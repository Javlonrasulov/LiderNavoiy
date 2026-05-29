package uz.distributor.crm.presentation.clients

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.ClientRepository
import uz.distributor.crm.domain.model.Client
import javax.inject.Inject

data class ClientsUiState(
    val clients: List<Client> = emptyList(),
    val isLoading: Boolean = true,
    val searchQuery: String = "",
    val error: String? = null,
)

@HiltViewModel
class ClientsViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClientsUiState())
    val uiState = _uiState.asStateFlow()

    init { loadClients() }

    fun onSearchChange(q: String) {
        _uiState.update { it.copy(searchQuery = q) }
        if (q.length >= 2) search(q) else loadClients()
    }

    fun refresh() = loadClients(force = true)

    private fun loadClients(force: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val clients = clientRepository.getClients(force)
                _uiState.update { it.copy(clients = clients, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    private fun search(q: String) {
        viewModelScope.launch {
            val results = clientRepository.search(q)
            _uiState.update { it.copy(clients = results, isLoading = false) }
        }
    }
}
