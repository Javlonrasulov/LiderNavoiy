package uz.distributor.crm.domain.model

data class AuthUser(
    val id: String,
    val username: String,
    val fullName: String,
    val role: String,
    val distributorId: String?,
    val companyName: String?,
    val position: String? = null,
    /** Backend `isDelivery` (login/refresh); null = eski sessiya → position fallback */
    val isDelivery: Boolean? = null,
    /** Backend kompaniya flagi; null/false = mijoz qo‘shish taqiqlangan */
    val agentsCanAddClients: Boolean? = null,
) {
    /** Agent va dostavkachi ikkalasi ham role=distributor; farq backend position/isDelivery. */
    fun isDeliveryPerson(): Boolean {
        isDelivery?.let { return it }
        return isDeliveryPosition(position)
    }

    fun canAddClients(): Boolean = agentsCanAddClients == true
}

/** Backend `staff-role.util.ts` bilan bir xil markerlar. */
fun isDeliveryPosition(position: String?): Boolean {
    val p = (position ?: "").lowercase()
    return p.contains("delivery") ||
        p.contains("yetkaz") ||
        p.contains("kuryer") ||
        p.contains("dostav") ||
        p.contains("haydov")
}

data class AuthTokens(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int,
    val user: AuthUser,
)

data class DashboardStats(
    val totalClients: Int = 0,
    val visitedClients: Int = 0,
    val pendingClients: Int = 0,
    val visitCount: Int = 0,
    val completedVisits: Int = 0,
    val pendingVisits: Int = 0,
    val totalSales: Double = 0.0,
    val clientProgressPercent: Float = 0f,
    val visitProgressPercent: Float = 0f,
    val pendingClientOrders: Int = 0,
)

data class LocationPoint(
    val latitude: Double,
    val longitude: Double,
    val speed: Float? = null,
    val accuracy: Float? = null,
    val altitude: Double? = null,
    val bearing: Float? = null,
    val recordedAt: Long = System.currentTimeMillis(),
    val deviceId: String? = null,
)

data class Client(
    val id: String,
    val code: String,
    val name: String,
    val address: String?,
    val balance: Double,
    val latitude: Double?,
    val longitude: Double?,
    val photoUrl: String? = null,
    val phone: String? = null,
    val category: String? = null,
    val territory: String? = null,
    val lineCode: String? = null,
    val priceCategory: String? = null,
    val contactPerson: String? = null,
)

data class Product(
    val id: String,
    val code: String,
    val name: String,
    val category: String,
    val brand: String? = null,
    val price: Double,
    val unit: String,
    val stockBalance: Double,
    val imageUrl: String? = null,
)

data class CartItem(
    val clientId: String,
    val productId: String,
    val productCode: String,
    val productName: String,
    val price: Double,
    val quantity: Double,
    val unit: String,
    val category: String?,
    val isFree: Boolean = false,
    val promotionId: String? = null,
)

/** Admindan kelgan mahsulot aksiyasi (masalan: 10+1, 20% chegirma) */
data class ProductPromotion(
    val id: String,
    val title: String,
    val subtitle: String = "",
    val discountPercent: Double = 0.0,
    val productId: String? = null,
    /** Admin tanlagan gradient boshlanish rangi, masalan "#4F46E5" */
    val colorStart: String = "#6366F1",
    val colorEnd: String = "#9333EA",
    val emoji: String = "🎁",
)

data class Message(
    val id: String,
    val senderName: String,
    val lastMessage: String,
    val timestamp: Long,
    val unread: Int = 0,
)
