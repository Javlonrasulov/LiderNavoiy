package uz.lider.client.presentation.tracking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import uz.lider.client.data.remote.TrackingSocketManager
import uz.lider.client.data.repository.LatLngPoint
import uz.lider.client.data.repository.OrderRepository
import uz.lider.client.data.repository.RoadRouteService
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.OrderStatus
import uz.lider.client.domain.model.OrderTrackingDetails
import uz.lider.client.map.GeoCoords
import uz.lider.client.map.RouteTrim
import java.time.Instant
import javax.inject.Inject

data class OrderTrackingUiState(
    val loading: Boolean = true,
    val order: ClientOrder? = null,
    val tracking: OrderTrackingDetails? = null,
    /** 1..5 progress; 0 when cancelled */
    val activeStep: Int = 1,
    val isCancelled: Boolean = false,
    /** Xarita faqat yo'lda / yetkazilganda */
    val showLiveMap: Boolean = false,
    val distance: String = "—",
    val etaLabel: String = "—",
    val routePoints: List<LatLngPoint> = emptyList(),
)

@HiltViewModel
class OrderTrackingViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val roadRouteService: RoadRouteService,
    private val trackingSocket: TrackingSocketManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrderTrackingUiState())
    val uiState: StateFlow<OrderTrackingUiState> = _uiState.asStateFlow()
    private var pollJob: Job? = null
    private var routeJob: Job? = null
    private var socketJob: Job? = null
    private var lastRouteAt = 0L
    /** Oxirgi WS/jonli GPS vaqti — eski HTTP nuqta buni yozib yubormasin */
    private var liveCourierAtMs = 0L

    fun load(orderId: String) {
        pollJob?.cancel()
        socketJob?.cancel()
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            reloadQuiet(orderId)
            _uiState.update { it.copy(loading = false) }
            startCourierWatch()
        }
        // HTTP zaxira — WS ishlamasa ham 2s da yangilanadi
        pollJob = viewModelScope.launch {
            while (isActive) {
                delay(2_000)
                reloadQuiet(orderId)
                startCourierWatch()
            }
        }
        socketJob = viewModelScope.launch {
            trackingSocket.locations.collect { event ->
                val watched = _uiState.value.tracking?.deliveryPerson?.distributorId
                if (!watched.isNullOrBlank() && event.distributorId != watched) return@collect
                applyLiveCourier(
                    lat = event.latitude,
                    lng = event.longitude,
                    online = true,
                    recordedAt = event.recordedAt,
                )
            }
        }
    }

    suspend fun refresh(orderId: String) {
        reloadQuiet(orderId)
        startCourierWatch()
    }

    private fun startCourierWatch() {
        val id = _uiState.value.tracking?.deliveryPerson?.distributorId
        if (!_uiState.value.showLiveMap || id.isNullOrBlank()) {
            trackingSocket.unwatch()
            return
        }
        trackingSocket.watchCourier(id)
    }

    private suspend fun reloadQuiet(orderId: String) {
        val order = orderRepository.getOrder(orderId) ?: _uiState.value.order
        val tracking = orderRepository.getOrderTracking(orderId)
        val merged = mergePreserveLiveCoords(tracking)
        applyTracking(order, merged)
        refreshRoadRoute(merged, force = false)
    }

    override fun onCleared() {
        pollJob?.cancel()
        routeJob?.cancel()
        socketJob?.cancel()
        trackingSocket.unwatch()
        super.onCleared()
    }

    private fun applyLiveCourier(
        lat: Double,
        lng: Double,
        online: Boolean,
        recordedAt: String? = null,
    ) {
        val current = _uiState.value.tracking ?: return
        val person = current.deliveryPerson ?: return
        if (!GeoCoords.isUsableCourier(lat, lng, current.deliveryLatitude, current.deliveryLongitude)) {
            return
        }
        liveCourierAtMs = parseIsoMs(recordedAt) ?: System.currentTimeMillis()
        val distKm = distanceKmOrNull(lat, lng, current.deliveryLatitude, current.deliveryLongitude)
        val updated = current.copy(
            distanceKm = distKm ?: current.distanceKm,
            etaMinutes = distKm?.let { etaFromKm(it) } ?: current.etaMinutes,
            deliveryPerson = person.copy(
                latitude = lat,
                longitude = lng,
                isOnline = online,
                lastLocationAt = recordedAt ?: person.lastLocationAt,
            ),
        )
        applyTracking(_uiState.value.order, updated)
        refreshRoadRoute(updated, force = false)
    }

    /**
     * WS orqali kelgan yangi nuqtani 20s ichida eski HTTP javob bilan almashtirmaslik.
     */
    private fun mergePreserveLiveCoords(incoming: OrderTrackingDetails?): OrderTrackingDetails? {
        if (incoming == null) return null
        val currentPerson = _uiState.value.tracking?.deliveryPerson ?: return incoming
        val nextPerson = incoming.deliveryPerson ?: return incoming
        val curLat = currentPerson.latitude
        val curLng = currentPerson.longitude
        if (curLat == null || curLng == null || liveCourierAtMs <= 0L) return incoming

        val liveAge = System.currentTimeMillis() - liveCourierAtMs
        val httpAt = parseIsoMs(nextPerson.lastLocationAt) ?: 0L
        val httpIsNewer = httpAt > liveCourierAtMs + 500
        if (liveAge > 20_000 || httpIsNewer) {
            if (httpIsNewer) liveCourierAtMs = httpAt
            return incoming
        }

        val distKm = distanceKmOrNull(
            curLat, curLng, incoming.deliveryLatitude, incoming.deliveryLongitude,
        )
        return incoming.copy(
            distanceKm = distKm ?: incoming.distanceKm,
            etaMinutes = distKm?.let { etaFromKm(it) } ?: incoming.etaMinutes,
            deliveryPerson = nextPerson.copy(
                latitude = curLat,
                longitude = curLng,
                isOnline = true,
                lastLocationAt = currentPerson.lastLocationAt ?: nextPerson.lastLocationAt,
            ),
        )
    }

    private fun applyTracking(order: ClientOrder?, tracking: OrderTrackingDetails?) {
        val status = OrderStatus.fromKey(tracking?.status ?: order?.status)
        val cancelled = status == OrderStatus.CANCELLED
        val step = when (status) {
            OrderStatus.PENDING -> 1
            OrderStatus.CONFIRMED -> 2
            OrderStatus.PACKING -> 3
            OrderStatus.ON_WAY -> 4
            OrderStatus.DELIVERED -> 5
            OrderStatus.CANCELLED -> 0
        }
        val showLiveMap = status == OrderStatus.ON_WAY || status == OrderStatus.DELIVERED
        val distance = if (showLiveMap) {
            tracking?.distanceKm
                ?.takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) }
                ?.let { formatDistance(it) }
                ?: "—"
        } else {
            "—"
        }
        val eta = if (showLiveMap) {
            tracking?.etaMinutes?.let { "$it min" } ?: "—"
        } else {
            "—"
        }
        _uiState.update {
            it.copy(
                order = order,
                tracking = tracking,
                activeStep = step,
                isCancelled = cancelled,
                showLiveMap = showLiveMap,
                distance = distance,
                etaLabel = eta,
                routePoints = if (showLiveMap) it.routePoints else emptyList(),
            )
        }
    }

    private fun refreshRoadRoute(tracking: OrderTrackingDetails?, force: Boolean) {
        if (!_uiState.value.showLiveMap) {
            _uiState.update { it.copy(routePoints = emptyList()) }
            return
        }
        val courierLat = tracking?.deliveryPerson?.latitude
        val courierLng = tracking?.deliveryPerson?.longitude
        val deliveryLat = tracking?.deliveryLatitude
        val deliveryLng = tracking?.deliveryLongitude
        if (!GeoCoords.isUsableCourier(courierLat, courierLng, deliveryLat, deliveryLng)) {
            _uiState.update { it.copy(routePoints = emptyList()) }
            return
        }
        val now = System.currentTimeMillis()
        // Marshrutni har 5s da yangilash — marker esa har WS/HTTP da siljiydi
        if (!force && now - lastRouteAt < 5_000 && _uiState.value.routePoints.isNotEmpty()) {
            val km = RoadRouteService.haversineM(
                courierLat!!, courierLng!!, deliveryLat!!, deliveryLng!!,
            ) / 1000.0
            if (GeoCoords.isPlausibleRouteDistanceKm(km)) {
                val trimmed = RouteTrim.remaining(
                    courierLat, courierLng, _uiState.value.routePoints,
                )
                _uiState.update {
                    it.copy(
                        routePoints = trimmed.ifEmpty { it.routePoints },
                        distance = formatDistance(km),
                        etaLabel = "${etaFromKm(km)} min",
                    )
                }
            }
            return
        }
        lastRouteAt = now
        routeJob?.cancel()
        routeJob = viewModelScope.launch {
            val route = roadRouteService.fetchDrivingRoute(
                fromLat = courierLat!!,
                fromLng = courierLng!!,
                toLat = deliveryLat!!,
                toLng = deliveryLng!!,
            )
            if (route != null && GeoCoords.isPlausibleRouteDistanceKm(route.distanceKm)) {
                _uiState.update {
                    it.copy(
                        routePoints = route.points,
                        distance = formatDistance(route.distanceKm),
                        etaLabel = "${route.durationMinutes} min",
                    )
                }
            } else {
                _uiState.update { it.copy(routePoints = emptyList()) }
            }
        }
    }

    private fun distanceKmOrNull(
        lat: Double,
        lng: Double,
        deliveryLat: Double?,
        deliveryLng: Double?,
    ): Double? {
        if (deliveryLat == null || deliveryLng == null) return null
        val km = RoadRouteService.haversineM(lat, lng, deliveryLat, deliveryLng) / 1000.0
        return km.takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) }
    }

    private fun etaFromKm(km: Double): Int = maxOf(5, Math.round((km / 30.0) * 60).toInt())

    private fun parseIsoMs(value: String?): Long? {
        if (value.isNullOrBlank()) return null
        return runCatching { Instant.parse(value).toEpochMilli() }.getOrNull()
    }

    private fun formatDistance(km: Double): String =
        if (km < 1.0) "${(km * 1000).toInt()} m" else String.format("%.1f km", km)
}
