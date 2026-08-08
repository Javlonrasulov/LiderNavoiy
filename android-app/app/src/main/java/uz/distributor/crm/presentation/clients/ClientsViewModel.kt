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
import uz.distributor.crm.util.VisitSchedule
import javax.inject.Inject

enum class ClientsListTab { SCHEDULE, ROUTE_DROPS, SEARCH }

data class ClientsUiState(
    val clients: List<Client> = emptyList(),
    val isLoading: Boolean = true,
    val searchQuery: String = "",
    val error: String? = null,
    val selectedDay: Int = VisitSchedule.todayVisitDay().let { if (it == 7) 0 else it },
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
    private var daysByLineCode: Map<String, List<Int>> = emptyMap()

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
                val lines = runCatching { clientRepository.getLines() }.getOrDefault(emptyList())
                daysByLineCode = VisitSchedule.buildDaysByLineCode(
                    lines.map { it.code to it.visitDays },
                )
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
                val visitDay = VisitSchedule.fromCalendarIndex(state.selectedDay)
                val byDay = list.filter {
                    VisitSchedule.clientMatchesDay(it, visitDay, daysByLineCode)
                }
                // Agar liniya kunlari sozlangan bo‘lsa — faqat shu kun mijozlari.
                // Aks holda (hech narsa topilmasa) eski usul: barcha mijozlar.
                list = if (byDay.isNotEmpty() || daysByLineCode.isNotEmpty()) byDay else list
            }
        }
        _uiState.update { it.copy(clients = list, dayClientCounts = dayCounts) }
    }

    private fun countClientsByDay(source: List<Client>): Map<Int, Int> {
        val counts = mutableMapOf<Int, Int>()
        for (day in 0..6) {
            val visitDay = VisitSchedule.fromCalendarIndex(day)
            counts[day] = source.count {
                VisitSchedule.clientMatchesDay(it, visitDay, daysByLineCode)
            }
        }
        return counts
    }
}
