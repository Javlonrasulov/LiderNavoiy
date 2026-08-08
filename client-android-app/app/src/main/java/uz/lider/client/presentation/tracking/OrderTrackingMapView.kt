package uz.lider.client.presentation.tracking

import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import uz.lider.client.data.repository.LatLngPoint
import uz.lider.client.data.repository.RoadRouteService
import uz.lider.client.map.GeoCoords
import uz.lider.client.map.MapDefaults
import uz.lider.client.map.MapLayerId
import uz.lider.client.map.MapTileSources
import uz.lider.client.map.OrgMapColors
import uz.lider.client.map.RouteTrim
import uz.lider.client.presentation.dashboard.LiveMapOrder
import uz.lider.client.presentation.dashboard.LiveMapVehicle

import kotlin.math.abs
import kotlin.math.max

private val NAVOIY = GeoPoint(MapDefaults.NAVOIY_LAT, MapDefaults.NAVOIY_LNG)
private const val NAVOIY_ZOOM = 13.5
private const val SINGLE_POINT_ZOOM = 15.0
/** GPS oralig‘iga yaqin — Yandex Taxi kabi uzluksiz siljish */
private const val TRUCK_ANIM_MS = 2_800L

private val truckAnimators = java.util.WeakHashMap<Marker, android.animation.ValueAnimator>()

private fun isValidCoord(lat: Double?, lng: Double?): Boolean = GeoCoords.isValid(lat, lng)

private fun buildRouteLine(
    courier: GeoPoint?,
    delivery: GeoPoint?,
    routePoints: List<LatLngPoint>,
): List<GeoPoint> {
    val roadGeo = routePoints
        .filter { isValidCoord(it.latitude, it.longitude) }
        .filter { GeoCoords.isInServiceArea(it.latitude, it.longitude) }
    val trimmed = if (courier != null && roadGeo.size >= 2) {
        RouteTrim.remaining(courier.latitude, courier.longitude, roadGeo)
    } else {
        roadGeo
    }
    val geo = trimmed.map { GeoPoint(it.latitude, it.longitude) }
    // To‘g‘ri chiziq (havo) chizilmasin — faqat yo‘l bo‘ylab OSRM nuqtalari
    return if (geo.size >= 2) geo else emptyList()
}

/**
 * showRouteStops=true — to‘liq multi-stop yo‘l.
 * false — faqat magazin (shopRoutePoints, yo‘l bo‘ylab); to‘g‘ri chiziq emas.
 */
private fun routePointsForDisplay(
    order: LiveMapOrder,
    showRouteStops: Boolean,
): List<LatLngPoint> {
    if (showRouteStops) return order.routePoints
    return order.shopRoutePoints.ifEmpty { emptyList() }
}

/** Bitta mashina = bitta asosiy marshrut (eski buyurtma chiziqlari «ghost» qolmasin). */
private fun primaryRouteOrder(vehicle: LiveMapVehicle): LiveMapOrder? {
    val sig = RouteTrim.stopsSignature(vehicle.routeStops)
    return vehicle.orders.firstOrNull {
        RouteTrim.stopsSignature(it.tracking.routeStops) == sig && it.routePoints.size >= 2
    } ?: vehicle.orders.maxByOrNull { it.routePoints.size }
}

private fun vehicleShowsRouteStops(
    vehicle: LiveMapVehicle,
    globalShow: Boolean,
    hideCompanyIds: Set<String>,
): Boolean {
    if (!globalShow) return false
    if (hideCompanyIds.isEmpty()) return true
    val id = vehicle.companyId?.trim().orEmpty()
    val short = vehicle.companyShortName?.trim().orEmpty()
    val vid = vehicle.id.trim()
    if (id.isNotEmpty() && id in hideCompanyIds) return false
    if (short.isNotEmpty() && short in hideCompanyIds) return false
    if (vid.isNotEmpty() && vid in hideCompanyIds) return false
    return true
}

