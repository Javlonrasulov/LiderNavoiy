package uz.lider.client.data.remote

import android.util.Log
import dagger.Lazy
import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import uz.lider.client.data.repository.AuthRepository
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 401 da token yangilash.
 * Muhim: refresh [AuthApiService] orqali (alohida OkHttp) — asosiy dispatcher qulflanmaydi.
 */
@Singleton
class TokenRefreshInterceptor @Inject constructor(
    private val authRepository: Lazy<AuthRepository>,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val path = request.url.encodedPath
        if (path.contains("/auth/login") ||
            path.contains("/auth/refresh") ||
            path.contains("/auth/logout")
        ) {
            return chain.proceed(request)
        }

        val response = chain.proceed(request)
        if (response.code != 401) return response
        response.close()

        val outcome = try {
            authRepository.get().refreshAccessTokenBlocking()
        } catch (e: Exception) {
            Log.w(TAG, "refresh blocking failed: ${e.message}")
            TokenRefreshOutcome.NETWORK_ERROR
        }

        return when (outcome) {
            TokenRefreshOutcome.SUCCESS -> {
                val newToken = authRepository.get().peekAccessTokenSync()
                val retry = if (!newToken.isNullOrBlank()) {
                    request.newBuilder()
                        .header("Authorization", "Bearer $newToken")
                        .build()
                } else {
                    request
                }
                chain.proceed(retry)
            }
            TokenRefreshOutcome.AUTH_EXPIRED,
            TokenRefreshOutcome.NO_SESSION,
            TokenRefreshOutcome.NETWORK_ERROR,
            -> unauthorized(request, response)
        }
    }

    private fun unauthorized(request: okhttp3.Request, prior: Response): Response =
        Response.Builder()
            .request(request)
            .protocol(prior.protocol)
            .code(401)
            .message("Unauthorized")
            .body("".toResponseBody(null))
            .build()

    companion object {
        private const val TAG = "TokenRefresh"
    }
}
