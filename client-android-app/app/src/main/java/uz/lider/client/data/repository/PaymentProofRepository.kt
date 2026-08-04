package uz.lider.client.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.util.Base64
import android.util.Log
import androidx.exifinterface.media.ExifInterface
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.HttpException
import uz.lider.client.BuildConfig
import uz.lider.client.data.local.SelectedOrgHolder
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.AttachPaymentPhotoRequest
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
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
     * 1) JSON base64 (yangi backend)
     * 2) multipart + photoUrl (eski backend)
     * paymentId o‘rniga orderId afzal — eski serverda "Payment not found" dan qochish.
     */
    suspend fun captureAndAttach(
        uri: Uri,
        orderId: String? = null,
        paymentId: String? = null,
    ): Result<String> {
        return try {
            val jpeg = prepareJpegBytes(uri)
            if (jpeg.size < MIN_VALID_BYTES || !isJpeg(jpeg)) {
                throw IllegalArgumentException("Photo is empty or unreadable")
            }
            val probe = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(jpeg, 0, jpeg.size, probe)
            if (probe.outWidth < 16 || probe.outHeight < 16) {
                throw IllegalArgumentException("Photo decode failed")
            }

            val companyId = selectedOrgHolder.getSelectedCompanyId()
            val oid = orderId?.takeIf { it.isNotBlank() }
            val pid = paymentId?.takeIf { it.isNotBlank() && !it.startsWith("ord-") }
            val photoUrl = attachPreferBase64(jpeg, oid, pid, companyId)
            paymentPhotoAlertStore.clearAlert()
            Result.success(resolvePhotoUrl(photoUrl))
        } catch (e: Exception) {
            Log.e(TAG, "captureAndAttach failed", e)
            Result.failure(e)
        }
    }

    private suspend fun attachPreferBase64(
        jpeg: ByteArray,
        orderId: String?,
        paymentId: String?,
        companyId: String?,
    ): String {
        val dataUrl = "data:image/jpeg;base64," +
            Base64.encodeToString(jpeg, Base64.NO_WRAP)

        try {
            val res = api.attachPaymentPhoto(
                AttachPaymentPhotoRequest(
                    photoBase64 = dataUrl,
                    orderId = orderId,
                    // Yangi backendda paymentId OK; eski backendda orderId yo‘li ishonchli
                    paymentId = null,
                ),
                companyId = companyId,
            )
            val url = res.photoUrl?.trim().orEmpty()
            if (url.isNotBlank()) return url
        } catch (e: HttpException) {
            when (e.code()) {
                401, 403 -> throw e
                in 400..499 -> Log.w(TAG, "base64 attach ${e.code()}, fallback multipart")
                else -> throw e
            }
        }

        val uploaded = uploadMultipart(jpeg)

        // Eski backend: faqat orderId — stub yaratadi; paymentId "not found" bermasin
        try {
            val res = api.attachPaymentPhoto(
                AttachPaymentPhotoRequest(
                    photoUrl = uploaded,
                    orderId = orderId,
                    paymentId = null,
                ),
                companyId = companyId,
            )
            return res.photoUrl?.takeIf { it.isNotBlank() } ?: uploaded
        } catch (e: HttpException) {
            if (paymentId == null || e.code() !in 400..404) throw e
            val res = api.attachPaymentPhoto(
                AttachPaymentPhotoRequest(
                    photoUrl = uploaded,
                    orderId = orderId,
                    paymentId = paymentId,
                ),
                companyId = companyId,
            )
            return res.photoUrl?.takeIf { it.isNotBlank() } ?: uploaded
        }
    }

    private suspend fun uploadMultipart(bytes: ByteArray): String {
        val part = MultipartBody.Part.createFormData(
            "file",
            "payment_${System.currentTimeMillis()}.jpg",
            bytes.toRequestBody("image/jpeg".toMediaTypeOrNull()),
        )
        val uploaded = api.uploadPaymentPhoto(part).url.trim()
        if (uploaded.isBlank()) throw IllegalStateException("Upload returned empty url")
        return uploaded
    }

    /** Kameradan URI → ishonchli JPEG (dostavkachi ilovasidagi usul). */
    private fun prepareJpegBytes(uri: Uri): ByteArray {
        val cacheFile = copyUriToCacheFile(uri)
        try {
            compressFileToJpeg(cacheFile)?.let { return it }
            val raw = cacheFile.readBytes()
            if (raw.size >= MIN_VALID_BYTES && isJpeg(raw)) {
                return reencodeWithExif(raw) ?: raw
            }
            throw IllegalArgumentException("Cannot read photo")
        } finally {
            cacheFile.delete()
        }
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
        }

        if (!out.exists() || out.length() <= 0L) {
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
        val maxSide = 960
        while (bounds.outWidth / sample > maxSide || bounds.outHeight / sample > maxSide) {
            sample *= 2
        }
        val opts = BitmapFactory.Options().apply {
            inSampleSize = sample
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        val decoded = BitmapFactory.decodeFile(file.absolutePath, opts) ?: return null

        val orientation = try {
            ExifInterface(file.absolutePath).getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL,
            )
        } catch (_: Exception) {
            ExifInterface.ORIENTATION_NORMAL
        }

        val bitmap = applyExifRotation(decoded, orientation).also {
            if (it !== decoded) decoded.recycle()
        }

        return try {
            val out = ByteArrayOutputStream()
            if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 70, out)) return null
            out.toByteArray().takeIf { it.size >= MIN_VALID_BYTES && isJpeg(it) }
        } finally {
            bitmap.recycle()
        }
    }

    private fun reencodeWithExif(raw: ByteArray): ByteArray? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(raw, 0, raw.size, bounds)
        if (bounds.outWidth <= 0) return null
        var sample = 1
        val maxSide = 1280
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
        return try {
            val out = ByteArrayOutputStream()
            if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 80, out)) return null
            out.toByteArray().takeIf { it.size >= MIN_VALID_BYTES && isJpeg(it) }
        } finally {
            bitmap.recycle()
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

    private fun isJpeg(bytes: ByteArray): Boolean =
        bytes.size >= 2 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte()

    companion object {
        private const val TAG = "PaymentProof"
        private const val MIN_VALID_BYTES = 512
    }
}
