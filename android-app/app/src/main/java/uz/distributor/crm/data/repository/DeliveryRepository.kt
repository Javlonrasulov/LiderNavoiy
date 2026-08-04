package uz.distributor.crm.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.net.Uri
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
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.CollectPaymentRequest
import uz.distributor.crm.data.remote.dto.CreateReturnRequest
import uz.distributor.crm.data.remote.dto.DeliverOrderRequest
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.data.remote.dto.OrderItemDto
import uz.distributor.crm.data.remote.dto.PaymentTerminalDto
import uz.distributor.crm.data.remote.dto.ReorderDeliveryRequest
import uz.distributor.crm.data.remote.dto.UpdateDueAtRequest
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
        return getAssignedOrders().firstOrNull { it.id == orderId }
            ?: getCachedOrder(orderId)
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
        val photoUrl = photoUri?.let { uploadPaymentPhotoReliably(it) }
        api.deliverOrder(
            orderId,
            DeliverOrderRequest(
                paymentMethod = paymentMethod,
                terminalId = terminalId,
                amount = amount,
                dueAt = dueAt,
                photoUrl = photoUrl,
            ),
        )
        return refreshOrder(orderId)
    }

    suspend fun collectPayment(
        orderId: String,
        paymentMethod: String,
        terminalId: String?,
        amount: Double,
        dueAt: String?,
        photoUri: Uri?,
    ): OrderDto {
        val photoUrl = photoUri?.let { uploadPaymentPhotoReliably(it) }
        api.collectOrderPayment(
            orderId,
            CollectPaymentRequest(
                paymentMethod = paymentMethod,
                terminalId = terminalId,
                amount = amount,
                dueAt = dueAt,
                photoUrl = photoUrl,
            ),
        )
        return refreshOrder(orderId)
    }

    /**
     * Ishlab chiqarishda ishonchli yo‘l:
     * 1) JPEG ga aylantirish (Coil)
     * 2) Avval clients/upload-photo (prod da allaqachon ishlaydi)
     * 3) Keyin payments/orders upload
     */
    private suspend fun uploadPaymentPhotoReliably(uri: Uri): String = withContext(Dispatchers.IO) {
        val jpegBytes = prepareJpegBytes(uri)
        if (jpegBytes.size < MIN_VALID_BYTES || !isJpeg(jpegBytes)) {
            throw IllegalArgumentException("Cannot read photo")
        }

        fun part(): MultipartBody.Part = MultipartBody.Part.createFormData(
            "file",
            "payment_${System.currentTimeMillis()}.jpg",
            jpegBytes.toRequestBody("image/jpeg".toMediaTypeOrNull()),
        )

        val errors = mutableListOf<String>()

        // 1) Agentlar allaqachon ishlatadigan endpoint — prod da bor
        try {
            val url = api.uploadClientPhoto(part()).url.trim()
            if (url.isNotBlank()) return@withContext url
            errors += "clients: empty url"
        } catch (e: Exception) {
            errors += "clients: ${e.message}"
        }

        try {
            val url = api.uploadPaymentPhoto(part()).url.trim()
            if (url.isNotBlank()) return@withContext url
            errors += "payments: empty url"
        } catch (e: Exception) {
            errors += "payments: ${e.message}"
        }

        try {
            val url = api.uploadPaymentPhotoLegacy(part()).url.trim()
            if (url.isNotBlank()) return@withContext url
            errors += "orders: empty url"
        } catch (e: Exception) {
            errors += "orders: ${e.message}"
        }

        throw IllegalStateException(
            "Photo upload failed: ${errors.joinToString(" | ").ifBlank { "unknown" }}",
        )
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
        return list.firstOrNull { it.id == orderId }
            ?: getCachedOrder(orderId)
            ?: OrderDto(
                id = orderId,
                clientId = "",
                createdAt = "",
                status = "delivered",
                paymentStatus = "paid",
            )
    }

    private suspend fun prepareJpegBytes(uri: Uri): ByteArray = withContext(Dispatchers.IO) {
        // 1) Coil — galereya/kamera URI lar uchun eng ishonchli
        decodeWithCoil(uri)?.let { return@withContext it }

        var lastError: Exception? = null
        repeat(4) { attempt ->
            try {
                val cached = copyUriToCacheFile(uri)
                try {
                    compressFileToJpeg(cached)?.let { return@withContext it }
                    val raw = cached.readBytes()
                    if (raw.size >= 256 && isJpeg(raw)) {
                        reencodeJpeg(raw)?.let { return@withContext it }
                        if (raw.size >= MIN_VALID_BYTES) return@withContext raw
                    }
                    reencodeJpeg(raw)?.let { return@withContext it }
                    throw IllegalArgumentException("Photo decode failed")
                } finally {
                    cached.delete()
                }
            } catch (e: Exception) {
                lastError = e
            }
            if (attempt < 3) delay(200L * (attempt + 1))
        }
        throw lastError ?: IllegalArgumentException("Cannot read photo")
    }

    private suspend fun decodeWithCoil(uri: Uri): ByteArray? {
        return try {
            val request = ImageRequest.Builder(context)
                .data(uri)
                .allowHardware(false)
                .size(1280)
                .build()
            val result = imageLoader.execute(request)
            if (result !is SuccessResult) return null
            val drawable = result.drawable
            val bitmap = when (drawable) {
                is BitmapDrawable -> drawable.bitmap
                else -> drawable.toBitmap(
                    width = drawable.intrinsicWidth.coerceAtLeast(1).coerceAtMost(1280),
                    height = drawable.intrinsicHeight.coerceAtLeast(1).coerceAtMost(1280),
                )
            }
            val scaled = scaleBitmap(bitmap, 1280)
            val out = ByteArrayOutputStream()
            val ok = scaled.compress(Bitmap.CompressFormat.JPEG, 85, out)
            if (scaled !== bitmap && !bitmap.isRecycled) {
                // coil managed bitmap — don't recycle source aggressively
            }
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

        var sample = 1
        val maxSide = 1280
        while (bounds.outWidth / sample > maxSide || bounds.outHeight / sample > maxSide) {
            sample *= 2
        }
        val opts = BitmapFactory.Options().apply {
            inSampleSize = sample
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        val bitmap = BitmapFactory.decodeFile(file.absolutePath, opts) ?: return null
        return try {
            val out = ByteArrayOutputStream()
            if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)) return null
            out.toByteArray().takeIf { it.size >= MIN_VALID_BYTES && isJpeg(it) }
        } finally {
            bitmap.recycle()
        }
    }

    private fun reencodeJpeg(raw: ByteArray): ByteArray? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(raw, 0, raw.size, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
        var sample = 1
        val maxSide = 1280
        while (bounds.outWidth / sample > maxSide || bounds.outHeight / sample > maxSide) {
            sample *= 2
        }
        val opts = BitmapFactory.Options().apply {
            inSampleSize = sample
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        val bitmap = BitmapFactory.decodeByteArray(raw, 0, raw.size, opts) ?: return null
        return try {
            val out = ByteArrayOutputStream()
            if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)) return null
            out.toByteArray().takeIf { it.size >= MIN_VALID_BYTES && isJpeg(it) }
        } finally {
            bitmap.recycle()
        }
    }

    private fun isJpeg(bytes: ByteArray): Boolean =
        bytes.size >= 2 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte()

    companion object {
        private const val MIN_VALID_BYTES = 512
    }
}
