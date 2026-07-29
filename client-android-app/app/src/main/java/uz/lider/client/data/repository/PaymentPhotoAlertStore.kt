package uz.lider.client.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.map
import uz.lider.client.BuildConfig
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

@Singleton
class PaymentPhotoAlertStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val expiresAtKey = longPreferencesKey("expires_at_ms")
    private val modalDismissedKey = booleanPreferencesKey("modal_dismissed")
    private val orderIdKey = stringPreferencesKey("order_id")
    /** Yo‘ldagi xarita banneri — shu versionCode da yopilgan */
    private val mapHintDismissedVersionKey = intPreferencesKey("map_hint_dismissed_version")

    private val _modalEvents = MutableSharedFlow<Unit>(extraBufferCapacity = 4)
    /** Yangi to‘lov push — modalni darhol ko‘rsatish */
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

    /** Yo‘ldagi xarita ogohlantirishi — ilova yangilanmaguncha yopiq qoladi */
    val showMapRoutePayHint: Flow<Boolean> = context.paymentPhotoAlertDataStore.data.map { prefs ->
        (prefs[mapHintDismissedVersionKey] ?: 0) != BuildConfig.VERSION_CODE
    }

    suspend fun dismissMapRoutePayHint() {
        context.paymentPhotoAlertDataStore.edit { prefs ->
            prefs[mapHintDismissedVersionKey] = BuildConfig.VERSION_CODE
        }
    }

    suspend fun recordPaymentReceived(orderId: String? = null) {
        val expiresAt = System.currentTimeMillis() + TTL_MS
        context.paymentPhotoAlertDataStore.edit { prefs ->
            prefs[expiresAtKey] = expiresAt
            prefs[modalDismissedKey] = false
            if (!orderId.isNullOrBlank()) {
                prefs[orderIdKey] = orderId
            } else {
                prefs.remove(orderIdKey)
            }
        }
        _modalEvents.tryEmit(Unit)
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
    }
}
