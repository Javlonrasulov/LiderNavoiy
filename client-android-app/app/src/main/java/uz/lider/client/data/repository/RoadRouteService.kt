package uz.lider.client.data.repository

import com.google.gson.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.abs
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
 * Driving route along roads via public OSRM (OpenStreetMap).
 * Supports multi-stop: courier → stop1 → stop2 → … → client.
 */
@Singleton
class RoadRouteService @Inject constructor() {

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
    ): RoadRoute? = fetchDrivingRoute(
        fromLat = fromLat,
        fromLng = fromLng,
        waypoints = listOf(LatLngPoint(toLat, toLng)),
    )

    /**
     * @param waypoints ketma-ket manzillar (1-chi mijoz … oxirgi = siz).
     * Marshrut: courier → waypoints[0] → … → waypoints.last
     */
    suspend fun fetchDrivingRoute(
        fromLat: Double,
        fromLng: Double,
        waypoints: List<LatLngPoint>,
    ): RoadRoute? = withContext(Dispatchers.IO) {
        if (!isValid(fromLat, fromLng)) return@withContext null
        val stops = waypoints.filter { isValid(it.latitude, it.longitude) }
        if (stops.isEmpty()) return@withContext null

        // Emulator / noto‘g‘ri GPS — okean bo‘ylab marshrut so‘ramaslik
        val dest = stops.last()
        val straightKm = haversineM(fromLat, fromLng, dest.latitude, dest.longitude) / 1000.0
        if (straightKm > 120.0) return@withContext null

        // Cache — mutex; OSRM so‘rovlari parallel (jonli GPS kutmasin).
        mutex.withLock {
            cached?.takeIf { it.matches(fromLat, fromLng, stops) }?.route
        }?.let { return@withContext it }

        // Multi-stop muvaffaqiyatsiz bo‘lsa — oyog‘ma-oyoq stitch; u ham bo‘lmasa null
        // (UI to‘g‘ri chiziq chizmasin, eski yo‘lni saqlasin).
        val resolved = fetchDrivingRouteOsrm(fromLat, fromLng, stops)
            ?: stitchLegs(fromLat, fromLng, stops)

        if (resolved != null) {
            mutex.withLock {
                cached = CachedRoute(fromLat, fromLng, stops, resolved)
            }
        }
        resolved
    }

    /**
     * Bitta OSRM so‘rovi (ko‘p waypoint) ishlamasa — har bir stop uchun alohida leg.
     * Shunda SofIn kabi 5–6 tochka yo‘qolib, to‘g‘ridan magazin chizilmaydi.
     */
    private fun stitchLegs(
        fromLat: Double,
        fromLng: Double,
        stops: List<LatLngPoint>,
    ): RoadRoute? {
        if (stops.size <= 1) return null
        var curLat = fromLat
        var curLng = fromLng
        val points = ArrayList<LatLngPoint>()
        var distanceKm = 0.0
        var durationMinutes = 0
        for (stop in stops) {
            val leg = fetchDrivingRouteOsrm(curLat, curLng, listOf(stop)) ?: return null
            if (points.isEmpty()) {
                points.addAll(leg.points)
            } else if (leg.points.size >= 2) {
                points.addAll(leg.points.drop(1))
            }
            distanceKm += leg.distanceKm
            durationMinutes += leg.durationMinutes
            curLat = stop.latitude
            curLng = stop.longitude
        }
        if (points.size < 2 || distanceKm > 250.0) return null
        return RoadRoute(
            points = points,
            distanceKm = distanceKm,
            durationMinutes = durationMinutes.coerceAtLeast(1),
        )
    }

    private fun fetchDrivingRouteOsrm(
        fromLat: Double,
        fromLng: Double,
        stops: List<LatLngPoint>,
    ): RoadRoute? {
        val coords = buildString {
            append("$fromLng,$fromLat")
            stops.forEach { append(";${it.longitude},${it.latitude}") }
        }
        val urls = listOf(
            "https://router.project-osrm.org/route/v1/driving/$coords?overview=full&geometries=geojson&steps=false",
            "https://routing.openstreetmap.de/routed-car/route/v1/driving/$coords?overview=full&geometries=geojson&steps=false",
        )
        for (url in urls) {
            val route = try {
                val request = Request.Builder()
                    .url(url)
                    .header("User-Agent", "LiderNavoiyClient/1.0 (delivery-tracking)")
                    .get()
                    .build()
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@use null
                    val body = response.body?.string() ?: return@use null
                    parseOsrm(body)
                }
            } catch (_: Exception) {
                null
            }
            if (route != null) return route
        }
        return null
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
            val lng = arr[0].asDouble
            val lat = arr[1].asDouble
            points.add(LatLngPoint(lat, lng))
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
        val waypoints: List<LatLngPoint>,
        val route: RoadRoute,
    ) {
        fun matches(fLat: Double, fLng: Double, stops: List<LatLngPoint>): Boolean {
            // GPS shovqiniga chidam — kamroq OSRM so‘rovi
            if (haversineM(fromLat, fromLng, fLat, fLng) >= 80.0) return false
            if (waypoints.size != stops.size) return false
            return waypoints.indices.all { i ->
                haversineM(
                    waypoints[i].latitude, waypoints[i].longitude,
                    stops[i].latitude, stops[i].longitude,
                ) < 40.0
            }
        }
    }

    companion object {
        fun haversineM(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
            val r = 6371000.0
            val dLat = Math.toRadians(lat2 - lat1)
            val dLng = Math.toRadians(lng2 - lng1)
            val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLng / 2) * sin(dLng / 2)
            return 2 * r * atan2(sqrt(a), sqrt(1 - a))
        }

        fun approxEqual(a: Double, b: Double, eps: Double = 1e-4): Boolean = abs(a - b) < eps

        /**
         * @param untilYouOnly true — faqat sizgacha (bitta buyurtma tracking).
         * false — kuryerning barcha manzillari (flot xarita: raqamli markerlar bilan mos).
         */
        fun waypointsUntilYou(
            routeStops: List<uz.lider.client.domain.model.RouteStopInfo>,
            deliveryLat: Double,
            deliveryLng: Double,
            untilYouOnly: Boolean = true,
        ): List<LatLngPoint> {
            val sorted = routeStops.sortedBy { it.sequence }
            if (sorted.isEmpty()) {
                return listOf(LatLngPoint(deliveryLat, deliveryLng))
            }
            val youIdx = sorted.indexOfFirst { it.isYou }.let { if (it < 0) sorted.lastIndex else it }
            val selected = if (untilYouOnly) sorted.take(youIdx + 1) else sorted
            val points = selected.mapNotNull { stop ->
                val lat = stop.latitude
                val lng = stop.longitude
                if (lat == null || lng == null) return@mapNotNull null
                if (lat == 0.0 && lng == 0.0) return@mapNotNull null
                LatLngPoint(lat, lng)
            }.toMutableList()
            if (points.isEmpty()) {
                points.add(LatLngPoint(deliveryLat, deliveryLng))
            } else {
                val youStop = selected.firstOrNull { it.isYou }
                val youLat = youStop?.latitude
                val youLng = youStop?.longitude
                val shopNearYouStop = youLat != null && youLng != null &&
                    haversineM(youLat, youLng, deliveryLat, deliveryLng) <= 40.0
                if (!shopNearYouStop) {
                    // «Siz» stop coords yetishmasa — delivery ni to‘g‘ri o‘ringa qo‘y
                    if (untilYouOnly && selected.lastOrNull()?.isYou == true) {
                        points[points.lastIndex] = LatLngPoint(deliveryLat, deliveryLng)
                    } else if (youIdx in selected.indices) {
                        val insertAt = selected.take(youIdx + 1).count { s ->
                            s.latitude != null && s.longitude != null &&
                                !(s.latitude == 0.0 && s.longitude == 0.0)
                        }.coerceAtMost(points.size)
                        if (insertAt > 0 && insertAt <= points.size) {
                            points[insertAt - 1] = LatLngPoint(deliveryLat, deliveryLng)
                        } else {
                            points.add(LatLngPoint(deliveryLat, deliveryLng))
                        }
                    } else {
                        points.add(LatLngPoint(deliveryLat, deliveryLng))
                    }
                }
            }
            // Juda yaqin ketma-ket nuqtalarni siqish (OSRM limit)
            return dedupeClose(points, minGapM = 30.0)
        }

        private fun dedupeClose(points: List<LatLngPoint>, minGapM: Double): List<LatLngPoint> {
            if (points.size <= 1) return points
            val out = mutableListOf(points.first())
            for (i in 1 until points.size) {
                val prev = out.last()
                val cur = points[i]
                val isLast = i == points.lastIndex
                if (isLast || haversineM(prev.latitude, prev.longitude, cur.latitude, cur.longitude) >= minGapM) {
                    out.add(cur)
                }
            }
            return out
        }

        /** OSRM ishlamasa — kuryer → manzillar bo‘ylab chiziq (yo‘l yo‘qolmasin). */
        fun fallbackViaWaypoints(
            fromLat: Double,
            fromLng: Double,
            waypoints: List<LatLngPoint>,
        ): List<LatLngPoint> {
            val pts = ArrayList<LatLngPoint>(waypoints.size + 1)
            pts.add(LatLngPoint(fromLat, fromLng))
            waypoints.forEach { pts.add(it) }
            return dedupeClose(pts, minGapM = 15.0)
        }
    }
}
