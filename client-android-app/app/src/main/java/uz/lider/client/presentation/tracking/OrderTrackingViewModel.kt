package uz.lider.client.presentation.tracking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import uz.lider.client.data.remote.TrackingSocketManager
import uz.lider.client.data.repository.LatLngPoint
import uz.lider.client.data.repository.OrderRepository
import uz.lider.client.data.repository.PaymentPhotoAlertStore
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
    private val paymentPhotoAlertStore: PaymentPhotoAlertStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrderTrackingUiState())
    val uiState: StateFlow<OrderTrackingUiState> = _uiState.asStateFlow()

    val mapPayHintDismissedOrderIds: StateFlow<Set<String>> =
        paymentPhotoAlertStore.mapPayHintDismissedOrderIds
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptySet())

    fun dismissMapPayHintFor(orderIds: Collection<String>) {
        viewModelScope.launch { paymentPhotoAlertStore.dismissMapPayHintFor(orderIds) }
    }

    fun shouldShowMapPayHint(orderIds: Collection<String>, dismissedIds: Set<String>): Boolean =
        paymentPhotoAlertStore.shouldShowMapPayHint(orderIds, dismissedIds)

    private var pollJob: Job? = null
    private var routeJob: Job? = null
    private var socketJob: Job? = null
    private var lastRouteAt = 0L
    private var lastStopsSignature: String = ""
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
            launch {
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
            launch {
                trackingSocket.routeChanges.collect { event ->
                    val watched = _uiState.value.tracking?.deliveryPerson?.distributorId
                    if (!watched.isNullOrBlank() && event.distributorId != watched) return@collect
                    reloadQuiet(orderId)
                }
            }
        }
    }

    suspend fun refresh(orderId: String) {
        reloadQuiet(orderId)
        startCourierWatch()
    }

    private fun startCourierWatch() {
        val id = _uiState.value.tracking?.deliveryPerson?.distributorId
        if (!_uiState.value.showLiveMap || id.isNullOrBlank()) return
        // unwatch qilmaymiz — Asosiy xarita watchlarini o‘chirmasin
        trackingSocket.watchCourier(id)
    }

    private suspend fun reloadQuiet(orderId: String) {
        val order = orderRepository.getOrder(orderId) ?: _uiState.value.order
        val tracking = orderRepository.getOrderTracking(orderId)
        val merged = mergePreserveLiveCoords(tracking)
        val stopsSig = RouteTrim.stopsSignature(merged?.routeStops.orEmpty())
        val stopsChanged = stopsSig != lastStopsSignature
        lastStopsSignature = stopsSig
        applyTracking(order, merged)
        refreshRoadRoute(merged, force = stopsChanged)
    }

    override fun onCleared() {
        pollJob?.cancel()
        routeJob?.cancel()
        socketJob?.cancel()
        // Socketni uzmaymiz — Dashboard jonli GPS ni yo‘qotmasin
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
        val prevLat = person.latitude
        val prevLng = person.longitude
        val movedM = if (prevLat != null && prevLng != null) {
            RoadRouteService.haversineM(prevLat, prevLng, lat, lng)
        } else {
            Double.MAX_VALUE
        }
        // Deyarli bir xil nuqta — faqat timestamp yangilab HTTP ni bloklamaslik
        if (movedM >= 3.0) {
            liveCourierAtMs = parseIsoMs(recordedAt) ?: System.currentTimeMillis()
        }
        val currentRoute = _uiState.value.routePoints
        val offRoute = currentRoute.size < 3 ||
            RouteTrim.isOffRoute(lat, lng, currentRoute)
        val trimmed = if (currentRoute.size >= 2) {
            RouteTrim.remaining(lat, lng, currentRoute)
        } else {
            currentRoute
        }
        val pathKm = RouteTrim.pathLengthKm(trimmed)
            .takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) && it > 0.01 }
        val distKm = pathKm
            ?: approxStopsDistanceKm(lat, lng, current)
            ?: distanceKmOrNull(lat, lng, current.deliveryLatitude, current.deliveryLongitude)
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
        if (trimmed.isNotEmpty()) {
            _uiState.update { it.copy(routePoints = trimmed) }
        }
        refreshRoadRoute(updated, force = offRoute)
    }

    /**
     * WS jonli nuqtani saqlash. HTTP boshqa joyda bo‘lsa — harakat deb qabul qilamiz
     * (timestamp eskiroq bo‘lsa ham; heartbeat eski joyni «yangi» qilib yubormasin).
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
        val httpLat = nextPerson.latitude
        val httpLng = nextPerson.longitude
        val httpMovedAway = httpLat != null && httpLng != null &&
            RoadRouteService.haversineM(curLat, curLng, httpLat, httpLng) > 20.0
        val httpIsNewer = httpAt > liveCourierAtMs + 500
        if (liveAge > 12_000 || httpIsNewer || httpMovedAway) {
            if (httpIsNewer || httpMovedAway) {
                liveCourierAtMs = maxOf(httpAt, System.currentTimeMillis() - 1_000)
            }
            return incoming
        }

        val pathKm = RouteTrim.pathLengthKm(
            RouteTrim.remaining(curLat, curLng, _uiState.value.routePoints),
        ).takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) && it > 0.01 }
        val distKm = pathKm
            ?: approxStopsDistanceKm(curLat, curLng, incoming)
            ?: distanceKmOrNull(
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
        // Off-route / force — darhol OSRM; aks holda 5s debounce
        if (!force && now - lastRouteAt < 5_000 && _uiState.value.routePoints.size >= 3) {
            val trimmed = RouteTrim.remaining(
                courierLat!!, courierLng!!, _uiState.value.routePoints,
            )
            val pathKm = RouteTrim.pathLengthKm(trimmed)
                .takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) && it > 0.01 }
            val approx = approxStopsDistanceKm(courierLat, courierLng, tracking)
            val km = pathKm ?: approx
            if (km != null) {
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
            // Debounce: ketma-ket GPS da OSRM spam bo‘lmasin
            if (force) delay(1_800)
            val waypoints = RoadRouteService.waypointsUntilYou(
                routeStops = tracking?.routeStops.orEmpty(),
                deliveryLat = deliveryLat!!,
                deliveryLng = deliveryLng!!,
                untilYouOnly = true,
            )
            val fromLat = _uiState.value.tracking?.deliveryPerson?.latitude ?: courierLat!!
            val fromLng = _uiState.value.tracking?.deliveryPerson?.longitude ?: courierLng!!
            val route = roadRouteService.fetchDrivingRoute(
                fromLat = fromLat,
                fromLng = fromLng,
                waypoints = waypoints,
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
                // To‘g‘ri chiziq emas — eski ko‘cha yo‘lini saqlaymiz
                val kept = _uiState.value.routePoints
                val fallback = if (kept.size >= 2) {
                    RouteTrim.remaining(fromLat, fromLng, kept)
                } else {
                    emptyList()
                }
                val approx = approxStopsDistanceKm(fromLat, fromLng, tracking)
                val pathKm = RouteTrim.pathLengthKm(fallback)
                    .takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) && it > 0.01 }
                val km = pathKm ?: approx
                _uiState.update {
                    it.copy(
                        routePoints = fallback.ifEmpty { it.routePoints },
                        distance = km?.let { d -> formatDistance(d) } ?: it.distance,
                        etaLabel = km?.let { d -> "${etaFromKm(d)} min" } ?: it.etaLabel,
                    )
                }
            }
        }
    }

    private fun approxStopsDistanceKm(
        fromLat: Double,
        fromLng: Double,
        tracking: OrderTrackingDetails?,
    ): Double? {
        val deliveryLat = tracking?.deliveryLatitude ?: return null
        val deliveryLng = tracking?.deliveryLongitude ?: return null
        val waypoints = RoadRouteService.waypointsUntilYou(
            routeStops = tracking.routeStops,
            deliveryLat = deliveryLat,
            deliveryLng = deliveryLng,
        )
        if (waypoints.isEmpty()) return null
        var sum = 0.0
        var prevLat = fromLat
        var prevLng = fromLng
        for (p in waypoints) {
            sum += RoadRouteService.haversineM(prevLat, prevLng, p.latitude, p.longitude)
            prevLat = p.latitude
            prevLng = p.longitude
        }
        val km = sum / 1000.0
        return km.takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) }
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
