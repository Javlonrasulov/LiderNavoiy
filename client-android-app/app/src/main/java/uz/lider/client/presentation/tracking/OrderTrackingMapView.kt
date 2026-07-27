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
import uz.lider.client.map.GeoCoords
import uz.lider.client.map.MapDefaults
import uz.lider.client.map.MapLayerId
import uz.lider.client.map.MapTileSources
import uz.lider.client.presentation.dashboard.LiveMapVehicle
import kotlin.math.abs
import kotlin.math.max

private val NAVOIY = GeoPoint(MapDefaults.NAVOIY_LAT, MapDefaults.NAVOIY_LNG)
private const val NAVOIY_ZOOM = 13.5
private const val SINGLE_POINT_ZOOM = 15.0
private const val ROUTE_COLOR = 0xFF2563EB.toInt()

private fun isValidCoord(lat: Double?, lng: Double?): Boolean = GeoCoords.isValid(lat, lng)

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

private fun updateFleetMap(
    map: MapView,
    vehicles: List<LiveMapVehicle>,
    interactive: Boolean,
    compactMarkers: Boolean,
    selectedStoreOrderId: String?,
    onVehicleClick: (LiveMapVehicle) -> Unit,
    onStoreClick: (StoreCallout) -> Unit,
    fitCamera: Boolean,
) {
    map.setTileSource(MapTileSources.source(MapLayerId.SHORTBREAD, dark = false))
    map.setMultiTouchControls(interactive)
    map.isClickable = interactive
    map.isFocusable = interactive

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

    // Yandex Taxi: faqat kuryer siljisa — marker ni siljitish, xaritani qayta qurmaslik
    if (canSlideTruck && !fitCamera) {
        val dest = GeoPoint(truckTarget!!.courierLat, truckTarget.courierLng)
        val from = existingTruck!!.position
        if (GeoCoords.samePoint(from.latitude, from.longitude, dest.latitude, dest.longitude, 1e-6)) {
            return
        }
        animateMarker(map, existingTruck, from, dest)
        // Route chizigini yangilash
        overlays.removeAll { it is Polyline }
        truckTarget.orders.forEach { order ->
            val roadGeo = order.routePoints
                .filter { isValidCoord(it.latitude, it.longitude) }
                .filter { GeoCoords.isInServiceArea(it.latitude, it.longitude) }
                .map { GeoPoint(it.latitude, it.longitude) }
            val delivery = if (isValidCoord(order.deliveryLat, order.deliveryLng)) {
                GeoPoint(order.deliveryLat!!, order.deliveryLng!!)
            } else null
            val linePoints = when {
                roadGeo.size >= 2 -> roadGeo
                delivery != null -> listOf(dest, delivery)
                else -> emptyList()
            }
            if (linePoints.size >= 2) {
                Polyline().apply {
                    setPoints(linePoints)
                    outlinePaint.color = ROUTE_COLOR
                    outlinePaint.strokeWidth = if (roadGeo.size >= 2) 10f else 6f
                    outlinePaint.strokeCap = android.graphics.Paint.Cap.ROUND
                    outlinePaint.strokeJoin = android.graphics.Paint.Join.ROUND
                    outlinePaint.isAntiAlias = true
                }.also { overlays.add(0, it) }
            }
        }
        existingTruck.relatedObject = truckTarget
        map.invalidate()
        return
    }

    overlays.removeAll { it is Marker || it is Polyline }

    val cameraPoints = ArrayList<GeoPoint>()
    val ctx = map.context
    val storeSizeDp = if (compactMarkers) 40 else 48
    val truckSizeDp = if (compactMarkers) 32 else 36
    val idleStoreIcon = createDeliveryPinDrawable(
        context = ctx,
        sizeDp = storeSizeDp,
        status = StoreMarkerStatus.APPROACHING,
        primaryColor = 0xFF3B82F6.toInt(),
    )
    val selectedStoreIcon = createDeliveryPinDrawable(
        context = ctx,
        sizeDp = storeSizeDp,
        status = StoreMarkerStatus.SELECTED,
        primaryColor = 0xFF3B82F6.toInt(),
    )

    vehicles.forEach { vehicle ->
        vehicle.orders.forEach { order ->
            val roadGeo = order.routePoints
                .filter { isValidCoord(it.latitude, it.longitude) }
                .filter { GeoCoords.isInServiceArea(it.latitude, it.longitude) }
                .map { GeoPoint(it.latitude, it.longitude) }
            val delivery = if (isValidCoord(order.deliveryLat, order.deliveryLng)) {
                GeoPoint(order.deliveryLat!!, order.deliveryLng!!)
            } else {
                null
            }
            val courierOk = GeoCoords.isUsableCourier(
                vehicle.courierLat,
                vehicle.courierLng,
                order.deliveryLat,
                order.deliveryLng,
            )
            val courier = if (courierOk) {
                GeoPoint(vehicle.courierLat, vehicle.courierLng)
            } else {
                null
            }

            val linePoints = when {
                roadGeo.size >= 2 -> roadGeo
                courier != null && delivery != null -> listOf(courier, delivery)
                else -> emptyList()
            }
            if (linePoints.size >= 2) {
                Polyline().apply {
                    setPoints(linePoints)
                    outlinePaint.color = ROUTE_COLOR
                    outlinePaint.strokeWidth = if (roadGeo.size >= 2) 10f else 6f
                    outlinePaint.strokeCap = android.graphics.Paint.Cap.ROUND
                    outlinePaint.strokeJoin = android.graphics.Paint.Join.ROUND
                    outlinePaint.isAntiAlias = true
                }.also { overlays.add(it) }
                cameraPoints.addAll(linePoints)
            }

            delivery?.let { point ->
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

        val truckIcon = createTruckMarkerDrawable(
            context = ctx,
            orderCount = vehicle.orderCount,
            sizeDp = truckSizeDp,
            online = true,
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
                // Admin xarita: doira markazga bog‘lanadi (pin emas)
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                icon = truckIcon
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

private fun animateMarker(map: MapView, marker: Marker, from: GeoPoint, to: GeoPoint) {
    val anim = android.animation.ValueAnimator.ofFloat(0f, 1f).apply {
        duration = 850
        interpolator = android.view.animation.LinearInterpolator()
        addUpdateListener { a ->
            val t = a.animatedValue as Float
            marker.position = GeoPoint(
                from.latitude + (to.latitude - from.latitude) * t,
                from.longitude + (to.longitude - from.longitude) * t,
            )
            map.invalidate()
        }
    }
    anim.start()
}

@Composable
fun OrderTrackingMapView(
    vehicles: List<LiveMapVehicle>,
    modifier: Modifier = Modifier,
    interactive: Boolean = true,
    compactMarkers: Boolean = false,
    onVehicleClick: (LiveMapVehicle) -> Unit = {},
) {
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val mapRef = remember { mutableStateOf<MapView?>(null) }
    val clickHandler = rememberUpdatedState(onVehicleClick)
    var selectedStore by remember { mutableStateOf<StoreCallout?>(null) }
    var cameraFitted by remember { mutableStateOf(false) }
    val vehicleSignature = remember(vehicles) {
        vehicles.joinToString("|") { v ->
            "${v.id}:${v.courierLat},${v.courierLng}:${v.orders.size}"
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
                    minZoomLevel = 5.0
                    maxZoomLevel = 19.0
                    setTileSource(MapTileSources.source(MapLayerId.SHORTBREAD, dark = false))
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
                val shouldFit = prevSignature.value == null || !cameraFitted
                updateFleetMap(
                    map = map,
                    vehicles = vehicles,
                    interactive = interactive,
                    compactMarkers = compactMarkers,
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
) {
    val vehicles = remember(deliveryLat, deliveryLng, courierLat, courierLng, routePoints, storeName) {
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
                ),
            )
            else -> emptyList()
        }
    }
    OrderTrackingMapView(
        vehicles = vehicles,
        modifier = modifier,
        interactive = interactive,
    )
}
