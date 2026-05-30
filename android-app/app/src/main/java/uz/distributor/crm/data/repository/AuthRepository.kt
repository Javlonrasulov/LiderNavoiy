package uz.distributor.crm.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import uz.distributor.crm.data.local.TokenHolder
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.TrackingSocketManager
import uz.distributor.crm.data.remote.MessagesSocketManager
import uz.distributor.crm.data.remote.dto.LoginRequest
import uz.distributor.crm.domain.model.AuthTokens
import uz.distributor.crm.domain.model.AuthUser
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore("auth_prefs")

@Singleton
class AuthRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiService,
    private val gson: Gson,
    private val tokenHolder: TokenHolder,
    private val trackingSocket: TrackingSocketManager,
    private val messagesSocket: MessagesSocketManager,
) {
    private val accessTokenKey = stringPreferencesKey("access_token")
    private val refreshTokenKey = stringPreferencesKey("refresh_token")
    private val userKey = stringPreferencesKey("user_json")

    val isLoggedIn: Flow<Boolean> = context.dataStore.data.map { it[accessTokenKey] != null }

    suspend fun login(username: String, password: String): AuthTokens {
        val response = api.login(LoginRequest(username, password))
        val tokens = AuthTokens(
            accessToken = response.accessToken,
            refreshToken = response.refreshToken,
            expiresIn = response.expiresIn,
            user = AuthUser(
                id = response.user.id,
                username = response.user.username,
                fullName = response.user.fullName,
                role = response.user.role,
                distributorId = response.user.distributorId,
                companyName = response.user.companyName,
            ),
        )
        saveTokens(tokens)
        return tokens
    }

    suspend fun restoreSession(): Boolean {
        val prefs = context.dataStore.data.first()
        val token = prefs[accessTokenKey]
        tokenHolder.setToken(token)
        if (token != null) {
            trackingSocket.connect()
            messagesSocket.connect()
        }
        return token != null
    }

    suspend fun logout() {
        trackingSocket.disconnect()
        messagesSocket.disconnect()
        tokenHolder.setToken(null)
        context.dataStore.edit { it.clear() }
    }

    fun getUserFlow(): Flow<AuthUser?> = context.dataStore.data.map { prefs ->
        prefs[userKey]?.let { gson.fromJson(it, AuthUser::class.java) }
    }

    private suspend fun saveTokens(tokens: AuthTokens) {
        tokenHolder.setToken(tokens.accessToken)
        trackingSocket.connect()
        messagesSocket.connect()
        context.dataStore.edit { prefs ->
            prefs[accessTokenKey] = tokens.accessToken
            prefs[refreshTokenKey] = tokens.refreshToken
            prefs[userKey] = gson.toJson(tokens.user)
        }
    }
}
