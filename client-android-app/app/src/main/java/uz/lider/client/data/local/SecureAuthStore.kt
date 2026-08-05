package uz.lider.client.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

private val Context.legacyAuthDataStore by preferencesDataStore("client_auth_prefs")

@Singleton
class SecureAuthStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val prefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "client_secure_auth_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    private val _accessToken = MutableStateFlow<String?>(null)
    private val _refreshToken = MutableStateFlow<String?>(null)
    private val _userJson = MutableStateFlow<String?>(null)
    private val migrateMutex = Mutex()

    val accessToken: Flow<String?> = _accessToken.asStateFlow()
    val userJson: Flow<String?> = _userJson.asStateFlow()
    val isLoggedIn: Flow<Boolean> = accessToken.map { it != null }

    @Volatile
    private var migrated = false

    suspend fun ensureMigrated() = migrateMutex.withLock {
        if (migrated) return
        withContext(Dispatchers.IO) {
            runCatching {
                if (prefs.getString(KEY_ACCESS, null) == null) {
                    migrateFromLegacy()
                }
                reloadFromPrefs()
            }.onFailure {
                _accessToken.value = null
                _refreshToken.value = null
                _userJson.value = null
            }
            migrated = true
        }
    }

    private suspend fun migrateFromLegacy() {
        runCatching {
            val legacy = context.legacyAuthDataStore.data.first()
            val access = legacy[stringPreferencesKey("access_token")]
            val refresh = legacy[stringPreferencesKey("refresh_token")]
            val user = legacy[stringPreferencesKey("user_json")]
            if (access != null) {
                prefs.edit()
                    .putString(KEY_ACCESS, access)
                    .putString(KEY_REFRESH, refresh)
                    .putString(KEY_USER, user)
                    .apply()
            }
            context.legacyAuthDataStore.edit { it.clear() }
        }
    }

    private fun reloadFromPrefs() {
        _accessToken.value = prefs.getString(KEY_ACCESS, null)
        _refreshToken.value = prefs.getString(KEY_REFRESH, null)
        _userJson.value = prefs.getString(KEY_USER, null)
    }

    fun peekAccessToken(): String? = _accessToken.value ?: prefs.getString(KEY_ACCESS, null)

    fun peekRefreshToken(): String? = _refreshToken.value ?: prefs.getString(KEY_REFRESH, null)

    fun peekUserJson(): String? = _userJson.value ?: prefs.getString(KEY_USER, null)

    fun save(access: String, refresh: String, userJson: String) {
        prefs.edit()
            .putString(KEY_ACCESS, access)
            .putString(KEY_REFRESH, refresh)
            .putString(KEY_USER, userJson)
            .apply()
        _accessToken.value = access
        _refreshToken.value = refresh
        _userJson.value = userJson
    }

    fun clear() {
        prefs.edit().clear().apply()
        _accessToken.value = null
        _refreshToken.value = null
        _userJson.value = null
    }

    companion object {
        private const val KEY_ACCESS = "access_token"
        private const val KEY_REFRESH = "refresh_token"
        private const val KEY_USER = "user_json"
    }
}
