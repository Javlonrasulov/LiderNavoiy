package uz.lider.client.data.repository

import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await
import uz.lider.client.data.local.TokenHolder
import uz.lider.client.data.remote.ApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PushRepository @Inject constructor(
    private val api: ApiService,
    private val tokenHolder: TokenHolder,
) {
    suspend fun registerCurrentToken() {
        if (tokenHolder.getToken() == null) return
        val fcmToken = FirebaseMessaging.getInstance().token.await()
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
