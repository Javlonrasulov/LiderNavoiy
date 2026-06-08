package uz.lider.client.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query
import uz.lider.client.data.remote.dto.AuthResponseDto
import uz.lider.client.data.remote.dto.CategoryRowDto
import uz.lider.client.data.remote.dto.ClientAnalyticsDto
import uz.lider.client.data.remote.dto.ClientOrderDto
import uz.lider.client.data.remote.dto.ClientProfileDto
import uz.lider.client.data.remote.dto.CreateOrderRequest
import uz.lider.client.data.remote.dto.LoginRequest
import uz.lider.client.data.remote.dto.ProductDto
import uz.lider.client.data.remote.dto.RefreshRequest

interface ApiService {

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponseDto

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): AuthResponseDto

    @GET("client-portal/me")
    suspend fun getProfile(): ClientProfileDto

    @GET("client-portal/orders")
    suspend fun getOrders(): List<ClientOrderDto>

    @POST("client-portal/orders")
    suspend fun createOrder(@Body body: CreateOrderRequest): ClientOrderDto

    @GET("client-portal/products")
    suspend fun getProducts(@Query("category") category: String? = null): List<ProductDto>

    @GET("client-portal/products/categories")
    suspend fun getProductCategories(): List<CategoryRowDto>

    @GET("client-portal/analytics")
    suspend fun getAnalytics(@Query("period") period: String = "month"): ClientAnalyticsDto
}
