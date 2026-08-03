package uz.distributor.crm.data.repository

import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.delay
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

    suspend fun registerToken(token: String) {
        if (tokenHolder.peekToken() == null) return
        api.registerFcmToken(mapOf("token" to token))
        Log.d(TAG, "FCM token registered on server")
    }

    companion object {
        private const val TAG = "PushRepository"
    }
}
