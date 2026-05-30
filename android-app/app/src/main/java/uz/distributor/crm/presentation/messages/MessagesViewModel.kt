package uz.distributor.crm.presentation.messages

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.dto.ChatContactDto
import uz.distributor.crm.data.remote.dto.ConversationDto
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.MessageRepository
import uz.distributor.crm.data.repository.MessagesRealtimeCoordinator
import javax.inject.Inject

data class MessagesUiState(
    val isLoading: Boolean = true,
    val conversations: List<ConversationDto> = emptyList(),
    val contacts: List<ChatContactDto> = emptyList(),
    val myUserId: String? = null,
    val error: String? = null,
    val showContactPicker: Boolean = false,
)

@HiltViewModel
class MessagesViewModel @Inject constructor(
    private val messageRepository: MessageRepository,
    private val authRepository: AuthRepository,
    private val realtime: MessagesRealtimeCoordinator,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MessagesUiState())
    val uiState: StateFlow<MessagesUiState> = _uiState.asStateFlow()

    init {
        realtime.start()
        viewModelScope.launch {
            authRepository.getUserFlow().collect { user ->
                _uiState.update { it.copy(myUserId = user?.id) }
            }
        }
        viewModelScope.launch {
            combine(
                realtime.conversations,
                realtime.loadError,
                realtime.isRefreshing,
            ) { convs, err, refreshing ->
                Triple(convs, err, refreshing)
            }.collect { (convs, err, refreshing) ->
                _uiState.update {
                    it.copy(
                        isLoading = refreshing && convs.isEmpty(),
                        conversations = convs,
                        error = err,
                    )
                }
            }
        }
    }

    fun load() {
        realtime.refresh()
    }

    fun openContactPicker() {
        viewModelScope.launch {
            try {
                val contacts = messageRepository.getContacts()
                _uiState.update { it.copy(contacts = contacts, showContactPicker = true) }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    fun dismissContactPicker() {
        _uiState.update { it.copy(showContactPicker = false) }
    }

    fun startConversation(userId: String, onReady: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val conv = messageRepository.startConversation(userId)
                dismissContactPicker()
                realtime.refresh()
                onReady(conv.id)
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
}