private fun replaceRoutePolylines(
    map: MapView,
    vehicles: List<LiveMapVehicle>,
    courierOverride: GeoPoint? = null,
    overrideVehicleId: String? = null,
    showRouteStops: Boolean = true,
    hideStopsCompanyIds: Set<String> = emptySet(),
) {
    // Animatsiya bitta mashina uchun chaqirilsa ham — barcha org yo‘llari saqlansin
    val fleet = fleetVehiclesFromTag(map).ifEmpty { vehicles }
    val tag = map.tag as? MapViewFleetTag
    // Tag — asosiy manba (parametr bo‘sh bo‘lsa ham eski hide yo‘qolmasin / chalkashmasin)
    val hideIds = tag?.hideStopsCompanyIds ?: hideStopsCompanyIds
    val globalShow = tag?.showRouteStops ?: showRouteStops
    val overlays = map.overlays
    overlays.removeAll { it is Polyline }
    fleet.forEach { vehicle ->
        val order = primaryRouteOrder(vehicle) ?: return@forEach
        val useOverride = courierOverride != null &&
            (overrideVehicleId == null || vehicle.id == overrideVehicleId)
        val courier = when {
            useOverride -> courierOverride
            !vehicle.id.startsWith("dest-only") &&
                GeoCoords.isUsableCourier(
                    vehicle.courierLat,
                    vehicle.courierLng,
                    order.deliveryLat,
                    order.deliveryLng,
                ) -> GeoPoint(vehicle.courierLat, vehicle.courierLng)
            else -> null
        }
        val delivery = if (isValidCoord(order.deliveryLat, order.deliveryLng)) {
            GeoPoint(order.deliveryLat!!, order.deliveryLng!!)
        } else {
            null
        }
        val showStops = vehicleShowsRouteStops(vehicle, globalShow, hideIds)
        val pts = routePointsForDisplay(order, showStops)
        val routeColor = OrgMapColors.forCompany(vehicle.companyId)
        val linePoints = buildRouteLine(courier, delivery, pts)
        if (linePoints.size >= 2) {
            Polyline().apply {
                setPoints(linePoints)
                outlinePaint.color = routeColor
                outlinePaint.strokeWidth = if (pts.size >= 2) 10f else 6f
                outlinePaint.strokeCap = android.graphics.Paint.Cap.ROUND
                outlinePaint.strokeJoin = android.graphics.Paint.Join.ROUND
                outlinePaint.isAntiAlias = true
            }.also { overlays.add(0, it) }
        }
    }
}

private fun showRouteStopsFromTag(map: MapView): Boolean =
    (map.tag as? MapViewFleetTag)?.showRouteStops ?: true

private fun applyCamera(map: MapView, points: List<GeoPoint>) {
    val controller = map.controller
    val safePoints = points.filter {
        GeoCoords.isInServiceArea(it.latitude, it.longitude)
    }.ifEmpty { points.filter { isValidCoord(it.latitude, it.longitude) } }

    when {
        safePoints.isEmpty() -> {
            controller.setCenter(NAVOIY)
            controller.setZoom(NAVOIY_ZOOM)
        }
        safePoints.size == 1 -> {
            controller.setCenter(safePoints.first())
            controller.setZoom(SINGLE_POINT_ZOOM)
        }
        else -> {
            val span = max(
                abs(safePoints.maxOf { it.latitude } - safePoints.minOf { it.latitude }),
                abs(safePoints.maxOf { it.longitude } - safePoints.minOf { it.longitude }),
            )
            if (span > 1.5) {
                controller.setCenter(NAVOIY)
                controller.setZoom(NAVOIY_ZOOM)
                return
            }
            try {
                val box = BoundingBox.fromGeoPoints(safePoints)
                map.zoomToBoundingBox(box, false, 72)
            } catch (_: Exception) {
                val mid = GeoPoint(
                    safePoints.map { it.latitude }.average(),
                    safePoints.map { it.longitude }.average(),
                )
                val zoom = when {
                    span < 0.01 -> 15.0
                    span < 0.03 -> 14.5
                    span < 0.08 -> 13.5
                    else -> 12.5
                }
                controller.setCenter(mid)
                controller.setZoom(zoom)
            }
        }
    }
}

