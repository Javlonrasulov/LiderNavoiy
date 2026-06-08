package uz.lider.client.presentation.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.NotificationsRepository
import javax.inject.Inject

object MockNotificationIds {
    const val ORDER = "1"
    const val PROMO = "2"
    const val PAYMENT = "3"

    val all = setOf(ORDER, PROMO, PAYMENT)
}

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val notificationsRepository: NotificationsRepository,
) : ViewModel() {

    val readIds: StateFlow<Set<String>> = notificationsRepository.readIds
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), setOf(MockNotificationIds.PAYMENT))

    fun markRead(id: String) {
        viewModelScope.launch { notificationsRepository.markRead(id) }
    }

    fun markAllRead() {
        viewModelScope.launch { notificationsRepository.markAllRead(MockNotificationIds.all) }
    }
}
