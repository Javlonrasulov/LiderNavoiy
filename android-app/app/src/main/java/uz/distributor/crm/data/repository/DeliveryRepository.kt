package uz.distributor.crm.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import dagger.hilt.android.qualifiers.ApplicationContext
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
        val photoUrl = photoUri?.let { uploadPaymentPhoto(it) }
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
        return ensurePaymentPhoto(refreshOrder(orderId), photoUrl)
    }

    suspend fun collectPayment(
        orderId: String,
        paymentMethod: String,
        terminalId: String?,
        amount: Double,
        dueAt: String?,
        photoUri: Uri?,
    ): OrderDto {
        val photoUrl = photoUri?.let { uploadPaymentPhoto(it) }
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
        return ensurePaymentPhoto(refreshOrder(orderId), photoUrl)
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

    /** Yangi yuklangan rasm API javobida yo‘qolsa ham UI da ko‘rinsin */
    private fun ensurePaymentPhoto(order: OrderDto, photoUrl: String?): OrderDto {
        if (photoUrl.isNullOrBlank()) return order
        val payments = order.payments.toMutableList()
        if (payments.isEmpty()) {
            val patched = order.copy(lastPaymentPhotoUrl = photoUrl)
            cached = cached.map { if (it.id == order.id) patched else it }
            return patched
        }
        val idx = payments.indexOfLast { it.photoUrl.isNullOrBlank() }
            .takeIf { it >= 0 }
            ?: payments.lastIndex
        val current = payments[idx]
        if (current.photoUrl == photoUrl) {
            return order.copy(lastPaymentPhotoUrl = order.lastPaymentPhotoUrl ?: photoUrl)
        }
        payments[idx] = current.copy(photoUrl = photoUrl)
        val patched = order.copy(
            payments = payments,
            lastPaymentPhotoUrl = order.lastPaymentPhotoUrl ?: photoUrl,
        )
        cached = cached.map { if (it.id == order.id) patched else it }
        return patched
    }

    private suspend fun uploadPaymentPhoto(uri: Uri): String {
        val bytes = prepareJpegBytes(uri)
        if (bytes.size < MIN_VALID_BYTES) {
            throw IllegalArgumentException("Photo is empty or unreadable")
        }
        val probe = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, probe)
        if (probe.outWidth < 16 || probe.outHeight < 16) {
            throw IllegalArgumentException("Photo decode failed")
        }
        // JPEG magic: FF D8
        if (bytes.size < 2 || bytes[0] != 0xFF.toByte() || bytes[1] != 0xD8.toByte()) {
            throw IllegalArgumentException("Photo content not allowed")
        }
        val part = MultipartBody.Part.createFormData(
            "file",
            "payment_${System.currentTimeMillis()}.jpg",
            bytes.toRequestBody("image/jpeg".toMediaTypeOrNull()),
        )
        val url = api.uploadPaymentPhoto(part).url
        if (url.isBlank()) throw IllegalStateException("Upload returned empty url")
        return url
    }

    private suspend fun prepareJpegBytes(uri: Uri): ByteArray {
        // Kameradan yozilishi kechiksa bir necha marta urinish
        var lastError: Exception? = null
        repeat(4) { attempt ->
            try {
                val compressed = compressImage(uri)
                if (compressed != null && compressed.size >= MIN_VALID_BYTES) return compressed
                val raw = readUriBytes(uri)
                if (raw != null && raw.size >= MIN_VALID_BYTES) {
                    val reencoded = reencodeJpeg(raw)
                    if (reencoded != null && reencoded.size >= MIN_VALID_BYTES) return reencoded
                    // Allaqachon JPEG bo‘lsa raw yuboramiz
                    if (raw.size >= 2 && raw[0] == 0xFF.toByte() && raw[1] == 0xD8.toByte()) {
                        return raw
                    }
                }
                lastError = IllegalArgumentException("Photo file is empty")
            } catch (e: Exception) {
                lastError = e
            }
            if (attempt < 3) {
                kotlinx.coroutines.delay(200L * (attempt + 1))
            }
        }
        throw lastError ?: IllegalArgumentException("Cannot read photo")
    }

    private fun readUriBytes(uri: Uri): ByteArray? {
        if (uri.scheme == "file") {
            val path = uri.path ?: return null
            val file = File(path)
            if (file.exists() && file.length() > 0) return file.readBytes()
        }
        return context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
    }

    private fun compressImage(uri: Uri): ByteArray? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        openDecodeStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
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
        val bitmap = openDecodeStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, opts)
        } ?: return null

        val out = ByteArrayOutputStream()
        val ok = bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
        bitmap.recycle()
        if (!ok) return null
        val bytes = out.toByteArray()
        return bytes.takeIf { it.size >= MIN_VALID_BYTES }
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
        val out = ByteArrayOutputStream()
        val ok = bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
        bitmap.recycle()
        if (!ok) return null
        return out.toByteArray().takeIf { it.size >= MIN_VALID_BYTES }
    }

    private fun openDecodeStream(uri: Uri): java.io.InputStream? {
        if (uri.scheme == "file") {
            val path = uri.path ?: return null
            val file = File(path)
            if (file.exists()) return file.inputStream()
        }
        return context.contentResolver.openInputStream(uri)
    }

    companion object {
        private const val MIN_VALID_BYTES = 2_048
    }
}
