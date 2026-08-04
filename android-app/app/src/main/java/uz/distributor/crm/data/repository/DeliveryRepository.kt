package uz.distributor.crm.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
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
        // Har doim tarmoqdan — cache eski dueAt qoldirmasin
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
        val photoBase64 = photoUri?.let { encodePaymentPhotoBase64(it) }
        api.deliverOrder(
            orderId,
            DeliverOrderRequest(
                paymentMethod = paymentMethod,
                terminalId = terminalId,
                amount = amount,
                dueAt = dueAt,
                photoBase64 = photoBase64,
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
        val photoBase64 = photoUri?.let { encodePaymentPhotoBase64(it) }
        api.collectOrderPayment(
            orderId,
            CollectPaymentRequest(
                paymentMethod = paymentMethod,
                terminalId = terminalId,
                amount = amount,
                dueAt = dueAt,
                photoBase64 = photoBase64,
            ),
        )
        return refreshOrder(orderId)
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

    private suspend fun encodePaymentPhotoBase64(uri: Uri): String = withContext(Dispatchers.IO) {
        val jpegBytes = prepareJpegBytes(uri)
        val b64 = android.util.Base64.encodeToString(jpegBytes, android.util.Base64.NO_WRAP)
        "data:image/jpeg;base64,$b64"
    }

    /**
     * Kameradan/galereyadan URI ni birinchi keshga nusxalaymiz — shundan keyin JPEG.
     */
    private suspend fun prepareJpegBytes(uri: Uri): ByteArray {
        var lastError: Exception? = null
        repeat(5) { attempt ->
            try {
                val cached = copyUriToCacheFile(uri)
                try {
                    if (cached.length() < 256) {
                        throw IllegalArgumentException("Photo file is empty")
                    }
                    val fromFile = compressFileToJpeg(cached)
                    if (fromFile != null && fromFile.size >= MIN_VALID_BYTES && isJpeg(fromFile)) {
                        return fromFile
                    }
                    val raw = cached.readBytes()
                    if (raw.size >= MIN_VALID_BYTES && isJpeg(raw)) {
                        val reencoded = reencodeJpeg(raw)
                        if (reencoded != null && reencoded.size >= MIN_VALID_BYTES) return reencoded
                        return raw
                    }
                    val reencoded = reencodeJpeg(raw)
                    if (reencoded != null && reencoded.size >= MIN_VALID_BYTES && isJpeg(reencoded)) {
                        return reencoded
                    }
                    throw IllegalArgumentException("Photo decode failed")
                } finally {
                    cached.delete()
                }
            } catch (e: Exception) {
                lastError = e
            }
            if (attempt < 4) delay(250L * (attempt + 1))
        }
        throw lastError ?: IllegalArgumentException("Cannot read photo")
    }

    private fun copyUriToCacheFile(uri: Uri): File {
        val dir = File(context.cacheDir, "payment_upload").apply { mkdirs() }
        val out = File(dir, "src_${System.currentTimeMillis()}.bin")

        // To‘g‘ridan-to‘g‘ri fayl yo‘li (FileProvider)
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
        private const val MIN_VALID_BYTES = 1_024
    }
}
