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
    val device: LoginDeviceDto? = null,
)

data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String,
)

data class LoginDeviceDto(
    val id: String? = null,
    val brand: String? = null,
    val model: String? = null,
    val os: String? = null,
)

data class RefreshRequest(
    val refreshToken: String,
    val device: LoginDeviceDto? = null,
)

data class LogoutRequest(
    val all: Boolean = false,
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
    /** Seed / eski buyurtmalarda null bo‘lishi mumkin — null bo‘lsa mapper bo‘shatadi. */
    val productId: String? = null,
    val productCode: String? = null,
    val productName: String? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val quantity: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val price: Double = 0.0,
    val unit: String? = null,
)

data class ClientOrderDto(
    val id: String,
    val status: String,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val totalAmount: Double = 0.0,
    val items: List<OrderItemDto> = emptyList(),
    val createdAt: String = "",
    val updatedAt: String = "",
    val companyId: String? = null,
    val companyName: String? = null,
    val companyShortName: String? = null,
)

data class DeliveryPersonTrackingDto(
    val userId: String? = null,
    val distributorId: String? = null,
    val name: String? = null,
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
    val companyId: String? = null,
    val companyName: String? = null,
    val companyShortName: String? = null,
    val routeStops: List<RouteStopDto> = emptyList(),
    val stopsBeforeYou: Int = 0,
    val yourSequence: Int? = null,
    val totalStops: Int = 0,
)

data class RouteStopDto(
    val sequence: Int = 0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val latitude: Double? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val longitude: Double? = null,
    val isYou: Boolean = false,
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

data class ClientOrganizationDto(
    val companyId: String,
    val name: String,
    val shortName: String? = null,
    val color: String? = null,
    val icon: String? = null,
    val clientId: String,
)

data class OrgPurchaseShareDto(
    val companyId: String,
    val shortName: String? = null,
    val name: String? = null,
    val color: String? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val total: Double = 0.0,
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
    val clientClass: String? = null,
    val priceCategory: String? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val balance: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val debt: Double? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val totalPurchases: Double = 0.0,
    val bonusPoints: Int? = null,
    val orderCount: Int = 0,
    val agentName: String? = null,
    val agentPosition: String? = null,
    val agentPhone: String? = null,
    val agentUserId: String? = null,
    val hasAssignedAgent: Boolean? = null,
    val deliveryPerson: ContactPersonDto? = null,
    val organizations: List<ClientOrganizationDto> = emptyList(),
    val activeOrganization: ClientOrganizationDto? = null,
)

data class ClientDashboardDto(
    val profile: ClientProfileDto? = null,
    val recentOrders: List<ClientOrderDto> = emptyList(),
    val activeOrders: Int = 0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val debt: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val balance: Double = 0.0,
    val bonusPoints: Int = 0,
    val discountLevel: String? = null,
    val discountSubtitle: String? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val totalPurchases: Double = 0.0,
    val orderCount: Int = 0,
    val organizations: List<ClientOrganizationDto> = emptyList(),
    val purchasesByOrg: List<OrgPurchaseShareDto> = emptyList(),
    val onWayOrderIds: List<String> = emptyList(),
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
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val quantity: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val amount: Double = 0.0,
    val unit: String? = null,
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

data class DebtHistoryItemDto(
    val id: String? = null,
    val date: String,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val amount: Double = 0.0,
    val type: String = "payment",
    val method: String? = null,
    val orderId: String? = null,
    val photoUrl: String? = null,
    val createdAt: String? = null,
)

data class DebtMonthlyPointDto(
    val year: Int = 0,
    val month: Int = 0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val amount: Double = 0.0,
)

data class ClientDebtDto(
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val currentDebt: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val balance: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val creditLimit: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val totalPaid: Double = 0.0,
    val history: List<DebtHistoryItemDto> = emptyList(),
    val monthlyDebt: List<DebtMonthlyPointDto> = emptyList(),
)

data class PromotionDto(
    val id: String,
    val title: String,
    val subtitle: String? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class)
    val discountPercent: Double = 0.0,
    val productId: String? = null,
    val productName: String? = null,
    val colorStart: String? = null,
    val colorEnd: String? = null,
    val emoji: String? = null,
    val validFrom: String? = null,
    val validTo: String? = null,
    val isActive: Boolean = true,
    val sortOrder: Int = 0,
)

data class PushNotificationDto(
    val id: String,
    val title: String,
    val body: String,
    val type: String? = null,
    val isRead: Boolean = false,
    val createdAt: String? = null,
    val data: Map<String, String>? = null,
)

data class UnreadCountDto(
    val count: Int = 0,
)

data class ProductRatingDto(
    val productId: String,
    val stars: Int? = null,
)

data class SetProductRatingRequest(
    val stars: Int,
)

data class PaymentPhotoUploadDto(
    val url: String = "",
    val fullUrl: String? = null,
)

data class AttachPaymentPhotoRequest(
    val photoUrl: String,
    val paymentId: String? = null,
    val orderId: String? = null,
)

data class AttachPaymentPhotoResponseDto(
    val id: String? = null,
    val orderId: String? = null,
    val photoUrl: String? = null,
)
