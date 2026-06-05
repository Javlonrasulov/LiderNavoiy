package uz.distributor.crm.presentation.clients

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.repository.ClientRepository
import uz.distributor.crm.domain.model.Client
import java.util.Calendar
import javax.inject.Inject

enum class ClientsListTab { SCHEDULE, ROUTE_DROPS, SEARCH }

data class ClientsUiState(
    val clients: List<Client> = emptyList(),
    val isLoading: Boolean = true,
    val searchQuery: String = "",
    val error: String? = null,
    val selectedDay: Int = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1,
    val activeTab: ClientsListTab = ClientsListTab.SCHEDULE,
)

@HiltViewModel
class ClientsViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClientsUiState())
    val uiState = _uiState.asStateFlow()

    private var allClients: List<Client> = emptyList()

    init { loadClients(force = true) }

    fun onSearchChange(q: String) {
        _uiState.update { it.copy(searchQuery = q) }
        if (q.length >= 2) search(q) else applyFilters(allClients)
    }

    fun setSelectedDay(day: Int) {
        _uiState.update { it.copy(selectedDay = day) }
        applyFilters(allClients)
    }

    fun setActiveTab(tab: ClientsListTab) {
        _uiState.update {
            it.copy(
                activeTab = tab,
                searchQuery = if (tab != ClientsListTab.SEARCH) "" else it.searchQuery,
            )
        }
        applyFilters(allClients)
    }

    fun refresh() = loadClients(force = true)

    fun filteredClients(): List<Client> = _uiState.value.clients

    private fun loadClients(force: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                allClients = clientRepository.getClients(force)
                applyFilters(allClients)
                _uiState.update { it.copy(isLoading = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = ApiErrorMapper.toKey(e)) }
            }
        }
    }

    private fun search(q: String) {
        viewModelScope.launch {
            val results = clientRepository.search(q)
            _uiState.update { it.copy(clients = results, isLoading = false) }
        }
    }

    private fun applyFilters(source: List<Client>) {
        val state = _uiState.value
        if (state.searchQuery.length >= 2 && state.activeTab == ClientsListTab.SEARCH) return

        var list = source
        when (state.activeTab) {
            ClientsListTab.ROUTE_DROPS -> list = list.filter { it.latitude == null || it.longitude == null }
            ClientsListTab.SEARCH -> if (state.searchQuery.isBlank()) list = emptyList()
            ClientsListTab.SCHEDULE -> Unit
        }
        _uiState.update { it.copy(clients = list) }
    }
}
