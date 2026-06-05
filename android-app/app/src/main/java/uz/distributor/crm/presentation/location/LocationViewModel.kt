package uz.distributor.crm.presentation.location

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.local.AgentLocationHolder
import uz.distributor.crm.data.remote.TrackingSocketManager
import uz.distributor.crm.data.repository.AppSettingsRepository
import uz.distributor.crm.data.repository.ClientRepository
import uz.distributor.crm.domain.model.Client
import uz.distributor.crm.domain.model.LocationPoint
import uz.distributor.crm.localization.AppLanguage
import javax.inject.Inject

data class LocationUiState(
    val clients: List<Client> = emptyList(),
    val agentLocation: LocationPoint? = null,
    val selectedClient: Client? = null,
    val selectedDay: String = "today",
    val sheetFraction: Float = 0.42f,
    val isLoading: Boolean = true,
    val socketConnected: Boolean = false,
)

@HiltViewModel
class LocationViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
    private val agentLocationHolder: AgentLocationHolder,
    private val trackingSocket: TrackingSocketManager,
    private val appSettingsRepository: AppSettingsRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LocationUiState())
    val uiState: StateFlow<LocationUiState> = _uiState.asStateFlow()

    val darkMode: StateFlow<Boolean> = appSettingsRepository.darkMode.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = false,
    )

    init {
        trackingSocket.connect()
        viewModelScope.launch {
            agentLocationHolder.location
                .distinctUntilChanged { a, b ->
                    if (a == null && b == null) return@distinctUntilChanged true
                    if (a == null || b == null) return@distinctUntilChanged false
                    kotlin.math.abs(a.latitude - b.latitude) < 0.0002 &&
                        kotlin.math.abs(a.longitude - b.longitude) < 0.0002
                }
                .collect { loc ->
                    _uiState.update { it.copy(agentLocation = loc) }
                }
        }
        loadClients()
    }

    fun loadClients() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val clients = clientRepository.getClients(forceRefresh = true)
            _uiState.update { it.copy(clients = clients, isLoading = false) }
        }
    }

    fun selectClient(client: Client) {
        _uiState.update { it.copy(selectedClient = client) }
    }

    fun setSelectedDay(day: String) {
        _uiState.update { it.copy(selectedDay = day) }
    }

    fun updateSheetFraction(fraction: Float) {
        _uiState.update { it.copy(sheetFraction = fraction.coerceIn(0.22f, 0.72f)) }
    }

    fun toggleDarkMode() {
        viewModelScope.launch { appSettingsRepository.toggleDarkMode() }
    }

    fun setLanguage(language: AppLanguage) {
        viewModelScope.launch { appSettingsRepository.setLanguage(language) }
    }

    fun filteredClients(): List<Client> = _uiState.value.clients
}
