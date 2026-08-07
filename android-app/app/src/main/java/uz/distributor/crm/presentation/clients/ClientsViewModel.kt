package uz.distributor.crm.presentation.clients

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.repository.AuthRepository
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
    /** 0=Yakshanba … 6=Shanba — kun bo‘yicha klientlar soni */
    val dayClientCounts: Map<Int, Int> = emptyMap(),
    val canAddClients: Boolean = false,
)

@HiltViewModel
class ClientsViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
    authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClientsUiState())
    val uiState = _uiState.asStateFlow()

    private var allClients: List<Client> = emptyList()

    init {
        viewModelScope.launch {
            authRepository.getUserFlow().collect { user ->
                _uiState.update { it.copy(canAddClients = user?.canAddClients() == true) }
            }
        }
        loadClients(force = true)
    }

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
        val dayCounts = countClientsByDay(source)
        if (state.searchQuery.length >= 2 && state.activeTab == ClientsListTab.SEARCH) {
            _uiState.update { it.copy(dayClientCounts = dayCounts) }
            return
        }

        var list = source
        when (state.activeTab) {
            ClientsListTab.ROUTE_DROPS -> list = list.filter { it.latitude == null || it.longitude == null }
            ClientsListTab.SEARCH -> if (state.searchQuery.isBlank()) list = emptyList()
            ClientsListTab.SCHEDULE -> {
                // selectedDay: 0=Yakshanba ... 6=Shanba (Calendar.DAY_OF_WEEK - 1)
                val dayKey = dayKeyFor(state.selectedDay)
                val byDay = list.filter { it.territory?.lowercase()?.trim() == dayKey }
                if (byDay.isNotEmpty()) list = byDay
            }
        }
        _uiState.update { it.copy(clients = list, dayClientCounts = dayCounts) }
    }

    private fun countClientsByDay(source: List<Client>): Map<Int, Int> {
        val counts = mutableMapOf<Int, Int>()
        for (day in 0..6) {
            val key = dayKeyFor(day)
            counts[day] = source.count { it.territory?.lowercase()?.trim() == key }
        }
        return counts
    }

    private fun dayKeyFor(day: Int): String = when (day) {
        0 -> "sunday"
        1 -> "monday"
        2 -> "tuesday"
        3 -> "wednesday"
        4 -> "thursday"
        5 -> "friday"
        else -> "saturday"
    }
}