private fun disableMarkerBubble(marker: Marker) {
    runCatching { marker.setInfoWindow(null) }
    runCatching { marker.infoWindow = null }
}

private data class MapViewFleetTag(
    val showRouteStops: Boolean,
    val hideStopsCompanyIds: Set<String> = emptySet(),
    val stopsSignature: String,
    val routeSignature: String,
    val vehicles: List<LiveMapVehicle> = emptyList(),
)

private fun fleetVehiclesFromTag(map: MapView): List<LiveMapVehicle> =
    (map.tag as? MapViewFleetTag)?.vehicles.orEmpty()

private fun fleetRouteSignature(vehicles: List<LiveMapVehicle>): String =
    vehicles.joinToString("#") { v ->
        val order = primaryRouteOrder(v)
        val pts = order?.routePoints.orEmpty()
        if (pts.isEmpty()) "0" else "${pts.size}:${"%.4f".format(pts.first().latitude)}:${"%.4f".format(pts.last().latitude)}:${"%.4f".format(pts.last().longitude)}"
    }

private fun updateFleetMap(
    map: MapView,
    vehicles: List<LiveMapVehicle>,
    interactive: Boolean,
    compactMarkers: Boolean,
    showRouteStops: Boolean,
    hideStopsCompanyIds: Set<String>,
    selectedStoreOrderId: String?,
    onVehicleClick: (LiveMapVehicle) -> Unit,
    onStoreClick: (StoreCallout) -> Unit,
    fitCamera: Boolean,
) {
    map.setMultiTouchControls(interactive)
    map.isClickable = interactive
    map.isFocusable = interactive
    val stopsSig = vehicles.joinToString("#") { RouteTrim.stopsSignature(it.routeStops) }
    val routeSig = fleetRouteSignature(vehicles)
    val prevTag = map.tag as? MapViewFleetTag
    val stopsChanged = prevTag?.stopsSignature != stopsSig
    val routeChanged = prevTag?.routeSignature != routeSig
    val showStopsChanged = prevTag?.showRouteStops != showRouteStops ||
        prevTag?.hideStopsCompanyIds != hideStopsCompanyIds
    map.tag = MapViewFleetTag(
        showRouteStops = showRouteStops,
        hideStopsCompanyIds = hideStopsCompanyIds,
        stopsSignature = stopsSig,
        routeSignature = routeSig,
        vehicles = vehicles,
    )

    val overlays = map.overlays
    val existingTrucks = overlays
        .filterIsInstance<Marker>()
        .mapNotNull { m ->
            val v = m.relatedObject as? LiveMapVehicle ?: return@mapNotNull null
            if (v.id.startsWith("dest-only")) null else v.id to m
        }
        .toMap()
    val liveTargets = vehicles.filter { v ->
        !v.id.startsWith("dest-only") &&
            GeoCoords.isUsableCourier(
                v.courierLat,
                v.courierLng,
                v.orders.firstOrNull()?.deliveryLat,
                v.orders.firstOrNull()?.deliveryLng,
            ) &&
            existingTrucks.containsKey(v.id)
    }
    val canSlideTrucks = liveTargets.isNotEmpty() &&
        liveTargets.size == existingTrucks.size &&
        vehicles.count { !it.id.startsWith("dest-only") } == liveTargets.size

    // Manzillar / toggle o‘zgarsa — to‘liq qayta chizish; GPS — silliq siljish
    if (canSlideTrucks && !fitCamera && !stopsChanged && !showStopsChanged) {
        var anyMove = false
        liveTargets.forEach { truckTarget ->
            val marker = existingTrucks[truckTarget.id] ?: return@forEach
            val dest = GeoPoint(truckTarget.courierLat, truckTarget.courierLng)
            val from = marker.position
            marker.relatedObject = truckTarget
            if (GeoCoords.samePoint(from.latitude, from.longitude, dest.latitude, dest.longitude, 1e-6)) {
                return@forEach
            }
            anyMove = true
            animateMarker(map, marker, dest)
        }
        // Yangi OSRM yo‘l keldi, GPS joyi o‘zgarmagan — faqat chiziq
        if (routeChanged && !anyMove) {
            replaceRoutePolylines(
                map,
                vehicles,
                showRouteStops = showRouteStops,
            )
        }
        map.invalidate()
        return
    }

    truckAnimators.values.forEach { it.cancel() }
    truckAnimators.clear()
    overlays.removeAll { it is Marker || it is Polyline }

    val cameraPoints = ArrayList<GeoPoint>()
    val ctx = map.context
    val storeSizeDp = if (compactMarkers) 40 else 48
    val truckSizeDp = if (compactMarkers) 32 else 36

    // Mijoz magazini — barcha org buyurtmalari bitta ikonkada
    data class ShopAgg(
        val lat: Double,
        val lng: Double,
        var storeName: String,
        val orderIds: MutableList<String> = mutableListOf(),
        val orgStops: LinkedHashMap<String, OrgStopCount> = linkedMapOf(),
        var companyId: String? = null,
    )
    val shops = linkedMapOf<String, ShopAgg>()
    vehicles.forEach { vehicle ->
        vehicle.orders.forEach { order ->
            val lat = order.deliveryLat
            val lng = order.deliveryLng
            if (!isValidCoord(lat, lng)) return@forEach
            val key = "%.5f,%.5f".format(lat, lng)
            val org = vehicle.companyShortName?.trim()?.takeIf { it.isNotEmpty() }
                ?: vehicle.companyId?.trim()?.takeIf { it.isNotEmpty() }
            val label = order.storeName.trim().ifBlank {
                order.tracking.deliveryAddress?.trim().orEmpty()
            }.ifBlank { "Magazin" }
            val agg = shops.getOrPut(key) {
                ShopAgg(lat = lat!!, lng = lng!!, storeName = label, companyId = vehicle.companyId)
            }
            if (agg.storeName.isBlank() || agg.storeName == "Magazin") agg.storeName = label
            if (order.orderId.isNotBlank() && order.orderId !in agg.orderIds) {
                agg.orderIds += order.orderId
            }
            if (org != null) {
                val stopCount = max(
                    vehicle.totalStops,
                    vehicle.routeStops.size,
                ).coerceAtLeast(vehicle.routeStops.count { !it.isYou })
                val beforeYou = max(
                    vehicle.stopsBeforeYou,
                    vehicle.routeStops.count { !it.isYou },
                )
                val orgKey = vehicle.companyId?.trim()?.takeIf { it.isNotEmpty() } ?: org
                val prev = agg.orgStops[orgKey]
                agg.orgStops[orgKey] = OrgStopCount(
                    name = org,
                    count = max(prev?.count ?: 0, stopCount),
                    stopsBeforeYou = max(prev?.stopsBeforeYou ?: 0, beforeYou),
                    companyId = vehicle.companyId,
                )
            }
            if (agg.companyId == null) agg.companyId = vehicle.companyId
        }
    }

    shops.values.forEach { shop ->
        val orgColor = OrgMapColors.forCompany(shop.companyId)
        val callout = StoreCallout(
            name = shop.storeName,
            orderId = shop.orderIds.firstOrNull(),
            orgStops = shop.orgStops.values.toList(),
        )
        val isSelected = selectedStoreOrderId != null &&
            shop.orderIds.any { it == selectedStoreOrderId }
        val point = GeoPoint(shop.lat, shop.lng)
        Marker(map).apply {
            position = point
            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
            icon = createDeliveryPinDrawable(
                context = ctx,
                sizeDp = storeSizeDp,
                status = if (isSelected) StoreMarkerStatus.SELECTED else StoreMarkerStatus.APPROACHING,
                primaryColor = orgColor,
            )
            relatedObject = callout
            disableMarkerBubble(this)
            setOnMarkerClickListener { marker, mapView ->
                val payload = marker.relatedObject as? StoreCallout ?: callout
                onStoreClick(payload)
                runCatching { mapView.controller.animateTo(marker.position) }
                mapView.invalidate()
                true
            }
        }.also { overlays.add(it) }
        cameraPoints.add(point)
    }

    vehicles.forEach { vehicle ->
        val orgColor = OrgMapColors.forCompany(vehicle.companyId)
        // Bitta poliliniya — bir nechta buyurtma eski yo‘llarni «ghost» qilib qoldirmasin
        val primaryOrder = primaryRouteOrder(vehicle)
        if (primaryOrder != null) {
            val delivery = if (isValidCoord(primaryOrder.deliveryLat, primaryOrder.deliveryLng)) {
                GeoPoint(primaryOrder.deliveryLat!!, primaryOrder.deliveryLng!!)
            } else {
                null
            }
            val courierOk = GeoCoords.isUsableCourier(
                vehicle.courierLat,
                vehicle.courierLng,
                primaryOrder.deliveryLat,
                primaryOrder.deliveryLng,
            )
            val courier = if (courierOk) {
                GeoPoint(vehicle.courierLat, vehicle.courierLng)
            } else {
                null
            }
            // Org alohida: hide — raqamlar + oraliq yo‘l yo‘q, faqat magazingacha
            val showStops = vehicleShowsRouteStops(vehicle, showRouteStops, hideStopsCompanyIds)
            val displayRoutePoints = routePointsForDisplay(primaryOrder, showStops)
            val linePoints = buildRouteLine(courier, delivery, displayRoutePoints)
            if (linePoints.size >= 2) {
                Polyline().apply {
                    setPoints(linePoints)
                    outlinePaint.color = orgColor
                    outlinePaint.strokeWidth = if (displayRoutePoints.size >= 2) 10f else 6f
                    outlinePaint.strokeCap = android.graphics.Paint.Cap.ROUND
                    outlinePaint.strokeJoin = android.graphics.Paint.Join.ROUND
                    outlinePaint.isAntiAlias = true
                }.also { overlays.add(it) }
                cameraPoints.addAll(linePoints)
            }

            // Raqamli manzillar (1…N) — faqat shu org uchun yoqilgan bo‘lsa
            if (showStops) {
                vehicle.routeStops.forEach { stop ->
                    if (stop.isYou) return@forEach
                    val lat = stop.latitude
                    val lng = stop.longitude
                    if (lat == null || lng == null || !isValidCoord(lat, lng)) return@forEach
                    val point = GeoPoint(lat, lng)
                    Marker(map).apply {
                        position = point
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                        icon = createNumberedStopDrawable(
                            context = ctx,
                            sequence = stop.sequence,
                            isYou = false,
                            sizeDp = if (compactMarkers) 32 else 36,
                            orgColor = orgColor,
                        )
                        relatedObject = null
                        disableMarkerBubble(this)
                    }.also { overlays.add(it) }
                    cameraPoints.add(point)
                }
            }
        }

        val truckIcon = createTruckMarkerDrawable(
            context = ctx,
            orderCount = vehicle.orderCount,
            sizeDp = truckSizeDp,
            online = true,
            orgLabel = vehicle.companyShortName,
            accentColor = orgColor,
        )
        if (!vehicle.id.startsWith("dest-only") &&
            GeoCoords.isUsableCourier(
                vehicle.courierLat,
                vehicle.courierLng,
                vehicle.orders.firstOrNull()?.deliveryLat,
                vehicle.orders.firstOrNull()?.deliveryLng,
            )
        ) {
            Marker(map).apply {
                position = GeoPoint(vehicle.courierLat, vehicle.courierLng)
                // Doira markazi geo-nuqtaga — label uning ustida
                setAnchor(Marker.ANCHOR_CENTER, truckIcon.discAnchorY)
                icon = truckIcon.drawable
                relatedObject = vehicle
                disableMarkerBubble(this)
                setOnMarkerClickListener { marker, mapView ->
                    val v = marker.relatedObject as? LiveMapVehicle
                    if (v != null) onVehicleClick(v)
                    mapView.invalidate()
                    true
                }
            }.also { overlays.add(it) }
            cameraPoints.add(GeoPoint(vehicle.courierLat, vehicle.courierLng))
        }
    }

    val distinct = cameraPoints.distinctBy { "${it.latitude},${it.longitude}" }
    fun runCamera() {
        if (map.width <= 0 || map.height <= 0) {
            map.post { runCamera() }
            return
        }
        applyCamera(map, distinct)
        map.invalidate()
    }
    if (fitCamera) runCamera() else map.invalidate()
}

