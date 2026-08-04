package uz.lider.client.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import uz.lider.client.BuildConfig
import uz.lider.client.data.local.SelectedOrgHolder
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.AttachPaymentPhotoRequest
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PaymentProofRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiService,
    private val selectedOrgHolder: SelectedOrgHolder,
    private val paymentPhotoAlertStore: PaymentPhotoAlertStore,
) {
    fun resolvePhotoUrl(path: String?): String {
        if (path.isNullOrBlank()) return ""
        if (path.startsWith("http")) return path
        val base = BuildConfig.API_BASE_URL.trimEnd('/').removeSuffix("/api/v1")
        return "$base$path"
    }

    /**
     * Kameradan olingan rasmni yuklab, to‘lovga biriktiradi.
     * Muvaffaqiyatda eslatmani tozalaydi.
     */
    suspend fun captureAndAttach(uri: Uri, orderId: String? = null): Result<String> {
        return try {
            val photoUrl = uploadPhoto(uri)
            val companyId = selectedOrgHolder.getSelectedCompanyId()
            api.attachPaymentPhoto(
                AttachPaymentPhotoRequest(
                    photoUrl = photoUrl,
                    orderId = orderId?.takeIf { it.isNotBlank() },
                ),
                companyId = companyId,
            )
            paymentPhotoAlertStore.clearAlert()
            Result.success(resolvePhotoUrl(photoUrl))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun uploadPhoto(uri: Uri): String {
        val bytes = prepareJpegBytes(uri)
        if (bytes.size < MIN_VALID_BYTES) {
            throw IllegalArgumentException("Photo is empty or unreadable")
        }
        // Decode tekshiruvi — qora/buzilgan faylni darhol rad etamiz
        val probe = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, probe)
        if (probe.outWidth < 16 || probe.outHeight < 16) {
            throw IllegalArgumentException("Photo decode failed")
        }
        val part = MultipartBody.Part.createFormData(
            "file",
            "payment_${System.currentTimeMillis()}.jpg",
            bytes.toRequestBody("image/jpeg".toMediaTypeOrNull()),
        )
        val uploaded = api.uploadPaymentPhoto(part).url
        if (uploaded.isBlank()) throw IllegalStateException("Upload returned empty url")
        return uploaded
    }

    /** Kameradan kelgan URI → EXIF-rotated, siqilgan JPEG. */
    private fun prepareJpegBytes(uri: Uri): ByteArray {
        val compressed = compressImage(uri)
        if (compressed != null && compressed.size >= MIN_VALID_BYTES) return compressed
        val raw = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            ?: throw IllegalArgumentException("Cannot read photo")
        if (raw.size < MIN_VALID_BYTES) {
            throw IllegalArgumentException("Photo file is empty")
        }
        // Raw JPEG bo‘lsa EXIF bilan qayta encode
        return reencodeWithExif(raw) ?: raw
    }

    private fun compressImage(uri: Uri): ByteArray? {
        val resolver = context.contentResolver
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        var sample = 1
        val maxSide = 1600
        while (bounds.outWidth / sample > maxSide || bounds.outHeight / sample > maxSide) {
            sample *= 2
        }
        val opts = BitmapFactory.Options().apply {
            inSampleSize = sample
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        val decoded = resolver.openInputStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, opts)
        } ?: return null

        val orientation = resolver.openInputStream(uri)?.use { input ->
            ExifInterface(input).getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL,
            )
        } ?: ExifInterface.ORIENTATION_NORMAL

        val bitmap = applyExifRotation(decoded, orientation).also {
            if (it !== decoded) decoded.recycle()
        }

        val scaled = if (bitmap.width > maxSide || bitmap.height > maxSide) {
            val ratio = maxSide.toFloat() / maxOf(bitmap.width, bitmap.height)
            Bitmap.createScaledBitmap(
                bitmap,
                (bitmap.width * ratio).toInt().coerceAtLeast(1),
                (bitmap.height * ratio).toInt().coerceAtLeast(1),
                true,
            ).also { if (it !== bitmap) bitmap.recycle() }
        } else {
            bitmap
        }

        if (isMostlyBlack(scaled)) {
            scaled.recycle()
            return null
        }

        return ByteArrayOutputStream().use { out ->
            val ok = scaled.compress(Bitmap.CompressFormat.JPEG, 85, out)
            scaled.recycle()
            if (!ok) null else out.toByteArray()
        }
    }

    private fun reencodeWithExif(raw: ByteArray): ByteArray? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(raw, 0, raw.size, bounds)
        if (bounds.outWidth <= 0) return null
        var sample = 1
        val maxSide = 1600
        while (bounds.outWidth / sample > maxSide || bounds.outHeight / sample > maxSide) {
            sample *= 2
        }
        val opts = BitmapFactory.Options().apply {
            inSampleSize = sample
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        val decoded = BitmapFactory.decodeByteArray(raw, 0, raw.size, opts) ?: return null
        val orientation = try {
            ExifInterface(ByteArrayInputStream(raw)).getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL,
            )
        } catch (_: Exception) {
            ExifInterface.ORIENTATION_NORMAL
        }
        val bitmap = applyExifRotation(decoded, orientation).also {
            if (it !== decoded) decoded.recycle()
        }
        if (isMostlyBlack(bitmap)) {
            bitmap.recycle()
            return null
        }
        return ByteArrayOutputStream().use { out ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
            bitmap.recycle()
            out.toByteArray()
        }
    }

    private fun applyExifRotation(bitmap: Bitmap, orientation: Int): Bitmap {
        val degrees = when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> 90f
            ExifInterface.ORIENTATION_ROTATE_180 -> 180f
            ExifInterface.ORIENTATION_ROTATE_270 -> 270f
            else -> return bitmap
        }
        val matrix = Matrix().apply { postRotate(degrees) }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    /** Kameradan bo‘sh / qora kadr kelganini aniqlash. */
    private fun isMostlyBlack(bitmap: Bitmap): Boolean {
        val w = bitmap.width
        val h = bitmap.height
        if (w < 8 || h < 8) return true
        val stepX = (w / 8).coerceAtLeast(1)
        val stepY = (h / 8).coerceAtLeast(1)
        var sum = 0L
        var count = 0
        var y = 0
        while (y < h) {
            var x = 0
            while (x < w) {
                val c = bitmap.getPixel(x, y)
                val r = (c shr 16) and 0xFF
                val g = (c shr 8) and 0xFF
                val b = c and 0xFF
                sum += (r + g + b) / 3
                count++
                x += stepX
            }
            y += stepY
        }
        if (count == 0) return true
        return (sum / count) < 12
    }

    companion object {
        private const val MIN_VALID_BYTES = 2_048
    }
}
