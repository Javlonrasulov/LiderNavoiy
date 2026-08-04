package uz.lider.client.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import uz.lider.client.BuildConfig
import uz.lider.client.data.local.SelectedOrgHolder
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.AttachPaymentPhotoRequest
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
        val resolver = context.contentResolver
        val mime = resolver.getType(uri) ?: "image/jpeg"
        val name = queryDisplayName(uri) ?: "payment.jpg"
        val bytes = if (mime.startsWith("image/") && mime != "image/gif") {
            compressImage(uri) ?: resolver.openInputStream(uri)?.readBytes()
                ?: throw IllegalArgumentException("Cannot read photo")
        } else {
            resolver.openInputStream(uri)?.readBytes()
                ?: throw IllegalArgumentException("Cannot read photo")
        }
        val uploadMime = if (mime.startsWith("image/") && mime != "image/gif") "image/jpeg" else mime
        val uploadName = if (uploadMime == "image/jpeg") {
            name.replace(Regex("\\.[^.]+$"), ".jpg")
        } else {
            name
        }
        val part = MultipartBody.Part.createFormData(
            "file",
            uploadName,
            bytes.toRequestBody(uploadMime.toMediaTypeOrNull()),
        )
        return api.uploadPaymentPhoto(part).url
    }

    private fun compressImage(uri: Uri): ByteArray? {
        val resolver = context.contentResolver
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
        var sample = 1
        val maxSide = 1280
        while (bounds.outWidth / sample > maxSide || bounds.outHeight / sample > maxSide) {
            sample *= 2
        }
        val opts = BitmapFactory.Options().apply { inSampleSize = sample }
        val bitmap = resolver.openInputStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, opts)
        } ?: return null
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
        return ByteArrayOutputStream().use { out ->
            scaled.compress(Bitmap.CompressFormat.JPEG, 82, out)
            scaled.recycle()
            out.toByteArray()
        }
    }

    private fun queryDisplayName(uri: Uri): String? {
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && cursor.moveToFirst()) return cursor.getString(idx)
        }
        return null
    }
}
