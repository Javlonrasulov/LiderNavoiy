package uz.lider.client.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
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
    /** Soft content load — shell stays visible (no full-screen block). */
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
            // Paint shell immediately with cached auth name (no network wait).
            val authUser = authRepository.getUserFlow().first()
            _uiState.update {
                it.copy(
                    clientName = resolveClientName(null, authUser),
                    loading = true,
                )
            }
            reloadQuiet(authUser)
            _uiState.update { it.copy(loading = false) }
            // First live sync reuses orders just loaded — skip extra GET /orders.
            ensureLiveDeliveryPolling(reuseOrdersOnce = true)
        }
    }

    /** Pull-to-refresh: updates data without full-screen spinner. */
    suspend fun refresh() {
        reloadQuiet()
        ensureLiveDeliveryPolling(reuseOrdersOnce = true)
    }

    private suspend fun reloadQuiet(authUserHint: AuthUser? = null) = coroutineScope {
        val authUser = authUserHint ?: authRepository.getUserFlow().first()
        // One parallel round-trip each (previously 4 sequential calls via getDashboardData).
        val profileDeferred = async { profileRepository.getProfile() }
        val ordersDeferred = async { profileRepository.getAllOrders() }
        val profile = profileDeferred.await()
        val allOrders = ordersDeferred.await()
        val data = buildDashboardData(profile, allOrders)
        val range = _uiState.value.dateRange
        val filtered = DashboardDateFilter.computeFiltered(allOrders, range)
        _uiState.update {
            it.copy(
                data = data,
                clientName = resolveClientName(profile, authUser),
                allOrders = allOrders,
                dateRange = range,
                filtered = filtered,
            )
        }
    }

    private fun buildDashboardData(
        profile: ClientProfile?,
        orders: List<ClientOrder>,
    ): DashboardData {
        val effective = profile ?: ClientProfile(
            id = "",
            code = "",
            name = "",
            balance = 0.0,
            totalPurchases = 0.0,
            orderCount = orders.size,
        )
        return DashboardData(
            profile = effective,
            recentOrders = orders.take(5),
            totalPurchases = profile?.totalPurchases ?: 0.0,
            orderCount = profile?.orderCount ?: orders.size,
            balance = profile?.balance ?: 0.0,
        )
    }

    /** Call when Asosiy becomes visible again — restarts map if poll died. */
    fun onDashboardVisible() {
        ensureLiveDeliveryPolling()
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

    private fun ensureLiveDeliveryPolling(reuseOrdersOnce: Boolean = false) {
        if (livePollJob?.isActive == true) {
            // Still kick a refresh so UI updates immediately on return
            viewModelScope.launch { syncLiveDeliveryOnce(reuseOrders = reuseOrdersOnce) }
            return
        }
        livePollJob = viewModelScope.launch {
            var first = reuseOrdersOnce
            while (isActive) {
                syncLiveDeliveryOnce(reuseOrders = first)
                first = false
                delay(8_000)
            }
        }
    }

    private suspend fun syncLiveDeliveryOnce(reuseOrders: Boolean = false) {
        val previousId = _uiState.value.liveDelivery?.orderId

        // Prefer a successful orders fetch; on failure keep previous live card.
        // First tick after dashboard load can reuse orders already fetched.
        val latest = if (reuseOrders && _uiState.value.allOrders.isNotEmpty()) {
            _uiState.value.allOrders
        } else {
            runCatching { orderRepository.getOrders() }.getOrNull()?.also { fetched ->
                _uiState.update { it.copy(allOrders = fetched) }
            }
        }
        val orders = latest ?: _uiState.value.allOrders

        val onWay = orders.firstOrNull { OrderStatus.fromKey(it.status) == OrderStatus.ON_WAY }
            ?: previousId?.let { id ->
                // List may lag; keep tracking known on-way order until confirmed finished
                orders.firstOrNull { it.id == id }?.takeIf {
                    val s = OrderStatus.fromKey(it.status)
                    s != OrderStatus.DELIVERED && s != OrderStatus.CANCELLED
                }
            }

        if (onWay == null) {
            // Only clear when we successfully loaded orders and none are on the way
            if (latest != null) {
                _uiState.update { it.copy(liveDelivery = null) }
            }
            return
        }

        refreshLiveDelivery(onWay.id, keepOnTrackingMiss = true)
    }

    private suspend fun refreshLiveDelivery(
        orderId: String,
        keepOnTrackingMiss: Boolean,
    ) {
        val tracking = orderRepository.getOrderTracking(orderId)
        if (tracking == null) {
            // Network glitch — do not hide the card
            return
        }

        val status = OrderStatus.fromKey(tracking.status)
        if (status == OrderStatus.DELIVERED || status == OrderStatus.CANCELLED) {
            _uiState.update { it.copy(liveDelivery = null) }
            return
        }
        // Show while packing/on_way/etc. as long as order is still active delivery flow.
        // Prefer ON_WAY; still show if list said on_way but tracking string is odd.
        val listSaysOnWay = _uiState.value.allOrders
            .firstOrNull { it.id == orderId }
            ?.let { OrderStatus.fromKey(it.status) == OrderStatus.ON_WAY }
            ?: false
        if (status != OrderStatus.ON_WAY && !listSaysOnWay) {
            if (!keepOnTrackingMiss) {
                _uiState.update { it.copy(liveDelivery = null) }
            }
            return
        }

        val courierLat = tracking.deliveryPerson?.latitude
        val courierLng = tracking.deliveryPerson?.longitude
        val deliveryLat = tracking.deliveryLatitude
        val deliveryLng = tracking.deliveryLongitude

        val previous = _uiState.value.liveDelivery?.takeIf { it.orderId == orderId }
        var routePoints = previous?.routePoints.orEmpty()
        var distanceLabel = tracking.distanceKm?.let { formatDistance(it) }
            ?: previous?.distanceLabel
            ?: "—"
        var etaLabel = tracking.etaMinutes?.let { "$it min" }
            ?: previous?.etaLabel
            ?: "—"

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
