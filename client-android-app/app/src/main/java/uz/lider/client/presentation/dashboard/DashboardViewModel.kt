package uz.lider.client.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.AuthRepository
import uz.lider.client.data.repository.LatLngPoint
import uz.lider.client.data.repository.OrderRepository
import uz.lider.client.data.repository.ProfileRepository
import uz.lider.client.data.repository.RoadRouteService
import uz.lider.client.domain.model.AuthUser
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.ClientProfile
import uz.lider.client.domain.model.DashboardData
import uz.lider.client.domain.model.OrderStatus
import uz.lider.client.domain.model.OrderTrackingDetails
import javax.inject.Inject

data class LiveDeliveryUi(
    val orderId: String,
    val tracking: OrderTrackingDetails,
    val routePoints: List<LatLngPoint> = emptyList(),
    val distanceLabel: String = "—",
    val etaLabel: String = "—",
)

data class DashboardUiState(
    val loading: Boolean = true,
    val data: DashboardData? = null,
    val clientName: String = "",
    val allOrders: List<ClientOrder> = emptyList(),
    val dateRange: DashboardDateRange = DashboardDateFilter.lastMonthRange(),
    val filtered: DashboardFiltered = DashboardFiltered(0.0, 0, emptyList(), listOf(0f, 0f)),
    val liveDelivery: LiveDeliveryUi? = null,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val authRepository: AuthRepository,
    private val orderRepository: OrderRepository,
    private val roadRouteService: RoadRouteService,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()
    private var livePollJob: Job? = null

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            val authUser = authRepository.getUserFlow().first()
            val profile = profileRepository.getProfile()
            val data = profileRepository.getDashboardData()
            val allOrders = profileRepository.getAllOrders()
            val range = _uiState.value.dateRange
            val filtered = DashboardDateFilter.computeFiltered(allOrders, range)
            _uiState.update {
                it.copy(
                    loading = false,
                    data = data,
                    clientName = resolveClientName(profile, authUser),
                    allOrders = allOrders,
                    dateRange = range,
                    filtered = filtered,
                )
            }
            startLiveDeliveryPolling(allOrders)
        }
    }

    fun setDateRange(startMillis: Long, endMillis: Long) {
        val start = DashboardDateFilter.fromMillis(startMillis)
        val end = DashboardDateFilter.fromMillis(endMillis)
        val range = DashboardDateRange(
            start = minOf(start, end),
            end = maxOf(start, end),
            isCustom = true,
        )
        applyRange(range)
    }

    fun resetToLastMonth() {
        applyRange(DashboardDateFilter.lastMonthRange())
    }

    private fun applyRange(range: DashboardDateRange) {
        _uiState.update { state ->
            val orders = state.allOrders
            state.copy(
                dateRange = range,
                filtered = DashboardDateFilter.computeFiltered(orders, range),
            )
        }
    }

    fun dateRangeLabel(): String = DashboardDateFilter.formatRange(_uiState.value.dateRange)

    private fun startLiveDeliveryPolling(orders: List<ClientOrder>) {
        livePollJob?.cancel()
        val onWay = orders.firstOrNull { OrderStatus.fromKey(it.status) == OrderStatus.ON_WAY }
        if (onWay == null) {
            _uiState.update { it.copy(liveDelivery = null) }
            return
        }
        livePollJob = viewModelScope.launch {
            var orderId = onWay.id
            while (isActive) {
                refreshLiveDelivery(orderId)
                delay(8_000)
                val latest = orderRepository.getOrders()
                _uiState.update { it.copy(allOrders = latest) }
                val current = latest.firstOrNull {
                    OrderStatus.fromKey(it.status) == OrderStatus.ON_WAY
                }
                if (current == null) {
                    _uiState.update { it.copy(liveDelivery = null) }
                    break
                }
                orderId = current.id
            }
        }
    }

    private suspend fun refreshLiveDelivery(orderId: String) {
        val tracking = orderRepository.getOrderTracking(orderId) ?: return
        if (OrderStatus.fromKey(tracking.status) != OrderStatus.ON_WAY) {
            _uiState.update { it.copy(liveDelivery = null) }
            return
        }
        val courierLat = tracking.deliveryPerson?.latitude
        val courierLng = tracking.deliveryPerson?.longitude
        val deliveryLat = tracking.deliveryLatitude
        val deliveryLng = tracking.deliveryLongitude

        var routePoints = emptyList<LatLngPoint>()
        var distanceLabel = tracking.distanceKm?.let { formatDistance(it) } ?: "—"
        var etaLabel = tracking.etaMinutes?.let { "$it min" } ?: "—"

        if (courierLat != null && courierLng != null && deliveryLat != null && deliveryLng != null) {
            val route = roadRouteService.fetchDrivingRoute(
                fromLat = courierLat,
                fromLng = courierLng,
                toLat = deliveryLat,
                toLng = deliveryLng,
            )
            if (route != null) {
                routePoints = route.points
                distanceLabel = formatDistance(route.distanceKm)
                etaLabel = "${route.durationMinutes} min"
            }
        }

        _uiState.update {
            it.copy(
                liveDelivery = LiveDeliveryUi(
                    orderId = orderId,
                    tracking = tracking,
                    routePoints = routePoints,
                    distanceLabel = distanceLabel,
                    etaLabel = etaLabel,
                ),
            )
        }
    }

    private fun formatDistance(km: Double): String =
        if (km < 1.0) "${(km * 1000).toInt()} m" else String.format("%.1f km", km)

    private fun resolveClientName(profile: ClientProfile?, authUser: AuthUser?): String {
        profile?.fullName?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
        profile?.name?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
        authUser?.fullName?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
        authUser?.clientName?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
        authUser?.username?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
        return "—"
    }

    override fun onCleared() {
        livePollJob?.cancel()
        super.onCleared()
    }
}
