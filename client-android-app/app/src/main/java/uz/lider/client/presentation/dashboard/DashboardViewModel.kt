package uz.lider.client.presentation.dashboard

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import uz.lider.client.data.local.MapRouteStopsHolder
import uz.lider.client.data.remote.TrackingSocketManager
import uz.lider.client.data.repository.AuthRepository
import uz.lider.client.data.repository.OrderRepository
import uz.lider.client.data.repository.PaymentPhotoAlertStore
import uz.lider.client.data.repository.PaymentProofRepository
import uz.lider.client.data.repository.ProfileRepository
import uz.lider.client.data.repository.RoadRouteService
import uz.lider.client.domain.model.AuthUser
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.ClientProfile
import uz.lider.client.domain.model.DashboardData
import uz.lider.client.domain.model.DeliveryPersonTracking
import uz.lider.client.domain.model.OrderStatus
import uz.lider.client.domain.model.OrderTrackingDetails
import uz.lider.client.map.GeoCoords
import uz.lider.client.map.MapDefaults
import uz.lider.client.map.RouteTrim
import java.time.Instant
import javax.inject.Inject

data class PaymentPhotoSectionUi(
    val visible: Boolean = false,
    val orderId: String? = null,
    val paymentId: String? = null,
    val amount: Double? = null,
    val collectedAtMs: Long? = null,
    val uploading: Boolean = false,
    val error: String? = null,
    val previewUrl: String? = null,
)

