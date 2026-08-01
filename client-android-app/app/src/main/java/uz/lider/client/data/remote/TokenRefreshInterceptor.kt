package uz.lider.client.data.remote

import dagger.Lazy
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import uz.lider.client.data.repository.AuthRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenRefreshInterceptor @Inject constructor(
    private val authRepository: Lazy<AuthRepository>,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val path = request.url.encodedPath
        if (path.contains("/auth/login") || path.contains("/auth/refresh")) {
            return chain.proceed(request)
        }

        val response = chain.proceed(request)
        if (response.code != 401) return response

        response.close()
        val hadAccessToken = runBlocking { !authRepository.get().peekAccessToken().isNullOrBlank() }
        val refreshed = runBlocking { authRepository.get().refreshAccessToken() }
        if (!refreshed) {
            // Sessiyasiz (login ekrani) 401 da navigate/reset qilmaslik
            if (hadAccessToken) {
                runBlocking { authRepository.get().logoutDueToExpiredSession() }
            }
            return Response.Builder()
                .request(request)
                .protocol(response.protocol)
                .code(401)
                .message("Unauthorized")
                .body("".toResponseBody(null))
                .build()
        }

        // Yangi access token bilan qayta so‘rov (eski Authorization header qayta ishlatilmasin)
        val newToken = runBlocking { authRepository.get().peekAccessToken() }
        val retry = if (!newToken.isNullOrBlank()) {
            request.newBuilder()
                .header("Authorization", "Bearer $newToken")
                .build()
        } else {
            request
        }
        return chain.proceed(retry)
    }
}
