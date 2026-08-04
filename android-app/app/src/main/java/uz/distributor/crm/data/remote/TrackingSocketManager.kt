package uz.distributor.crm.data.remote

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONObject
import uz.distributor.crm.BuildConfig
import uz.distributor.crm.data.local.TokenHolder
import uz.distributor.crm.domain.model.LocationPoint
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TrackingSocketManager @Inject constructor(
    private val tokenHolder: TokenHolder,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var socket: Socket? = null
    private var presenceJob: Job? = null
    @Volatile private var connected = false
    @Volatile private var pendingPoint: LocationPoint? = null

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    fun connect() {
        scope.launch {
            val token = tokenHolder.getToken()
            if (token.isNullOrBlank()) return@launch
            if (connected && socket?.connected() == true) return@launch

            disconnectInternal()

            try {
                val options = IO.Options().apply {
                    forceNew = true
                    reconnection = true
                    reconnectionAttempts = Int.MAX_VALUE
                    reconnectionDelay = 1_000
                    reconnectionDelayMax = 5_000
                    transports = arrayOf("websocket")
                    auth = mapOf("token" to token)
                }
                val url = BuildConfig.WS_BASE_URL.trimEnd('/')
                socket = IO.socket(url, options).apply {
                    on(Socket.EVENT_CONNECT) {
                        connected = true
                        Log.d(TAG, "Socket connected")
                        emitPresencePing()
                        startPresenceLoop()
                        pendingPoint?.let { flushPending(it) }
                    }
                    on("reconnect") {
                        connected = true
                        Log.d(TAG, "Socket reconnected")
                        emitPresencePing()
                        startPresenceLoop()
                        pendingPoint?.let { flushPending(it) }
                    }
                    on(Socket.EVENT_DISCONNECT) {
                        connected = false
                        Log.d(TAG, "Socket disconnected")
                    }
                    on(Socket.EVENT_CONNECT_ERROR) { args ->
                        Log.w(TAG, "Socket connect error: ${args.firstOrNull()}")
                    }
                }
                socket?.connect()
            } catch (e: Exception) {
                Log.e(TAG, "Socket setup failed", e)
            }
        }
    }

    fun emitLocation(point: LocationPoint) {
        pendingPoint = point
        if (socket?.connected() != true) {
            connect()
            return
        }
        flushPending(point)
    }

    private fun startPresenceLoop() {
        presenceJob?.cancel()
        presenceJob = scope.launch {
            while (isActive) {
                delay(PRESENCE_INTERVAL_MS)
                if (socket?.connected() == true) emitPresencePing()
            }
        }
    }

    private fun emitPresencePing() {
        try {
            socket?.emit("presence:ping", JSONObject())
        } catch (e: Exception) {
            Log.w(TAG, "presence ping failed", e)
        }
    }

    private fun flushPending(point: LocationPoint) {
        try {
            val payload = JSONObject().apply {
                put("latitude", point.latitude)
                put("longitude", point.longitude)
                put("recordedAt", isoFormat.format(Date(point.recordedAt)))
                point.speed?.let { put("speed", it) }
                point.accuracy?.let { put("accuracy", it) }
                point.altitude?.let { put("altitude", it) }
                point.bearing?.let { put("bearing", it) }
                point.deviceId?.let { put("deviceId", it) }
            }
            socket?.emit("location:update", payload)
            pendingPoint = null
        } catch (e: Exception) {
            Log.w(TAG, "emit location failed", e)
        }
    }

    fun disconnect() {
        scope.launch { disconnectInternal() }
    }

    private fun disconnectInternal() {
        presenceJob?.cancel()
        presenceJob = null
        connected = false
        socket?.off()
        socket?.disconnect()
        socket = null
    }

    companion object {
        private const val TAG = "TrackingSocket"
        private const val PRESENCE_INTERVAL_MS = 30_000L
    }
}
