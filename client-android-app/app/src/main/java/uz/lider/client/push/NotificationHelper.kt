package uz.lider.client.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
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
        amount: Double? = null,
        collectedAtMs: Long? = null,
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
            if (amount != null && amount > 0) {
                putExtra(PaymentPhotoAlertStore.EXTRA_AMOUNT, amount.toString())
                putExtra("amount", amount.toString())
            }
            if (collectedAtMs != null && collectedAtMs > 0) {
                putExtra(PaymentPhotoAlertStore.EXTRA_COLLECTED_AT, collectedAtMs.toString())
                putExtra("collectedAt", collectedAtMs.toString())
            }
            putExtra("title", title)
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val isPaymentReminder = type.equals("payment_reminder", ignoreCase = true) ||
            title.contains("To'lov muddati", ignoreCase = true) ||
            title.contains("Тўлов муддати", ignoreCase = true) ||
            title.contains("Bugun to'lov", ignoreCase = true) ||
            title.contains("Бугун тўлов", ignoreCase = true) ||
            title.contains("To'lov eslatmasi", ignoreCase = true) ||
            title.contains("Тўлов эслатмаси", ignoreCase = true)

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)

        if (isPaymentReminder) {
            val big = runCatching {
                BitmapFactory.decodeResource(context.resources, R.drawable.push_payment_reminder)
            }.getOrNull()
            if (big != null) {
                builder
                    .setLargeIcon(big)
                    .setStyle(
                        NotificationCompat.BigPictureStyle()
                            .bigPicture(big)
                            .bigLargeIcon(null as android.graphics.Bitmap?)
                            .setSummaryText(body),
                    )
            } else {
                builder.setStyle(NotificationCompat.BigTextStyle().bigText(body))
            }
        } else {
            builder.setStyle(NotificationCompat.BigTextStyle().bigText(body))
        }

        NotificationManagerCompat.from(context).notify(notificationId, builder.build())
    }
}
