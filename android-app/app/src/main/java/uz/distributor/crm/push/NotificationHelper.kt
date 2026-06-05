package uz.distributor.crm.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import uz.distributor.crm.R
import uz.distributor.crm.presentation.MainActivity

const val EXTRA_OPEN_CONVERSATION_ID = "open_conversation_id"

object NotificationHelper {
    /** Eski kanal — umumiy push */
    const val CHANNEL_ID = "crm_push_channel"
    /**
     * Yangi kanal ID (v2): Android eski "Silent" sozlamasini saqlab qoladi,
     * shuning uchun chat uchun yangi kanal ochiladi — heads-up + ovoz.
     */
    const val MESSAGES_CHANNEL_ID = "crm_chat_alert_v2"
    const val MESSAGES_CHANNEL_NAME = "Chat xabarlari"

    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        val appName = context.getString(R.string.app_name)

        // Eski "Silent" bo'lib qolgan kanallarni o'chirish (yangi HIGH kanal ishlaydi)
        manager.deleteNotificationChannel("crm_messages_channel")

        val defaultChannel = NotificationChannel(
            CHANNEL_ID,
            "$appName — bildirishnomalar",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = "Buyurtma, tashrif va boshqa bildirishnomalar"
            enableVibration(true)
        }
        manager.createNotificationChannel(defaultChannel)

        val messageSound: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val audioAttrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        val messagesChannel = NotificationChannel(
            MESSAGES_CHANNEL_ID,
            MESSAGES_CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Yangi chat xabarlari — ovoz va tepadan popup"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 280, 120, 280)
            enableLights(true)
            setSound(messageSound, audioAttrs)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            setShowBadge(true)
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
        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setOnlyAlertOnce(false)

        if (isMessage) {
            builder
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setVibrate(longArrayOf(0, 280, 120, 280))
                .setDefaults(NotificationCompat.DEFAULT_VIBRATE)
        } else {
            builder.setPriority(NotificationCompat.PRIORITY_DEFAULT)
        }

        NotificationManagerCompat.from(context).notify(notificationId, builder.build())
    }
}
