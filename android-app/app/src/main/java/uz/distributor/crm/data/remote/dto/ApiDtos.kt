package uz.distributor.crm.data.remote.dto

data class LoginRequest(val username: String, val password: String)

data class AuthResponseDto(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int,
    val user: UserDto,
)

data class UserDto(
    val id: String,
    val username: String,
    val fullName: String,
    val role: String,
    val distributorId: String?,
    val companyName: String?,
)

data class DashboardStatsDto(
    val totalClients: Int,
    val visitedClients: Int,
    val pendingClients: Int,
    val visitCount: Int,
    val completedVisits: Int,
    val pendingVisits: Int,
    val totalSales: Double,
    val clientProgressPercent: Float,
    val visitProgressPercent: Float,
)

data class LocationPointDto(
    val latitude: Double,
    val longitude: Double,
    val speed: Float?,
    val accuracy: Float?,
    val altitude: Double?,
    val bearing: Float?,
    val recordedAt: String,
    val deviceId: String?,
)

data class BatchLocationRequest(val points: List<LocationPointDto>)
data class BatchLocationResponse(val saved: Int)

data class ClientDto(
    val id: String,
    val code: String,
    val name: String,
    val address: String?,
    val balance: String,
    val latitude: Double?,
    val longitude: Double?,
)

data class ProductDto(
    val id: String,
    val code: String,
    val name: String,
    val category: String?,
    val brand: String?,
    val price: String,
    val unit: String,
    val stockBalance: String,
)

data class OrderItemDto(
    val productId: String,
    val productCode: String,
    val productName: String,
    val quantity: Double,
    val price: Double,
    val unit: String,
)

data class CreateOrderRequest(
    val clientId: String,
    val visitId: String? = null,
    val items: List<OrderItemDto>,
    val offlineId: String? = null,
)

data class CreateVisitRequest(
    val clientId: String,
    val visitedAt: String,
    val checkInLatitude: Double? = null,
    val checkInLongitude: Double? = null,
    val orderTotal: Double? = null,
)

data class BatchVisitsRequest(val visits: List<CreateVisitRequest>)
data class BatchOrdersRequest(val orders: List<CreateOrderRequest>)
