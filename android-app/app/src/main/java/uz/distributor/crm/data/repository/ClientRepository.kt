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
import uz.distributor.crm.data.remote.dto.LineDto
import uz.distributor.crm.data.remote.dto.UpdateClientLocationRequest
import uz.distributor.crm.domain.model.Client
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject
import javax.inject.Singleton

data class ClientActivityDates(
    val lastVisitAt: Long? = null,
    val lastOrderAt: Long? = null,
)

data class CreateClientResult(
    val pendingRequest: Boolean,
)

data class UpdateClientResult(
    val client: Client?,
    val pendingRequest: Boolean,
)

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
        db.clientDao().getById(id)?.toDomain()?.let { return it }
        return try {
            api.getClient(id).toEntity().toDomain()
        } catch (_: Exception) {
            null
        }
    }

    suspend fun getClientDetail(id: String): Client? {
        return try {
            val entity = api.getClient(id).toEntity()
            db.clientDao().insertAll(listOf(entity))
            entity.toDomain()
        } catch (_: Exception) {
            db.clientDao().getById(id)?.toDomain()
        }
    }

    suspend fun getReconciliation(clientId: String, from: String, to: String) =
        api.getClientReconciliation(clientId, from, to)

    suspend fun getClientActivity(clientId: String): ClientActivityDates {
        var lastVisit: Long? = null
        var lastOrder: Long? = null

        try {
            api.getVisits().forEach { visit ->
                if (visit.clientId != clientId) return@forEach
                parseApiDate(visit.visitedAt)?.let { ts ->
                    if (lastVisit == null || ts > lastVisit!!) lastVisit = ts
                }
            }
        } catch (_: Exception) { }

        try {
            api.getOrders().forEach { order ->
                if (order.clientId != clientId) return@forEach
                parseApiDate(order.createdAt)?.let { ts ->
                    if (lastOrder == null || ts > lastOrder!!) lastOrder = ts
                }
            }
        } catch (_: Exception) { }

        db.pendingVisitDao().getPending()
            .filter { it.clientId == clientId }
            .forEach { visit ->
                if (lastVisit == null || visit.visitedAt > lastVisit!!) lastVisit = visit.visitedAt
            }

        db.pendingOrderDao().getPending()
            .filter { it.clientId == clientId }
            .forEach { order ->
                if (lastOrder == null || order.createdAt > lastOrder!!) lastOrder = order.createdAt
            }

        return ClientActivityDates(lastVisitAt = lastVisit, lastOrderAt = lastOrder)
    }

    suspend fun getLines(): List<LineDto> = api.getLines()

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
        address: String,
        latitude: Double?,
        longitude: Double?,
        photoUri: Uri?,
        distributorId: String?,
        lineCode: String,
    ): CreateClientResult {
        val photoUrl = photoUri?.let { uploadClientPhoto(it) }
        val created = api.createClient(
            CreateClientRequest(
                name = name.trim(),
                inn = inn?.trim()?.ifBlank { null },
                phone = phone?.trim()?.ifBlank { null },
                address = address.trim(),
                latitude = latitude,
                longitude = longitude,
                photoUrl = photoUrl,
                distributorId = distributorId,
                lineCode = lineCode,
            ),
        )
        val pendingRequest = created.status == "pending" || created.code.isNullOrBlank()
        if (!pendingRequest) {
            val entity = created.toEntity()
            db.clientDao().insertAll(listOf(entity))
        }
        return CreateClientResult(pendingRequest = pendingRequest)
    }

    suspend fun updateClientLocation(
        clientId: String,
        latitude: Double,
        longitude: Double,
    ): UpdateClientResult {
        val updated = api.updateClient(
            clientId,
            UpdateClientLocationRequest(latitude = latitude, longitude = longitude),
        )
        val pendingRequest = updated.status == "pending" || updated.code.isNullOrBlank()
        if (pendingRequest) {
            return UpdateClientResult(client = null, pendingRequest = true)
        }
        val entity = updated.toEntity()
        db.clientDao().insertAll(listOf(entity))
        return UpdateClientResult(client = entity.toDomain(), pendingRequest = false)
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

    private fun parseApiDate(value: Any?): Long? {
        when (value) {
            null -> return null
            is Number -> return value.toLong()
            is String -> {
                val patterns = listOf(
                    "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
                    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                    "yyyy-MM-dd'T'HH:mm:ssXXX",
                    "yyyy-MM-dd'T'HH:mm:ss'Z'",
                    "yyyy-MM-dd",
                )
                for (pattern in patterns) {
                    try {
                        val sdf = SimpleDateFormat(pattern, Locale.US).apply {
                            timeZone = TimeZone.getTimeZone("UTC")
                        }
                        return sdf.parse(value)?.time
                    } catch (_: Exception) { }
                }
            }
        }
        return null
    }

    private fun ClientDto.toEntity() = ClientEntity(
        id = id, code = code.orEmpty(), name = name, address = address,
        // API: balance (signed) yoki debt (musbat) — ro‘yxatda qarz ko‘rinsin
        balance = when {
            kotlin.math.abs(balance) > 0.005 -> balance
            debt > 0.005 -> -debt
            else -> 0.0
        },
        latitude = latitude, longitude = longitude,
        photoUrl = photoUrl,
        phone = phone, category = category, territory = territory,
        lineCode = lineCode, priceCategory = priceCategory, contactPerson = contactPerson,
    )
}
