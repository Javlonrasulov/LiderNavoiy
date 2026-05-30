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
import com.google.android.gms.location.*
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import uz.distributor.crm.R
import uz.distributor.crm.data.local.AgentLocationHolder
import uz.distributor.crm.data.repository.LocationRepository
import uz.distributor.crm.domain.model.LocationPoint
import uz.distributor.crm.presentation.MainActivity
import javax.inject.Inject

@AndroidEntryPoint
class LocationTrackingService : Service() {

    @Inject lateinit var locationRepository: LocationRepository
    @Inject lateinit var agentLocationHolder: AgentLocationHolder

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var fusedClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback

    companion object {
        /** Yangi kanal — IMPORTANCE_MIN (eski kanal o‘zgarmaydi) */
        const val CHANNEL_ID = "location_tracking_silent"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "START_TRACKING"
        const val ACTION_STOP = "STOP_TRACKING"
        const val INTERVAL_MS = 2_000L
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

        // Android FGS: avval qisqa foreground, keyin bildirishnomani olib tashlash (GPS davom etadi)
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            @Suppress("DEPRECATION")
            startForeground(NOTIFICATION_ID, notification)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_DETACH)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
            .setMinUpdateIntervalMillis(INTERVAL_MS)
            .setWaitForAccurateLocation(false)
            .setMaxUpdateDelayMillis(INTERVAL_MS * 2)
            .build()

        try {
            fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
        } catch (e: SecurityException) {
            stopSelf()
        }
    }

    private fun stopTracking() {
        fusedClient.removeLocationUpdates(locationCallback)
        getSystemService(NotificationManager::class.java).cancel(NOTIFICATION_ID)
    }

    /** Eski APK dagi «GPS kuzatuv faol» bildirishnomasini tozalash */
    private fun dismissStaleNotifications() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.cancel(NOTIFICATION_ID)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.deleteNotificationChannel("location_tracking")
        }
    }

    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { loc ->
                    val point = LocationPoint(
                        latitude = loc.latitude,
                        longitude = loc.longitude,
                        speed = if (loc.hasSpeed()) loc.speed else null,
                        accuracy = if (loc.hasAccuracy()) loc.accuracy else null,
                        altitude = if (loc.hasAltitude()) loc.altitude else null,
                        bearing = if (loc.hasBearing()) loc.bearing else null,
                        recordedAt = loc.time,
                    )
                    agentLocationHolder.update(point)
                    scope.launch {
                        locationRepository.sendRealtime(point)
                    }
                }
            }
        }
    }

    private fun buildNotification(): Notification {
        val intent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(" ")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentIntent(intent)
            .setOngoing(true)
            .setSilent(true)
            .setShowWhen(false)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setVisibility(NotificationCompat.VISIBILITY_SECRET)
            .build()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.channel_location),
            NotificationManager.IMPORTANCE_MIN,
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
