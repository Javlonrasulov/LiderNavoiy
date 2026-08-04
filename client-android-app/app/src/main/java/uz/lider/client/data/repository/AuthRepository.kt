package uz.lider.client.data.repository

import android.os.Build
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import uz.lider.client.data.local.SecureAuthStore
import uz.lider.client.data.local.SelectedOrgHolder
import uz.lider.client.data.local.TokenHolder
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.ApiErrorMapper
import uz.lider.client.data.remote.ClientOnlyException
import uz.lider.client.data.remote.dto.ChangePasswordRequest
import uz.lider.client.data.remote.dto.LoginDeviceDto
import uz.lider.client.data.remote.dto.LoginRequest
import uz.lider.client.data.remote.dto.LogoutRequest
import uz.lider.client.data.remote.dto.RefreshRequest
import uz.lider.client.domain.model.AuthTokens
import uz.lider.client.domain.model.AuthUser
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: ApiService,
    private val gson: Gson,
    private val tokenHolder: TokenHolder,
    private val secureAuthStore: SecureAuthStore,
    private val selectedOrgHolder: SelectedOrgHolder,
    private val paymentPhotoAlertStore: PaymentPhotoAlertStore,
) {
    private val refreshMutex = Mutex()

    private val _sessionExpired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionExpired = _sessionExpired.asSharedFlow()

    val isLoggedIn: Flow<Boolean> = secureAuthStore.isLoggedIn

    private fun currentDevice(): LoginDeviceDto = LoginDeviceDto(
        id = "${Build.MANUFACTURER}-${Build.MODEL}-${Build.ID}".take(160),
        brand = Build.MANUFACTURER?.replaceFirstChar { it.uppercase() },
        model = Build.MODEL,
        os = "Android ${Build.VERSION.RELEASE}",
    )

    suspend fun peekAccessToken(): String? =
        tokenHolder.getToken() ?: secureAuthStore.peekAccessToken()

    suspend fun login(username: String, password: String): AuthTokens {
        val response = api.login(LoginRequest(username, password, currentDevice()))
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
        secureAuthStore.ensureMigrated()
        val token = secureAuthStore.peekAccessToken()
        val userJson = secureAuthStore.peekUserJson()
        val user = userJson?.let { gson.fromJson(it, AuthUser::class.java) }
        if (token == null || user?.role != "client") {
            if (token != null) logout()
            return false
        }
        tokenHolder.setToken(token)
        return true
    }

    suspend fun refreshAccessToken(): Boolean = refreshMutex.withLock {
        secureAuthStore.ensureMigrated()
        val refresh = secureAuthStore.peekRefreshToken() ?: return false
        return try {
            val response = api.refresh(RefreshRequest(refresh, currentDevice()))
            if (response.user.role != "client") {
                logoutDueToExpiredSession()
                return false
            }
            val userJson = secureAuthStore.peekUserJson()
            val user = userJson?.let { gson.fromJson(it, AuthUser::class.java) }
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
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun logoutDueToExpiredSession() {
        runCatching { api.logout(LogoutRequest(all = false)) }
        clearLocalSession()
        _sessionExpired.tryEmit(Unit)
    }

    suspend fun logout() {
        runCatching { api.logout(LogoutRequest(all = false)) }
        clearLocalSession()
    }

    private suspend fun clearLocalSession() {
        tokenHolder.setToken(null)
        selectedOrgHolder.clear()
        paymentPhotoAlertStore.clearMapPayHintDismissals()
        secureAuthStore.clear()
    }

    fun getUserFlow(): Flow<AuthUser?> = secureAuthStore.userJson.map { prefs ->
        prefs?.let { gson.fromJson(it, AuthUser::class.java) }
    }

    private suspend fun saveTokens(tokens: AuthTokens) {
        tokenHolder.setToken(tokens.accessToken)
        secureAuthStore.ensureMigrated()
        secureAuthStore.save(
            access = tokens.accessToken,
            refresh = tokens.refreshToken,
            userJson = gson.toJson(tokens.user),
        )
    }
}
