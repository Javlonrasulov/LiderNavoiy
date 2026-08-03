package uz.lider.client.presentation.dashboard

import uz.lider.client.data.repository.LatLngPoint
import uz.lider.client.data.repository.RoadRouteService
import uz.lider.client.domain.model.OrderTrackingDetails
import uz.lider.client.domain.model.RouteStopInfo
import uz.lider.client.map.RouteTrim

/** One on-the-way order shown on the live map. */
data class LiveMapOrder(
    val orderId: String,
    val amount: Double,
    val distanceLabel: String,
    /** To‘liq multi-stop yo‘l (raqamli manzillar bilan). */
    val routePoints: List<LatLngPoint> = emptyList(),
    /** Faqat kuryer → magazin (yo‘l bo‘ylab) — kichik xarita / tochkalarsiz. */
    val shopRoutePoints: List<LatLngPoint> = emptyList(),
    val shopDistanceLabel: String = "",
    val deliveryLat: Double?,
    val deliveryLng: Double?,
    /** Client / magazine name for map callout. */
    val storeName: String = "",
    val tracking: OrderTrackingDetails,
)

/** Courier vehicle — may carry 1..N of this client's on-way orders. */
data class LiveMapVehicle(
    val id: String,
    val courierLat: Double,
    val courierLng: Double,
    val courierName: String,
    val courierPhone: String?,
    val orders: List<LiveMapOrder>,
    val companyId: String? = null,
    val companyShortName: String? = null,
    /** Full courier route stops (numbered 1…N), including other clients. */
    val routeStops: List<RouteStopInfo> = emptyList(),
    val stopsBeforeYou: Int = 0,
    val totalStops: Int = 0,
) {
    val orderCount: Int get() = orders.size
}

/** All live deliveries for the dashboard map. */
data class LiveFleetUi(
    val vehicles: List<LiveMapVehicle>,
) {
    val orderCount: Int get() = vehicles.sumOf { it.orders.size }
    val primaryOrderId: String? get() = vehicles.firstOrNull()?.orders?.firstOrNull()?.orderId
    val stopsBeforeYou: Int
        get() = vehicles.minOfOrNull { it.stopsBeforeYou } ?: 0
    val totalStops: Int
        get() = vehicles.maxOfOrNull { it.totalStops } ?: 0

    /** Bitta org — oddiy masofa; ko‘p org — har biri alohida. */
    val distanceLabel: String
        get() {
            val lines = orgDistanceLines()
            return when {
                lines.isEmpty() -> "—"
                lines.size == 1 -> lines.first().second
                else -> lines.joinToString(" · ") { "${it.first} ${it.second}" }
            }
        }

    /** (org shortName, "12,4 km") — fullscreen da alohida chiplar. */
    fun orgDistanceLines(shopOnlyCompanyIds: Set<String> = emptySet()): List<Pair<String, String>> =
        vehicles.map { v ->
            val name = v.companyShortName?.trim()?.takeIf { it.isNotEmpty() }
                ?: v.companyId?.trim()?.takeIf { it.isNotEmpty() }
                ?: "—"
            val shopOnly = isShopOnly(v, shopOnlyCompanyIds)
            val dist = if (shopOnly) {
                shopOnlyDistanceLabel(v)
            } else {
                viaStopsDistanceLabel(v)
            }
            name to dist
        }

    /** Bitta mashina uchun magazin-only km (popup / toggle). */
    fun shopOnlyDistanceFor(vehicle: LiveMapVehicle): String = shopOnlyDistanceLabel(vehicle)

    /** Bitta mashina uchun tochkalari bilan km. */
    fun viaStopsDistanceFor(vehicle: LiveMapVehicle): String = viaStopsDistanceLabel(vehicle)

    /** Tochklar yoqilganda: kuryer → 1 → 2 → … → magazin yo‘li. */
    private fun viaStopsDistanceLabel(vehicle: LiveMapVehicle): String {
        val order = vehicle.orders.maxByOrNull { it.routePoints.size }
            ?: vehicle.orders.firstOrNull()
            ?: return "—"
        val pathKm = RouteTrim.pathLengthKm(
            RouteTrim.remaining(
                vehicle.courierLat,
                vehicle.courierLng,
                order.routePoints,
            ),
        ).takeIf { it > 0.01 }
        if (pathKm != null) return formatDistance(pathKm)
        order.distanceLabel.takeIf { it.isNotBlank() && it != "—" }?.let { return it }
        // Label yo‘q — stop coords bo‘ylab taxmin (magazin haversine emas)
        val stops = vehicle.routeStops.ifEmpty { order.tracking.routeStops }
        if (stops.size > 1) {
            val youIdx = stops.indexOfFirst { it.isYou }.let { if (it < 0) stops.lastIndex else it }
            val untilYou = stops.sortedBy { it.sequence }.take(youIdx + 1)
            var sum = 0.0
            var prevLat = vehicle.courierLat
            var prevLng = vehicle.courierLng
            var ok = false
            for (s in untilYou) {
                val lat = s.latitude ?: continue
                val lng = s.longitude ?: continue
                if (lat == 0.0 && lng == 0.0) continue
                sum += RoadRouteService.haversineM(prevLat, prevLng, lat, lng)
                prevLat = lat
                prevLng = lng
                ok = true
            }
            if (ok && sum > 10.0) return formatDistance(sum / 1000.0)
        }
        return "—"
    }

    private fun isShopOnly(vehicle: LiveMapVehicle, shopOnlyCompanyIds: Set<String>): Boolean {
        if (shopOnlyCompanyIds.isEmpty()) return false
        val id = vehicle.companyId?.trim().orEmpty()
        val short = vehicle.companyShortName?.trim().orEmpty()
        val vid = vehicle.id.trim()
        return (id.isNotEmpty() && id in shopOnlyCompanyIds) ||
            (short.isNotEmpty() && short in shopOnlyCompanyIds) ||
            (vid.isNotEmpty() && vid in shopOnlyCompanyIds)
    }

    /** Oraliq manzillarsiz — OSRM magazin yo‘li km. */
    private fun shopOnlyDistanceLabel(vehicle: LiveMapVehicle): String {
        val order = vehicle.orders.maxByOrNull { it.shopRoutePoints.size }
            ?: vehicle.orders.firstOrNull()
            ?: return "—"
        order.shopDistanceLabel.takeIf { it.isNotBlank() && it != "—" }?.let { return it }
        val pathKm = RouteTrim.pathLengthKm(
            RouteTrim.remaining(
                vehicle.courierLat,
                vehicle.courierLng,
                order.shopRoutePoints,
            ),
        )
        if (pathKm > 0.01) return formatDistance(pathKm)
        val dLat = order.deliveryLat ?: return "—"
        val dLng = order.deliveryLng ?: return "—"
        val km = RoadRouteService.haversineM(
            vehicle.courierLat, vehicle.courierLng, dLat, dLng,
        ) / 1000.0
        return if (km > 0.01) formatDistance(km) else "—"
    }

    private fun formatDistance(km: Double): String =
        if (km < 1.0) "${(km * 1000).toInt()} m" else String.format("%.1f km", km)
}
