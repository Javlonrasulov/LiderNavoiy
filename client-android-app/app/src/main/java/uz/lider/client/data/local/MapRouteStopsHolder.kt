package uz.lider.client.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

private val Context.mapRouteStopsDataStore by preferencesDataStore("map_route_stops")

/**
 * Tochkalarni o‘chirish — logout / qayta ochishda ham saqlanadi.
 * Yangi yo‘ldagi buyurtma paydo bo‘lsa — shu org uchun yana default ko‘rinadi.
 */
@Singleton
class MapRouteStopsHolder @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val hideKeysKey = stringSetPreferencesKey("hide_company_keys")
    private val knownOnWayIdsKey = stringSetPreferencesKey("known_on_way_order_ids")
    private val mutex = Mutex()
    private var loaded = false

    private val _hideCompanyIds = MutableStateFlow<Set<String>>(emptySet())
    val hideCompanyIds: StateFlow<Set<String>> = _hideCompanyIds.asStateFlow()

    private var knownOnWayOrderIds: Set<String> = emptySet()

    private suspend fun ensureLoaded() {
        if (loaded) return
        mutex.withLock {
            if (loaded) return
            val prefs = context.mapRouteStopsDataStore.data.first()
            _hideCompanyIds.value = prefs[hideKeysKey].orEmpty()
            knownOnWayOrderIds = prefs[knownOnWayIdsKey].orEmpty()
            loaded = true
        }
    }

    suspend fun setHideCompanyIds(ids: Set<String>) {
        ensureLoaded()
        mutex.withLock {
            _hideCompanyIds.value = ids
            persistLocked()
        }
    }

    /**
     * @param keysByOrderId har bir yo‘ldagi buyurtma uchun hide kalitlari (companyId, shortName, vehicleId)
     */
    suspend fun syncOnWayOrders(
        currentOnWayIds: Set<String>,
        keysByOrderId: Map<String, Set<String>>,
    ) {
        ensureLoaded()
        mutex.withLock {
            val newly = currentOnWayIds - knownOnWayOrderIds
            var hide = _hideCompanyIds.value
            if (newly.isNotEmpty()) {
                val unhideKeys = newly.flatMap { keysByOrderId[it].orEmpty() }.toSet()
                if (unhideKeys.isNotEmpty()) {
                    hide = hide - unhideKeys
                }
            }
            _hideCompanyIds.value = hide
            knownOnWayOrderIds = currentOnWayIds
            persistLocked()
        }
    }

    private suspend fun persistLocked() {
        val hide = _hideCompanyIds.value
        val known = knownOnWayOrderIds
        context.mapRouteStopsDataStore.edit { prefs ->
            prefs[hideKeysKey] = hide
            prefs[knownOnWayIdsKey] = known
        }
    }
}
