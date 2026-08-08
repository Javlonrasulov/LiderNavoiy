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

/** Dostavkachi yo‘nalish tartibi o‘zgardi — tracking qayta yuklansin. */
data class CourierRouteEvent(
    val distributorId: String,
    val orderIds: List<String> = emptyList(),
    val updatedAt: String? = null,
)

@Singleton
class TrackingSocketManager @Inject constructor(
    private val tokenHolder: TokenHolder,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var socket: Socket? = null
    private val watchingIds = linkedSetOf<String>()

    private val _locations = MutableSharedFlow<CourierLocationEvent>(extraBufferCapacity = 64)
    val locations: SharedFlow<CourierLocationEvent> = _locations.asSharedFlow()

    private val _routeChanges = MutableSharedFlow<CourierRouteEvent>(extraBufferCapacity = 16)
    val routeChanges: SharedFlow<CourierRouteEvent> = _routeChanges.asSharedFlow()

    /** Bitta kuryerni kuzatishga qo‘shadi (mavjud watchlarni o‘chirmaydi). */
    fun watchCourier(distributorId: String) {
        if (distributorId.isBlank()) return
        synchronized(watchingIds) {
            watchingIds.add(distributorId)
        }
        connectAndWatch()
    }

    fun watchCouriers(distributorIds: Collection<String>) {
        val next = distributorIds.map { it.trim() }.filter { it.isNotEmpty() }.toSet()
        synchronized(watchingIds) {
            // Dashboard to‘liq ro‘yxat beradi — lekin bo‘sh bo‘lsa socketni o‘chirmaymiz
            // (boshqa ekran watch qilgan bo‘lishi mumkin). Faqat yangi to‘plamni merge.
            if (next.isEmpty()) return
            watchingIds.clear()
            watchingIds.addAll(next)
        }
        connectAndWatch()
    }

    fun unwatch() {
        val ids = synchronized(watchingIds) {
            watchingIds.toList().also { watchingIds.clear() }
        }
        scope.launch {
            if (socket?.connected() == true) {
                ids.forEach { id ->
                    socket?.emit("unwatch:courier", JSONObject().put("distributorId", id))
                }
            }
            // Socketni uzmaymiz — boshqa ekran (Asosiy) jonli GPS ni yo‘qotmasin.
            // To‘liq uzish faqat [disconnect].
        }
    }

    /** Logout / ViewModel tozalash — socketni butunlay yopish. */
    fun disconnect() {
        val ids = synchronized(watchingIds) {
            watchingIds.toList().also { watchingIds.clear() }
        }
        scope.launch {
            if (socket?.connected() == true) {
                ids.forEach { id ->
                    socket?.emit("unwatch:courier", JSONObject().put("distributorId", id))
                }
            }
            disconnectInternal()
        }
    }

    private fun snapshotWatching(): List<String> =
        synchronized(watchingIds) { watchingIds.toList() }

    private fun connectAndWatch() {
        scope.launch {
            val token = tokenHolder.getToken()
            val targets = snapshotWatching()
            if (token.isNullOrBlank() || targets.isEmpty()) return@launch

            if (socket?.connected() == true) {
                emitWatchAll(targets)
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
                    reconnectionDelayMax = 5_000
                    transports = arrayOf("websocket")
                    auth = mapOf("token" to token)
                }
                socket = IO.socket("$base/tracking", options).apply {
                    on(Socket.EVENT_CONNECT) {
                        Log.d(TAG, "Tracking connected")
                        emitWatchAll(snapshotWatching())
                    }
                    on("reconnect") {
                        Log.d(TAG, "Tracking reconnected")
                        emitWatchAll(snapshotWatching())
                    }
                    on(Socket.EVENT_DISCONNECT) {
                        Log.d(TAG, "Tracking disconnected")
                    }
                    on("courier:location") { args ->
                        parseLocation(args)?.let { event ->
                            val watching = snapshotWatching()
                            if (watching.isEmpty() || event.distributorId in watching) {
                                scope.launch { _locations.emit(event) }
                            }
                        }
                    }
                    on("courier:route") { args ->
                        parseRoute(args)?.let { event ->
                            val watching = snapshotWatching()
                            if (watching.isEmpty() || event.distributorId in watching) {
                                scope.launch { _routeChanges.emit(event) }
                            }
                        }
                    }
                }
                socket?.connect()
            } catch (e: Exception) {
                Log.e(TAG, "Tracking socket failed", e)
            }
        }
    }

    private fun emitWatchAll(ids: List<String>) {
        ids.forEach { id ->
            socket?.emit("watch:courier", JSONObject().put("distributorId", id))
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

    private fun parseRoute(args: Array<out Any>): CourierRouteEvent? {
        if (args.isEmpty()) return null
        return try {
            val root = args[0] as? JSONObject ?: return null
            val id = root.optString("distributorId").ifBlank { return null }
            val ids = mutableListOf<String>()
            val arr = root.optJSONArray("orderIds")
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    arr.optString(i).takeIf { it.isNotBlank() }?.let { ids.add(it) }
                }
            }
            CourierRouteEvent(
                distributorId = id,
                orderIds = ids,
                updatedAt = root.optString("updatedAt").ifBlank { null },
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
