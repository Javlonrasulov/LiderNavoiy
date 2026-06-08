package uz.lider.client.data.remote.dto

import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.annotations.JsonAdapter
import java.lang.reflect.Type

class FlexibleDoubleAdapter : JsonDeserializer<Double> {
    override fun deserialize(
        json: JsonElement?,
        type: Type?,
        context: JsonDeserializationContext?,
    ): Double {
        if (json == null || json.isJsonNull) return 0.0
        return when {
            json.isJsonPrimitive && json.asJsonPrimitive.isString ->
                json.asString.toDoubleOrNull() ?: 0.0
            json.isJsonPrimitive && json.asJsonPrimitive.isNumber ->
                json.asDouble
            else -> 0.0
        }
    }
}

data class LoginRequest(
    val username: String,
    val password: String,
)

data class RefreshRequest(
    val refreshToken: String,
)

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
    val clientId: String? = null,
    val clientName: String? = null,
)

data class ProductDto(
    val id: String,
    val code: String,
    val name: String,
    val brand: String? = null,
    val category: String? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val price: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val stockBalance: Double = 0.0,
    val unit: String,
    val imageUrl: String? = null,
)

data class CategoryRowDto(
    val category: String,
)

data class OrderItemDto(
    val productId: String,
    val productCode: String,
    val productName: String,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val quantity: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val price: Double = 0.0,
    val unit: String,
)

data class ClientOrderDto(
    val id: String,
    val status: String,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val totalAmount: Double = 0.0,
    val items: List<OrderItemDto>,
    val createdAt: String,
    val updatedAt: String,
)

data class CourierTrackingDto(
    val name: String,
    val isOnline: Boolean = false,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val latitude: Double? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val longitude: Double? = null,
    val lastLocationAt: String? = null,
)

data class OrderTrackingDto(
    val orderId: String,
    val status: String,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val totalAmount: Double = 0.0,
    val deliveryAddress: String? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val deliveryLatitude: Double? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val deliveryLongitude: Double? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val distanceKm: Double? = null,
    val etaMinutes: Int? = null,
    val courier: CourierTrackingDto? = null,
)

data class CreateOrderRequest(
    val items: List<OrderItemDto>,
)

data class ClientProfileDto(
    val id: String,
    val code: String,
    val name: String,
    val fullName: String? = null,
    val phone: String? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val balance: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val totalPurchases: Double = 0.0,
    val orderCount: Int = 0,
    val agentName: String? = null,
)

data class ApiErrorDto(
    val message: String? = null,
    val statusCode: Int? = null,
)

data class AnalyticsMonthlyDto(
    val year: Int,
    val month: Int,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val amount: Double = 0.0,
)

data class AnalyticsWeeklyDto(
    val date: String,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val amount: Double = 0.0,
)

data class AnalyticsCategoryDto(
    val name: String,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val share: Double = 0.0,
)

data class AnalyticsTopProductDto(
    val name: String,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val share: Double = 0.0,
)

data class ClientAnalyticsDto(
    val period: String,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val totalPurchases: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val totalPurchasesTrend: Double = 0.0,
    val orderCount: Int = 0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val orderCountTrend: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val avgCheck: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val avgCheckTrend: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val totalQuantity: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val totalQuantityTrend: Double = 0.0,
    val monthlyPurchases: List<AnalyticsMonthlyDto> = emptyList(),
    val weeklyDynamics: List<AnalyticsWeeklyDto> = emptyList(),
    val categories: List<AnalyticsCategoryDto> = emptyList(),
    val topProducts: List<AnalyticsTopProductDto> = emptyList(),
)
