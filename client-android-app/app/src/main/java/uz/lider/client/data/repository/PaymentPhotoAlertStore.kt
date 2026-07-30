package uz.lider.client.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
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
import uz.lider.client.BuildConfig
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

private val Context.paymentPhotoAlertDataStore: DataStore<Preferences> by preferencesDataStore(
    "payment_photo_alert",
)

data class PaymentPhotoAlertState(
    /** Hali 30 daqiqa ichida — banner / modal asosi */
    val isActive: Boolean = false,
    /** Modal X bilan yopilgan — banner To‘lov sahifasida qoladi */
    val modalDismissed: Boolean = false,
    val orderId: String? = null,
    val expiresAtMs: Long = 0L,
) {
    val shouldShowModal: Boolean get() = isActive && !modalDismissed
}

data class RecentPaymentSignal(
    val id: String,
    val orderId: String? = null,
    val createdAtMs: Long,
)

@Singleton
class PaymentPhotoAlertStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val expiresAtKey = longPreferencesKey("expires_at_ms")
    private val modalDismissedKey = booleanPreferencesKey("modal_dismissed")
    private val orderIdKey = stringPreferencesKey("order_id")
    private val mapHintDismissedVersionKey = intPreferencesKey("map_hint_dismissed_version")
    private val handledPaymentIdsKey = stringSetPreferencesKey("handled_payment_ids")
    private val bootstrapDoneKey = booleanPreferencesKey("payments_bootstrap_done")

    private val _modalEvents = MutableSharedFlow<Unit>(extraBufferCapacity = 4)
    val modalEvents: SharedFlow<Unit> = _modalEvents.asSharedFlow()

    val state: Flow<PaymentPhotoAlertState> = context.paymentPhotoAlertDataStore.data.map { prefs ->
        val expiresAt = prefs[expiresAtKey] ?: 0L
        val active = expiresAt > System.currentTimeMillis()
        PaymentPhotoAlertState(
            isActive = active,
            modalDismissed = if (active) prefs[modalDismissedKey] == true else false,
            orderId = prefs[orderIdKey],
            expiresAtMs = expiresAt,
        )
    }

    val showMapRoutePayHint: Flow<Boolean> = context.paymentPhotoAlertDataStore.data.map { prefs ->
        (prefs[mapHintDismissedVersionKey] ?: 0) != BuildConfig.VERSION_CODE
    }

    suspend fun dismissMapRoutePayHint() {
        context.paymentPhotoAlertDataStore.edit { prefs ->
            prefs[mapHintDismissedVersionKey] = BuildConfig.VERSION_CODE
        }
    }

    /** Push / FCM / intent — modal majburiy. */
    suspend fun recordPaymentReceived(orderId: String? = null, paymentId: String? = null) {
        context.paymentPhotoAlertDataStore.edit { prefs ->
            prefs[expiresAtKey] = System.currentTimeMillis() + TTL_MS
            prefs[modalDismissedKey] = false
            if (!orderId.isNullOrBlank()) {
                prefs[orderIdKey] = orderId
            } else {
                prefs.remove(orderIdKey)
            }
            if (!paymentId.isNullOrBlank()) {
                val handled = prefs[handledPaymentIdsKey].orEmpty().toMutableSet()
                handled.add(paymentId)
                prefs[handledPaymentIdsKey] = handled.takeLast(80).toSet()
            }
        }
        _modalEvents.tryEmit(Unit)
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
            context.paymentPhotoAlertDataStore.edit { prefs ->
                prefs[bootstrapDoneKey] = true
                prefs[handledPaymentIdsKey] = payments.map { it.id }.toSet()
            }
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
        }
        _modalEvents.tryEmit(Unit)
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

    suspend fun clearIfExpired() {
        context.paymentPhotoAlertDataStore.edit { prefs ->
            val expiresAt = prefs[expiresAtKey] ?: 0L
            if (expiresAt <= System.currentTimeMillis()) {
                prefs.remove(expiresAtKey)
                prefs.remove(modalDismissedKey)
                prefs.remove(orderIdKey)
            }
        }
    }

    companion object {
        const val TTL_MS = 30L * 60L * 1000L
        const val EXTRA_TYPE = "push_type"
        const val EXTRA_ORDER_ID = "orderId"
        const val TYPE_PAYMENT = "payment"

        fun parseCreatedAtMs(iso: String?): Long? {
            if (iso.isNullOrBlank()) return null
            return runCatching { Instant.parse(iso).toEpochMilli() }.getOrNull()
        }
    }
}

private fun <T> Collection<T>.takeLast(n: Int): List<T> {
    if (size <= n) return toList()
    return drop(size - n)
}
