package uz.distributor.crm.data.repository

import android.os.Build
import uz.distributor.crm.data.local.AppDatabase
import uz.distributor.crm.data.local.PendingLocationEntity
import uz.distributor.crm.data.local.SyncStatus
import uz.distributor.crm.data.local.toEntity
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.TrackingSocketManager
import uz.distributor.crm.data.remote.dto.BatchLocationRequest
import uz.distributor.crm.data.remote.dto.LocationPointDto
import uz.distributor.crm.domain.model.LocationPoint
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocationRepository @Inject constructor(
    private val db: AppDatabase,
    private val api: ApiService,
    private val trackingSocket: TrackingSocketManager,
) {
    private val deviceId = Build.MODEL + "-" + Build.ID
    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    suspend fun saveLocation(point: LocationPoint) {
        db.pendingLocationDao().insert(point.toEntity(deviceId))
    }

    suspend fun syncPendingLocations(): Int {
        val pending = db.pendingLocationDao().getPending(100)
        if (pending.isEmpty()) return 0

        val ids = pending.map { it.id }
        db.pendingLocationDao().updateStatus(ids, SyncStatus.SYNCING.name)

        return try {
            val dtos = pending.map { it.toDto() }
            val response = api.sendLocationBatch(BatchLocationRequest(dtos))
            db.pendingLocationDao().updateStatus(ids, SyncStatus.SYNCED.name)
            db.pendingLocationDao().deleteOldSynced(System.currentTimeMillis() - 7 * 86400000L)
            response.saved
        } catch (e: Exception) {
            db.pendingLocationDao().updateStatus(ids, SyncStatus.PENDING.name)
            0
        }
    }

    suspend fun sendRealtime(point: LocationPoint) {
        trackingSocket.emitLocation(point)
        try {
            api.sendLocation(point.toDto())
        } catch (_: Exception) {
            saveLocation(point)
        }
    }

    suspend fun pendingCount(): Int = db.pendingLocationDao().pendingCount()

    private fun PendingLocationEntity.toDto() = LocationPointDto(
        latitude = latitude,
        longitude = longitude,
        speed = speed,
        accuracy = accuracy,
        altitude = altitude,
        bearing = bearing,
        recordedAt = isoFormat.format(Date(recordedAt)),
        deviceId = deviceId,
    )

    private fun LocationPoint.toDto() = LocationPointDto(
        latitude = latitude,
        longitude = longitude,
        speed = speed,
        accuracy = accuracy,
        altitude = altitude,
        bearing = bearing,
        recordedAt = isoFormat.format(Date(recordedAt)),
        deviceId = deviceId,
    )
}
