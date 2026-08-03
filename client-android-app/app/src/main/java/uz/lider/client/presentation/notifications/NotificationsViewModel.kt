package uz.lider.client.presentation.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.NotificationsRepository
import uz.lider.client.domain.model.AppNotification
import javax.inject.Inject

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val notificationsRepository: NotificationsRepository,
) : ViewModel() {

    val items: StateFlow<List<AppNotification>> = notificationsRepository.items
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val unreadCount: StateFlow<Int> = notificationsRepository.unreadCount
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch { notificationsRepository.refresh() }
    }

    suspend fun refreshSuspend() {
        notificationsRepository.refresh()
    }

    fun markRead(id: String) {
        viewModelScope.launch { notificationsRepository.markRead(id) }
    }

    fun markAllRead() {
        viewModelScope.launch { notificationsRepository.markAllRead() }
    }
}
