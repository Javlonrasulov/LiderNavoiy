package uz.lider.client.presentation.chat

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
import uz.lider.client.data.remote.ApiErrorMapper
import uz.lider.client.data.remote.dto.ChatMessageDto
import uz.lider.client.data.remote.dto.ConversationDto
import uz.lider.client.data.repository.AuthRepository
import uz.lider.client.data.repository.MessageRepository
import javax.inject.Inject

data class ChatUiState(
    val isLoading: Boolean = true,
    val conversation: ConversationDto? = null,
    val messages: List<ChatMessageDto> = emptyList(),
    val myUserId: String? = null,
    val contactName: String = "",
    val contactPosition: String = "",
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
) : ViewModel() {

    private val otherUserId: String = savedStateHandle.get<String>("userId").orEmpty()
    private val fallbackName: String = savedStateHandle.get<String>("name").orEmpty()
    private val fallbackPosition: String = savedStateHandle.get<String>("position").orEmpty()

    private val _uiState = MutableStateFlow(
        ChatUiState(contactName = fallbackName, contactPosition = fallbackPosition),
    )
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
                val convId = _uiState.value.conversation?.id ?: return@collect
                if (event.message.conversationId != convId) return@collect
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
                val convId = _uiState.value.conversation?.id ?: return@collect
                if (event.conversationId != convId) return@collect
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
                val convId = _uiState.value.conversation?.id ?: return@collect
                if (event.conversationId != convId) return@collect
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
        if (otherUserId.isBlank()) {
            _uiState.update { it.copy(isLoading = false, error = "chat_error") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            reloadQuiet()
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    suspend fun refresh() {
        reloadQuiet()
    }

    private suspend fun reloadQuiet() {
        if (otherUserId.isBlank()) return
        try {
            val conv = messageRepository.startConversation(otherUserId)
            val messages = messageRepository.getMessages(conv.id)
            messageRepository.markRead(conv.id)
            _uiState.update {
                it.copy(
                    conversation = conv,
                    messages = messages.sortedBy { m -> m.createdAt },
                    contactName = conv.otherUser.fullName.ifBlank { fallbackName },
                    contactPosition = fallbackPosition,
                    error = null,
                )
            }
        } catch (e: Exception) {
            _uiState.update { it.copy(error = ApiErrorMapper.toKey(e)) }
        }
    }

    fun send(text: String) {
        val trimmed = text.trim()
        val convId = _uiState.value.conversation?.id ?: return
        if (trimmed.isEmpty()) return
        viewModelScope.launch {
            _uiState.update { it.copy(sending = true) }
            try {
                val msg = messageRepository.sendMessage(convId, trimmed)
                _uiState.update { state ->
                    state.copy(messages = appendMessage(state.messages, msg))
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = ApiErrorMapper.toKey(e)) }
            } finally {
                _uiState.update { it.copy(sending = false) }
            }
        }
    }

    fun sendFile(uri: Uri, caption: String = "") {
        val convId = _uiState.value.conversation?.id ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(sending = true) }
            try {
                val msg = messageRepository.uploadAndSend(convId, uri, caption)
                _uiState.update { state ->
                    state.copy(messages = appendMessage(state.messages, msg))
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = ApiErrorMapper.toKey(e)) }
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
        val convId = state.conversation?.id ?: return
        if (state.selectedIds.isEmpty() || state.deleting) return
        viewModelScope.launch {
            _uiState.update { it.copy(deleting = true) }
            try {
                val ids = state.selectedIds.toList()
                messageRepository.deleteMessages(convId, ids, forEveryone && canDeleteForAll())
                _uiState.update {
                    it.copy(
                        messages = it.messages.filter { m -> m.id !in ids },
                        selectedIds = emptySet(),
                        deleting = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(deleting = false, error = ApiErrorMapper.toKey(e)) }
            }
        }
    }
}
