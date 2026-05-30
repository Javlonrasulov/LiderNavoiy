package uz.distributor.crm.presentation.messages

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.dto.ConversationDto
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.MessageRepository
import javax.inject.Inject

data class MessagesUiState(
    val isLoading: Boolean = true,
    val conversations: List<ConversationDto> = emptyList(),
    val myUserId: String? = null,
    val error: String? = null,
)

@HiltViewModel
class MessagesViewModel @Inject constructor(
    private val messageRepository: MessageRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MessagesUiState())
    val uiState: StateFlow<MessagesUiState> = _uiState.asStateFlow()

    init {
        messageRepository.connectSocket()
        viewModelScope.launch {
            authRepository.getUserFlow().collect { user ->
                _uiState.update { it.copy(myUserId = user?.id) }
            }
        }
        viewModelScope.launch {
            messageRepository.socketEvents.collect { event ->
                val conv = event.conversation
                if (conv == null) {
                    load()
                    return@collect
                }
                _uiState.update { state ->
                    val idx = state.conversations.indexOfFirst { it.id == conv.id }
                    val updated = if (idx >= 0) {
                        state.conversations.toMutableList().apply { this[idx] = conv }
                    } else {
                        listOf(conv) + state.conversations
                    }
                    state.copy(
                        conversations = updated.sortedByDescending { it.updatedAt },
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
                var convs = messageRepository.getConversations()
                if (convs.isEmpty()) {
                    val contacts = messageRepository.getContacts()
                    contacts.firstOrNull()?.let { contact ->
                        convs = listOf(messageRepository.startConversation(contact.id))
                    }
                }
                _uiState.update { it.copy(isLoading = false, conversations = convs) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun startConversation(userId: String, onReady: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val conv = messageRepository.startConversation(userId)
                _uiState.update { state ->
                    val exists = state.conversations.any { it.id == conv.id }
                    val list = if (exists) {
                        state.conversations.map { if (it.id == conv.id) conv else it }
                    } else {
                        listOf(conv) + state.conversations
                    }
                    state.copy(conversations = list)
                }
                onReady(conv.id)
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
    }
}
