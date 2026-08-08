package uz.distributor.crm.presentation.location

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.local.AgentLocationHolder
import uz.distributor.crm.data.location.DeviceLocationProvider
import uz.distributor.crm.data.remote.TrackingSocketManager
import uz.distributor.crm.data.repository.AppSettingsRepository
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.ClientRepository
import uz.distributor.crm.data.repository.PushRepository
import uz.distributor.crm.domain.model.Client
import uz.distributor.crm.domain.model.LocationPoint
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.service.LocationTrackingController
import uz.distributor.crm.util.VisitSchedule
import javax.inject.Inject

data class LocationUiState(
    val clients: List<Client> = emptyList(),
    val agentLocation: LocationPoint? = null,
    val selectedClient: Client? = null,
    val selectedDay: String = "today",
    val sheetFraction: Float = 0.42f,
    val isLoading: Boolean = true,
    val socketConnected: Boolean = false,
    val daysByLineCode: Map<String, List<Int>> = emptyMap(),
)

@HiltViewModel
class LocationViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
    private val authRepository: AuthRepository,
    private val agentLocationHolder: AgentLocationHolder,
    private val deviceLocationProvider: DeviceLocationProvider,
    private val locationTrackingController: LocationTrackingController,
    private val trackingSocket: TrackingSocketManager,
    private val appSettingsRepository: AppSettingsRepository,
    private val pushRepository: PushRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LocationUiState())
    val uiState: StateFlow<LocationUiState> = _uiState.asStateFlow()

    private var isDeliveryUser: Boolean = false

    val darkMode: StateFlow<Boolean> = appSettingsRepository.darkMode.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = false,
    )

    init {
        trackingSocket.connect()
        viewModelScope.launch {
            authRepository.getUserFlow().collect { user ->
                isDeliveryUser = user?.isDeliveryPerson() == true
            }
        }
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
        ensureLocationTracking()
    }

    /** GPS servis + joriy joylashuv — marshrut shu nuqtadan chiziladi */
    fun ensureLocationTracking() {
        locationTrackingController.startIfReady()
        viewModelScope.launch {
            deviceLocationProvider.getCurrentLocation()
        }
    }

    fun refreshAgentLocation() = ensureLocationTracking()

    fun loadClients() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val lines = runCatching { clientRepository.getLines() }.getOrDefault(emptyList())
            val daysByLine = VisitSchedule.buildDaysByLineCode(
                lines.map { line ->
                    val days = if (isDeliveryUser) line.daysForDelivery() else line.daysForAgent()
                    line.code to days
                },
            )
            val clients = clientRepository.getClients(forceRefresh = true)
            _uiState.update {
                it.copy(clients = clients, daysByLineCode = daysByLine, isLoading = false)
            }
        }
    }

    fun refresh() {
        loadClients()
    }

    fun selectClient(client: Client) {
        _uiState.update { it.copy(selectedClient = client) }
        refreshAgentLocation()
    }

    fun clearSelection() {
        _uiState.update { it.copy(selectedClient = null) }
    }

    fun setSelectedDay(day: String) {
        _uiState.update { it.copy(selectedDay = day) }
    }

    fun updateSheetFraction(fraction: Float) {
        _uiState.update { it.copy(sheetFraction = fraction.coerceIn(0.22f, 0.88f)) }
    }

    fun toggleDarkMode() {
        viewModelScope.launch { appSettingsRepository.toggleDarkMode() }
    }

    fun setLanguage(language: AppLanguage) {
        viewModelScope.launch {
            appSettingsRepository.setLanguage(language)
            pushRepository.syncPreferredLanguage()
        }
    }

    fun filteredClients(): List<Client> {
        val state = _uiState.value
        val visitDay = when (state.selectedDay) {
            "today" -> VisitSchedule.todayVisitDay()
            else -> VisitSchedule.englishKeyToVisitDay(state.selectedDay)
                ?: VisitSchedule.todayVisitDay()
        }
        return state.clients.filter { client ->
            VisitSchedule.clientMatchesDay(client, visitDay, state.daysByLineCode)
        }
    }

    fun selectedMapId(): String? = _uiState.value.selectedClient?.id
}
