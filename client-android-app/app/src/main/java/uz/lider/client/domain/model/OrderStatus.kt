package uz.lider.client.domain.model

enum class OrderStatus(val key: String) {
    PENDING("pending"),
    CONFIRMED("confirmed"),
    PACKING("packing"),
    ON_WAY("on_way"),
    DELIVERED("delivered"),
    CANCELLED("cancelled"),
    ;

    /** Filter chip key used on Orders screen. */
    val filterKey: String
        get() = when (this) {
            PENDING -> "received"
            CONFIRMED -> "warehouse"
            PACKING -> "packing"
            ON_WAY -> "onway"
            DELIVERED -> "delivered"
            CANCELLED -> "cancelled"
        }

    companion object {
        fun fromKey(key: String?): OrderStatus {
            val normalized = key
                ?.trim()
                ?.lowercase()
                ?.replace('-', '_')
                ?.replace(' ', '_')
                ?: return PENDING
            return when (normalized) {
                "pending", "received", "accepted", "new", "draft" -> PENDING
                "confirmed", "warehouse", "in_warehouse", "ombor" -> CONFIRMED
                "packing", "assembling", "preparing" -> PACKING
                "on_way", "onway", "in_transit", "shipping", "shipped" -> ON_WAY
                "delivered", "completed", "done" -> DELIVERED
                "cancelled", "canceled", "rejected" -> CANCELLED
                else -> entries.firstOrNull { it.key == normalized } ?: PENDING
            }
        }

        fun matchesFilter(status: String?, filter: String): Boolean {
            if (filter == "all") return true
            return fromKey(status).filterKey == filter
        }
    }
}
