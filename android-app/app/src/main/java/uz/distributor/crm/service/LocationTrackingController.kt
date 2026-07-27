package uz.distributor.crm.service

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import uz.distributor.crm.data.location.DeviceLocationProvider
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Login / sessiyani tiklash / GPS ruxsatidan keyin kuzatuvni ishga tushirish.
 */
@Singleton
class LocationTrackingController @Inject constructor(
    @ApplicationContext private val context: Context,
    private val deviceLocationProvider: DeviceLocationProvider,
) {
    fun startIfReady() {
        if (!deviceLocationProvider.isReadyForTracking()) return
        val intent = Intent(context, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_START
        }
        runCatching {
            ContextCompat.startForegroundService(context, intent)
        }
        LocationSyncWorker.enqueue(context)
        LocationSyncWorker.enqueueImmediate(context)
    }

    fun stop() {
        val intent = Intent(context, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_STOP
        }
        runCatching { context.startService(intent) }
    }
}
