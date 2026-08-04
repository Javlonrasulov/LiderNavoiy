package uz.distributor.crm.data.remote.dto

import com.google.gson.annotations.JsonAdapter

data class LoginDeviceDto(
    val id: String? = null,
    val brand: String? = null,
    val model: String? = null,
    val os: String? = null,
)

data class LoginRequest(
    val username: String,
    val password: String,
    val device: LoginDeviceDto? = null,
)

data class RefreshTokenRequest(
    val refreshToken: String,
    val device: LoginDeviceDto? = null,
)

data class LogoutRequest(
    val all: Boolean = false,
)

data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String,
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
    val distributorId: String?,
    val companyName: String?,
    val position: String? = null,
    val isDelivery: Boolean? = null,
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
    val pendingClientOrders: Int = 0,
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
    val code: String? = null,
    val name: String,
    val address: String? = null,
    @field:JsonAdapter(FlexibleDoubleAdapter::class) val balance: Double = 0.0,
    @field:JsonAdapter(FlexibleDoubleAdapter::class) val debt: Double = 0.0,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val inn: String? = null,
    val photoUrl: String? = null,
    val status: String? = null,
    val phone: String? = null,
    val category: String? = null,
    val territory: String? = null,
    val lineCode: String? = null,
    val priceCategory: String? = null,
    val contactPerson: String? = null,
)

data class ReconciliationLineItemDto(
    val productName: String,
    val quantity: Double,
    val price: Double,
    val total: Double,
    val unit: String? = null,
)

data class ReconciliationLineDto(
    val date: String? = null,
    val operation: String,
    val debit: Double? = null,
    val credit: Double? = null,
    val expandable: Boolean = false,
    val isSummary: Boolean = false,
    val isOpening: Boolean = false,
    val isClosing: Boolean = false,
    val items: List<ReconciliationLineItemDto>? = null,
)

data class ClientReconciliationDto(
    val clientId: String,
    val clientCode: String,
    val clientName: String,
    val companyName: String? = null,
    val from: String,
    val to: String,
    @JsonAdapter(FlexibleDoubleAdapter::class) val openingBalance: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class) val closingBalance: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class) val totalDebit: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class) val totalCredit: Double = 0.0,
    val lines: List<ReconciliationLineDto>,
)

data class CreateClientRequest(
    val name: String,
    val inn: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val photoUrl: String? = null,
    val distributorId: String? = null,
    val lineCode: String? = null,
)

data class UpdateClientLocationRequest(
    val latitude: Double,
    val longitude: Double,
)

data class LineDto(
    val code: String,
    val name: String,
    val clientCount: Int = 0,
    val agentName: String? = null,
)

data class ClientPhotoUploadDto(
    val url: String,
    val fullUrl: String,
    val mimeType: String,
    val fileSize: Int,
)

data class ProductDto(
    val id: String,
    val code: String,
    val name: String,
    val category: String?,
    val brand: String?,
    @JsonAdapter(FlexibleDoubleAdapter::class) val price: Double = 0.0,
    val unit: String,
    @JsonAdapter(FlexibleDoubleAdapter::class) val stockBalance: Double = 0.0,
    val imageUrl: String? = null,
)

data class PromotionDto(
    val id: String,
    val title: String,
    val subtitle: String? = null,
    @JsonAdapter(FlexibleDoubleAdapter::class) val discountPercent: Double = 0.0,
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

data class OrderItemDto(
    val productId: String,
    val productCode: String,
    val productName: String,
    val quantity: Double,
    val price: Double,
    val unit: String,
    val isFree: Boolean = false,
    val promotionId: String? = null,
)

data class CreateOrderRequest(
    val clientId: String,
    val visitId: String? = null,
    val items: List<OrderItemDto>,
    val offlineId: String? = null,
)

data class VisitDto(
    val id: String,
    val clientId: String,
    val visitedAt: String,
    @JsonAdapter(FlexibleDoubleAdapter::class) val orderTotal: Double = 0.0,
    val clientName: String? = null,
    val clientCode: String? = null,
    val clientAddress: String? = null,
    val fromClientOrder: Boolean = false,
    val notes: String? = null,
    val orderId: String? = null,
    val orderStatus: String? = null,
    val orderSource: String? = null,
)

data class OrderPaymentDto(
    val id: String,
    @JsonAdapter(FlexibleDoubleAdapter::class) val amount: Double = 0.0,
    val method: String? = null,
    val collectorName: String? = null,
    val collectedAt: String? = null,
    /** Dostavkachi rasmi */
    val photoUrl: String? = null,
    /** Mijoz xavfsizlik rasmi */
    val clientPhotoUrl: String? = null,
)

data class OrderDto(
    val id: String,
    val clientId: String,
    val createdAt: String,
    @JsonAdapter(FlexibleDoubleAdapter::class) val totalAmount: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class) val paidAmount: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class) val returnedAmount: Double = 0.0,
    val paymentStatus: String? = null,
    val items: List<OrderItemDto> = emptyList(),
    val status: String? = null,
    val source: String? = null,
    val visitId: String? = null,
    val clientName: String? = null,
    val clientCode: String? = null,
    val clientAddress: String? = null,
    val clientPhone: String? = null,
    val clientLatitude: Double? = null,
    val clientLongitude: Double? = null,
    val deliveryDistributorId: String? = null,
    val deliverySequence: Int? = null,
    val dueAt: String? = null,
    val updatedAt: String? = null,
    val loadedAt: String? = null,
    val deliveredAt: String? = null,
    val lastPaymentPhotoUrl: String? = null,
    val lastClientPaymentPhotoUrl: String? = null,
    val isUrgent: Boolean = false,
    val payments: List<OrderPaymentDto> = emptyList(),
) {
    val remainingBalance: Double
        get() = (totalAmount - returnedAmount - paidAmount).coerceAtLeast(0.0)

    val needsPaymentFollowUp: Boolean
        get() = status == "delivered" &&
            (paymentStatus == "unpaid" || paymentStatus == "partial") &&
            remainingBalance > 0.01
}

