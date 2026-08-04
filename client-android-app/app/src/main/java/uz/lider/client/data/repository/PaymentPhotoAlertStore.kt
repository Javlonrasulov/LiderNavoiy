package uz.lider.client.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

private val Context.paymentPhotoAlertDataStore: DataStore<Preferences> by preferencesDataStore(
    "payment_photo_alert",
)

data class PaymentPhotoAlertState(
    /** Hali 30 daqiqa ichida — To‘lovlar tarixida ko‘rinadi */
    val isActive: Boolean = false,
    /** Asosiydagi (xarita osti) X bilan yopilgan — tarixda 30 daqiqagacha qoladi */
    val modalDismissed: Boolean = false,
    val orderId: String? = null,
    val paymentId: String? = null,
    val amount: Double? = null,
    val collectedAtMs: Long? = null,
    val expiresAtMs: Long = 0L,
) {
    /** Asosiy ekran (xarita osti) — X bosilmaguncha */
    val shouldShowModal: Boolean get() = isActive && !modalDismissed
}

data class RecentPaymentSignal(
    val id: String,
    val orderId: String? = null,
    val createdAtMs: Long,
    val amount: Double? = null,
)

@Singleton
class PaymentPhotoAlertStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val expiresAtKey = longPreferencesKey("expires_at_ms")
    private val modalDismissedKey = booleanPreferencesKey("modal_dismissed")
    private val orderIdKey = stringPreferencesKey("order_id")
    private val paymentIdKey = stringPreferencesKey("payment_id")
    private val amountKey = doublePreferencesKey("amount")
    private val collectedAtMsKey = longPreferencesKey("collected_at_ms")
    private val mapHintDismissedOrderIdsKey = stringSetPreferencesKey("map_hint_dismissed_order_ids")
    private val handledPaymentIdsKey = stringSetPreferencesKey("handled_payment_ids")
    private val bootstrapDoneKey = booleanPreferencesKey("payments_bootstrap_done")

    private val _modalEvents = MutableSharedFlow<Unit>(extraBufferCapacity = 4)
    val modalEvents: SharedFlow<Unit> = _modalEvents.asSharedFlow()

    val state: Flow<PaymentPhotoAlertState> = context.paymentPhotoAlertDataStore.data.map { prefs ->
        val expiresAt = prefs[expiresAtKey] ?: 0L
        val active = expiresAt > System.currentTimeMillis()
        val amount = prefs[amountKey]
        val collectedAt = prefs[collectedAtMsKey]
        PaymentPhotoAlertState(
            isActive = active,
            modalDismissed = if (active) prefs[modalDismissedKey] == true else false,
            orderId = prefs[orderIdKey],
            paymentId = prefs[paymentIdKey],
            amount = amount?.takeIf { it > 0 },
            collectedAtMs = collectedAt?.takeIf { it > 0 },
            expiresAtMs = expiresAt,
        )
    }

    /** X bosilgan buyurtma id lari — shu buyurtmalar uchun xarita banneri ko‘rinmaydi. */
    val mapPayHintDismissedOrderIds: Flow<Set<String>> =
        context.paymentPhotoAlertDataStore.data.map { prefs ->
            prefs[mapHintDismissedOrderIdsKey].orEmpty()
        }

    fun shouldShowMapPayHint(orderIds: Collection<String>, dismissedIds: Set<String>): Boolean {
        val ids = orderIds.map { it.trim() }.filter { it.isNotEmpty() }.toSet()
        if (ids.isEmpty()) return false
        return ids.any { it !in dismissedIds }
    }

    suspend fun dismissMapPayHintFor(orderIds: Collection<String>) {
        val add = orderIds.map { it.trim() }.filter { it.isNotEmpty() }.toSet()
        if (add.isEmpty()) return
        context.paymentPhotoAlertDataStore.edit { prefs ->
            val next = prefs[mapHintDismissedOrderIdsKey].orEmpty().toMutableSet()
            next.addAll(add)
            prefs[mapHintDismissedOrderIdsKey] = next.takeLast(120).toSet()
        }
    }

    /** Logout — bannerlar qayta chiqishi uchun. */
    suspend fun clearMapPayHintDismissals() {
        context.paymentPhotoAlertDataStore.edit { prefs ->
            prefs.remove(mapHintDismissedOrderIdsKey)
        }
    }

    /** Push / FCM / intent — modal majburiy (30 daqiqa). */
    suspend fun recordPaymentReceived(
        orderId: String? = null,
        paymentId: String? = null,
        amount: Double? = null,
        collectedAtMs: Long? = null,
    ) {
        context.paymentPhotoAlertDataStore.edit { prefs ->
            prefs[expiresAtKey] = System.currentTimeMillis() + TTL_MS
            prefs[modalDismissedKey] = false
            // orderId/paymentId kelmasa — eski qiymatni saqlab qolamiz
            if (!orderId.isNullOrBlank()) {
                prefs[orderIdKey] = orderId
            }
            if (!paymentId.isNullOrBlank() && !paymentId.startsWith("ord-")) {
                prefs[paymentIdKey] = paymentId
            }
            if (amount != null && amount > 0) {
                prefs[amountKey] = amount
            }
            if (collectedAtMs != null && collectedAtMs > 0) {
                prefs[collectedAtMsKey] = collectedAtMs
            } else if (prefs[collectedAtMsKey] == null) {
                prefs[collectedAtMsKey] = System.currentTimeMillis()
            }
            if (!paymentId.isNullOrBlank()) {
                val handled = prefs[handledPaymentIdsKey].orEmpty().toMutableSet()
                handled.add(paymentId)
                prefs[handledPaymentIdsKey] = handled.takeLast(80).toSet()
            }
        }
        _modalEvents.tryEmit(Unit)
    }

    /** Faol eslatmaga summa/vaqt qo‘shish (debt poll). */
    suspend fun enrichPaymentDetails(
        amount: Double? = null,
        collectedAtMs: Long? = null,
        orderId: String? = null,
        paymentId: String? = null,
    ) {
        context.paymentPhotoAlertDataStore.edit { prefs ->
            if (amount != null && amount > 0) prefs[amountKey] = amount
            if (collectedAtMs != null && collectedAtMs > 0) prefs[collectedAtMsKey] = collectedAtMs
            if (!orderId.isNullOrBlank()) prefs[orderIdKey] = orderId
            if (!paymentId.isNullOrBlank() && !paymentId.startsWith("ord-")) {
                prefs[paymentIdKey] = paymentId
            }
        }
    }

    /**
     * Push kelmasa ham: yangi to‘lovlar (oxirgi 30 daqiqa) → modal.
     * Birinchi sync — faqat bootstrap (eski to‘lovlar modal ochmaydi).
     */
    suspend fun ingestRecentPayments(payments: List<RecentPaymentSignal>) {
        if (payments.isEmpty()) return
        val prefsSnap = context.paymentPhotoAlertDataStore.data.first()
        val bootstrapped = prefsSnap[bootstrapDoneKey] == true
        val handled = prefsSnap[handledPaymentIdsKey].orEmpty().toMutableSet()
        val now = System.currentTimeMillis()

        if (!bootstrapped) {
            val freshOnBoot = payments.filter { p ->
                p.id.isNotBlank() && now - p.createdAtMs in 0..TTL_MS
            }
            val newest = freshOnBoot.maxByOrNull { it.createdAtMs }
            context.paymentPhotoAlertDataStore.edit { prefs ->
                prefs[bootstrapDoneKey] = true
                prefs[handledPaymentIdsKey] = payments.map { it.id }.toSet()
                if (newest != null) {
                    prefs[expiresAtKey] = now + TTL_MS
                    prefs[modalDismissedKey] = false
                    val oid = newest.orderId
                    if (!oid.isNullOrBlank()) prefs[orderIdKey] = oid else prefs.remove(orderIdKey)
                    val pid = newest.id.takeIf { it.isNotBlank() && !it.startsWith("ord-") }
                    if (pid != null) prefs[paymentIdKey] = pid else prefs.remove(paymentIdKey)
                    writePaymentMeta(prefs, newest.amount, newest.createdAtMs)
                }
            }
            if (newest != null) _modalEvents.tryEmit(Unit)
            return
        }

        val fresh = payments.filter { p ->
            p.id.isNotBlank() &&
                p.id !in handled &&
                now - p.createdAtMs in 0..TTL_MS
        }
        if (fresh.isEmpty()) return

        val newest = fresh.maxByOrNull { it.createdAtMs } ?: return
        handled.addAll(fresh.map { it.id })
        context.paymentPhotoAlertDataStore.edit { prefs ->
            prefs[handledPaymentIdsKey] = handled.takeLast(80).toSet()
            prefs[expiresAtKey] = now + TTL_MS
            prefs[modalDismissedKey] = false
            val oid = newest.orderId
            if (!oid.isNullOrBlank()) prefs[orderIdKey] = oid else prefs.remove(orderIdKey)
            val pid = newest.id.takeIf { it.isNotBlank() && !it.startsWith("ord-") }
            if (pid != null) prefs[paymentIdKey] = pid else prefs.remove(paymentIdKey)
            writePaymentMeta(prefs, newest.amount, newest.createdAtMs)
        }
        _modalEvents.tryEmit(Unit)
    }

    private fun writePaymentMeta(
        prefs: androidx.datastore.preferences.core.MutablePreferences,
        amount: Double?,
        collectedAtMs: Long?,
    ) {
        if (amount != null && amount > 0) prefs[amountKey] = amount
        if (collectedAtMs != null && collectedAtMs > 0) prefs[collectedAtMsKey] = collectedAtMs
    }

    /** Yo‘ldagi buyurtma yetkazilganda (pushsiz). */
    suspend fun onOrderDelivered(orderId: String) {
        val key = "ord-$orderId"
        val handled = context.paymentPhotoAlertDataStore.data.first()[handledPaymentIdsKey].orEmpty()
        if (key in handled) return
        recordPaymentReceived(orderId = orderId, paymentId = key)
    }

    suspend fun dismissModal() {
        context.paymentPhotoAlertDataStore.edit { prefs ->
            prefs[modalDismissedKey] = true
        }
    }

    /** Rasm muvaffaqiyatli yuklangach — eslatmani to‘liq yopish. */
    suspend fun clearAlert() {
        context.paymentPhotoAlertDataStore.edit { prefs ->
            prefs.remove(expiresAtKey)
            prefs.remove(modalDismissedKey)
            prefs.remove(orderIdKey)
            prefs.remove(paymentIdKey)
            prefs.remove(amountKey)
            prefs.remove(collectedAtMsKey)
        }
    }

    suspend fun clearIfExpired() {
        context.paymentPhotoAlertDataStore.edit { prefs ->
            val expiresAt = prefs[expiresAtKey] ?: 0L
            if (expiresAt <= System.currentTimeMillis()) {
                prefs.remove(expiresAtKey)
                prefs.remove(modalDismissedKey)
                prefs.remove(orderIdKey)
                prefs.remove(paymentIdKey)
                prefs.remove(amountKey)
                prefs.remove(collectedAtMsKey)
            }
        }
    }

    companion object {
        const val TTL_MS = 30L * 60L * 1000L
        const val EXTRA_TYPE = "push_type"
        const val EXTRA_ORDER_ID = "orderId"
        const val EXTRA_PAYMENT_ID = "paymentId"
        const val EXTRA_AMOUNT = "amount"
        const val EXTRA_COLLECTED_AT = "collectedAt"
        const val TYPE_PAYMENT = "payment"

        fun parseAmount(raw: String?): Double? {
            if (raw.isNullOrBlank()) return null
            val cleaned = raw.replace(" ", "").replace(",", "").replace('\u00A0', ' ').trim()
            return cleaned.toDoubleOrNull()?.takeIf { it > 0 }
        }

        fun parseCreatedAtMs(iso: String?): Long? {
            if (iso.isNullOrBlank()) return null
            return runCatching { Instant.parse(iso).toEpochMilli() }.getOrNull()
        }

        /** Intent / FCM extras dan to‘lov pushini aniqlash. */
        fun isPaymentPushExtras(
            type: String?,
            title: String?,
            body: String?,
            orderId: String?,
            paymentId: String?,
        ): Boolean {
            if (type.equals(TYPE_PAYMENT, ignoreCase = true)) return true
            if (!paymentId.isNullOrBlank()) return true
            val blob = "${title.orEmpty()}\n${body.orEmpty()}"
            if (blob.contains("To'lov qabul", ignoreCase = true)) return true
            if (blob.contains("Тўлов қабул", ignoreCase = true)) return true
            if (blob.contains("Оплата получена", ignoreCase = true)) return true
            if (blob.contains("Платёж получен", ignoreCase = true)) return true
            if (blob.contains("Payment received", ignoreCase = true)) return true
            if (blob.contains("Dostavkachi", ignoreCase = true)) return true
            if (blob.contains("Доставщик", ignoreCase = true)) return true
            if (blob.contains("xavfsizlik", ignoreCase = true)) return true
            if (blob.contains("безопасн", ignoreCase = true)) return true
            // Ba'zi OEM faqat orderId qoldiradi
            if (!orderId.isNullOrBlank() && type.isNullOrBlank() && blob.isNotBlank()) return true
            return false
        }
    }
}

private fun <T> Collection<T>.takeLast(n: Int): List<T> {
    if (size <= n) return toList()
    return drop(size - n)
}