data class DashboardUiState(
    val loading: Boolean = true,
    val data: DashboardData? = null,
    val clientName: String = "",
    val allOrders: List<ClientOrder> = emptyList(),
    val promotions: List<uz.lider.client.domain.model.Promotion> = emptyList(),
    /** null = sana filtri yo‘q — chip ko‘rinmaydi, barcha savdolar */
    val dateRange: DashboardDateRange? = null,
    val purchasesCompanyId: String? = null,
    val filtered: DashboardFiltered = DashboardFiltered(0.0, 0, emptyList(), listOf(0f, 0f)),
    val liveFleet: LiveFleetUi? = null,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val authRepository: AuthRepository,
    private val orderRepository: OrderRepository,
    private val roadRouteService: RoadRouteService,
    private val trackingSocket: TrackingSocketManager,
    private val promotionsRepository: uz.lider.client.data.repository.PromotionsRepository,
    private val paymentPhotoAlertStore: PaymentPhotoAlertStore,
    private val paymentProofRepository: PaymentProofRepository,
    private val mapRouteStopsHolder: MapRouteStopsHolder,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    private val _photoUploading = MutableStateFlow(false)
    private val _photoError = MutableStateFlow<String?>(null)
    private val _photoPreview = MutableStateFlow<String?>(null)

    val paymentPhotoSection: StateFlow<PaymentPhotoSectionUi> = combine(
        paymentPhotoAlertStore.state,
        _photoUploading,
        _photoError,
        _photoPreview,
    ) { alert, uploading, error, preview ->
        PaymentPhotoSectionUi(
            visible = alert.shouldShowModal || uploading || !preview.isNullOrBlank(),
            orderId = alert.orderId,
            paymentId = alert.paymentId,
            amount = alert.amount,
            collectedAtMs = alert.collectedAtMs,
            uploading = uploading,
            error = error,
            previewUrl = preview,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), PaymentPhotoSectionUi())

    fun dismissPaymentPhotoSection() {
        viewModelScope.launch {
            _photoPreview.value = null
            _photoError.value = null
            paymentPhotoAlertStore.dismissModal()
        }
    }

    fun uploadPaymentProof(uri: Uri) {
        viewModelScope.launch {
            _photoUploading.value = true
            _photoError.value = null
            val orderId = paymentPhotoSection.value.orderId
            val paymentId = paymentPhotoSection.value.paymentId
            val result = paymentProofRepository.captureAndAttach(uri, orderId, paymentId)
            _photoUploading.value = false
            result.fold(
                onSuccess = { url ->
                    _photoPreview.value = url
                    _photoError.value = null
                    delay(1800)
                    _photoPreview.value = null
                },
                onFailure = { err ->
                    android.util.Log.e("PayPhoto", "upload failed", err)
                    _photoError.value = uz.lider.client.data.remote.ApiErrorMapper.detailMessage(err)
                },
            )
        }
    }

    val hideStopsCompanyIds: StateFlow<Set<String>> = mapRouteStopsHolder.hideCompanyIds

    fun setHideStopsCompanyIds(ids: Set<String>) {
        viewModelScope.launch { mapRouteStopsHolder.setHideCompanyIds(ids) }
    }

    val mapPayHintDismissedOrderIds: StateFlow<Set<String>> =
        paymentPhotoAlertStore.mapPayHintDismissedOrderIds
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptySet())

    fun dismissMapPayHintFor(orderIds: Collection<String>) {
        viewModelScope.launch { paymentPhotoAlertStore.dismissMapPayHintFor(orderIds) }
    }

    fun shouldShowMapPayHint(orderIds: Collection<String>, dismissedIds: Set<String>): Boolean =
        paymentPhotoAlertStore.shouldShowMapPayHint(orderIds, dismissedIds)

    private var livePollJob: Job? = null
    private var socketJob: Job? = null
    /** orderId → oxirgi jonli GPS ms */
    private val liveCourierAtByOrder = mutableMapOf<String, Long>()
    private var trackedOnWayIds: Set<String> = emptySet()
    private var onWayTrackReady = false

    init {
        load()
        viewModelScope.launch {
            while (isActive) {
                paymentPhotoAlertStore.clearIfExpired()
                delay(15_000)
            }
        }
        socketJob = viewModelScope.launch {
            trackingSocket.locations.collect { event ->
                applyLiveCourierToFleet(event.distributorId, event.latitude, event.longitude, event.recordedAt)
            }
        }
        viewModelScope.launch {
            trackingSocket.routeChanges.collect {
                // Tartib o‘zgardi — trackingni darhol qayta yuklash
                syncLiveDeliveryOnce(reuseOrders = true)
            }
        }
    }

    fun load() {
        viewModelScope.launch {
            val authUser = runCatching {
                withTimeout(8_000) { authRepository.getUserFlow().first() }
            }.getOrNull()
            _uiState.update {
                it.copy(
                    clientName = resolveClientName(null, authUser),
                    loading = true,
                )
            }
            try {
                withTimeout(25_000) {
                    reloadQuiet(authUser)
                }
            } catch (_: Exception) {
                // Spinnerni ushlab qolmaslik — fonida qayta urinish
            } finally {
                _uiState.update { it.copy(loading = false) }
            }
            ensureLiveDeliveryPolling(reuseOrdersOnce = true)
            if (_uiState.value.data == null) {
                launch {
                    delay(2_000)
                    runCatching {
                        withTimeout(25_000) { reloadQuiet(authUser) }
                    }
                }
            }
        }
    }

    suspend fun refresh() {
        try {
            withTimeout(45_000) {
                reloadQuiet()
            }
        } catch (_: Exception) {
            // Oldingi UI saqlanadi; pull-to-refresh spinner qotib qolmasin
        }
        ensureLiveDeliveryPolling(reuseOrdersOnce = true)
    }

    private suspend fun reloadQuiet(authUserHint: AuthUser? = null) = coroutineScope {
        val authUser = authUserHint ?: runCatching {
            withTimeout(5_000) { authRepository.getUserFlow().first() }
        }.getOrNull()
        val profileDeferred = async { runCatching { profileRepository.getProfile() }.getOrNull() }
        val ordersDeferred = async {
            runCatching { profileRepository.getAllOrders() }.getOrElse { emptyList() }
        }
        val promotionsDeferred = async {
            runCatching { promotionsRepository.getPromotions() }.getOrElse { emptyList() }
        }
        val apiDashDeferred = async {
            runCatching { profileRepository.fetchDashboardSummary() }.getOrNull()
        }
        val profile = profileDeferred.await()
        val allOrders = ordersDeferred.await()
        val promotions = promotionsDeferred.await()
        val apiDash = apiDashDeferred.await()
        val local = profileRepository.buildDashboardFromProfileOrders(profile, allOrders)
        val data = if (apiDash != null) {
            local.copy(
                debt = apiDash.debt.takeIf { it > 0 } ?: local.debt,
                bonusPoints = maxOf(apiDash.bonusPoints, local.bonusPoints),
                activeOrderCount = maxOf(apiDash.activeOrderCount, local.activeOrderCount),
                discountLevel = apiDash.discountLevel.ifBlank { local.discountLevel },
                discountSubtitle = apiDash.discountSubtitle.ifBlank { local.discountSubtitle },
                balance = apiDash.balance,
                totalPurchases = apiDash.totalPurchases.takeIf { it > 0 } ?: local.totalPurchases,
                organizations = apiDash.organizations.ifEmpty { local.organizations },
                purchasesByOrg = apiDash.purchasesByOrg.ifEmpty { local.purchasesByOrg },
            )
        } else {
            local
        }
        val range = _uiState.value.dateRange
        // «Барчаси» yo‘q — ko‘p orgda birinchisini tanlaymiz
        var companyId = _uiState.value.purchasesCompanyId
        val orgs = data.organizations
        if (companyId != null && orgs.none { it.companyId == companyId }) {
            companyId = null
        }
        if (companyId == null && orgs.size >= 2) {
            companyId = orgs.first().companyId
        }
        val filtered = DashboardDateFilter.computeFiltered(allOrders, range, companyId)
        // Buyurtmalar bo‘sh/timeout bo‘lsa ham API dashboard raqamlarini ko‘rsatamiz
        val displayFiltered = if (filtered.totalPurchases <= 0.0 && apiDash != null && apiDash.totalPurchases > 0) {
            filtered.copy(
                totalPurchases = if (companyId == null) {
                    apiDash.totalPurchases
                } else {
                    apiDash.purchasesByOrg.firstOrNull { it.companyId == companyId }?.total
                        ?: filtered.totalPurchases
                },
                activeOrderCount = maxOf(filtered.activeOrderCount, apiDash.activeOrderCount),
                purchasesByOrg = filtered.purchasesByOrg.ifEmpty { apiDash.purchasesByOrg },
            )
        } else {
            filtered
        }
        _uiState.update {
            it.copy(
                data = data,
                clientName = resolveClientName(profile, authUser),
                allOrders = allOrders,
                promotions = promotions,
                dateRange = range,
                purchasesCompanyId = companyId,
                filtered = displayFiltered,
            )
        }
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

    /** Kalendardan «tozalash» — sana filtri olib tashlanadi, chip yashirinadi. */
    fun clearDateRange() {
        applyRange(null)
    }

    fun selectAllDates() {
        applyRange(DashboardDateFilter.allOrdersRange(_uiState.value.allOrders))
    }

    fun selectPurchasesOrganization(companyId: String?) {
        _uiState.update { state ->
            state.copy(
                purchasesCompanyId = companyId,
                filtered = DashboardDateFilter.computeFiltered(
                    state.allOrders,
                    state.dateRange,
                    companyId,
                ),
            )
        }
    }

    private fun applyRange(range: DashboardDateRange?) {
        _uiState.update { state ->
            state.copy(
                dateRange = range,
                filtered = DashboardDateFilter.computeFiltered(
                    state.allOrders,
                    range,
                    state.purchasesCompanyId,
                ),
            )
        }
    }

    fun dateRangeLabel(): String =
        _uiState.value.dateRange?.let { DashboardDateFilter.formatRange(it) }.orEmpty()

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
                delay(3_000)
            }
        }
    }

    private suspend fun syncLiveDeliveryOnce(reuseOrders: Boolean = false) {
        val previous = _uiState.value.liveFleet
        val latest = if (reuseOrders && _uiState.value.allOrders.isNotEmpty()) {
            _uiState.value.allOrders
        } else {
            runCatching { orderRepository.getOrders() }.getOrNull()?.also { fetched ->
                _uiState.update { state ->
                    state.copy(
                        allOrders = fetched,
                        filtered = DashboardDateFilter.computeFiltered(
                            fetched,
                            state.dateRange,
                            state.purchasesCompanyId,
                        ),
                    )
                }
            }
        }
        val orders = latest ?: _uiState.value.allOrders

        val realOnWayIds = orders
            .filter { OrderStatus.fromKey(it.status) == OrderStatus.ON_WAY }
            .map { it.id }
            .toSet()

        val keysByOrderId = realOnWayIds.associateWith { orderId ->
            hideKeysForOrder(orderId, orders, previous)
        }
        mapRouteStopsHolder.syncOnWayOrders(realOnWayIds, keysByOrderId)

        // Pushsiz: yo‘ldagi buyurtma yetkazilganda modal
        if (onWayTrackReady) {
            val deliveredNow = trackedOnWayIds - realOnWayIds
            for (orderId in deliveredNow) {
                val status = orders.firstOrNull { it.id == orderId }
                    ?.let { OrderStatus.fromKey(it.status) }
                if (status == OrderStatus.DELIVERED) {
                    paymentPhotoAlertStore.onOrderDelivered(orderId)
                    break
                }
            }
        } else {
            onWayTrackReady = true
        }
        trackedOnWayIds = realOnWayIds

        var onWayIds = realOnWayIds.toMutableSet()

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
                    val trackingRaw = orderRepository.getOrderTracking(orderId) ?: return@async null
                    val status = OrderStatus.fromKey(trackingRaw.status)
                    val listSaysOnWay = orders.firstOrNull { it.id == orderId }
                        ?.let { OrderStatus.fromKey(it.status) == OrderStatus.ON_WAY }
                        ?: false
                    if (status == OrderStatus.DELIVERED || status == OrderStatus.CANCELLED) return@async null
                    if (status != OrderStatus.ON_WAY && !listSaysOnWay) return@async null

                    val prev = prevByOrder[orderId]
                    var tracking = trackingRaw
                    // Jonli WS nuqtasini eski HTTP bilan almashtirmaslik
                    val liveAt = liveCourierAtByOrder[orderId] ?: 0L
                    val prevPerson = prev?.tracking?.deliveryPerson
                    val httpAt = parseIsoMs(tracking.deliveryPerson?.lastLocationAt) ?: 0L
                    if (
                        prevPerson?.latitude != null &&
                        prevPerson.longitude != null &&
                        liveAt > 0L &&
                        System.currentTimeMillis() - liveAt < 20_000 &&
                        httpAt <= liveAt + 500
                    ) {
                        val lat = prevPerson.latitude!!
                        val lng = prevPerson.longitude!!
                        val distKm = if (
                            tracking.deliveryLatitude != null && tracking.deliveryLongitude != null
                        ) {
                            RoadRouteService.haversineM(
                                lat, lng, tracking.deliveryLatitude!!, tracking.deliveryLongitude!!,
                            ) / 1000.0
                        } else null
                        tracking = tracking.copy(
                            distanceKm = distKm?.takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) }
                                ?: tracking.distanceKm,
                            etaMinutes = distKm
                                ?.takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) }
                                ?.let { maxOf(5, Math.round((it / 30.0) * 60).toInt()) }
                                ?: tracking.etaMinutes,
                            deliveryPerson = tracking.deliveryPerson?.copy(
                                latitude = lat,
                                longitude = lng,
                                isOnline = true,
                                lastLocationAt = prevPerson.lastLocationAt
                                    ?: tracking.deliveryPerson?.lastLocationAt,
                            ),
                        )
                    } else if (httpAt > liveAt) {
                        liveCourierAtByOrder[orderId] = httpAt
                    }

                    var routePoints = prev?.routePoints.orEmpty()
                    var shopRoutePoints = prev?.shopRoutePoints.orEmpty()
                    var shopDistanceLabel = prev?.shopDistanceLabel.orEmpty()
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
                    val stopsChanged = RouteTrim.stopsSignature(tracking.routeStops) !=
                        RouteTrim.stopsSignature(prev?.tracking?.routeStops.orEmpty())
                    if (!gpsOk) {
                        routePoints = emptyList()
                        shopRoutePoints = emptyList()
                        shopDistanceLabel = ""
                        distanceLabel = "—"
                    } else if (deliveryLat != null && deliveryLng != null) {
                        val prevLat = prev?.tracking?.deliveryPerson?.latitude
                        val prevLng = prev?.tracking?.deliveryPerson?.longitude
                        val movedM = if (prevLat != null && prevLng != null) {
                            haversineMoved(prevLat, prevLng, courierLat!!, courierLng!!)
                        } else {
                            Double.MAX_VALUE
                        }
                        val oldRoute = if (stopsChanged) emptyList() else prev?.routePoints.orEmpty()
                        val oldShopRoute = if (stopsChanged) emptyList() else prev?.shopRoutePoints.orEmpty()
                        val nearestNow = if (oldRoute.isNotEmpty()) {
                            RouteTrim.nearestIndex(courierLat!!, courierLng!!, oldRoute)
                        } else {
                            -1
                        }
                        val nearestPrev = if (oldRoute.isNotEmpty() && prevLat != null && prevLng != null) {
                            RouteTrim.nearestIndex(prevLat, prevLng, oldRoute)
                        } else {
                            -1
                        }
                        val wentBack = nearestPrev >= 0 && nearestNow >= 0 && nearestNow + 2 < nearestPrev
                        val offRoute = nearestNow >= 0 && RoadRouteService.haversineM(
                            courierLat!!,
                            courierLng!!,
                            oldRoute[nearestNow].latitude,
                            oldRoute[nearestNow].longitude,
                        ) > 80.0

                        val movedEnough = prev == null ||
                            stopsChanged ||
                            prevLat == null ||
                            movedM > 45.0 ||
                            oldRoute.isEmpty() ||
                            oldShopRoute.isEmpty() ||
                            wentBack ||
                            offRoute

                        if (movedEnough) {
                            // Km = kuryer → tochka1 → … → mijoz (siz); magazin-only alohida.
                            val waypoints = RoadRouteService.waypointsUntilYou(
                                routeStops = tracking.routeStops,
                                deliveryLat = deliveryLat,
                                deliveryLng = deliveryLng,
                                untilYouOnly = true,
                            )
                            val multiStop = waypoints.size > 1
                            val route = roadRouteService.fetchDrivingRoute(
                                fromLat = courierLat!!,
                                fromLng = courierLng!!,
                                waypoints = waypoints,
                            )
                            if (route != null && GeoCoords.isPlausibleRouteDistanceKm(route.distanceKm)) {
                                routePoints = route.points
                                distanceLabel = formatDistance(route.distanceKm)
                            } else if (oldRoute.size >= 2 && !stopsChanged) {
                                routePoints = RouteTrim.remaining(courierLat!!, courierLng!!, oldRoute)
                                val pathKm = RouteTrim.pathLengthKm(routePoints)
                                    .takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) && it > 0.01 }
                                distanceLabel = when {
                                    pathKm != null -> formatDistance(pathKm)
                                    // Multi-stopda backend rawKm (faqat magazin) ni ishlatmaymiz
                                    !multiStop && rawKm != null &&
                                        GeoCoords.isPlausibleRouteDistanceKm(rawKm) ->
                                        formatDistance(rawKm)
                                    else -> distanceLabel
                                }
                            } else {
                                routePoints = RoadRouteService.fallbackViaWaypoints(
                                    courierLat!!, courierLng!!, waypoints,
                                )
                                val approx = approxStopsDistanceKm(
                                    courierLat, courierLng, waypoints,
                                )
                                distanceLabel = when {
                                    approx != null -> formatDistance(approx)
                                    !multiStop && rawKm != null &&
                                        GeoCoords.isPlausibleRouteDistanceKm(rawKm) ->
                                        formatDistance(rawKm)
                                    else -> distanceLabel.ifBlank { "—" }
                                }
                            }

                            // Kichik xarita / tochkalarsiz — faqat magazin (yo‘l bo‘ylab)
                            val shopRoute = roadRouteService.fetchDrivingRoute(
                                fromLat = courierLat!!,
                                fromLng = courierLng!!,
                                toLat = deliveryLat,
                                toLng = deliveryLng,
                            )
                            if (shopRoute != null && GeoCoords.isPlausibleRouteDistanceKm(shopRoute.distanceKm)) {
                                shopRoutePoints = shopRoute.points
                                shopDistanceLabel = formatDistance(shopRoute.distanceKm)
                            } else if (oldShopRoute.size >= 2) {
                                shopRoutePoints = RouteTrim.remaining(
                                    courierLat!!, courierLng!!, oldShopRoute,
                                )
                                val shopKm = RouteTrim.pathLengthKm(shopRoutePoints)
                                    .takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) && it > 0.01 }
                                shopDistanceLabel = shopKm?.let { formatDistance(it) }.orEmpty()
                            } else {
                                shopRoutePoints = emptyList()
                                shopDistanceLabel = ""
                            }
                        } else {
                            routePoints = RouteTrim.remaining(courierLat!!, courierLng!!, oldRoute)
                            val pathKm = RouteTrim.pathLengthKm(routePoints)
                                .takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) && it > 0.01 }
                            val multiStop = tracking.routeStops.size > 1
                            distanceLabel = when {
                                pathKm != null -> formatDistance(pathKm)
                                !multiStop && rawKm != null &&
                                    GeoCoords.isPlausibleRouteDistanceKm(rawKm) ->
                                    formatDistance(rawKm)
                                else -> distanceLabel
                            }
                            shopRoutePoints = RouteTrim.remaining(
                                courierLat!!, courierLng!!, oldShopRoute,
                            )
                            val shopKm = RouteTrim.pathLengthKm(shopRoutePoints)
                                .takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) && it > 0.01 }
                            shopDistanceLabel = shopKm?.let { formatDistance(it) }
                                ?: shopDistanceLabel
                        }
                    }

                    val storeName = _uiState.value.clientName.trim()
                        .takeIf { it.isNotEmpty() && it != "—" }
                        ?: tracking.deliveryAddress?.trim()?.takeIf { it.isNotEmpty() }
                        ?: "Magazin"

                    LiveMapOrder(
                        orderId = orderId,
                        amount = tracking.totalAmount,
                        distanceLabel = distanceLabel,
                        routePoints = routePoints,
                        shopRoutePoints = shopRoutePoints,
                        shopDistanceLabel = shopDistanceLabel,
                        deliveryLat = deliveryLat,
                        deliveryLng = deliveryLng,
                        storeName = storeName,
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
            .groupBy { vehicleKeyFor(it.tracking.deliveryPerson, it.tracking.companyId) }
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
                val companyId = group.firstOrNull()?.tracking?.companyId
                val companyShortName = group.firstOrNull()?.tracking?.companyShortName
                    ?: group.firstOrNull()?.tracking?.companyName
                if (withGps != null) {
                    val person = withGps.tracking.deliveryPerson!!
                    val routeSource = group.maxByOrNull { it.tracking.routeStops.size }?.tracking
                    LiveMapVehicle(
                        id = key,
                        courierLat = person.latitude!!,
                        courierLng = person.longitude!!,
                        courierName = person.name.ifBlank { "—" },
                        courierPhone = person.phone,
                        orders = group,
                        companyId = companyId,
                        companyShortName = companyShortName,
                        routeStops = routeSource?.routeStops.orEmpty(),
                        stopsBeforeYou = routeSource?.stopsBeforeYou ?: 0,
                        totalStops = routeSource?.totalStops ?: 0,
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
                    val routeSource = group.maxByOrNull { it.tracking.routeStops.size }?.tracking
                    LiveMapVehicle(
                        id = "dest-only:$key",
                        courierLat = lat,
                        courierLng = lng,
                        courierName = person?.name?.ifBlank { "—" } ?: "—",
                        courierPhone = person?.phone,
                        orders = group.map {
                            it.copy(
                                routePoints = emptyList(),
                                shopRoutePoints = emptyList(),
                                shopDistanceLabel = "",
                                distanceLabel = "—",
                            )
                        },
                        companyId = companyId,
                        companyShortName = companyShortName,
                        routeStops = routeSource?.routeStops.orEmpty(),
                        stopsBeforeYou = routeSource?.stopsBeforeYou ?: 0,
                        totalStops = routeSource?.totalStops ?: 0,
                    )
                }
            }

        _uiState.update {
            it.copy(liveFleet = vehicles.takeIf { v -> v.isNotEmpty() }?.let { LiveFleetUi(it) })
        }
        syncCourierWatches(vehicles)
    }

    private fun syncCourierWatches(vehicles: List<LiveMapVehicle>) {
        val ids = vehicles
            .asSequence()
            .filterNot { it.id.startsWith("dest-only") }
            .mapNotNull { v ->
                v.orders.firstOrNull()?.tracking?.deliveryPerson?.distributorId
                    ?.takeIf { it.isNotBlank() }
            }
            .toSet()
        if (ids.isEmpty()) {
            trackingSocket.unwatch()
        } else {
            trackingSocket.watchCouriers(ids)
        }
    }

    private fun applyLiveCourierToFleet(
        distributorId: String,
        lat: Double,
        lng: Double,
        recordedAt: String?,
    ) {
        val fleet = _uiState.value.liveFleet ?: return
        var changed = false
        val atMs = parseIsoMs(recordedAt) ?: System.currentTimeMillis()
        val vehicles = fleet.vehicles.map { vehicle ->
            val matchOrders = vehicle.orders.filter {
                it.tracking.deliveryPerson?.distributorId == distributorId
            }
            if (matchOrders.isEmpty()) return@map vehicle
            val sample = matchOrders.first()
            if (!GeoCoords.isUsableCourier(lat, lng, sample.deliveryLat, sample.deliveryLng)) {
                return@map vehicle
            }
            changed = true
            val updatedOrders = vehicle.orders.map { order ->
                if (order.tracking.deliveryPerson?.distributorId != distributorId) return@map order
                liveCourierAtByOrder[order.orderId] = atMs
                val distKm = if (order.deliveryLat != null && order.deliveryLng != null) {
                    RoadRouteService.haversineM(lat, lng, order.deliveryLat, order.deliveryLng) / 1000.0
                } else null
                val person = order.tracking.deliveryPerson!!.copy(
                    latitude = lat,
                    longitude = lng,
                    isOnline = true,
                    lastLocationAt = recordedAt ?: order.tracking.deliveryPerson?.lastLocationAt,
                )
                val trimmedRoute = if (order.routePoints.size >= 2) {
                    RouteTrim.remaining(lat, lng, order.routePoints)
                } else {
                    order.routePoints
                }
                val trimmedShop = if (order.shopRoutePoints.size >= 2) {
                    RouteTrim.remaining(lat, lng, order.shopRoutePoints)
                } else {
                    order.shopRoutePoints
                }
                val pathKm = RouteTrim.pathLengthKm(trimmedRoute)
                    .takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) && it > 0.01 }
                val shopKm = RouteTrim.pathLengthKm(trimmedShop)
                    .takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) && it > 0.01 }
                val multiStop = order.tracking.routeStops.size > 1 ||
                    order.tracking.routeStops.any { !it.isYou }
                // Live GPS: multi-stop km ni magazin haversine bilan almashtirmaslik
                val nextDistanceLabel = pathKm?.let { formatDistance(it) }
                    ?: order.distanceLabel.takeIf { it.isNotBlank() && it != "—" }
                    ?: if (!multiStop) {
                        distKm
                            ?.takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) }
                            ?.let { formatDistance(it) }
                    } else {
                        null
                    }
                    ?: order.distanceLabel
                order.copy(
                    distanceLabel = nextDistanceLabel,
                    routePoints = trimmedRoute,
                    shopRoutePoints = trimmedShop,
                    shopDistanceLabel = shopKm?.let { formatDistance(it) }
                        ?: order.shopDistanceLabel,
                    tracking = order.tracking.copy(
                        distanceKm = pathKm
                            ?: if (!multiStop) {
                                distKm?.takeIf { GeoCoords.isPlausibleRouteDistanceKm(it) }
                            } else {
                                null
                            }
                            ?: order.tracking.distanceKm,
                        etaMinutes = pathKm
                            ?.let { maxOf(5, Math.round((it / 30.0) * 60).toInt()) }
                            ?: order.tracking.etaMinutes,
                        deliveryPerson = person,
                    ),
                )
            }
            vehicle.copy(
                courierLat = lat,
                courierLng = lng,
                orders = updatedOrders,
            )
        }
        if (changed) {
            _uiState.update { it.copy(liveFleet = LiveFleetUi(vehicles)) }
        }
    }

    private fun vehicleKeyFor(
        person: DeliveryPersonTracking?,
        companyId: String?,
    ): String {
        val company = companyId?.takeIf { it.isNotBlank() } ?: "none"
        val distributorId = person?.distributorId?.takeIf { it.isNotBlank() }
        if (distributorId != null) return "courier:$distributorId:$company"
        val userId = person?.userId?.takeIf { it.isNotBlank() }
        if (userId != null) return "user:$userId:$company"
        val name = person?.name?.trim().orEmpty()
        return "anon:$company:${name.ifBlank { "unknown" }}"
    }

    private fun haversineMoved(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double =
        RoadRouteService.haversineM(lat1, lng1, lat2, lng2)

    private fun approxStopsDistanceKm(
        fromLat: Double,
        fromLng: Double,
        waypoints: List<uz.lider.client.data.repository.LatLngPoint>,
    ): Double? {
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

    private fun parseIsoMs(value: String?): Long? {
        if (value.isNullOrBlank()) return null
        return runCatching { Instant.parse(value).toEpochMilli() }.getOrNull()
    }

    private fun hideKeysForOrder(
        orderId: String,
        orders: List<ClientOrder>,
        fleet: LiveFleetUi?,
    ): Set<String> {
        val order = orders.firstOrNull { it.id == orderId }
        val companyId = order?.companyId?.trim()?.takeIf { it.isNotEmpty() }
        val keys = mutableSetOf<String>()
        if (companyId != null) keys += companyId
        fleet?.vehicles?.forEach { vehicle ->
            val matchesOrder = vehicle.orders.any { it.orderId == orderId }
            val matchesCompany = companyId != null &&
                vehicle.companyId?.trim().orEmpty() == companyId
            if (matchesOrder || matchesCompany) {
                vehicle.companyId?.trim()?.takeIf { it.isNotEmpty() }?.let { keys += it }
                vehicle.companyShortName?.trim()?.takeIf { it.isNotEmpty() }?.let { keys += it }
                vehicle.id.trim().takeIf { it.isNotEmpty() }?.let { keys += it }
            }
        }
        return keys
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
        socketJob?.cancel()
        trackingSocket.unwatch()
        super.onCleared()
    }
}
