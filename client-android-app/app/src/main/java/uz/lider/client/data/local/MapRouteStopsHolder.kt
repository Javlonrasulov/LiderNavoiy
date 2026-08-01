package uz.lider.client.data.local

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Tochkalarni o‘chirish holati — Asosiy dan boshqa sahifaga o‘tib qaytganda ham saqlanadi.
 */
@Singleton
class MapRouteStopsHolder @Inject constructor() {
    private val _hideCompanyIds = MutableStateFlow<Set<String>>(emptySet())
    val hideCompanyIds: StateFlow<Set<String>> = _hideCompanyIds.asStateFlow()

    fun setHideCompanyIds(ids: Set<String>) {
        _hideCompanyIds.value = ids
    }

    fun clear() {
        _hideCompanyIds.value = emptySet()
    }
}
