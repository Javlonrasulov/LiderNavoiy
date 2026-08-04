package uz.lider.client.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import uz.lider.client.R
import uz.lider.client.data.repository.PaymentPhotoAlertStore
import uz.lider.client.presentation.MainActivity

object NotificationHelper {
    const val CHANNEL_ID = "client_push_channel"

    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        val appName = context.getString(R.string.app_name)
        val channel = NotificationChannel(
            CHANNEL_ID,
            "$appName — bildirishnomalar",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = "Buyurtma, bonus va boshqa bildirishnomalar"
            enableVibration(true)
        }
        manager.createNotificationChannel(channel)
    }

    fun showNotification(
        context: Context,
        title: String,
        body: String,
        type: String? = null,
        orderId: String? = null,
        paymentId: String? = null,
        notificationId: Int = (System.currentTimeMillis() % Int.MAX_VALUE).toInt(),
    ) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            if (!type.isNullOrBlank()) {
                putExtra(PaymentPhotoAlertStore.EXTRA_TYPE, type)
                putExtra("type", type)
            }
            if (!orderId.isNullOrBlank()) {
                putExtra(PaymentPhotoAlertStore.EXTRA_ORDER_ID, orderId)
                putExtra("orderId", orderId)
            }
            if (!paymentId.isNullOrBlank()) {
                putExtra(PaymentPhotoAlertStore.EXTRA_PAYMENT_ID, paymentId)
                putExtra("paymentId", paymentId)
            }
            putExtra("title", title)
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        NotificationManagerCompat.from(context).notify(notificationId, notification)
    }
}
