package uz.distributor.crm.data.repository

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import uz.distributor.crm.data.remote.dto.ConversationDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MessagesRealtimeCoordinator @Inject constructor(
    private val messageRepository: MessageRepository,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private val _conversations = MutableStateFlow<List<ConversationDto>>(emptyList())
    val conversations: StateFlow<List<ConversationDto>> = _conversations.asStateFlow()

    private val _loadError = MutableStateFlow<String?>(null)
    val loadError: StateFlow<String?> = _loadError.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    @Volatile
    private var started = false

    fun start() {
        if (started) return
        started = true
        messageRepository.connectSocket()
        scope.launch {
            messageRepository.socketEvents.collect { event ->
                if (event.conversation != null) {
                    mergeConversation(event.conversation)
                } else {
                    refresh()
                }
            }
        }
        scope.launch { refresh() }
    }

    fun refresh() {
        scope.launch {
            _isRefreshing.value = true
            _loadError.value = null
            try {
                val convs = messageRepository.getConversations()
                _conversations.value = convs.sortedByDescending { it.updatedAt }
            } catch (e: Exception) {
                _loadError.value = when (e) {
                    is HttpException -> when (e.code()) {
                        401 -> "Sessiya tugadi — qayta kiring"
                        else -> "HTTP ${e.code()} ${e.message()}"
                    }
                    else -> e.message ?: "Serverga ulanib bo'lmadi"
                }
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    private fun mergeConversation(conv: ConversationDto) {
        val list = _conversations.value.toMutableList()
        val idx = list.indexOfFirst { it.id == conv.id }
        if (idx >= 0) list[idx] = conv else list.add(0, conv)
        _conversations.value = list.sortedByDescending { it.updatedAt }
    }
}
