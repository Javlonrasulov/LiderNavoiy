package uz.lider.client.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
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
import uz.lider.client.data.repository.OrderRepository
import uz.lider.client.data.repository.ProfileRepository
import uz.lider.client.data.repository.RoadRouteService
import uz.lider.client.domain.model.AuthUser
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.ClientProfile
import uz.lider.client.domain.model.DashboardData
import uz.lider.client.domain.model.OrderStatus
import uz.lider.client.domain.model.OrderTrackingDetails
import uz.lider.client.map.GeoCoords
import uz.lider.client.map.MapDefaults
import javax.inject.Inject

data class DashboardUiState(
    val loading: Boolean = true,
    val data: DashboardData? = null,
    val clientName: String = "",
    val allOrders: List<ClientOrder> = emptyList(),
    val dateRange: DashboardDateRange = DashboardDateFilter.lastMonthRange(),
    val filtered: DashboardFiltered = DashboardFiltered(0.0, 0, emptyList(), listOf(0f, 0f)),
    val liveFleet: LiveFleetUi? = null,
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
            val authUser = authRepository.getUserFlow().first()
            _uiState.update {
                it.copy(
                    clientName = resolveClientName(null, authUser),
                    loading = true,
                )
            }
            reloadQuiet(authUser)
            _uiState.update { it.copy(loading = false) }
            ensureLiveDeliveryPolling(reuseOrdersOnce = true)
        }
    }

    suspend fun refresh() {
        reloadQuiet()
        ensureLiveDeliveryPolling(reuseOrdersOnce = true)
    }

    private suspend fun reloadQuiet(authUserHint: AuthUser? = null) = coroutineScope {
        val authUser = authUserHint ?: authRepository.getUserFlow().first()
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

    fun onDashboardVisible() {
        ensureLiveDeliveryPolling()
    }

    fun setDateRange(startMillis: Long, endMillis: Long) {
        val start = DashboardDateFilter.fromMillis(startMillis)
        val end = DashboardDateFilter.fromMillis(endMillis)
        applyRange(
            DashboardDateRange(
                start = minOf(start, end),
                end = maxOf(start, end),
                isCustom = true,
            ),
        )
    }

    fun resetToLastMonth() {
        applyRange(DashboardDateFilter.lastMonthRange())
    }

    private fun applyRange(range: DashboardDateRange) {
        _uiState.update { state ->
            state.copy(
                dateRange = range,
                filtered = DashboardDateFilter.computeFiltered(state.allOrders, range),
            )
        }
    }

    fun dateRangeLabel(): String = DashboardDateFilter.formatRange(_uiState.value.dateRange)

    private fun ensureLiveDeliveryPolling(reuseOrdersOnce: Boolean = false) {
        if (livePollJob?.isActive == true) {
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
        val previous = _uiState.value.liveFleet
        val latest = if (reuseOrders && _uiState.value.allOrders.isNotEmpty()) {
            _uiState.value.allOrders
        } else {
            runCatching { orderRepository.getOrders() }.getOrNull()?.also { fetched ->
                _uiState.update { it.copy(allOrders = fetched) }
            }
        }
        val orders = latest ?: _uiState.value.allOrders

        var onWayIds = orders
            .filter { OrderStatus.fromKey(it.status) == OrderStatus.ON_WAY }
            .map { it.id }
            .toMutableSet()

        // Keep previous live orders briefly if list lags
        previous?.vehicles?.flatMap { it.orders }?.forEach { liveOrder ->
            val row = orders.firstOrNull { it.id == liveOrder.orderId }
            val status = row?.let { OrderStatus.fromKey(it.status) }
            if (row == null || (status != OrderStatus.DELIVERED && status != OrderStatus.CANCELLED)) {
                if (status == OrderStatus.ON_WAY || row == null) {
                    onWayIds.add(liveOrder.orderId)
                }
            }
        }

        if (onWayIds.isEmpty()) {
            if (latest != null) {
                _uiState.update { it.copy(liveFleet = null) }
            }
            return
        }

        val prevByOrder = previous?.vehicles
            ?.flatMap { v -> v.orders.map { it.orderId to it } }
            ?.toMap()
            .orEmpty()

        val liveOrders = coroutineScope {
            onWayIds.map { orderId ->
                async {
                    val tracking = orderRepository.getOrderTracking(orderId) ?: return@async null
                    val status = OrderStatus.fromKey(tracking.status)
                    val listSaysOnWay = orders.firstOrNull { it.id == orderId }
                        ?.let { OrderStatus.fromKey(it.status) == OrderStatus.ON_WAY }
                        ?: false
                    if (status == OrderStatus.DELIVERED || status == OrderStatus.CANCELLED) return@async null
                    if (status != OrderStatus.ON_WAY && !listSaysOnWay) return@async null

                    val prev = prevByOrder[orderId]
                    var routePoints = prev?.routePoints.orEmpty()
                    val rawKm = tracking.distanceKm
                    var distanceLabel = rawKm
                        ?.takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) }
                        ?.let { formatDistance(it) }
                        ?: "—"

                    val courierLat = tracking.deliveryPerson?.latitude
                    val courierLng = tracking.deliveryPerson?.longitude
                    val deliveryLat = tracking.deliveryLatitude
                        ?.takeIf { GeoCoords.isValid(it, tracking.deliveryLongitude) }
                    val deliveryLng = tracking.deliveryLongitude
                        ?.takeIf { GeoCoords.isValid(tracking.deliveryLatitude, it) }

                    val gpsOk = GeoCoords.isUsableCourier(
                        courierLat, courierLng, deliveryLat, deliveryLng,
                    )
                    if (!gpsOk) {
                        routePoints = emptyList()
                        distanceLabel = "—"
                    } else if (deliveryLat != null && deliveryLng != null) {
                        val route = roadRouteService.fetchDrivingRoute(
                            fromLat = courierLat!!,
                            fromLng = courierLng!!,
                            toLat = deliveryLat,
                            toLng = deliveryLng,
                        )
                        if (route != null && GeoCoords.isPlausibleRouteDistanceKm(route.distanceKm)) {
                            routePoints = route.points
                            distanceLabel = formatDistance(route.distanceKm)
                        } else {
                            // Eski yomon marshrut (okean) ni saqlab qolmaslik
                            routePoints = emptyList()
                            if (rawKm != null && GeoCoords.isPlausibleRouteDistanceKm(rawKm)) {
                                distanceLabel = formatDistance(rawKm)
                            }
                        }
                    }

                    LiveMapOrder(
                        orderId = orderId,
                        amount = tracking.totalAmount,
                        distanceLabel = distanceLabel,
                        routePoints = routePoints,
                        deliveryLat = deliveryLat,
                        deliveryLng = deliveryLng,
                        tracking = tracking,
                    )
                }
            }.awaitAll().filterNotNull()
        }

        if (liveOrders.isEmpty()) {
            if (latest != null) {
                _uiState.update { it.copy(liveFleet = null) }
            }
            return
        }

        val vehicles = liveOrders
            .groupBy { vehicleKeyFor(it.tracking.deliveryPerson) }
            .mapNotNull { (key, group) ->
                val withGps = group.firstOrNull {
                    val p = it.tracking.deliveryPerson
                    GeoCoords.isUsableCourier(
                        p?.latitude,
                        p?.longitude,
                        it.deliveryLat,
                        it.deliveryLng,
                    )
                }
                if (withGps != null) {
                    val person = withGps.tracking.deliveryPerson!!
                    LiveMapVehicle(
                        id = key,
                        courierLat = person.latitude!!,
                        courierLng = person.longitude!!,
                        courierName = person.name.ifBlank { "—" },
                        courierPhone = person.phone,
                        orders = group,
                    )
                } else {
                    // GPS yo‘q / emulator — faqat magazin (manzil) ni ko‘rsatamiz
                    val dest = group.firstOrNull {
                        GeoCoords.isValid(it.deliveryLat, it.deliveryLng) &&
                            GeoCoords.isInServiceArea(it.deliveryLat!!, it.deliveryLng!!)
                    } ?: group.firstOrNull {
                        GeoCoords.isValid(it.deliveryLat, it.deliveryLng)
                    }
                    val lat = dest?.deliveryLat ?: MapDefaults.NAVOIY_LAT
                    val lng = dest?.deliveryLng ?: MapDefaults.NAVOIY_LNG
                    val person = group.firstOrNull()?.tracking?.deliveryPerson
                    LiveMapVehicle(
                        id = "dest-only:$key",
                        courierLat = lat,
                        courierLng = lng,
                        courierName = person?.name?.ifBlank { "—" } ?: "—",
                        courierPhone = person?.phone,
                        orders = group.map { it.copy(routePoints = emptyList(), distanceLabel = "—") },
                    )
                }
            }

        _uiState.update {
            it.copy(liveFleet = vehicles.takeIf { v -> v.isNotEmpty() }?.let { LiveFleetUi(it) })
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
