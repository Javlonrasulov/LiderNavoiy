package uz.distributor.crm.data.remote

import dagger.Lazy
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import uz.distributor.crm.data.repository.AuthRepository
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
        val refreshed = runBlocking { authRepository.get().refreshAccessToken() }
        if (!refreshed) {
            runBlocking { authRepository.get().logoutDueToExpiredSession() }
            return Response.Builder()
                .request(request)
                .protocol(response.protocol)
                .code(401)
                .message("Unauthorized")
                .body("".toResponseBody(null))
                .build()
        }

        return chain.proceed(request)
    }
}
