package uz.distributor.crm.data.repository

import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull
import uz.distributor.crm.data.local.TokenHolder
import uz.distributor.crm.data.remote.ApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PushRepository @Inject constructor(
    private val api: ApiService,
    private val tokenHolder: TokenHolder,
    private val appSettingsRepository: AppSettingsRepository,
) {
    suspend fun registerCurrentToken() {
        if (tokenHolder.peekToken() == null) return
        repeat(3) { attempt ->
            val fcmToken = withTimeoutOrNull(20_000) {
                FirebaseMessaging.getInstance().token.await()
            }
            if (fcmToken.isNullOrBlank()) {
                Log.w(TAG, "FCM token timeout attempt=${attempt + 1}")
                delay(1_000L * (attempt + 1))
                return@repeat
            }
            try {
                registerToken(fcmToken)
                return
            } catch (e: Exception) {
                Log.e(TAG, "FCM register failed attempt=${attempt + 1}", e)
                delay(1_000L * (attempt + 1))
            }
        }
    }

    /** Til o‘zgaganda serverga yuborish (push matnlari uchun) */
    suspend fun syncPreferredLanguage() {
        if (tokenHolder.peekToken() == null) return
        val fcmToken = withTimeoutOrNull(10_000) {
            FirebaseMessaging.getInstance().token.await()
        } ?: return
        runCatching { registerToken(fcmToken) }
            .onFailure { Log.e(TAG, "Failed to sync language", it) }
    }

    suspend fun registerToken(token: String) {
        if (tokenHolder.peekToken() == null) return
        val lang = appSettingsRepository.language.first().code
        api.registerFcmToken(
            mapOf(
                "token" to token,
                "language" to lang,
            ),
        )
        Log.d(TAG, "FCM token registered on server lang=$lang")
    }

    companion object {
        private const val TAG = "PushRepository"
    }
}
