package uz.lider.client.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import uz.lider.client.data.local.TokenHolder
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.ClientOnlyException
import uz.lider.client.data.remote.dto.LoginRequest
import uz.lider.client.data.remote.dto.RefreshRequest
import uz.lider.client.domain.model.AuthTokens
import uz.lider.client.domain.model.AuthUser
import javax.inject.Inject
import javax.inject.Singleton

private val Context.authDataStore by preferencesDataStore("client_auth_prefs")

@Singleton
class AuthRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiService,
    private val gson: Gson,
    private val tokenHolder: TokenHolder,
) {
    private val accessTokenKey = stringPreferencesKey("access_token")
    private val refreshTokenKey = stringPreferencesKey("refresh_token")
    private val userKey = stringPreferencesKey("user_json")
    private val refreshMutex = Mutex()

    private val _sessionExpired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionExpired = _sessionExpired.asSharedFlow()

    val isLoggedIn: Flow<Boolean> = context.authDataStore.data.map { it[accessTokenKey] != null }

    suspend fun login(username: String, password: String): AuthTokens {
        val response = api.login(LoginRequest(username, password))
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

    suspend fun restoreSession(): Boolean {
        val prefs = context.authDataStore.data.first()
        val token = prefs[accessTokenKey]
        val userJson = prefs[userKey]
        val user = userJson?.let { gson.fromJson(it, AuthUser::class.java) }
        if (token == null || user?.role != "client") {
            if (token != null) logout()
            return false
        }
        tokenHolder.setToken(token)
        return true
    }

    suspend fun refreshAccessToken(): Boolean = refreshMutex.withLock {
        val prefs = context.authDataStore.data.first()
        val refresh = prefs[refreshTokenKey] ?: return false
        return try {
            val response = api.refresh(RefreshRequest(refresh))
            if (response.user.role != "client") {
                logoutDueToExpiredSession()
                return false
            }
            val userJson = prefs[userKey]
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
        logout()
        _sessionExpired.tryEmit(Unit)
    }

    suspend fun logout() {
        tokenHolder.setToken(null)
        context.authDataStore.edit { it.clear() }
    }

    fun getUserFlow(): Flow<AuthUser?> = context.authDataStore.data.map { prefs ->
        prefs[userKey]?.let { gson.fromJson(it, AuthUser::class.java) }
    }

    private suspend fun saveTokens(tokens: AuthTokens) {
        tokenHolder.setToken(tokens.accessToken)
        context.authDataStore.edit { prefs ->
            prefs[accessTokenKey] = tokens.accessToken
            prefs[refreshTokenKey] = tokens.refreshToken
            prefs[userKey] = gson.toJson(tokens.user)
        }
    }
}
