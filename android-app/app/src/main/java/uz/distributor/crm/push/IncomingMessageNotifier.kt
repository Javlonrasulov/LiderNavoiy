package uz.distributor.crm.push

import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import uz.distributor.crm.data.local.ChatSessionHolder
import javax.inject.Inject
import javax.inject.Singleton

data class IncomingMessageAlert(
    val conversationId: String,
    val senderName: String,
    val preview: String,
)

@Singleton
class IncomingMessageNotifier @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val _alerts = MutableSharedFlow<IncomingMessageAlert>(extraBufferCapacity = 16)
    val alerts: SharedFlow<IncomingMessageAlert> = _alerts.asSharedFlow()

    suspend fun notifyIncoming(alert: IncomingMessageAlert) {
        if (alert.conversationId == ChatSessionHolder.openConversationId) return

        playSound()

        // Ilova ichida Telegram uslubidagi tepa banner
        _alerts.emit(alert)

        // Tizim bildirishnomasi (heads-up) — yangi HIGH kanal orqali
        NotificationHelper.showMessageNotification(
            context = context,
            conversationId = alert.conversationId,
            senderName = alert.senderName,
            preview = alert.preview,
        )
    }

    fun playSound() {
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val ringtone = RingtoneManager.getRingtone(context, uri) ?: return
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                ringtone.audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            }
            ringtone.play()
        } catch (_: Exception) {
            /* ignore */
        }
    }
}
