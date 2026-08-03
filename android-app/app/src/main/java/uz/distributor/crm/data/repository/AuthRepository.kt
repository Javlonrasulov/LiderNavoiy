package uz.distributor.crm.data.repository

import android.content.Context
import android.content.Intent
import android.os.Build
import dagger.hilt.android.qualifiers.ApplicationContext
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import uz.distributor.crm.data.local.SecureAuthStore
import uz.distributor.crm.data.local.TokenHolder
import uz.distributor.crm.data.local.UserIdHolder
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.MessagesSocketManager
import uz.distributor.crm.data.remote.TrackingSocketManager
import uz.distributor.crm.data.remote.dto.ChangePasswordRequest
import uz.distributor.crm.data.remote.dto.LogoutRequest
import uz.distributor.crm.data.remote.dto.LoginDeviceDto
import uz.distributor.crm.data.remote.dto.LoginRequest
import uz.distributor.crm.data.remote.dto.RefreshTokenRequest
import uz.distributor.crm.domain.model.AuthTokens
import uz.distributor.crm.domain.model.AuthUser
import uz.distributor.crm.service.LocationTrackingService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiService,
    private val gson: Gson,
    private val tokenHolder: TokenHolder,
    private val userIdHolder: UserIdHolder,
    private val secureAuthStore: SecureAuthStore,
    private val trackingSocket: TrackingSocketManager,
    private val messagesSocket: MessagesSocketManager,
    private val clientRepository: ClientRepository,
) {
    private val refreshMutex = Mutex()

    private val _sessionExpired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionExpired = _sessionExpired.asSharedFlow()

    val isLoggedIn: Flow<Boolean> = secureAuthStore.isLoggedIn

    fun peekAccessToken(): String? = tokenHolder.peekToken() ?: secureAuthStore.peekAccessToken()

    private fun currentDevice(): LoginDeviceDto = LoginDeviceDto(
        id = "${Build.MANUFACTURER}-${Build.MODEL}-${Build.ID}".take(160),
        brand = Build.MANUFACTURER?.replaceFirstChar { it.uppercase() },
        model = Build.MODEL,
        os = "Android ${Build.VERSION.RELEASE}",
    )

    suspend fun login(username: String, password: String): AuthTokens {
        val response = api.login(LoginRequest(username, password, currentDevice()))
        if (response.user.role != "distributor") {
            throw AgentOnlyException()
        }
        val tokens = AuthTokens(
            accessToken = response.accessToken,
            refreshToken = response.refreshToken,
            expiresIn = response.expiresIn,
            user = response.user.toAuthUser(),
        )
        runCatching { clientRepository.clearCache() }
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
        tokenHolder.setToken(token)
        secureAuthStore.peekUserJson()?.let {
            userIdHolder.userId = gson.fromJson(it, AuthUser::class.java).id
        }
        if (token != null) {
            clientRepository.clearCache()
            trackingSocket.connect()
            messagesSocket.connect()
        }
        return token != null
    }

    suspend fun refreshAccessToken(): Boolean = refreshMutex.withLock {
        secureAuthStore.ensureMigrated()
        val refresh = secureAuthStore.peekRefreshToken() ?: return false
        return try {
            val response = api.refresh(RefreshTokenRequest(refresh, currentDevice()))
            val user = response.user.toAuthUser()
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
        trackingSocket.disconnect()
        messagesSocket.disconnect()
        clientRepository.clearCache()
        tokenHolder.setToken(null)
        userIdHolder.userId = null
        secureAuthStore.clear()
        context.startService(
            Intent(context, LocationTrackingService::class.java).apply {
                action = LocationTrackingService.ACTION_STOP
            },
        )
    }

    fun getUserFlow(): Flow<AuthUser?> = secureAuthStore.userJson.map { json ->
        json?.let { gson.fromJson(it, AuthUser::class.java) }
    }

    private suspend fun saveTokens(tokens: AuthTokens) {
        tokenHolder.setToken(tokens.accessToken)
        userIdHolder.userId = tokens.user.id
        secureAuthStore.ensureMigrated()
        secureAuthStore.save(
            access = tokens.accessToken,
            refresh = tokens.refreshToken,
            userJson = gson.toJson(tokens.user),
        )
        runCatching { trackingSocket.connect() }
        runCatching { messagesSocket.connect() }
    }
}

class AgentOnlyException : Exception("agent_only")

private fun uz.distributor.crm.data.remote.dto.UserDto.toAuthUser() = AuthUser(
    id = id,
    username = username,
    fullName = fullName,
    role = role,
    distributorId = distributorId,
    companyName = companyName,
    position = position,
    isDelivery = isDelivery,
)
