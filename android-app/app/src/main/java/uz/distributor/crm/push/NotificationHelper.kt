package uz.distributor.crm.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import uz.distributor.crm.presentation.MainActivity

const val EXTRA_OPEN_CONVERSATION_ID = "open_conversation_id"

object NotificationHelper {
    const val CHANNEL_ID = "crm_push_channel"
    const val MESSAGES_CHANNEL_ID = "crm_messages_channel"
    const val CHANNEL_NAME = "CRM bildirishnomalar"
    const val MESSAGES_CHANNEL_NAME = "Xabarlar"

    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return

        val defaultChannel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Buyurtma, vizit va muhim xabarlar"
            enableVibration(true)
        }
        manager.createNotificationChannel(defaultChannel)

        val messageSound: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val messagesChannel = NotificationChannel(
            MESSAGES_CHANNEL_ID,
            MESSAGES_CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Chat xabarlari"
            enableVibration(true)
            setSound(messageSound, android.media.AudioAttributes.Builder()
                .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                .build())
        }
        manager.createNotificationChannel(messagesChannel)
    }

    fun showMessageNotification(
        context: Context,
        conversationId: String,
        senderName: String,
        preview: String,
    ) {
        showNotification(
            context = context,
            title = senderName,
            body = preview,
            notificationId = conversationId.hashCode(),
            isMessage = true,
            conversationId = conversationId,
        )
    }

    fun showNotification(
        context: Context,
        title: String,
        body: String,
        notificationId: Int,
        isMessage: Boolean = false,
        conversationId: String? = null,
    ) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            conversationId?.let { putExtra(EXTRA_OPEN_CONVERSATION_ID, it) }
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val channelId = if (isMessage) MESSAGES_CHANNEL_ID else CHANNEL_ID
        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .apply {
                if (isMessage) {
                    setDefaults(NotificationCompat.DEFAULT_SOUND or NotificationCompat.DEFAULT_VIBRATE)
                }
            }
            .build()

        NotificationManagerCompat.from(context).notify(notificationId, notification)
    }
}
