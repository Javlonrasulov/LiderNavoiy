package uz.lider.client.map

import uz.lider.client.data.repository.LatLngPoint
import uz.lider.client.data.repository.RoadRouteService
import uz.lider.client.domain.model.RouteStopInfo

/**
 * Marshrutdan o‘tib ketgan qismni kesib, faqat oldinda qolgan yo‘lni qaytaradi
 * (Yandex Taxi uslubi — ortida «ghost» chiziq qolmasin).
 */
object RouteTrim {

    fun remaining(
        courierLat: Double,
        courierLng: Double,
        route: List<LatLngPoint>,
    ): List<LatLngPoint> {
        if (route.size < 2) {
            val end = route.lastOrNull() ?: return emptyList()
            return listOf(LatLngPoint(courierLat, courierLng), end)
        }

        var bestIdx = 0
        var bestDist = Double.MAX_VALUE
        for (i in route.indices) {
            val d = RoadRouteService.haversineM(
                courierLat, courierLng, route[i].latitude, route[i].longitude,
            )
            if (d < bestDist) {
                bestDist = d
                bestIdx = i
            }
        }

        // Juda uzoqda — eski marshrutni ishlatmaslik (qayta chizish kerak)
        if (bestDist > 180.0) {
            return listOf(LatLngPoint(courierLat, courierLng), route.last())
        }

        val tail = route.drop(bestIdx).toMutableList()
        if (tail.isEmpty()) {
            return listOf(LatLngPoint(courierLat, courierLng), route.last())
        }
        // Birinchi nuqta — mashina joyi (chiziq marker bilan ulanadi)
        tail[0] = LatLngPoint(courierLat, courierLng)
        // Keyingi nuqta juda yaqin bo‘lsa — takroriy nuqtani olib tashlash
        if (tail.size >= 2) {
            val d1 = RoadRouteService.haversineM(
                tail[0].latitude, tail[0].longitude,
                tail[1].latitude, tail[1].longitude,
            )
            if (d1 < 8.0) {
                tail.removeAt(1)
            }
        }
        return if (tail.size >= 2) tail else listOf(LatLngPoint(courierLat, courierLng), route.last())
    }

    /** Eng yaqin nuqta indeksi — orqaga qaytishni aniqlash uchun. */
    fun nearestIndex(courierLat: Double, courierLng: Double, route: List<LatLngPoint>): Int {
        if (route.isEmpty()) return -1
        var bestIdx = 0
        var bestDist = Double.MAX_VALUE
        for (i in route.indices) {
            val d = RoadRouteService.haversineM(
                courierLat, courierLng, route[i].latitude, route[i].longitude,
            )
            if (d < bestDist) {
                bestDist = d
                bestIdx = i
            }
        }
        return bestIdx
    }

    /** Poliliniya uzunligi (km) — qolgan manzillar bo‘ylab masofa. */
    fun pathLengthKm(route: List<LatLngPoint>): Double {
        if (route.size < 2) return 0.0
        var sum = 0.0
        for (i in 1 until route.size) {
            sum += RoadRouteService.haversineM(
                route[i - 1].latitude, route[i - 1].longitude,
                route[i].latitude, route[i].longitude,
            )
        }
        return sum / 1000.0
    }

    fun stopsSignature(stops: List<RouteStopInfo>): String =
        stops.joinToString("|") { s ->
            "${s.sequence}:${s.isYou}:${s.latitude?.let { "%.4f".format(it) }}:${s.longitude?.let { "%.4f".format(it) }}"
        }
}
