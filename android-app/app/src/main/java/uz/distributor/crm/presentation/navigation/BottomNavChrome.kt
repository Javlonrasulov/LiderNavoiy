package uz.distributor.crm.presentation.navigation

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Ba'zi sahifalar (masalan Mahsulotlar) scroll paytida pastki navbar ni yashirish uchun.
 */
object BottomNavChrome {
    private val _visible = MutableStateFlow(true)
    val visible: StateFlow<Boolean> = _visible.asStateFlow()

    fun setVisible(visible: Boolean) {
        if (_visible.value != visible) _visible.value = visible
    }

    fun reset() {
        _visible.value = true
    }
}
