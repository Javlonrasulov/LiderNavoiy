package uz.lider.client.push

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import uz.lider.client.R
import uz.lider.client.data.repository.PushRepository
import javax.inject.Inject

@AndroidEntryPoint
class ClientFirebaseMessagingService : FirebaseMessagingService() {

    @Inject lateinit var pushRepository: PushRepository

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM token refreshed")
        scope.launch {
            runCatching { pushRepository.registerToken(token) }
                .onFailure { Log.e(TAG, "Failed to register FCM token", it) }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val title = message.notification?.title
            ?: message.data["title"]
            ?: getString(R.string.app_name)
        val body = message.notification?.body ?: message.data["body"] ?: ""
        if (body.isNotBlank()) {
            NotificationHelper.showNotification(
                context = this,
                title = title,
                body = body,
            )
        }
    }

    companion object {
        private const val TAG = "ClientFCM"
    }
}
