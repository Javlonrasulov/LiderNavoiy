package uz.distributor.crm.data.repository

import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
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
        if (tokenHolder.getToken() == null) return
        val fcmToken = withTimeoutOrNull(8_000) {
            FirebaseMessaging.getInstance().token.await()
        } ?: run {
            Log.w(TAG, "FCM token timeout — skip push register")
            return
        }
        registerToken(fcmToken)
    }

    suspend fun registerToken(token: String) {
        if (tokenHolder.getToken() == null) return
        api.registerFcmToken(mapOf("token" to token))
        Log.d(TAG, "FCM token registered on server")
    }

    companion object {
        private const val TAG = "PushRepository"
    }
}