/**
 * Joriy (ekrandagi) pozitsiyadan yangi GPS nuqtaga ~2.8s linear siljish.
 * Yangi nuqta kelganda eski animatsiya bekor — Yandex Taxi uslubi.
 */
private fun animateMarker(map: MapView, marker: Marker, to: GeoPoint) {
    truckAnimators.remove(marker)?.cancel()
    val from = marker.position
    val distM = RoadRouteService.haversineM(
        from.latitude, from.longitude, to.latitude, to.longitude,
    )
    // Juda kichik siljish — darhol
    if (distM < 1.5) {
        marker.position = to
        val vehicle = marker.relatedObject as? LiveMapVehicle
        if (vehicle != null) {
            replaceRoutePolylines(
                map,
                vehicles = fleetVehiclesFromTag(map).ifEmpty { listOf(vehicle) },
                courierOverride = to,
                overrideVehicleId = vehicle.id,
                showRouteStops = showRouteStopsFromTag(map),
            )
        }
        map.invalidate()
        return
    }
    // Masofaga mos duration, lekin GPS oralig‘idan qisqa bo‘lmasin
    val duration = when {
        distM < 8 -> 1_200L
        distM < 40 -> 2_200L
        else -> TRUCK_ANIM_MS
    }
    var lastRoutePaint = 0L
    val anim = android.animation.ValueAnimator.ofFloat(0f, 1f).apply {
        this.duration = duration
        interpolator = android.view.animation.LinearInterpolator()
        addUpdateListener { a ->
            val t = a.animatedValue as Float
            marker.position = GeoPoint(
                from.latitude + (to.latitude - from.latitude) * t,
                from.longitude + (to.longitude - from.longitude) * t,
            )
            val now = android.os.SystemClock.uptimeMillis()
            // Chiziqni ~200ms da bir yangilash (har kadr emas)
            if (now - lastRoutePaint > 200L) {
                lastRoutePaint = now
                val vehicle = marker.relatedObject as? LiveMapVehicle
                if (vehicle != null) {
                    replaceRoutePolylines(
                        map,
                        vehicles = fleetVehiclesFromTag(map).ifEmpty { listOf(vehicle) },
                        courierOverride = marker.position,
                        overrideVehicleId = vehicle.id,
                        showRouteStops = showRouteStopsFromTag(map),
                    )
                }
            }
            map.invalidate()
        }
        addListener(object : android.animation.AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: android.animation.Animator) {
                truckAnimators.remove(marker)
                marker.position = to
                val vehicle = marker.relatedObject as? LiveMapVehicle
                if (vehicle != null) {
                    replaceRoutePolylines(
                        map,
                        vehicles = fleetVehiclesFromTag(map).ifEmpty { listOf(vehicle) },
                        courierOverride = to,
                        overrideVehicleId = vehicle.id,
                        showRouteStops = showRouteStopsFromTag(map),
                    )
                }
                map.invalidate()
            }

            override fun onAnimationCancel(animation: android.animation.Animator) {
                truckAnimators.remove(marker)
            }
        })
    }
    truckAnimators[marker] = anim
    anim.start()
}

