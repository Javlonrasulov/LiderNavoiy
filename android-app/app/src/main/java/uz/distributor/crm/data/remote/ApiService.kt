package uz.distributor.crm.data.remote

import okhttp3.MultipartBody
import retrofit2.http.*
import uz.distributor.crm.data.remote.dto.*

interface ApiService {

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponseDto

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshTokenRequest): AuthResponseDto

    @POST("auth/logout")
    suspend fun logout(@Body body: LogoutRequest = LogoutRequest())

    @POST("auth/change-password")
    suspend fun changePassword(@Body body: ChangePasswordRequest)

    @GET("dashboard/stats")
    suspend fun getDashboardStats(): DashboardStatsDto

    @POST("gps/location")
    suspend fun sendLocation(@Body point: LocationPointDto)

    @POST("gps/location/batch")
    suspend fun sendLocationBatch(@Body body: BatchLocationRequest): BatchLocationResponse

    @GET("clients")
    suspend fun getClients(
        @Query("companyId") companyId: String? = null,
        @Query("lineCode") lineCode: String? = null,
    ): List<ClientDto>

    @GET("clients/search")
    suspend fun searchClients(@Query("q") q: String): List<ClientDto>

    @GET("clients/lines")
    suspend fun getLines(): List<LineDto>

    @GET("clients/{id}")
    suspend fun getClient(@Path("id") id: String): ClientDto

    @GET("clients/{id}/reconciliation")
    suspend fun getClientReconciliation(
        @Path("id") id: String,
        @Query("from") from: String,
        @Query("to") to: String,
    ): ClientReconciliationDto

    @POST("clients")
    suspend fun createClient(@Body body: CreateClientRequest): ClientDto

    @PATCH("clients/{id}")
    suspend fun updateClient(
        @Path("id") id: String,
        @Body body: UpdateClientLocationRequest,
    ): ClientDto

    @Multipart
    @POST("clients/upload-photo")
    suspend fun uploadClientPhoto(@Part file: MultipartBody.Part): ClientPhotoUploadDto

    @GET("products")
    suspend fun getProducts(@Query("category") category: String? = null): List<ProductDto>

    @GET("products/categories")
    suspend fun getProductCategories(): List<Map<String, String>>

    @GET("promotions/active")
    suspend fun getActivePromotions(): List<PromotionDto>

    @GET("visits")
    suspend fun getVisits(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
    ): List<VisitDto>

    @POST("visits")
    suspend fun createVisit(@Body body: CreateVisitRequest): Map<String, Any>

    @POST("visits/sync")
    suspend fun syncVisits(@Body body: BatchVisitsRequest): Map<String, Any>

    @GET("orders")
    suspend fun getOrders(): List<OrderDto>

    @GET("orders/client")
    suspend fun getClientOrders(@Query("status") status: String? = null): List<OrderDto>

    @GET("orders/delivery")
    suspend fun getDeliveryOrders(): List<OrderDto>

    @PUT("orders/delivery/reorder")
    suspend fun reorderDeliveryOrders(@Body body: ReorderDeliveryRequest): List<OrderDto>

    @GET("terminals/my")
    suspend fun getMyTerminals(): List<PaymentTerminalDto>

    @PATCH("orders/{id}/deliver")
    suspend fun deliverOrder(
        @Path("id") id: String,
        @Body body: DeliverOrderRequest,
    ): Map<String, Any>

    @POST("orders/{id}/payments")
    suspend fun collectOrderPayment(
        @Path("id") id: String,
        @Body body: CollectPaymentRequest,
    ): Map<String, Any>

    @PATCH("orders/{id}/payments/due")
    suspend fun updatePaymentDue(
        @Path("id") id: String,
        @Body body: UpdateDueAtRequest,
    ): Map<String, Any>

    @Multipart
    @POST("payments/upload-photo")
    suspend fun uploadPaymentPhoto(@Part file: MultipartBody.Part): PaymentPhotoUploadDto

    @Multipart
    @POST("orders/upload-payment-photo")
    suspend fun uploadPaymentPhotoLegacy(@Part file: MultipartBody.Part): PaymentPhotoUploadDto

    @POST("orders/{id}/returns")
    suspend fun createOrderReturn(
        @Path("id") id: String,
        @Body body: CreateReturnRequest,
    ): Map<String, Any>

    @PATCH("orders/{id}/send-to-warehouse")
    suspend fun sendOrderToWarehouse(
        @Path("id") id: String,
        @Body body: SendToWarehouseRequest,
    ): OrderDto

    @PATCH("orders/{id}/items")
    suspend fun updateClientOrderItems(
        @Path("id") id: String,
        @Body body: UpdateOrderItemsRequest,
    ): OrderDto

    @PATCH("orders/{id}/reject")
    suspend fun rejectClientOrder(@Path("id") id: String): OrderDto

    @POST("orders")
    suspend fun createOrder(@Body body: CreateOrderRequest): Map<String, Any>

    @POST("orders/sync")
    suspend fun syncOrders(@Body body: BatchOrdersRequest): Map<String, Any>

    @POST("notifications/fcm-token")
    suspend fun registerFcmToken(@Body body: Map<String, String>)

    @GET("notifications/unread-count")
    suspend fun getUnreadNotificationCount(): UnreadCountDto

    @GET("notifications")
    suspend fun getMyNotifications(): List<PushNotificationDto>

    @GET("messages/contacts")
    suspend fun getChatContacts(@Query("companyId") companyId: String? = null): List<ChatContactDto>

    @GET("messages/client-contacts")
    suspend fun getClientChatContacts(): List<ChatContactDto>

    @GET("messages/conversations")
    suspend fun getConversations(): List<ConversationDto>

    @POST("messages/conversations")
    suspend fun startConversation(@Body body: StartConversationRequest): ConversationDto

    @GET("messages/conversations/{id}/messages")
    suspend fun getChatMessages(
        @Path("id") conversationId: String,
        @Query("limit") limit: Int = 50,
    ): List<ChatMessageDto>

    @POST("messages/conversations/{id}/messages")
    suspend fun sendChatMessage(
        @Path("id") conversationId: String,
        @Body body: SendMessageRequest,
    ): ChatMessageDto

    @Multipart
    @POST("messages/upload")
    suspend fun uploadChatFile(@Part file: MultipartBody.Part): UploadResponseDto

    @PATCH("messages/conversations/{id}/read")
    suspend fun markConversationRead(@Path("id") conversationId: String): Map<String, Int>

    @POST("messages/conversations/{id}/messages/delete")
    suspend fun deleteChatMessages(
        @Path("id") conversationId: String,
        @Body body: DeleteMessagesRequest,
    ): DeleteMessagesResponse

    @GET("plans/me")
    suspend fun getMyPlan(
        @Query("year") year: Int? = null,
        @Query("month") month: Int? = null,
    ): retrofit2.Response<AgentPlanDto>

    @GET("plans/team")
    suspend fun getTeamPlans(
        @Query("year") year: Int? = null,
        @Query("month") month: Int? = null,
    ): List<AgentPlanDto>

    @GET("plans/sales-stats")
    suspend fun getPlanSalesStats(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
    ): AgentSalesStatsDto?

    // ─── Van Sales ───
    @GET("van-sales/my/stock")
    suspend fun getVanMyStock(): List<VanLoadDto>

    @GET("van-sales/my/clients")
    suspend fun getVanMyClients(): List<VanClientDto>

    @POST("van-sales/sell")
    suspend fun vanSell(@Body body: VanSellRequest): VanSellResponse

    @POST("van-sales/loads/{id}/return")
    suspend fun submitVanReturn(
        @Path("id") id: String,
        @Body body: VanReturnRequest = VanReturnRequest(),
    ): VanLoadDto
}
