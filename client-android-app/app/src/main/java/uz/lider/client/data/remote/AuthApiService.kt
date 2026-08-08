package uz.lider.client.data.remote

import retrofit2.http.Body
import retrofit2.http.POST
import uz.lider.client.data.remote.dto.AuthResponseDto
import uz.lider.client.data.remote.dto.LoginRequest
import uz.lider.client.data.remote.dto.LogoutRequest
import uz.lider.client.data.remote.dto.RefreshRequest

/**
 * Login/refresh/logout — asosiy OkHttp dan AJRALGAN client.
 * Aks holda 401 → runBlocking(refresh) → api.refresh → yana shu dispatcher = deadlock.
 */
interface AuthApiService {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponseDto

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): AuthResponseDto

    @POST("auth/logout")
    suspend fun logout(@Body body: LogoutRequest = LogoutRequest())
}
