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
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.remote.dto.ChatContactDto
import uz.distributor.crm.data.remote.dto.ConversationDto
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.MessageRepository
import uz.distributor.crm.data.repository.MessagesRealtimeCoordinator
import javax.inject.Inject

enum class MessagesListTab { CHATS, CONTACTS, CLIENTS }

data class MessagesUiState(
    val isLoading: Boolean = true,
    val conversations: List<ConversationDto> = emptyList(),
    val contacts: List<ChatContactDto> = emptyList(),
    val contactsLoading: Boolean = false,
    val contactsLoaded: Boolean = false,
    val clientContacts: List<ChatContactDto> = emptyList(),
    val clientContactsLoading: Boolean = false,
    val clientContactsLoaded: Boolean = false,
    val selectedTab: MessagesListTab = MessagesListTab.CHATS,
    val myUserId: String? = null,
    val error: String? = null,
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

    fun selectTab(tab: MessagesListTab) {
        _uiState.update { it.copy(selectedTab = tab, error = null) }
        when (tab) {
            MessagesListTab.CONTACTS -> loadContacts(force = true)
            MessagesListTab.CLIENTS -> loadClientContacts(force = true)
            MessagesListTab.CHATS -> Unit
        }
    }

    fun loadContacts(force: Boolean = false) {
        if (!force && _uiState.value.contactsLoaded) return
        if (_uiState.value.contactsLoading) return
        viewModelScope.launch {
            _uiState.update { it.copy(contactsLoading = true, error = null) }
            try {
                val contacts = messageRepository.getContacts()
                _uiState.update {
                    it.copy(
                        contacts = contacts,
                        contactsLoaded = true,
                        contactsLoading = false,
                        error = null,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(contactsLoading = false, error = ApiErrorMapper.toKey(e))
                }
            }
        }
    }

    fun loadClientContacts(force: Boolean = false) {
        if (!force && _uiState.value.clientContactsLoaded) return
        if (_uiState.value.clientContactsLoading) return
        viewModelScope.launch {
            _uiState.update { it.copy(clientContactsLoading = true, error = null) }
            try {
                val clients = messageRepository.getClientContacts()
                _uiState.update {
                    it.copy(
                        clientContacts = clients,
                        clientContactsLoaded = true,
                        clientContactsLoading = false,
                        error = null,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(clientContactsLoading = false, error = ApiErrorMapper.toKey(e))
                }
            }
        }
    }

    fun startConversation(userId: String, onReady: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val conv = messageRepository.startConversation(userId)
                _uiState.update { it.copy(selectedTab = MessagesListTab.CHATS) }
                realtime.refresh()
                onReady(conv.id)
            } catch (e: Exception) {
                _uiState.update { it.copy(error = ApiErrorMapper.toKey(e)) }
            }
        }
    }
}
