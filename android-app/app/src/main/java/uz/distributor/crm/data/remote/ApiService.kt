package uz.distributor.crm.data.remote

import retrofit2.http.*
import uz.distributor.crm.data.remote.dto.*

interface ApiService {

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponseDto

    @POST("auth/refresh")
    suspend fun refresh(@Body body: Map<String, String>): AuthResponseDto

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

    @GET("clients/{id}")
    suspend fun getClient(@Path("id") id: String): ClientDto

    @GET("products")
    suspend fun getProducts(@Query("category") category: String? = null): List<ProductDto>

    @GET("products/categories")
    suspend fun getProductCategories(): List<Map<String, String>>

    @GET("visits")
    suspend fun getVisits(@Query("from") from: String? = null): List<Map<String, Any>>

    @POST("visits")
    suspend fun createVisit(@Body body: CreateVisitRequest): Map<String, Any>

    @POST("visits/sync")
    suspend fun syncVisits(@Body body: BatchVisitsRequest): Map<String, Any>

    @GET("orders")
    suspend fun getOrders(): List<Map<String, Any>>

    @POST("orders")
    suspend fun createOrder(@Body body: CreateOrderRequest): Map<String, Any>

    @POST("orders/sync")
    suspend fun syncOrders(@Body body: BatchOrdersRequest): Map<String, Any>

    @POST("notifications/fcm-token")
    suspend fun registerFcmToken(@Body body: Map<String, String>)
}