@Composable
fun OrderTrackingMapView(
    vehicles: List<LiveMapVehicle>,
    modifier: Modifier = Modifier,
    interactive: Boolean = true,
    compactMarkers: Boolean = false,
    /** false — default tozalangan: faqat mashina + siz; true — 1…N manzillar. */
    showRouteStops: Boolean = true,
    /** companyId / shortName — shu org tochkalarini yashirish (boshqalariga ta’sir qilmaydi). */
    hideStopsCompanyIds: Set<String> = emptySet(),
    mapLayer: MapLayerId = MapTileSources.defaultLayer,
    /** Fullscreen title qatori ostiga — magazin bubble yashirinmasin. */
    calloutTopInset: Dp = 0.dp,
    onVehicleClick: (LiveMapVehicle) -> Unit = {},
) {
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val mapRef = remember { mutableStateOf<MapView?>(null) }
    val clickHandler = rememberUpdatedState(onVehicleClick)
    var selectedStore by remember { mutableStateOf<StoreCallout?>(null) }
    var cameraFitted by remember { mutableStateOf(false) }
    val vehicleSignature = remember(vehicles) {
        vehicles.joinToString("|") { v ->
            val routeSig = v.orders.joinToString(";") { o ->
                "${o.routePoints.size}:${o.routePoints.firstOrNull()?.latitude}:" +
                    "${o.routePoints.lastOrNull()?.longitude}"
            }
            "${v.id}:${v.courierLat},${v.courierLng}:${v.orders.size}:$routeSig"
        }
    }
    val prevSignature = remember { mutableStateOf<String?>(null) }

    DisposableEffect(lifecycle) {
        fun startMap() = mapRef.value?.onResume()
        fun stopMap() = mapRef.value?.onPause()
        if (lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) startMap()
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> startMap()
                Lifecycle.Event.ON_PAUSE -> stopMap()
                else -> Unit
            }
        }
        lifecycle.addObserver(observer)
        onDispose {
            lifecycle.removeObserver(observer)
            stopMap()
        }
    }

    Box(modifier = modifier) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                MapView(ctx).apply {
                    layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                    setMultiTouchControls(interactive)
                    isTilesScaledToDpi = true
                    setHorizontalMapRepetitionEnabled(false)
                    setVerticalMapRepetitionEnabled(false)
                    setLayerType(View.LAYER_TYPE_HARDWARE, null)
                    // Osmdroid o'z zoom tugmalarini yashirish — bizning fullscreen tugmamiz ishlatiladi
                    runCatching {
                        zoomController.setVisibility(
                            org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER,
                        )
                    }
                    minZoomLevel = 5.0
                    maxZoomLevel = 19.0
                    setTileSource(MapTileSources.source(MapTileSources.defaultLayer, dark = false))
                    controller.setZoom(NAVOIY_ZOOM)
                    controller.setCenter(NAVOIY)
                    mapRef.value = this
                    post {
                        onResume()
                        applyCamera(this, emptyList())
                    }
                }
            },
            update = { map ->
                if (map.layoutParams == null ||
                    map.layoutParams.width != ViewGroup.LayoutParams.MATCH_PARENT ||
                    map.layoutParams.height != ViewGroup.LayoutParams.MATCH_PARENT
                ) {
                    map.layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                }
                val desired = MapTileSources.source(mapLayer, dark = false)
                if (map.tileProvider.tileSource.name() != desired.name()) {
                    map.setTileSource(desired)
                    map.invalidate()
                }
                val shouldFit = prevSignature.value == null || !cameraFitted
                updateFleetMap(
                    map = map,
                    vehicles = vehicles,
                    interactive = interactive,
                    compactMarkers = compactMarkers,
                    showRouteStops = showRouteStops,
                    hideStopsCompanyIds = hideStopsCompanyIds,
                    selectedStoreOrderId = selectedStore?.orderId,
                    onVehicleClick = {
                        selectedStore = null
                        clickHandler.value(it)
                    },
                    onStoreClick = { selectedStore = it },
                    fitCamera = shouldFit,
                )
                if (vehicles.isNotEmpty()) {
                    prevSignature.value = vehicleSignature
                    cameraFitted = true
                }
            },
            onRelease = { map ->
                map.onPause()
                map.onDetach()
                mapRef.value = null
            },
        )

        selectedStore?.let { callout ->
            GlassStoreNameBubble(
                name = callout.name,
                orgStops = callout.orgStops,
                onDismiss = { selectedStore = null },
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth()
                    .padding(
                        start = 12.dp,
                        end = 12.dp,
                        top = calloutTopInset + 8.dp,
                        bottom = 10.dp,
                    ),
            )
        }
    }
}

