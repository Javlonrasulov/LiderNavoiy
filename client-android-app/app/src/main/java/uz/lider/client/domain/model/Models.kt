package uz.lider.client.domain.model

data class AuthUser(
    val id: String,
    val username: String,
    val fullName: String,
    val role: String,
    val clientId: String? = null,
    val clientName: String? = null,
)

data class AuthTokens(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int,
    val user: AuthUser,
)

data class Product(
    val id: String,
    val code: String,
    val name: String,
    val brand: String? = null,
    val category: String? = null,
    val price: Double,
    val stockBalance: Double,
    val unit: String,
    val imageUrl: String? = null,
)

data class CartItem(
    val id: String,
    val name: String,
    val sku: String,
    val price: Double,
    val qty: Double,
    val brand: String,
    val image: String,
    val unit: String,
)

data class OrderItem(
    val productId: String,
    val productCode: String,
    val productName: String,
    val quantity: Double,
    val price: Double,
    val unit: String,
)

data class ClientOrder(
    val id: String,
    val status: String,
    val totalAmount: Double,
    val items: List<OrderItem>,
    val createdAt: String,
    val updatedAt: String,
)

data class ClientProfile(
    val id: String,
    val code: String,
    val name: String,
    val fullName: String? = null,
    val phone: String? = null,
    val balance: Double,
    val totalPurchases: Double,
    val orderCount: Int,
    val agentName: String? = null,
)

data class DashboardData(
    val profile: ClientProfile,
    val recentOrders: List<ClientOrder>,
    val totalPurchases: Double,
    val orderCount: Int,
    val balance: Double,
)

data class AnalyticsMonthlyPoint(
    val year: Int,
    val month: Int,
    val amount: Double,
)

data class AnalyticsWeeklyPoint(
    val date: String,
    val amount: Double,
)

data class AnalyticsCategoryShare(
    val name: String,
    val share: Double,
)

data class AnalyticsTopProduct(
    val name: String,
    val share: Double,
)

data class ClientAnalytics(
    val period: String,
    val totalPurchases: Double,
    val totalPurchasesTrend: Double,
    val orderCount: Int,
    val orderCountTrend: Double,
    val avgCheck: Double,
    val avgCheckTrend: Double,
    val totalQuantity: Double,
    val totalQuantityTrend: Double,
    val monthlyPurchases: List<AnalyticsMonthlyPoint>,
    val weeklyDynamics: List<AnalyticsWeeklyPoint>,
    val categories: List<AnalyticsCategoryShare>,
    val topProducts: List<AnalyticsTopProduct>,
)

data class OrderTrackingInfo(
    val id: String,
    val product: String,
    val amount: String,
    val status: String,
    val statusColorArgb: Long,
)

data class CourierTracking(
    val name: String,
    val isOnline: Boolean,
    val latitude: Double?,
    val longitude: Double?,
)

data class OrderTrackingDetails(
    val orderId: String,
    val status: String,
    val totalAmount: Double,
    val deliveryAddress: String?,
    val deliveryLatitude: Double?,
    val deliveryLongitude: Double?,
    val distanceKm: Double?,
    val etaMinutes: Int?,
    val courier: CourierTracking?,
)

enum class OrderStatus(val key: String) {
    PENDING("pending"),
    CONFIRMED("confirmed"),
    PACKING("packing"),
    ON_WAY("on_way"),
    DELIVERED("delivered"),
    CANCELLED("cancelled"),
    ;

    companion object {
        fun fromKey(key: String): OrderStatus =
            entries.firstOrNull { it.key.equals(key, ignoreCase = true) } ?: PENDING
    }
}
