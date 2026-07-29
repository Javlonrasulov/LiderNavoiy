package uz.lider.client.presentation.dashboard

import uz.lider.client.data.repository.LatLngPoint
import uz.lider.client.domain.model.DeliveryPersonTracking
import uz.lider.client.domain.model.OrderTrackingDetails

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
) {
    val orderCount: Int get() = orders.size
}

/** All live deliveries for the dashboard map. */
data class LiveFleetUi(
    val vehicles: List<LiveMapVehicle>,
) {
    val orderCount: Int get() = vehicles.sumOf { it.orders.size }
    val primaryOrderId: String? get() = vehicles.firstOrNull()?.orders?.firstOrNull()?.orderId
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
            else -> null
        }
    }

    private fun formatDistance(km: Double): String {
        return if (km < 1.0) "${(km * 1000).toInt()} m" else String.format("%.1f km", km)
    }
}

fun vehicleKeyFor(person: DeliveryPersonTracking?, companyId: String?): String {
    val org = companyId?.trim()?.takeIf { it.isNotEmpty() } ?: "org"
    val courier = run {
        person?.userId?.trim()?.takeIf { it.isNotEmpty() }?.let { return@run "u:$it" }
        val lat = person?.latitude
        val lng = person?.longitude
        if (lat != null && lng != null && lat != 0.0 && lng != 0.0) {
            return@run "p:${(lat * 10_000).toInt()}_${(lng * 10_000).toInt()}"
        }
        val name = person?.name?.trim().orEmpty()
        val phone = person?.phone?.trim().orEmpty()
        if (name.isNotEmpty() || phone.isNotEmpty()) return@run "c:$name|$phone"
        "unknown"
    }
    return "$org|$courier"
}
