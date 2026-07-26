package uz.lider.client.data.remote.dto

import com.google.gson.TypeAdapter
import com.google.gson.annotations.JsonAdapter
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonToken
import com.google.gson.stream.JsonWriter
import java.io.IOException

/**
 * Double uchun moslashuvchan adapter (string/number).
 * Muhim: JsonSerializer/TypeAdapter.write bo'lmasa create-order so'rovi
 * Gson orqali serialize bo'lmaydi (JsonIOException → save_failed).
 */
class FlexibleDoubleAdapter : TypeAdapter<Double>() {
    @Throws(IOException::class)
    override fun write(out: JsonWriter, value: Double?) {
        if (value == null) out.nullValue() else out.value(value)
    }

    @Throws(IOException::class)
    override fun read(reader: JsonReader): Double {
        return when (reader.peek()) {
            JsonToken.NULL -> {
                reader.nextNull()
                0.0
            }
            JsonToken.STRING -> reader.nextString().toDoubleOrNull() ?: 0.0
            JsonToken.NUMBER -> reader.nextDouble()
            else -> {
                reader.skipValue()
                0.0
            }
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
    val items: List<OrderItemDto> = emptyList(),
    val createdAt: String = "",
    val updatedAt: String = "",
)

data class DeliveryPersonTrackingDto(
    val userId: String? = null,
    val name: String,
    val position: String? = null,
    val phone: String? = null,
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
    val deliveryPerson: DeliveryPersonTrackingDto? = null,
)

data class CreateOrderRequest(
    val items: List<OrderItemDto>,
)

data class ContactPersonDto(
    val userId: String? = null,
    val name: String? = null,
    val position: String? = null,
    val phone: String? = null,
)

data class ClientProfileDto(
    val id: String,
    val code: String,
    val name: String,
    val fullName: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val territory: String? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val latitude: Double? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val longitude: Double? = null,
    val category: String? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val balance: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val totalPurchases: Double = 0.0,
    val orderCount: Int = 0,
    val agentName: String? = null,
    val agentPosition: String? = null,
    val agentPhone: String? = null,
    val agentUserId: String? = null,
    val hasAssignedAgent: Boolean? = null,
    val deliveryPerson: ContactPersonDto? = null,
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
