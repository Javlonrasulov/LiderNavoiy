package uz.distributor.crm.push

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import uz.distributor.crm.R
import uz.distributor.crm.data.repository.PushRepository
import javax.inject.Inject

@AndroidEntryPoint
class CrmFirebaseMessagingService : FirebaseMessagingService() {

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
        val title = message.notification?.title ?: message.data["title"] ?: getString(R.string.app_name)
        val body = message.notification?.body ?: message.data["body"] ?: ""
        if (body.isNotBlank()) {
            val isMessage = message.data["type"] == "message"
            val conversationId = message.data["conversationId"]
            if (isMessage && !conversationId.isNullOrBlank()) {
                NotificationHelper.showMessageNotification(
                    context = this,
                    conversationId = conversationId,
                    senderName = title,
                    preview = body,
                )
            } else {
                NotificationHelper.showNotification(
                    context = this,
                    title = title,
                    body = body,
                    notificationId = (System.currentTimeMillis() % Int.MAX_VALUE).toInt(),
                    isMessage = isMessage,
                )
            }
        }
    }

    companion object {
        private const val TAG = "CrmFCM"
    }
}
