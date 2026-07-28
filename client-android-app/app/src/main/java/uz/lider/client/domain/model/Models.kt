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

data class ContactPerson(
    val userId: String? = null,
    val name: String,
    val position: String? = null,
    val phone: String? = null,
)

data class ClientProfile(
    val id: String,
    val code: String,
    val name: String,
    val fullName: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val territory: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val category: String? = null,
    val clientClass: String? = null,
    val priceCategory: String? = null,
    val balance: Double,
    /** Qarzdorlik (manfiy balansning absolyuti). */
    val debt: Double = 0.0,
    val totalPurchases: Double,
    val bonusPoints: Int = 0,
    val orderCount: Int,
    val agentName: String? = null,
    val agentPosition: String? = null,
    val agentPhone: String? = null,
    val agentUserId: String? = null,
    /** null = server hali bu maydonni yubormagan */
    val hasAssignedAgent: Boolean? = null,
    val deliveryPerson: ContactPerson? = null,
) {
    /** Klient qo'shilganda saqlangan manzil — joriy GPS emas. */
    fun registeredDeliveryAddress(): String {
        val addr = address?.trim().orEmpty()
        val terr = territory?.trim().orEmpty()
        return when {
            addr.isNotEmpty() && terr.isNotEmpty() &&
                !addr.contains(terr, ignoreCase = true) -> "$addr, $terr"
            addr.isNotEmpty() -> addr
            terr.isNotEmpty() -> terr
            else -> ""
        }
    }

    fun discountTitle(): String =
        category?.trim()?.takeIf { it.isNotEmpty() }
            ?: priceCategory?.trim()?.takeIf { it.isNotEmpty() }
            ?: "Standard"

    fun discountSubtitle(): String {
        clientClass?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
        return when (discountTitle().lowercase()) {
            "vip" -> "Gold"
            "premium" -> "Silver"
            else -> priceCategory?.trim()?.takeIf { it.isNotEmpty() } ?: "—"
        }
    }
}

data class DashboardData(
    val profile: ClientProfile,
    val recentOrders: List<ClientOrder>,
    val totalPurchases: Double,
    val orderCount: Int,
    val balance: Double,
    val debt: Double = 0.0,
    val bonusPoints: Int = 0,
    val activeOrderCount: Int = 0,
    val discountLevel: String = "Standard",
    val discountSubtitle: String = "—",
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
    val quantity: Double = 0.0,
    val amount: Double = 0.0,
    val unit: String = "",
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

data class DeliveryPersonTracking(
    val userId: String? = null,
    val distributorId: String? = null,
    val name: String,
    val position: String? = null,
    val phone: String? = null,
    val isOnline: Boolean = false,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val lastLocationAt: String? = null,
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
    val deliveryPerson: DeliveryPersonTracking? = null,
)
