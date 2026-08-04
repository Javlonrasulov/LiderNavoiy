package uz.lider.client.data.remote

import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query
import uz.lider.client.data.remote.dto.AuthResponseDto
import uz.lider.client.data.remote.dto.CategoryRowDto
import uz.lider.client.data.remote.dto.ChangePasswordRequest
import uz.lider.client.data.remote.dto.ClientAnalyticsDto
import uz.lider.client.data.remote.dto.ClientOrderDto
import uz.lider.client.data.remote.dto.OrderTrackingDto
import uz.lider.client.data.remote.dto.ClientProfileDto
import uz.lider.client.data.remote.dto.CreateOrderRequest
import uz.lider.client.data.remote.dto.LoginRequest
import uz.lider.client.data.remote.dto.LogoutRequest
import uz.lider.client.data.remote.dto.ProductDto
import uz.lider.client.data.remote.dto.ProductRatingDto
import uz.lider.client.data.remote.dto.PromotionDto
import uz.lider.client.data.remote.dto.PushNotificationDto
import uz.lider.client.data.remote.dto.RefreshRequest
import uz.lider.client.data.remote.dto.SetProductRatingRequest
import uz.lider.client.data.remote.dto.UnreadCountDto
import uz.lider.client.data.remote.dto.ChatMessageDto
import uz.lider.client.data.remote.dto.ConversationDto
import uz.lider.client.data.remote.dto.DeleteMessagesRequest
import uz.lider.client.data.remote.dto.DeleteMessagesResponse
import uz.lider.client.data.remote.dto.SendMessageRequest
import uz.lider.client.data.remote.dto.StartConversationRequest
import uz.lider.client.data.remote.dto.UploadResponseDto

interface ApiService {

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponseDto

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): AuthResponseDto

    @POST("auth/logout")
    suspend fun logout(@Body body: LogoutRequest = LogoutRequest())

    @POST("auth/change-password")
    suspend fun changePassword(@Body body: ChangePasswordRequest)

    @GET("client-portal/me")
    suspend fun getProfile(
        @Header("X-Company-Id") companyId: String? = null,
    ): ClientProfileDto

    @GET("client-portal/dashboard")
    suspend fun getClientDashboard(
        @Header("X-Company-Id") companyId: String? = null,
    ): uz.lider.client.data.remote.dto.ClientDashboardDto

    @GET("client-portal/orders")
    suspend fun getOrders(
        @Header("X-Company-Id") companyId: String? = null,
    ): List<ClientOrderDto>

    @GET("client-portal/orders/{orderId}/tracking")
    suspend fun getOrderTracking(@Path("orderId") orderId: String): OrderTrackingDto

    @POST("client-portal/orders")
    suspend fun createOrder(
        @Body body: CreateOrderRequest,
        @Header("X-Company-Id") companyId: String? = null,
    ): ClientOrderDto

    @GET("client-portal/products")
    suspend fun getProducts(
        @Query("category") category: String? = null,
        @Header("X-Company-Id") companyId: String? = null,
    ): List<ProductDto>

    @GET("client-portal/products/categories")
    suspend fun getProductCategories(
        @Header("X-Company-Id") companyId: String? = null,
    ): List<CategoryRowDto>

    @GET("client-portal/analytics")
    suspend fun getAnalytics(
        @Query("period") period: String = "month",
        @Header("X-Company-Id") companyId: String? = null,
    ): ClientAnalyticsDto

    @GET("client-portal/debt")
    suspend fun getDebt(
        @Header("X-Company-Id") companyId: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
    ): uz.lider.client.data.remote.dto.ClientDebtDto

    @Multipart
    @POST("client-portal/upload-payment-photo")
    suspend fun uploadPaymentPhoto(
        @Part file: MultipartBody.Part,
    ): uz.lider.client.data.remote.dto.PaymentPhotoUploadDto

    @POST("client-portal/payments/photo")
    suspend fun attachPaymentPhoto(
        @Body body: uz.lider.client.data.remote.dto.AttachPaymentPhotoRequest,
        @Header("X-Company-Id") companyId: String? = null,
    ): uz.lider.client.data.remote.dto.AttachPaymentPhotoResponseDto

    @GET("client-portal/promotions")
    suspend fun getPromotions(): List<PromotionDto>
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

    @PATCH("messages/conversations/{id}/read")
    suspend fun markConversationRead(@Path("id") conversationId: String): Map<String, Int>

    @Multipart
    @POST("messages/upload")
    suspend fun uploadChatFile(@Part file: MultipartBody.Part): UploadResponseDto

    @POST("messages/conversations/{id}/messages/delete")
    suspend fun deleteChatMessages(
        @Path("id") conversationId: String,
        @Body body: DeleteMessagesRequest,
    ): DeleteMessagesResponse

    @POST("notifications/fcm-token")
    suspend fun registerFcmToken(@Body body: Map<String, String>)

    @GET("notifications")
    suspend fun getNotifications(): List<PushNotificationDto>

    @GET("notifications/unread-count")
    suspend fun getUnreadNotificationCount(): UnreadCountDto

    @PATCH("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): Map<String, Boolean>

    @PATCH("notifications/read-all")
    suspend fun markAllNotificationsRead(): Map<String, Boolean>

    @GET("client-portal/product-ratings")
    suspend fun getProductRatings(): Map<String, Int>

    @GET("client-portal/products/{productId}/rating")
    suspend fun getProductRating(@Path("productId") productId: String): ProductRatingDto

    @PUT("client-portal/products/{productId}/rating")
    suspend fun setProductRating(
        @Path("productId") productId: String,
        @Body body: SetProductRatingRequest,
    ): ProductRatingDto
}
