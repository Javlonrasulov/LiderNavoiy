package uz.lider.client.data.remote

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import uz.lider.client.BuildConfig
import uz.lider.client.data.local.TokenHolder
import javax.inject.Inject
import javax.inject.Singleton

data class CourierLocationEvent(
    val distributorId: String,
    val latitude: Double,
    val longitude: Double,
    val speed: Double? = null,
    val bearing: Double? = null,
    val accuracy: Double? = null,
    val recordedAt: String? = null,
)

@Singleton
class TrackingSocketManager @Inject constructor(
    private val tokenHolder: TokenHolder,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var socket: Socket? = null
    @Volatile private var watchingId: String? = null

    private val _locations = MutableSharedFlow<CourierLocationEvent>(extraBufferCapacity = 64)
    val locations: SharedFlow<CourierLocationEvent> = _locations.asSharedFlow()

    fun watchCourier(distributorId: String) {
        if (distributorId.isBlank()) return
        watchingId = distributorId
        connectAndWatch()
    }

    fun unwatch() {
        val id = watchingId
        watchingId = null
        scope.launch {
            if (id != null && socket?.connected() == true) {
                socket?.emit("unwatch:courier", JSONObject().put("distributorId", id))
            }
            disconnectInternal()
        }
    }

    private fun connectAndWatch() {
        scope.launch {
            val token = tokenHolder.getToken()
            val target = watchingId
            if (token.isNullOrBlank() || target.isNullOrBlank()) return@launch

            if (socket?.connected() == true) {
                socket?.emit("watch:courier", JSONObject().put("distributorId", target))
                return@launch
            }

            disconnectInternal()
            try {
                val base = BuildConfig.WS_BASE_URL.trimEnd('/')
                val options = IO.Options().apply {
                    forceNew = true
                    reconnection = true
                    reconnectionAttempts = Int.MAX_VALUE
                    reconnectionDelay = 1_000
                    auth = mapOf("token" to token)
                }
                socket = IO.socket("$base/tracking", options).apply {
                    on(Socket.EVENT_CONNECT) {
                        Log.d(TAG, "Tracking connected")
                        watchingId?.let { id ->
                            emit("watch:courier", JSONObject().put("distributorId", id))
                        }
                    }
                    on(Socket.EVENT_DISCONNECT) {
                        Log.d(TAG, "Tracking disconnected")
                    }
                    on("courier:location") { args ->
                        parseLocation(args)?.let { event ->
                            scope.launch { _locations.emit(event) }
                        }
                    }
                }
                socket?.connect()
            } catch (e: Exception) {
                Log.e(TAG, "Tracking socket failed", e)
            }
        }
    }

    private fun parseLocation(args: Array<out Any>): CourierLocationEvent? {
        if (args.isEmpty()) return null
        return try {
            val root = args[0] as? JSONObject ?: return null
            val id = root.optString("distributorId").ifBlank { return null }
            val lat = root.optDouble("latitude", Double.NaN)
            val lng = root.optDouble("longitude", Double.NaN)
            if (!lat.isFinite() || !lng.isFinite()) return null
            CourierLocationEvent(
                distributorId = id,
                latitude = lat,
                longitude = lng,
                speed = root.optDouble("speed").takeIf { root.has("speed") && !it.isNaN() },
                bearing = root.optDouble("bearing").takeIf { root.has("bearing") && !it.isNaN() },
                accuracy = root.optDouble("accuracy").takeIf { root.has("accuracy") && !it.isNaN() },
                recordedAt = root.optString("recordedAt").ifBlank { null },
            )
        } catch (_: Exception) {
            null
        }
    }

    private fun disconnectInternal() {
        socket?.off()
        socket?.disconnect()
        socket = null
    }

    companion object {
        private const val TAG = "ClientTrackingSocket"
    }
}
