package uz.lider.client.data.repository

import android.os.Build
import android.util.Base64
import android.util.Log
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject
import retrofit2.HttpException
import uz.lider.client.data.local.SecureAuthStore
import uz.lider.client.data.local.SelectedOrgHolder
import uz.lider.client.data.local.TokenHolder
import uz.lider.client.data.remote.ApiErrorMapper
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.AuthApiService
import uz.lider.client.data.remote.ClientOnlyException
import uz.lider.client.data.remote.TokenRefreshOutcome
import uz.lider.client.data.remote.dto.ChangePasswordRequest
import uz.lider.client.data.remote.dto.LoginDeviceDto
import uz.lider.client.data.remote.dto.LoginRequest
import uz.lider.client.data.remote.dto.LogoutRequest
import uz.lider.client.data.remote.dto.RefreshRequest
import uz.lider.client.domain.model.AuthTokens
import uz.lider.client.domain.model.AuthUser
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: ApiService,
    private val authApi: AuthApiService,
    private val gson: Gson,
    private val tokenHolder: TokenHolder,
    private val secureAuthStore: SecureAuthStore,
    private val selectedOrgHolder: SelectedOrgHolder,
    private val paymentPhotoAlertStore: PaymentPhotoAlertStore,
) {
    private val refreshMutex = Mutex()
    private val accessExpiresAtMs = AtomicLong(0L)

    /** OkHttp threadlarida single-flight — asosiy dispatcher qulflanmasin. */
    private val refreshExecutor = Executors.newSingleThreadExecutor { r ->
        Thread(r, "client-token-refresh").apply { isDaemon = true }
    }
    private val inflightRefresh = AtomicReference<CompletableFuture<TokenRefreshOutcome>?>(null)

    private val _sessionExpired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionExpired = _sessionExpired.asSharedFlow()

    val isLoggedIn: Flow<Boolean> = secureAuthStore.isLoggedIn

    private fun currentDevice(): LoginDeviceDto = LoginDeviceDto(
        id = "${Build.MANUFACTURER}-${Build.MODEL}-${Build.ID}".take(160),
        brand = Build.MANUFACTURER?.replaceFirstChar { it.uppercase() },
        model = Build.MODEL,
        os = "Android ${Build.VERSION.RELEASE}",
    )

    /** Interceptor tokeni tayyor — splash/login paytida false. */
    fun hasInMemoryAccessToken(): Boolean = tokenHolder.peekToken() != null

    fun peekAccessTokenSync(): String? = tokenHolder.peekToken()

    suspend fun peekAccessToken(): String? =
        tokenHolder.getToken() ?: secureAuthStore.peekAccessToken()

    suspend fun login(username: String, password: String): AuthTokens {
        val response = authApi.login(LoginRequest(username, password, currentDevice()))
        if (response.user.role != "client") {
            throw ClientOnlyException()
        }
        val tokens = AuthTokens(
            accessToken = response.accessToken,
            refreshToken = response.refreshToken,
            expiresIn = response.expiresIn,
            user = AuthUser(
                id = response.user.id,
                username = response.user.username,
                fullName = response.user.fullName,
                role = response.user.role,
                clientId = response.user.clientId,
                clientName = response.user.clientName,
            ),
        )
        saveTokens(tokens)
        return tokens
    }

    suspend fun changePassword(currentPassword: String, newPassword: String): Result<Unit> {
        return try {
            api.changePassword(ChangePasswordRequest(currentPassword, newPassword))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(Exception(ApiErrorMapper.toKey(e)))
        }
    }

    suspend fun restoreSession(): Boolean {
        return try {
            secureAuthStore.ensureMigrated()
            val token = secureAuthStore.peekAccessToken()
            val user = runCatching {
                secureAuthStore.peekUserJson()?.let { gson.fromJson(it, AuthUser::class.java) }
            }.getOrNull()
            if (token == null || user?.role != "client") {
                if (token != null) logout()
                return false
            }
            tokenHolder.setToken(token)
            accessExpiresAtMs.set(jwtExpMs(token) ?: 0L)
            // Muddati yaqin/o‘tgan bo‘lsa — darhol yangilash (4 soatlik JWT)
            ensureFreshAccessToken()
            hasInMemoryAccessToken()
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Access token muddati 2 daqiqadan kam qolsa — oldindan refresh.
     * Soatlab ochiq qolganda 401 storm / deadlockni oldini oladi.
     */
    suspend fun ensureFreshAccessToken(): TokenRefreshOutcome {
        secureAuthStore.ensureMigrated()
        val token = tokenHolder.peekToken() ?: secureAuthStore.peekAccessToken()
        if (token.isNullOrBlank()) return TokenRefreshOutcome.NO_SESSION
        if (tokenHolder.peekToken() == null) tokenHolder.setToken(token)

        var expiresAt = accessExpiresAtMs.get()
        if (expiresAt <= 0L) {
            expiresAt = jwtExpMs(token) ?: 0L
            accessExpiresAtMs.set(expiresAt)
        }
        val skewMs = 2L * 60L * 1000L
        if (expiresAt > 0L && System.currentTimeMillis() < expiresAt - skewMs) {
            return TokenRefreshOutcome.SUCCESS
        }
        return refreshAccessTokenDetailed()
    }

    /**
     * OkHttp interceptor uchun — dedicated threadda refresh, single-flight.
     * Asosiy OkHttp dispatcherda runBlocking(api.refresh) QILINMAYDI.
     */
    fun refreshAccessTokenBlocking(): TokenRefreshOutcome {
        while (true) {
            inflightRefresh.get()?.let { return awaitRefreshFuture(it) }
            val created = CompletableFuture<TokenRefreshOutcome>()
            if (!inflightRefresh.compareAndSet(null, created)) continue
            refreshExecutor.execute {
                try {
                    val outcome = runBlocking { refreshAccessTokenDetailed() }
                    created.complete(outcome)
                } catch (e: Exception) {
                    Log.w(TAG, "refresh executor: ${e.message}")
                    created.complete(TokenRefreshOutcome.NETWORK_ERROR)
                } finally {
                    inflightRefresh.compareAndSet(created, null)
                }
            }
            return awaitRefreshFuture(created)
        }
    }

    private fun awaitRefreshFuture(future: CompletableFuture<TokenRefreshOutcome>): TokenRefreshOutcome {
        return try {
            future.get(35, TimeUnit.SECONDS)
        } catch (e: Exception) {
            Log.w(TAG, "refresh wait: ${e.message}")
            TokenRefreshOutcome.NETWORK_ERROR
        }
    }

    suspend fun refreshAccessToken(): Boolean =
        refreshAccessTokenDetailed() == TokenRefreshOutcome.SUCCESS

    suspend fun refreshAccessTokenDetailed(): TokenRefreshOutcome = refreshMutex.withLock {
        secureAuthStore.ensureMigrated()
        val refresh = secureAuthStore.peekRefreshToken()
        if (refresh.isNullOrBlank()) {
            return TokenRefreshOutcome.NO_SESSION
        }
        return try {
            val response = authApi.refresh(RefreshRequest(refresh, currentDevice()))
            if (response.user.role != "client") {
                clearLocalSession()
                _sessionExpired.tryEmit(Unit)
                return TokenRefreshOutcome.AUTH_EXPIRED
            }
            val userJson = secureAuthStore.peekUserJson()
            val user = runCatching {
                userJson?.let { gson.fromJson(it, AuthUser::class.java) }
            }.getOrNull()
                ?: AuthUser(
                    id = response.user.id,
                    username = response.user.username,
                    fullName = response.user.fullName,
                    role = response.user.role,
                    clientId = response.user.clientId,
                    clientName = response.user.clientName,
                )
            saveTokens(
                AuthTokens(
                    accessToken = response.accessToken,
                    refreshToken = response.refreshToken,
                    expiresIn = response.expiresIn,
                    user = user,
                ),
            )
            TokenRefreshOutcome.SUCCESS
        } catch (e: HttpException) {
            if (e.code() == 401 || e.code() == 403) {
                Log.w(TAG, "refresh auth rejected HTTP ${e.code()}")
                clearLocalSession()
                _sessionExpired.tryEmit(Unit)
                TokenRefreshOutcome.AUTH_EXPIRED
            } else {
                Log.w(TAG, "refresh HTTP ${e.code()}: ${e.message()}")
                TokenRefreshOutcome.NETWORK_ERROR
            }
        } catch (e: Exception) {
            Log.w(TAG, "refresh network: ${e.javaClass.simpleName}: ${e.message}")
            TokenRefreshOutcome.NETWORK_ERROR
        }
    }

    suspend fun logoutDueToExpiredSession() {
        runCatching { authApi.logout(LogoutRequest(all = false)) }
        clearLocalSession()
        _sessionExpired.tryEmit(Unit)
    }

    suspend fun logout() {
        runCatching { authApi.logout(LogoutRequest(all = false)) }
        clearLocalSession()
    }

    private suspend fun clearLocalSession() {
        tokenHolder.setToken(null)
        accessExpiresAtMs.set(0L)
        selectedOrgHolder.clear()
        paymentPhotoAlertStore.clearMapPayHintDismissals()
        secureAuthStore.clear()
    }

    fun getUserFlow(): Flow<AuthUser?> = secureAuthStore.userJson.map { json ->
        json?.let { runCatching { gson.fromJson(it, AuthUser::class.java) }.getOrNull() }
    }

    private suspend fun saveTokens(tokens: AuthTokens) {
        tokenHolder.setToken(tokens.accessToken)
        val fromJwt = jwtExpMs(tokens.accessToken)
        val fromExpiresIn = if (tokens.expiresIn > 0) {
            System.currentTimeMillis() + tokens.expiresIn * 1000L
        } else {
            0L
        }
        accessExpiresAtMs.set(fromJwt ?: fromExpiresIn)
        secureAuthStore.ensureMigrated()
        secureAuthStore.save(
            access = tokens.accessToken,
            refresh = tokens.refreshToken,
            userJson = gson.toJson(tokens.user),
        )
    }

    companion object {
        private const val TAG = "AuthRepository"

        /** JWT `exp` (verify qilmasdan) — faqat proactive refresh uchun. */
        fun jwtExpMs(token: String): Long? {
            return try {
                val parts = token.split(".")
                if (parts.size < 2) return null
                var payload = parts[1]
                val pad = (4 - payload.length % 4) % 4
                if (pad > 0) payload += "=".repeat(pad)
                val json = String(
                    Base64.decode(payload, Base64.URL_SAFE or Base64.NO_WRAP),
                    Charsets.UTF_8,
                )
                val exp = JSONObject(json).optLong("exp", 0L)
                if (exp > 0L) exp * 1000L else null
            } catch (_: Exception) {
                null
            }
        }
    }
}