/** Single-order convenience wrapper (tracking screen). */
@Composable
fun OrderTrackingMapView(
    deliveryLat: Double?,
    deliveryLng: Double?,
    courierLat: Double?,
    courierLng: Double?,
    isDark: Boolean,
    modifier: Modifier = Modifier,
    routePoints: List<LatLngPoint> = emptyList(),
    interactive: Boolean = true,
    storeName: String = "",
    routeStops: List<uz.lider.client.domain.model.RouteStopInfo> = emptyList(),
    stopsBeforeYou: Int = 0,
    totalStops: Int = 0,
    mapLayer: MapLayerId = MapTileSources.defaultLayer,
    calloutTopInset: Dp = 0.dp,
) {
    val vehicles = remember(
        deliveryLat, deliveryLng, courierLat, courierLng, routePoints, storeName,
        routeStops, stopsBeforeYou, totalStops,
    ) {
        val label = storeName.trim().ifBlank { "Magazin" }
        val order = uz.lider.client.presentation.dashboard.LiveMapOrder(
            orderId = "single",
            amount = 0.0,
            distanceLabel = "—",
            routePoints = routePoints,
            deliveryLat = deliveryLat,
            deliveryLng = deliveryLng,
            storeName = label,
            tracking = uz.lider.client.domain.model.OrderTrackingDetails(
                orderId = "single",
                status = "on_way",
                totalAmount = 0.0,
                deliveryAddress = label,
                deliveryLatitude = deliveryLat,
                deliveryLongitude = deliveryLng,
                distanceKm = null,
                etaMinutes = null,
                routeStops = routeStops,
                stopsBeforeYou = stopsBeforeYou,
                totalStops = totalStops,
            ),
        )
        when {
            GeoCoords.isUsableCourier(courierLat, courierLng, deliveryLat, deliveryLng) -> listOf(
                LiveMapVehicle(
                    id = "single",
                    courierLat = courierLat!!,
                    courierLng = courierLng!!,
                    courierName = "",
                    courierPhone = null,
                    orders = listOf(order),
                    routeStops = routeStops,
                    stopsBeforeYou = stopsBeforeYou,
                    totalStops = totalStops,
                ),
            )
            isValidCoord(deliveryLat, deliveryLng) -> listOf(
                LiveMapVehicle(
                    id = "dest-only",
                    courierLat = deliveryLat!!,
                    courierLng = deliveryLng!!,
                    courierName = "",
                    courierPhone = null,
                    orders = listOf(order),
                    routeStops = routeStops,
                    stopsBeforeYou = stopsBeforeYou,
                    totalStops = totalStops,
                ),
            )
            else -> emptyList()
        }
    }
    OrderTrackingMapView(
        vehicles = vehicles,
        modifier = modifier,
        interactive = interactive,
        showRouteStops = true,
        mapLayer = mapLayer,
        calloutTopInset = calloutTopInset,
    )
}
