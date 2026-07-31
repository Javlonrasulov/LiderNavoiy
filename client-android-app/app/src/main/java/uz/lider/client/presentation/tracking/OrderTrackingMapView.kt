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
    return when {
        geo.size >= 2 -> geo
        courier != null && delivery != null -> listOf(courier, delivery)
        else -> emptyList()
    }
}

/** Bitta mashina = bitta asosiy marshrut (eski buyurtma chiziqlari «ghost» qolmasin). */
private fun primaryRouteOrder(vehicle: LiveMapVehicle): LiveMapOrder? {
    val sig = RouteTrim.stopsSignature(vehicle.routeStops)
    return vehicle.orders.firstOrNull {
        RouteTrim.stopsSignature(it.tracking.routeStops) == sig && it.routePoints.size >= 2
    } ?: vehicle.orders.maxByOrNull { it.routePoints.size }
}

private fun replaceRoutePolylines(
    map: MapView,
    vehicles: List<LiveMapVehicle>,
    courierOverride: GeoPoint? = null,
    overrideVehicleId: String? = null,
    showRouteStops: Boolean = true,
) {
    // Animatsiya bitta mashina uchun chaqirilsa ham — barcha org yo‘llari saqlansin
    val fleet = fleetVehiclesFromTag(map).ifEmpty { vehicles }
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
        val pts = order.routePoints
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
    map.tag = MapViewFleetTag(showRouteStops, stopsSig, routeSig, vehicles)

    val overlays = map.overlays
    val existingTruck = overlays
        .filterIsInstance<Marker>()
        .firstOrNull { it.relatedObject is LiveMapVehicle && !(it.relatedObject as LiveMapVehicle).id.startsWith("dest-only") }
    val truckTarget = vehicles.firstOrNull { !it.id.startsWith("dest-only") }
    val canSlideTruck = existingTruck != null &&
        truckTarget != null &&
        GeoCoords.isUsableCourier(
            truckTarget.courierLat,
            truckTarget.courierLng,
            truckTarget.orders.firstOrNull()?.deliveryLat,
            truckTarget.orders.firstOrNull()?.deliveryLng,
        )

    // Manzillar o‘zgarsa (yetkazildi) — to‘liq qayta chizish (12/13 markerlar o‘chsin)
    if (canSlideTruck && !fitCamera && !stopsChanged) {
        val dest = GeoPoint(truckTarget!!.courierLat, truckTarget.courierLng)
        val from = existingTruck!!.position
        existingTruck.relatedObject = truckTarget
        if (GeoCoords.samePoint(from.latitude, from.longitude, dest.latitude, dest.longitude, 1e-6)) {
            if (routeChanged) {
                replaceRoutePolylines(
                    map,
                    vehicles,
                    courierOverride = dest,
                    overrideVehicleId = truckTarget.id,
                    showRouteStops = showRouteStops,
                )
            }
            map.invalidate()
            return
        }
        replaceRoutePolylines(
            map,
            vehicles,
            courierOverride = dest,
            overrideVehicleId = truckTarget.id,
            showRouteStops = showRouteStops,
        )
        animateMarker(map, existingTruck, dest)
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

    vehicles.forEach { vehicle ->
        val orgColor = OrgMapColors.forCompany(vehicle.companyId)
        val idleStoreIcon = createDeliveryPinDrawable(
            context = ctx,
            sizeDp = storeSizeDp,
            status = StoreMarkerStatus.APPROACHING,
            primaryColor = orgColor,
        )
        val selectedStoreIcon = createDeliveryPinDrawable(
            context = ctx,
            sizeDp = storeSizeDp,
            status = StoreMarkerStatus.SELECTED,
            primaryColor = orgColor,
        )
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
            // showRouteStops faqat 1…N markerlar; yo‘l chizig‘i har doim OSRM marshruti
            val displayRoutePoints = primaryOrder.routePoints
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
        }

        vehicle.orders.forEach { order ->
            val delivery = if (isValidCoord(order.deliveryLat, order.deliveryLng)) {
                GeoPoint(order.deliveryLat!!, order.deliveryLng!!)
            } else {
                null
            }
            delivery?.let { point ->
                val hasRouteStops = showRouteStops && vehicle.routeStops.any {
                    it.latitude != null && it.longitude != null
                }
                if (!hasRouteStops) {
                    val storeLabel = order.storeName.trim().ifBlank {
                        order.tracking.deliveryAddress?.trim().orEmpty()
                    }.ifBlank { "Magazin" }
                    val callout = StoreCallout(name = storeLabel, orderId = order.orderId)
                    val isSelected = selectedStoreOrderId != null && selectedStoreOrderId == order.orderId
                    Marker(map).apply {
                        position = point
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                        icon = if (isSelected) selectedStoreIcon else idleStoreIcon
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
            }
        }

        // Raqamli manzillar (1…N) — faqat to‘liq yo‘nalish rejimida
        if (showRouteStops) {
            vehicle.routeStops.forEach { stop ->
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
                        isYou = stop.isYou,
                        sizeDp = if (compactMarkers) 32 else 36,
                        orgColor = orgColor,
                    )
                    relatedObject = if (stop.isYou) {
                        StoreCallout(name = "Siz", orderId = vehicle.orders.firstOrNull()?.orderId.orEmpty())
                    } else {
                        null
                    }
                    disableMarkerBubble(this)
                    if (stop.isYou) {
                        setOnMarkerClickListener { marker, mapView ->
                            val payload = marker.relatedObject as? StoreCallout
                            if (payload != null) onStoreClick(payload)
                            runCatching { mapView.controller.animateTo(marker.position) }
                            mapView.invalidate()
                            true
                        }
                    }
                }.also { overlays.add(it) }
                cameraPoints.add(point)
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
    mapLayer: MapLayerId = MapTileSources.defaultLayer,
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
                onDismiss = { selectedStore = null },
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
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
    )
}
