package uz.distributor.crm.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import uz.distributor.crm.R
import uz.distributor.crm.data.local.AgentLocationHolder
import uz.distributor.crm.data.remote.TrackingSocketManager
import uz.distributor.crm.data.repository.LocationRepository
import uz.distributor.crm.domain.model.LocationPoint
import uz.distributor.crm.presentation.MainActivity
import javax.inject.Inject
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

@AndroidEntryPoint
class LocationTrackingService : Service() {

    @Inject lateinit var locationRepository: LocationRepository
    @Inject lateinit var agentLocationHolder: AgentLocationHolder
    @Inject lateinit var trackingSocket: TrackingSocketManager

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var fusedClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback

    private var lastSentLat = Double.NaN
    private var lastSentLng = Double.NaN
    private var lastSentAtMs = 0L

    companion object {
        const val CHANNEL_ID = "location_tracking_v2"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "START_TRACKING"
        const val ACTION_STOP = "STOP_TRACKING"
        /** Yandex Taxi uslubi — tez, aniq GPS */
        const val INTERVAL_MS = 3_000L
        const val MIN_INTERVAL_MS = 1_500L
        const val MIN_DISTANCE_M = 3f
        const val MAX_ACCURACY_M = 80f
        /** Bir joyda turganda spam qilmaslik */
        const val STATIONARY_SKIP_M = 2.5
        const val STATIONARY_MIN_RESEND_MS = 12_000L
    }

    override fun onCreate() {
        super.onCreate()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
        setupLocationCallback()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopTracking()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    stopForeground(STOP_FOREGROUND_REMOVE)
                }
                stopSelf()
            }
            else -> startTracking()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopTracking()
        scope.cancel()
        super.onDestroy()
    }

    private fun startTracking() {
        dismissStaleNotifications()
        trackingSocket.connect()

        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            @Suppress("DEPRECATION")
            startForeground(NOTIFICATION_ID, notification)
        }

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
            .setMinUpdateIntervalMillis(MIN_INTERVAL_MS)
            .setMinUpdateDistanceMeters(MIN_DISTANCE_M)
            .setWaitForAccurateLocation(false)
            // Batch qilmasin — mijozda sakrash bo‘lmasin
            .setMaxUpdateDelayMillis(INTERVAL_MS)
            .build()

        try {
            fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
        } catch (_: SecurityException) {
            stopSelf()
            return
        }
        // Online TTL — TrackingSocketManager presence ping (30s).
        // Eski joyni qayta location:update qilib yubormaymiz (mijozni bloklaydi).
    }

    private fun stopTracking() {
        runCatching { fusedClient.removeLocationUpdates(locationCallback) }
        getSystemService(NotificationManager::class.java).cancel(NOTIFICATION_ID)
    }

    private fun dismissStaleNotifications() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.cancel(NOTIFICATION_ID)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.deleteNotificationChannel("location_tracking")
            nm.deleteNotificationChannel("location_tracking_silent")
        }
    }

    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val loc = result.locations
                    .filter { it.hasAccuracy() }
                    .minByOrNull { it.accuracy }
                    ?: result.lastLocation
                    ?: return

                if (loc.hasAccuracy() &&
                    loc.accuracy > MAX_ACCURACY_M &&
                    agentLocationHolder.location.value != null
                ) {
                    return
                }

                val now = System.currentTimeMillis()
                // Wall-clock — heartbeat/eski loc.time mijozni chalkashtirmasin
                val point = LocationPoint(
                    latitude = loc.latitude,
                    longitude = loc.longitude,
                    speed = if (loc.hasSpeed()) loc.speed else null,
                    accuracy = if (loc.hasAccuracy()) loc.accuracy else null,
                    altitude = if (loc.hasAltitude()) loc.altitude else null,
                    bearing = if (loc.hasBearing()) loc.bearing else null,
                    recordedAt = now,
                )
                agentLocationHolder.update(point)

                if (!lastSentLat.isNaN()) {
                    val moved = haversineM(lastSentLat, lastSentLng, point.latitude, point.longitude)
                    if (moved < STATIONARY_SKIP_M && now - lastSentAtMs < STATIONARY_MIN_RESEND_MS) {
                        return
                    }
                }

                lastSentLat = point.latitude
                lastSentLng = point.longitude
                lastSentAtMs = now
                scope.launch {
                    locationRepository.sendRealtime(point)
                }
            }
        }
    }

    private fun haversineM(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val r = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
            cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
            sin(dLng / 2) * sin(dLng / 2)
        return 2 * r * atan2(sqrt(a), sqrt(1 - a))
    }

    private fun buildNotification(): Notification {
        val intent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.app_name))
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(intent)
            .setOngoing(true)
            .setSilent(true)
            .setShowWhen(false)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.channel_location),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = getString(R.string.channel_location_desc)
            setShowBadge(false)
            enableLights(false)
            enableVibration(false)
            setSound(null, null)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
}
