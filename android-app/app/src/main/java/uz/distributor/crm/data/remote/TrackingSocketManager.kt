package uz.distributor.crm.data.remote

import android.util.Log
import com.google.gson.Gson
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import uz.distributor.crm.BuildConfig
import uz.distributor.crm.data.local.TokenHolder
import uz.distributor.crm.domain.model.LocationPoint
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TrackingSocketManager @Inject constructor(
    private val tokenHolder: TokenHolder,
    private val gson: Gson,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var socket: Socket? = null
    @Volatile private var connected = false

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
                    reconnectionDelay = 2_000
                    auth = mapOf("token" to token)
                }
                val url = BuildConfig.WS_BASE_URL.trimEnd('/')
                socket = IO.socket(url, options).apply {
                    on(Socket.EVENT_CONNECT) {
                        connected = true
                        Log.d(TAG, "Socket connected")
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
        if (socket?.connected() != true) {
            connect()
            return
        }
        try {
            val payload = gson.toJson(
                mapOf(
                    "latitude" to point.latitude,
                    "longitude" to point.longitude,
                    "speed" to point.speed,
                    "accuracy" to point.accuracy,
                    "altitude" to point.altitude,
                    "bearing" to point.bearing,
                    "recordedAt" to java.text.SimpleDateFormat(
                        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                        java.util.Locale.US,
                    ).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
                        .format(java.util.Date(point.recordedAt)),
                    "deviceId" to point.deviceId,
                ),
            )
            socket?.emit("location:update", org.json.JSONObject(payload))
        } catch (e: Exception) {
            Log.w(TAG, "emit location failed", e)
        }
    }

    fun disconnect() {
        scope.launch { disconnectInternal() }
    }

    private fun disconnectInternal() {
        connected = false
        socket?.off()
        socket?.disconnect()
        socket = null
    }

    companion object {
        private const val TAG = "TrackingSocket"
    }
}
