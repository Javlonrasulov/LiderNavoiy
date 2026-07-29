package uz.lider.client.presentation.dashboard

import uz.lider.client.data.repository.LatLngPoint
import uz.lider.client.domain.model.DeliveryPersonTracking
import uz.lider.client.domain.model.OrderTrackingDetails
import uz.lider.client.domain.model.RouteStopInfo

/** One on-the-way order shown on the live map. */
data class LiveMapOrder(
    val orderId: String,
    val amount: Double,
    val distanceLabel: String,
    val routePoints: List<LatLngPoint> = emptyList(),
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
    val distanceLabel: String
        get() = when {
            vehicles.isEmpty() -> "—"
            orderCount == 1 -> vehicles.first().orders.first().distanceLabel
            else -> vehicles.flatMap { it.orders }.mapNotNull { parseDistanceKm(it.distanceLabel) }
                .minOrNull()
                ?.let { formatDistance(it) }
                ?: "—"
        }

    private fun parseDistanceKm(label: String): Double? {
        val normalized = label.replace(',', '.').trim().lowercase()
        return when {
            normalized.endsWith("km") -> normalized
                .removeSuffix("km")
                .trim()
                .toDoubleOrNull()
            normalized.endsWith("m") -> normalized
                .removeSuffix("m")
                .trim()
                .toDoubleOrNull()
                ?.div(1000.0)
            else -> normalized.toDoubleOrNull()
        }
    }

    private fun formatDistance(km: Double): String =
        if (km < 1.0) "${(km * 1000).toInt()} m" else String.format("%.1f km", km)
}