data class SendToWarehouseRequest(
    val isUrgent: Boolean = false,
)

data class UpdateOrderItemsRequest(
    val items: List<OrderItemDto>,
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

data class UnreadCountDto(val count: Int)

data class PushNotificationDto(
    val id: String,
    val title: String = "",
    val body: String = "",
    val type: String = "general",
    val isRead: Boolean = false,
    val createdAt: String? = null,
)

data class ChatContactDto(
    val id: String,
    val fullName: String,
    val role: String,
    val username: String,
)

data class LastMessageDto(
    val id: String,
    val text: String,
    val senderId: String,
    val createdAt: String,
    val isRead: Boolean,
    val messageType: String = "text",
    val fileName: String? = null,
)

data class ConversationDto(
    val id: String,
    val otherUser: ChatContactDto,
    val lastMessage: LastMessageDto?,
    val unreadCount: Int,
    val updatedAt: String,
)

data class ChatMessageDto(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val text: String,
    val isRead: Boolean,
    val createdAt: String,
    val messageType: String = "text",
    val fileUrl: String? = null,
    val fileName: String? = null,
    val fileMime: String? = null,
    @JsonAdapter(FlexibleIntAdapter::class)
    val fileSize: Int? = null,
)

data class MessageAttachmentRequest(
    val url: String,
    val fileName: String,
    val mimeType: String,
    val fileSize: Int,
    val messageType: String,
)

data class SendMessageRequest(
    val text: String = "",
    val attachment: MessageAttachmentRequest? = null,
)

data class DeleteMessagesRequest(
    val messageIds: List<String>,
    val forEveryone: Boolean = false,
)

data class DeleteMessagesResponse(val deleted: List<String>)

data class UploadResponseDto(
    val url: String,
    val fullUrl: String,
    val fileName: String,
    val mimeType: String,
    val fileSize: Int,
    val messageType: String,
)

data class PaymentPhotoUploadDto(
    val url: String,
    val fullUrl: String? = null,
)

data class PaymentTerminalDto(
    val id: String,
    val name: String,
    val code: String? = null,
    val isActive: Boolean = true,
)

data class DeliverOrderRequest(
    val paymentMethod: String,
    val terminalId: String? = null,
    val amount: Double? = null,
    val dueAt: String? = null,
    val photoUrl: String? = null,
    val photoBase64: String? = null,
)

data class CollectPaymentRequest(
    val paymentMethod: String,
    val terminalId: String? = null,
    val amount: Double,
    val dueAt: String? = null,
    val photoUrl: String? = null,
    val photoBase64: String? = null,
)

data class UpdateDueAtRequest(
    val dueAt: String,
)

data class ReorderDeliveryRequest(
    val orderIds: List<String>,
)

data class CreateReturnRequest(
    val items: List<OrderItemDto>,
    val note: String? = null,
)

data class StartConversationRequest(val userId: String)

data class PlanCategoryDto(
    val key: String,
    val name: String,
    val color: String,
    @JsonAdapter(FlexibleDoubleAdapter::class) val plan: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class) val done: Double = 0.0,
    val pct: Int = 0,
)

data class AgentPlanDto(
    val distributorId: String,
    val agentName: String,
    val year: Int,
    val month: Int,
    @JsonAdapter(FlexibleDoubleAdapter::class) val totalPlan: Double = 0.0,
    @JsonAdapter(FlexibleDoubleAdapter::class) val totalDone: Double = 0.0,
    val donePct: Int = 0,
    val categories: List<PlanCategoryDto> = emptyList(),
)

data class SalesChartPointDto(
    val label: String,
    @JsonAdapter(FlexibleDoubleAdapter::class) val sales: Double = 0.0,
)

data class SalesPeriodStatsDto(
    val points: List<SalesChartPointDto> = emptyList(),
    @JsonAdapter(FlexibleDoubleAdapter::class) val total: Double = 0.0,
)

data class AgentSalesStatsDto(
    val day: SalesPeriodStatsDto = SalesPeriodStatsDto(),
    val week: SalesPeriodStatsDto = SalesPeriodStatsDto(),
    val month: SalesPeriodStatsDto = SalesPeriodStatsDto(),
    val custom: SalesPeriodStatsDto? = null,
)
