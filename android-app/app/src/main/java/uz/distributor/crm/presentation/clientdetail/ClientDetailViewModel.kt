package uz.distributor.crm.presentation.clientdetail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.CartRepository
import uz.distributor.crm.data.repository.ClientRepository
import uz.distributor.crm.domain.model.Client
import javax.inject.Inject

data class ClientDetailUiState(
    val client: Client? = null,
    val isLoading: Boolean = true,
    val orderSubmitted: Boolean = false,
)

@HiltViewModel
class ClientDetailViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
    private val cartRepository: CartRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClientDetailUiState())
    val uiState = _uiState.asStateFlow()

    fun load(clientId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val client = clientRepository.getClient(clientId)
            _uiState.update { it.copy(client = client, isLoading = false) }
        }
    }

    fun startVisit(onReady: () -> Unit) {
        onReady()
    }
}
