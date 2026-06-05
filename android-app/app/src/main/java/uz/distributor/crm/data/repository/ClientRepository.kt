package uz.distributor.crm.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import uz.distributor.crm.BuildConfig
import uz.distributor.crm.data.local.*
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.ClientDto
import uz.distributor.crm.data.remote.dto.CreateClientRequest
import uz.distributor.crm.domain.model.Client
import java.io.ByteArrayOutputStream
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ClientRepository @Inject constructor(
    private val api: ApiService,
    private val db: AppDatabase,
    @ApplicationContext private val context: Context,
) {
    suspend fun getClients(forceRefresh: Boolean = false): List<Client> {
        if (forceRefresh) refreshFromApi()
        val cached = db.clientDao().getAll()
        if (cached.isNotEmpty()) return cached.map { it.toDomain() }
        refreshFromApi()
        return db.clientDao().getAll().map { it.toDomain() }
    }

    suspend fun getClient(id: String): Client? {
        return db.clientDao().getById(id)?.toDomain()
            ?: api.getClient(id).toEntity().toDomain()
    }

    suspend fun search(query: String): List<Client> {
        return try {
            api.searchClients(query).map { it.toEntity() }.also {
                db.clientDao().insertAll(it)
            }.map { it.toDomain() }
        } catch (_: Exception) {
            db.clientDao().search(query).map { it.toDomain() }
        }
    }

    suspend fun createClient(
        name: String,
        inn: String?,
        phone: String?,
        latitude: Double?,
        longitude: Double?,
        photoUri: Uri?,
        distributorId: String?,
    ): Client {
        val photoUrl = photoUri?.let { uploadClientPhoto(it) }
        val created = api.createClient(
            CreateClientRequest(
                name = name.trim(),
                inn = inn?.trim()?.ifBlank { null },
                phone = phone?.trim()?.ifBlank { null },
                latitude = latitude,
                longitude = longitude,
                photoUrl = photoUrl,
                distributorId = distributorId,
            ),
        )
        val entity = created.toEntity()
        db.clientDao().insertAll(listOf(entity))
        return entity.toDomain()
    }

    suspend fun clearCache() {
        db.clientDao().clearAll()
    }

    private suspend fun uploadClientPhoto(uri: Uri): String {
        val resolver = context.contentResolver
        val mime = resolver.getType(uri) ?: "image/jpeg"
        val name = queryDisplayName(uri) ?: "photo.jpg"
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
        } else name
        val part = MultipartBody.Part.createFormData(
            "file",
            uploadName,
            bytes.toRequestBody(uploadMime.toMediaTypeOrNull()),
        )
        return api.uploadClientPhoto(part).url
    }

    private suspend fun refreshFromApi() {
        try {
            db.clientDao().clearAll()
            val dtos = api.getClients()
            db.clientDao().insertAll(dtos.map { it.toEntity() })
        } catch (_: Exception) { /* use cache */ }
    }

    private fun compressImage(uri: Uri): ByteArray? {
        val resolver = context.contentResolver
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        val maxDim = 1280
        var sample = 1
        while (bounds.outWidth / sample > maxDim || bounds.outHeight / sample > maxDim) {
            sample *= 2
        }

        val opts = BitmapFactory.Options().apply { inSampleSize = sample }
        val bitmap = resolver.openInputStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, opts)
        } ?: return null

        val scaled = if (bitmap.width > maxDim || bitmap.height > maxDim) {
            val ratio = minOf(maxDim.toFloat() / bitmap.width, maxDim.toFloat() / bitmap.height)
            val w = (bitmap.width * ratio).toInt().coerceAtLeast(1)
            val h = (bitmap.height * ratio).toInt().coerceAtLeast(1)
            Bitmap.createScaledBitmap(bitmap, w, h, true).also {
                if (it !== bitmap) bitmap.recycle()
            }
        } else bitmap

        return ByteArrayOutputStream().use { out ->
            scaled.compress(Bitmap.CompressFormat.JPEG, 82, out)
            scaled.recycle()
            out.toByteArray()
        }
    }

    private fun queryDisplayName(uri: Uri): String? {
        val cursor = context.contentResolver.query(uri, null, null, null, null) ?: return null
        return cursor.use {
            val idx = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && it.moveToFirst()) it.getString(idx) else null
        }
    }

    fun resolvePhotoUrl(path: String?): String {
        if (path.isNullOrBlank()) return ""
        if (path.startsWith("http")) return path
        val base = BuildConfig.API_BASE_URL.trimEnd('/').removeSuffix("/api/v1")
        return "$base$path"
    }

    private fun ClientDto.toEntity() = ClientEntity(
        id = id, code = code, name = name, address = address,
        balance = balance,
        latitude = latitude, longitude = longitude,
    )
}
