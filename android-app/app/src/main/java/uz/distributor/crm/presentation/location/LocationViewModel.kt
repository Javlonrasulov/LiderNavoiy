package uz.distributor.crm.presentation.location

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.local.AgentLocationHolder
import uz.distributor.crm.data.location.DeviceLocationProvider
import uz.distributor.crm.data.remote.TrackingSocketManager
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.data.repository.AppSettingsRepository
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.ClientRepository
import uz.distributor.crm.data.repository.DeliveryRepository
import uz.distributor.crm.data.repository.PushRepository
import uz.distributor.crm.domain.model.Client
import uz.distributor.crm.domain.model.LocationPoint
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.service.LocationTrackingController
import javax.inject.Inject

data class LocationUiState(
    val isDeliveryPerson: Boolean = false,
    val clients: List<Client> = emptyList(),
    /** Dostavchik: yuklangan (on_way) + to'lov kutayotgan buyurtmalar */
    val deliveryOrders: List<OrderDto> = emptyList(),
    val agentLocation: LocationPoint? = null,
    val selectedClient: Client? = null,
    val selectedOrderId: String? = null,
    val selectedDay: String = "today",
    val sheetFraction: Float = 0.42f,
    val isLoading: Boolean = true,
    val socketConnected: Boolean = false,
)

@HiltViewModel
class LocationViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
    private val deliveryRepository: DeliveryRepository,
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
        viewModelScope.launch {
            val user = authRepository.getUserFlow().first()
            val isDelivery = user?.isDeliveryPerson() == true
            _uiState.update { it.copy(isDeliveryPerson = isDelivery) }
            if (isDelivery) loadDeliveryOrders() else loadClients()
        }
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
            val clients = clientRepository.getClients(forceRefresh = true)
            _uiState.update { it.copy(clients = clients, isLoading = false) }
        }
    }

    fun loadDeliveryOrders() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val orders = sortDeliveryOrders(deliveryRepository.getAssignedOrders())
                _uiState.update {
                    it.copy(
                        deliveryOrders = orders,
                        isLoading = false,
                        selectedOrderId = it.selectedOrderId?.takeIf { id -> orders.any { o -> o.id == id } },
                    )
                }
            } catch (_: Exception) {
                _uiState.update { it.copy(isLoading = false, deliveryOrders = emptyList()) }
            }
        }
    }

    fun refresh() {
        if (_uiState.value.isDeliveryPerson) loadDeliveryOrders() else loadClients()
    }

    fun selectClient(client: Client) {
        _uiState.update { it.copy(selectedClient = client, selectedOrderId = null) }
        refreshAgentLocation()
    }

    fun selectOrder(order: OrderDto) {
        _uiState.update { it.copy(selectedOrderId = order.id, selectedClient = null) }
        refreshAgentLocation()
    }

    fun clearSelection() {
        _uiState.update { it.copy(selectedClient = null, selectedOrderId = null) }
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
        if (state.isDeliveryPerson) {
            return state.deliveryOrders.map { it.toMapClient() }
        }
        val dayKey = when (state.selectedDay) {
            "today" -> {
                val cal = java.util.Calendar.getInstance().get(java.util.Calendar.DAY_OF_WEEK)
                when (cal) {
                    java.util.Calendar.SUNDAY -> "sunday"
                    java.util.Calendar.MONDAY -> "monday"
                    java.util.Calendar.TUESDAY -> "tuesday"
                    java.util.Calendar.WEDNESDAY -> "wednesday"
                    java.util.Calendar.THURSDAY -> "thursday"
                    java.util.Calendar.FRIDAY -> "friday"
                    else -> "saturday"
                }
            }
            else -> state.selectedDay
        }
        val byDay = state.clients.filter { client ->
            client.territory?.lowercase()?.trim() == dayKey
        }
        return byDay.ifEmpty { state.clients }
    }

    fun selectedMapId(): String? {
        val state = _uiState.value
        return if (state.isDeliveryPerson) state.selectedOrderId else state.selectedClient?.id
    }

    private fun sortDeliveryOrders(orders: List<OrderDto>): List<OrderDto> {
        val onWay = orders.filter { it.status == "on_way" }
            .sortedWith(
                compareBy<OrderDto> { it.deliverySequence ?: Int.MAX_VALUE }
                    .thenByDescending { it.updatedAt ?: it.createdAt },
            )
        val rest = orders.filter { it.status != "on_way" }
            .sortedByDescending { it.updatedAt ?: it.createdAt }
        return onWay + rest
    }
}

/** Xarita markerlari uchun Order → Client (id = order.id) */
private fun OrderDto.toMapClient(): Client = Client(
    id = id,
    code = clientCode.orEmpty(),
    name = clientName.orEmpty().ifBlank { clientCode.orEmpty() },
    address = clientAddress,
    balance = remainingBalance,
    latitude = clientLatitude,
    longitude = clientLongitude,
    phone = clientPhone,
)
