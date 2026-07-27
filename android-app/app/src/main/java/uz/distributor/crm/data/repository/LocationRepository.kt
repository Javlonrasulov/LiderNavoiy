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
import java.util.Date
import java.util.Locale
import java.util.TimeZone
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

    suspend fun saveLocation(point: LocationPoint): Long =
        db.pendingLocationDao().insert(point.toEntity(deviceId))

    /**
     * Har nuqta: 1) Room ga yo‘l tarixi sifatida 2) Socket jonli 3) REST.
     * Internet yo‘q / REST xato → PENDING qoladi, keyin sync.
     */
    suspend fun sendRealtime(point: LocationPoint) {
        val localId = saveLocation(point)
        trackingSocket.emitLocation(point)
        try {
            api.sendLocation(point.toDto())
            db.pendingLocationDao().updateStatus(listOf(localId), SyncStatus.SYNCED.name)
        } catch (_: Exception) {
            // PENDING — internet qaytganda syncPendingLocations / WorkManager
        }
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
        } catch (_: Exception) {
            db.pendingLocationDao().updateStatus(ids, SyncStatus.PENDING.name)
            0
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
