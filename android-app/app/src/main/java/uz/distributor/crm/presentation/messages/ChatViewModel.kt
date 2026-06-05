package uz.distributor.crm.presentation.messages

import android.net.Uri
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.dto.ChatMessageDto
import uz.distributor.crm.data.remote.dto.ConversationDto
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.MessageRepository
import uz.distributor.crm.data.repository.MessagesRealtimeCoordinator
import javax.inject.Inject

data class ChatUiState(
    val isLoading: Boolean = true,
    val conversation: ConversationDto? = null,
    val messages: List<ChatMessageDto> = emptyList(),
    val myUserId: String? = null,
    val sending: Boolean = false,
    val deleting: Boolean = false,
    val selectedIds: Set<String> = emptySet(),
    val error: String? = null,
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val messageRepository: MessageRepository,
    private val authRepository: AuthRepository,
    private val realtime: MessagesRealtimeCoordinator,
) : ViewModel() {

    private val conversationId: String = savedStateHandle.get<String>("conversationId") ?: ""

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    init {
        messageRepository.connectSocket()
        viewModelScope.launch {
            authRepository.getUserFlow().collect { user ->
                _uiState.update { it.copy(myUserId = user?.id) }
            }
        }
        viewModelScope.launch {
            messageRepository.socketEvents.collect { event ->
                if (event.message.conversationId != conversationId) return@collect
                _uiState.update { state ->
                    state.copy(
                        messages = appendMessage(state.messages, event.message),
                        conversation = event.conversation ?: state.conversation,
                    )
                }
            }
        }
        viewModelScope.launch {
            messageRepository.deletedSocketEvents.collect { event ->
                if (event.conversationId != conversationId) return@collect
                _uiState.update { state ->
                    state.copy(
                        messages = state.messages.filter { it.id !in event.messageIds },
                        selectedIds = state.selectedIds - event.messageIds.toSet(),
                        conversation = event.conversation ?: state.conversation,
                    )
                }
            }
        }
        viewModelScope.launch {
            messageRepository.readSocketEvents.collect { event ->
                if (event.conversationId != conversationId) return@collect
                _uiState.update { state ->
                    state.copy(
                        messages = state.messages.map { msg ->
                            if (msg.id in event.messageIds) msg.copy(isRead = true) else msg
                        },
                    )
                }
            }
        }
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val messages = messageRepository.getMessages(conversationId)
                val convs = messageRepository.getConversations()
                val conv = convs.find { it.id == conversationId }
                messageRepository.markRead(conversationId)
                realtime.refresh()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        messages = messages.sortedBy { m -> m.createdAt },
                        conversation = conv,
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun send(text: String) {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return
        viewModelScope.launch {
            _uiState.update { it.copy(sending = true) }
            try {
                val msg = messageRepository.sendMessage(conversationId, trimmed)
                _uiState.update { state ->
                    state.copy(messages = appendMessage(state.messages, msg))
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            } finally {
                _uiState.update { it.copy(sending = false) }
            }
        }
    }

    fun sendFile(uri: Uri, caption: String = "") {
        viewModelScope.launch {
            _uiState.update { it.copy(sending = true) }
            try {
                val msg = messageRepository.uploadAndSend(conversationId, uri, caption)
                _uiState.update { state ->
                    state.copy(messages = appendMessage(state.messages, msg))
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            } finally {
                _uiState.update { it.copy(sending = false) }
            }
        }
    }

    fun resolveFileUrl(path: String?) = messageRepository.resolveFileUrl(path)

    private fun appendMessage(
        current: List<ChatMessageDto>,
        incoming: ChatMessageDto,
    ): List<ChatMessageDto> {
        if (current.any { it.id == incoming.id }) return current
        return (current + incoming).sortedBy { it.createdAt }
    }

    fun toggleSelection(messageId: String) {
        _uiState.update { state ->
            val next = state.selectedIds.toMutableSet()
            if (next.contains(messageId)) next.remove(messageId) else next.add(messageId)
            state.copy(selectedIds = next)
        }
    }

    fun clearSelection() {
        _uiState.update { it.copy(selectedIds = emptySet()) }
    }

    fun canDeleteForAll(): Boolean {
        val state = _uiState.value
        val myId = state.myUserId ?: return false
        return state.selectedIds.any { id ->
            state.messages.find { it.id == id }?.senderId == myId
        }
    }

    fun deleteSelected(forEveryone: Boolean) {
        val state = _uiState.value
        if (state.selectedIds.isEmpty() || state.deleting) return
        viewModelScope.launch {
            _uiState.update { it.copy(deleting = true) }
            try {
                val ids = state.selectedIds.toList()
                messageRepository.deleteMessages(conversationId, ids, forEveryone && canDeleteForAll())
                _uiState.update {
                    it.copy(
                        messages = it.messages.filter { m -> m.id !in ids },
                        selectedIds = emptySet(),
                        deleting = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(deleting = false, error = e.message) }
            }
        }
    }
}
