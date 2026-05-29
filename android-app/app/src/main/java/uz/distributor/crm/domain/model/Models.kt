package uz.distributor.crm.domain.model

data class AuthUser(
    val id: String,
    val username: String,
    val fullName: String,
    val role: String,
    val distributorId: String?,
    val companyName: String?,
)

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
)

data class Product(
    val id: String,
    val code: String,
    val name: String,
    val category: String,
    val price: Double,
    val unit: String,
    val stockBalance: Double,
)

data class CartItem(
    val productId: String,
    val productCode: String,
    val productName: String,
    val price: Double,
    val quantity: Double,
    val unit: String,
    val category: String?,
)

data class Message(
    val id: String,
    val senderName: String,
    val lastMessage: String,
    val timestamp: Long,
    val unread: Int = 0,
)
