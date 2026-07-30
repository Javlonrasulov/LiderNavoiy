package uz.distributor.crm.map

import com.google.gson.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

data class LatLngPoint(
    val latitude: Double,
    val longitude: Double,
)

data class RoadRoute(
    val points: List<LatLngPoint>,
    val distanceKm: Double,
    val durationMinutes: Int,
)

/**
 * Yo‘l bo‘ylab marshrut — OSRM (OpenStreetMap), admin/OSM bilan bir xil.
 */
object RoadRouteService {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    private val mutex = Mutex()
    private var cached: CachedRoute? = null

    suspend fun fetchDrivingRoute(
        fromLat: Double,
        fromLng: Double,
        toLat: Double,
        toLng: Double,
    ): RoadRoute? = withContext(Dispatchers.IO) {
        if (!isValid(fromLat, fromLng) || !isValid(toLat, toLng)) return@withContext null
        val straightKm = haversineM(fromLat, fromLng, toLat, toLng) / 1000.0
        if (straightKm > 120.0) return@withContext null

        mutex.withLock {
            cached?.takeIf { it.matches(fromLat, fromLng, toLat, toLng) }?.route
                ?.let { return@withContext it }
        }

        val url =
            "https://router.project-osrm.org/route/v1/driving/" +
                "$fromLng,$fromLat;$toLng,$toLat" +
                "?overview=full&geometries=geojson&steps=false"

        val route = try {
            client.newCall(Request.Builder().url(url).get().build()).execute().use { response ->
                if (!response.isSuccessful) return@use null
                val body = response.body?.string() ?: return@use null
                parseOsrm(body)
            }
        } catch (_: Exception) {
            null
        }

        if (route != null) {
            mutex.withLock {
                cached = CachedRoute(fromLat, fromLng, toLat, toLng, route)
            }
        }
        route
    }

    private fun parseOsrm(json: String): RoadRoute? {
        val root = JsonParser.parseString(json).asJsonObject
        if (root.get("code")?.asString != "Ok") return null
        val routes = root.getAsJsonArray("routes") ?: return null
        if (routes.size() == 0) return null
        val first = routes[0].asJsonObject
        val distanceM = first.get("distance")?.asDouble ?: return null
        val durationS = first.get("duration")?.asDouble ?: 0.0
        val coords = first.getAsJsonObject("geometry")
            ?.getAsJsonArray("coordinates")
            ?: return null
        val points = ArrayList<LatLngPoint>(coords.size())
        for (el in coords) {
            val arr = el.asJsonArray
            points.add(LatLngPoint(arr[1].asDouble, arr[0].asDouble))
        }
        if (points.size < 2) return null
        return RoadRoute(
            points = points,
            distanceKm = distanceM / 1000.0,
            durationMinutes = (durationS / 60.0).toInt().coerceAtLeast(1),
        ).takeIf { it.distanceKm <= 250.0 }
    }

    private fun isValid(lat: Double, lng: Double): Boolean =
        lat in -90.0..90.0 && lng in -180.0..180.0 && !(lat == 0.0 && lng == 0.0)

    private data class CachedRoute(
        val fromLat: Double,
        val fromLng: Double,
        val toLat: Double,
        val toLng: Double,
        val route: RoadRoute,
    ) {
        fun matches(fLat: Double, fLng: Double, tLat: Double, tLng: Double): Boolean =
            haversineM(fromLat, fromLng, fLat, fLng) < 30.0 &&
                haversineM(toLat, toLng, tLat, tLng) < 30.0
    }

    fun haversineM(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val r = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
            cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
            sin(dLng / 2) * sin(dLng / 2)
        return 2 * r * atan2(sqrt(a), sqrt(1 - a))
    }
}
