package uz.lider.client.data.repository

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import uz.lider.client.data.remote.ApiService
import uz.lider.client.domain.model.AppNotification
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationsRepository @Inject constructor(
    private val api: ApiService,
) {
    private val _items = MutableStateFlow<List<AppNotification>>(emptyList())
    val items: StateFlow<List<AppNotification>> = _items.asStateFlow()

    private val _unreadCount = MutableStateFlow(0)
    val unreadCount: StateFlow<Int> = _unreadCount.asStateFlow()

    suspend fun refresh() {
        runCatching {
            val list = api.getNotifications().map {
                AppNotification(
                    id = it.id,
                    title = it.title,
                    body = it.body,
                    type = it.type.orEmpty(),
                    isRead = it.isRead,
                    createdAt = it.createdAt,
                )
            }
            _items.value = list
            _unreadCount.value = list.count { !it.isRead }
        }.onFailure {
            runCatching {
                _unreadCount.value = api.getUnreadNotificationCount().count
            }
        }
    }

    suspend fun markRead(id: String) {
        runCatching { api.markNotificationRead(id) }
        _items.update { list ->
            list.map { if (it.id == id) it.copy(isRead = true) else it }
        }
        _unreadCount.value = _items.value.count { !it.isRead }
    }

    suspend fun markAllRead() {
        runCatching { api.markAllNotificationsRead() }
        _items.update { list -> list.map { it.copy(isRead = true) } }
        _unreadCount.value = 0
    }
}
