package uz.distributor.crm.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.net.Uri
import android.util.Base64
import androidx.core.graphics.drawable.toBitmap
import coil.ImageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.HttpException
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.CollectPaymentRequest
import uz.distributor.crm.data.remote.dto.CreateReturnRequest
import uz.distributor.crm.data.remote.dto.DeliverOrderRequest
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.data.remote.dto.OrderItemDto
import uz.distributor.crm.data.remote.dto.PaymentTerminalDto
import uz.distributor.crm.data.remote.dto.ReorderDeliveryRequest
import uz.distributor.crm.data.remote.dto.UpdateDueAtRequest
import uz.distributor.crm.util.JpegOrientation
import java.io.ByteArrayOutputStream
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeliveryRepository @Inject constructor(
    private val api: ApiService,
    @ApplicationContext private val context: Context,
) {
    @Volatile
    private var cached: List<OrderDto> = emptyList()

    private val imageLoader by lazy {
        ImageLoader.Builder(context)
            .allowHardware(false)
            .build()
    }

    suspend fun getAssignedOrders(): List<OrderDto> {
        val orders = api.getDeliveryOrders()
        cached = orders
        return orders
    }

    suspend fun reorderOnWay(orderIds: List<String>): List<OrderDto> {
        val orders = api.reorderDeliveryOrders(ReorderDeliveryRequest(orderIds))
        cached = orders
        return orders
    }

    fun getCachedOrder(orderId: String): OrderDto? =
        cached.firstOrNull { it.id == orderId }

    suspend fun getOrder(orderId: String): OrderDto? {
        val order = getAssignedOrders().firstOrNull { it.id == orderId }
            ?: getCachedOrder(orderId)
        return order?.let { withVisiblePaymentPhotos(it) }
    }

    /** Oxirgi to‘lovda yetkazib beruvchi rasmi bo‘sh bo‘lsa — lastPaymentPhotoUrl dan. */
    private fun withVisiblePaymentPhotos(order: OrderDto): OrderDto {
        val payments = order.payments
        if (payments.isEmpty()) return order
        val last = payments.last()
        val courierFallback = order.lastPaymentPhotoUrl?.trim()?.takeIf { it.isNotBlank() }
            ?: return order
        if (!last.photoUrl.isNullOrBlank()) return order
        return order.copy(
            payments = payments.dropLast(1) + last.copy(photoUrl = courierFallback),
        )
    }

    suspend fun getMyTerminals(): List<PaymentTerminalDto> =
        api.getMyTerminals().filter { it.isActive }

    suspend fun deliver(
        orderId: String,
        paymentMethod: String,
        terminalId: String?,
        amount: Double?,
        dueAt: String?,
        photoUri: Uri?,
    ): OrderDto {
        val savedPhotoUrl = submitWithPhoto(
            photoUri = photoUri,
            withUrl = { url ->
                api.deliverOrder(
                    orderId,
                    DeliverOrderRequest(
                        paymentMethod = paymentMethod,
                        terminalId = terminalId,
                        amount = amount,
                        dueAt = dueAt,
                        photoUrl = url,
                    ),
                )
            },
            withBase64 = { b64 ->
                api.deliverOrder(
                    orderId,
                    DeliverOrderRequest(
                        paymentMethod = paymentMethod,
                        terminalId = terminalId,
                        amount = amount,
                        dueAt = dueAt,
                        photoBase64 = b64,
                    ),
                )
            },
            withoutPhoto = {
                api.deliverOrder(
                    orderId,
                    DeliverOrderRequest(
                        paymentMethod = paymentMethod,
                        terminalId = terminalId,
                        amount = amount,
                        dueAt = dueAt,
                    ),
                )
            },
        )
        val refreshed = ensurePaymentPhoto(refreshOrder(orderId), savedPhotoUrl)
        cached = cached.map { if (it.id == refreshed.id) refreshed else it }
        return refreshed
    }

    suspend fun collectPayment(
        orderId: String,
        paymentMethod: String,
        terminalId: String?,
        amount: Double,
        dueAt: String?,
        photoUri: Uri?,
    ): OrderDto {
        val savedPhotoUrl = submitWithPhoto(
            photoUri = photoUri,
            withUrl = { url ->
                api.collectOrderPayment(
                    orderId,
                    CollectPaymentRequest(
                        paymentMethod = paymentMethod,
                        terminalId = terminalId,
                        amount = amount,
                        dueAt = dueAt,
                        photoUrl = url,
                    ),
                )
            },
            withBase64 = { b64 ->
                api.collectOrderPayment(
                    orderId,
                    CollectPaymentRequest(
                        paymentMethod = paymentMethod,
                        terminalId = terminalId,
                        amount = amount,
                        dueAt = dueAt,
                        photoBase64 = b64,
                    ),
                )
            },
            withoutPhoto = {
                api.collectOrderPayment(
                    orderId,
                    CollectPaymentRequest(
                        paymentMethod = paymentMethod,
                        terminalId = terminalId,
                        amount = amount,
                        dueAt = dueAt,
                    ),
                )
            },
        )
        val refreshed = ensurePaymentPhoto(refreshOrder(orderId), savedPhotoUrl)
        cached = cached.map { if (it.id == refreshed.id) refreshed else it }
        return refreshed
    }

    /**
     * @return saqlangan photoUrl (yoki null)
     */
    private suspend fun submitWithPhoto(
        photoUri: Uri?,
        withUrl: suspend (String) -> Any,
        withBase64: suspend (String) -> Any,
        withoutPhoto: suspend () -> Any,
    ): String? {
        if (photoUri == null) {
            withoutPhoto()
            return null
        }
        val jpegBytes = prepareJpegBytes(photoUri)
        if (jpegBytes.size < MIN_VALID_BYTES || !isJpeg(jpegBytes)) {
            throw IllegalArgumentException("Cannot read photo")
        }

        var multipartError: Exception? = null
        try {
            val url = uploadJpegViaMultipart(jpegBytes)
            withUrl(url)
            return url
        } catch (e: Exception) {
            multipartError = e
        }

        val dataUrl = "data:image/jpeg;base64," +
            Base64.encodeToString(jpegBytes, Base64.NO_WRAP)
        try {
            withBase64(dataUrl)
            // base64 serverda faylga aylanadi — URL refresh dan keladi
            return null
        } catch (e: HttpException) {
            val body = runCatching { e.response()?.errorBody()?.string().orEmpty() }.getOrDefault("")
            val unknownField = body.contains("photoBase64", ignoreCase = true) ||
                body.contains("should not exist", ignoreCase = true)
            if (!unknownField) {
                val msg = parseNestMessage(body) ?: "HTTP ${e.code()}"
                throw IllegalStateException(msg, e)
            }
        }

        throw multipartError ?: IllegalStateException("Photo upload failed")
    }

    /** API photoUrl qaytarmasa ham, yuborgan URL ni oxirgi to‘lovga yopishtiramiz. */
    private fun ensurePaymentPhoto(order: OrderDto, uploadedUrl: String?): OrderDto {
        val url = uploadedUrl?.trim()?.takeIf { it.isNotBlank() }
            ?: order.lastPaymentPhotoUrl?.trim()?.takeIf { it.isNotBlank() }
            ?: return order

        val payments = order.payments
        if (payments.isEmpty()) {
            return order.copy(lastPaymentPhotoUrl = order.lastPaymentPhotoUrl ?: url)
        }

        // createdAt ASC — oxirgi element eng yangi to‘lov
        val last = payments.last()
        val patched = if (last.photoUrl.isNullOrBlank()) {
            payments.dropLast(1) + last.copy(photoUrl = url)
        } else {
            payments
        }
        return order.copy(
            payments = patched,
            lastPaymentPhotoUrl = order.lastPaymentPhotoUrl?.takeIf { it.isNotBlank() } ?: url,
        )
    }

    /**
     * 1) messages/upload — sharp ishlamasa ham originalni saqlaydi (prod)
     * 2) clients / payments / orders
     */
    private suspend fun uploadJpegViaMultipart(jpegBytes: ByteArray): String = withContext(Dispatchers.IO) {
        fun part(): MultipartBody.Part = MultipartBody.Part.createFormData(
            "file",
            "payment_${System.currentTimeMillis()}.jpg",
            jpegBytes.toRequestBody("image/jpeg".toMediaTypeOrNull()),
        )

        val errors = mutableListOf<String>()

        fun errLabel(e: Exception): String {
            if (e is HttpException) {
                val body = runCatching { e.response()?.errorBody()?.string().orEmpty() }.getOrDefault("")
                val msg = parseNestMessage(body)
                return if (msg != null) "HTTP ${e.code()} $msg" else "HTTP ${e.code()}"
            }
            return e.message ?: e.javaClass.simpleName
        }

        try {
            val url = api.uploadChatFile(part()).url.trim()
            if (url.isNotBlank()) return@withContext url
            errors += "chat: empty url"
        } catch (e: Exception) {
            errors += "chat: ${errLabel(e)}"
        }

        try {
            val url = api.uploadClientPhoto(part()).url.trim()
            if (url.isNotBlank()) return@withContext url
            errors += "clients: empty url"
        } catch (e: Exception) {
            errors += "clients: ${errLabel(e)}"
        }

        try {
            val url = api.uploadPaymentPhoto(part()).url.trim()
            if (url.isNotBlank()) return@withContext url
            errors += "payments: empty url"
        } catch (e: Exception) {
            errors += "payments: ${errLabel(e)}"
        }

        try {
            val url = api.uploadPaymentPhotoLegacy(part()).url.trim()
            if (url.isNotBlank()) return@withContext url
            errors += "orders: empty url"
        } catch (e: Exception) {
            errors += "orders: ${errLabel(e)}"
        }

        throw IllegalStateException(
            "Photo upload failed: ${errors.joinToString(" | ").ifBlank { "unknown" }}",
        )
    }

    private fun parseNestMessage(body: String): String? {
        if (body.isBlank()) return null
        return try {
            val json = com.google.gson.JsonParser.parseString(body).asJsonObject
            if (!json.has("message")) return body.take(120)
            val message = json.get("message")
            when {
                message.isJsonArray -> message.asJsonArray.joinToString("; ") { it.asString }
                message.isJsonPrimitive -> message.asString
                else -> body.take(120)
            }
        } catch (_: Exception) {
            body.take(120)
        }
    }

    suspend fun updateDueAt(orderId: String, dueAt: String): OrderDto {
        api.updatePaymentDue(orderId, UpdateDueAtRequest(dueAt))
        val refreshed = refreshOrder(orderId)
        val patched = refreshed.copy(dueAt = dueAt)
        cached = cached.map { if (it.id == orderId) patched else it }
        return patched
    }

    suspend fun createReturn(
        orderId: String,
        items: List<OrderItemDto>,
        note: String?,
    ) {
        api.createOrderReturn(orderId, CreateReturnRequest(items = items, note = note))
    }

    private suspend fun refreshOrder(orderId: String): OrderDto {
        val list = getAssignedOrders()
        val order = list.firstOrNull { it.id == orderId }
            ?: getCachedOrder(orderId)
            ?: OrderDto(
                id = orderId,
                clientId = "",
                createdAt = "",
                status = "delivered",
                paymentStatus = "paid",
            )
        return withVisiblePaymentPhotos(order)
    }

    private suspend fun prepareJpegBytes(uri: Uri): ByteArray = withContext(Dispatchers.IO) {
        var lastError: Exception? = null
        repeat(4) { attempt ->
            try {
                val cached = copyUriToCacheFile(uri)
                try {
                    // Har doim EXIF bilan normalizatsiya — aks holda portret albom bo‘lib qoladi
                    compressFileToJpeg(cached)?.let { return@withContext it }
                    val raw = cached.readBytes()
                    if (isJpeg(raw) && raw.size >= MIN_VALID_BYTES) {
                        reencodeJpeg(raw)?.let { return@withContext it }
                    }
                    throw IllegalArgumentException("Photo decode failed")
                } finally {
                    cached.delete()
                }
            } catch (e: Exception) {
                lastError = e
            }
            if (attempt < 3) delay(200L * (attempt + 1))
        }
        decodeWithCoil(uri)?.let { return@withContext it }
        throw lastError ?: IllegalArgumentException("Cannot read photo")
    }

    private suspend fun decodeWithCoil(uri: Uri): ByteArray? {
        return try {
            val request = ImageRequest.Builder(context)
                .data(uri)
                .allowHardware(false)
                .size(MAX_SIDE)
                .build()
            val result = imageLoader.execute(request)
            if (result !is SuccessResult) return null
            val drawable = result.drawable
            val bitmap = when (drawable) {
                is BitmapDrawable -> drawable.bitmap
                else -> drawable.toBitmap(
                    width = drawable.intrinsicWidth.coerceAtLeast(1).coerceAtMost(MAX_SIDE),
                    height = drawable.intrinsicHeight.coerceAtLeast(1).coerceAtMost(MAX_SIDE),
                )
            }
            val scaled = scaleBitmap(bitmap, MAX_SIDE)
            val out = ByteArrayOutputStream()
            val ok = scaled.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, out)
            if (scaled !== bitmap) scaled.recycle()
            if (!ok) return null
            out.toByteArray().takeIf { it.size >= MIN_VALID_BYTES && isJpeg(it) }
        } catch (_: Exception) {
            null
        }
    }

    private fun scaleBitmap(bitmap: Bitmap, maxSide: Int): Bitmap {
        val w = bitmap.width
        val h = bitmap.height
        if (w <= maxSide && h <= maxSide) return bitmap
        val ratio = maxSide.toFloat() / maxOf(w, h)
        return Bitmap.createScaledBitmap(
            bitmap,
            (w * ratio).toInt().coerceAtLeast(1),
            (h * ratio).toInt().coerceAtLeast(1),
            true,
        )
    }

    private fun copyUriToCacheFile(uri: Uri): File {
        val dir = File(context.cacheDir, "payment_upload").apply { mkdirs() }
        val out = File(dir, "src_${System.currentTimeMillis()}.bin")

        if (uri.scheme == "file") {
            val path = uri.path
            if (path != null) {
                val src = File(path)
                if (src.exists() && src.length() > 0) {
                    src.copyTo(out, overwrite = true)
                    return out
                }
            }
        }

        val resolver = context.contentResolver
        resolver.openInputStream(uri)?.use { input ->
            out.outputStream().use { output -> input.copyTo(output) }
        } ?: throw IllegalArgumentException("Cannot open photo stream")

        if (out.length() <= 0L) {
            val pfd = resolver.openFileDescriptor(uri, "r")
            if (pfd != null) {
                android.os.ParcelFileDescriptor.AutoCloseInputStream(pfd).use { input ->
                    out.outputStream().use { output -> input.copyTo(output) }
                }
            }
        }
        if (!out.exists() || out.length() <= 0L) {
            throw IllegalArgumentException("Photo file is empty")
        }
        return out
    }

    private fun compressFileToJpeg(file: File): ByteArray? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.absolutePath, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        val orientation = JpegOrientation.fromFile(file)
        var sample = 1
        while (bounds.outWidth / sample > MAX_SIDE || bounds.outHeight / sample > MAX_SIDE) {
            sample *= 2
        }
        val opts = BitmapFactory.Options().apply {
            inSampleSize = sample
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        val decoded = BitmapFactory.decodeFile(file.absolutePath, opts) ?: return null
        val bitmap = JpegOrientation.apply(decoded, orientation)
        return try {
            val scaled = scaleBitmap(bitmap, MAX_SIDE)
            try {
                val out = ByteArrayOutputStream()
                if (!scaled.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, out)) return null
                out.toByteArray().takeIf { it.size >= MIN_VALID_BYTES && isJpeg(it) }
            } finally {
                if (scaled !== bitmap) scaled.recycle()
            }
        } finally {
            if (!bitmap.isRecycled) bitmap.recycle()
        }
    }

    private fun reencodeJpeg(raw: ByteArray): ByteArray? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(raw, 0, raw.size, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
        val orientation = JpegOrientation.fromBytes(raw)
        var sample = 1
        while (bounds.outWidth / sample > MAX_SIDE || bounds.outHeight / sample > MAX_SIDE) {
            sample *= 2
        }
        val opts = BitmapFactory.Options().apply {
            inSampleSize = sample
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        val decoded = BitmapFactory.decodeByteArray(raw, 0, raw.size, opts) ?: return null
        val bitmap = JpegOrientation.apply(decoded, orientation)
        return try {
            val scaled = scaleBitmap(bitmap, MAX_SIDE)
            try {
                val out = ByteArrayOutputStream()
                if (!scaled.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, out)) return null
                out.toByteArray().takeIf { it.size >= MIN_VALID_BYTES && isJpeg(it) }
            } finally {
                if (scaled !== bitmap) scaled.recycle()
            }
        } finally {
            if (!bitmap.isRecycled) bitmap.recycle()
        }
    }

    private fun isJpeg(bytes: ByteArray): Boolean =
        bytes.size >= 2 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte()

    companion object {
        private const val MIN_VALID_BYTES = 512
        /** Server joyi: ~1280px, sifat ~78 — o‘qiladi, lekin katta emas */
        private const val MAX_SIDE = 1280
        private const val JPEG_QUALITY = 78
    }
}
