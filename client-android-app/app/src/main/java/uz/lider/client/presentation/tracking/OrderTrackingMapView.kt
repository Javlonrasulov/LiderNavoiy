package uz.lider.client.presentation.tracking

import android.graphics.drawable.GradientDrawable
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import uz.lider.client.data.repository.LatLngPoint
import uz.lider.client.map.MapDefaults
import uz.lider.client.map.MapLayerId
import uz.lider.client.map.MapTileSources
import kotlin.math.abs
import kotlin.math.max

private val NAVOIY = GeoPoint(MapDefaults.NAVOIY_LAT, MapDefaults.NAVOIY_LNG)
private const val NAVOIY_ZOOM = 13.5
private const val SINGLE_POINT_ZOOM = 15.0
private const val ROUTE_COLOR = 0xFF2563EB.toInt()
private const val DELIVERY_COLOR = 0xFF7C3AED.toInt()
private const val COURIER_COLOR = 0xFF2563EB.toInt()

private fun markerDrawable(color: Int, sizeDp: Int = 24): GradientDrawable =
    GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(color)
        setStroke(3, android.graphics.Color.WHITE)
        setSize(sizeDp, sizeDp)
    }

private fun isValidCoord(lat: Double?, lng: Double?): Boolean =
    lat != null && lng != null && lat in -90.0..90.0 && lng in -180.0..180.0 &&
        !(lat == 0.0 && lng == 0.0)

private data class MapPoint(val lat: Double, val lng: Double)

private fun applyCamera(map: MapView, points: List<GeoPoint>) {
    val controller = map.controller
    when {
        points.isEmpty() -> {
            controller.setCenter(NAVOIY)
            controller.setZoom(NAVOIY_ZOOM)
        }
        points.size == 1 -> {
            controller.setCenter(points.first())
            controller.setZoom(SINGLE_POINT_ZOOM)
        }
        else -> {
            try {
                val box = BoundingBox.fromGeoPoints(points)
                map.zoomToBoundingBox(box, false, 72)
            } catch (_: Exception) {
                val mid = GeoPoint(
                    points.map { it.latitude }.average(),
                    points.map { it.longitude }.average(),
                )
                val span = max(
                    abs(points.maxOf { it.latitude } - points.minOf { it.latitude }),
                    abs(points.maxOf { it.longitude } - points.minOf { it.longitude }),
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

private fun updateMapContent(
    map: MapView,
    deliveryLat: Double?,
    deliveryLng: Double?,
    courierLat: Double?,
    courierLng: Double?,
    routePoints: List<LatLngPoint>,
    isDark: Boolean,
    interactive: Boolean,
    deliveryIcon: GradientDrawable,
    courierIcon: GradientDrawable,
) {
    map.setTileSource(MapTileSources.source(MapLayerId.STANDARD, isDark))
    map.setMultiTouchControls(interactive)
    map.isClickable = interactive
    map.isFocusable = interactive

    val overlays = map.overlays
    overlays.removeAll { it is Marker || it is Polyline }

    fun addMarker(lat: Double, lng: Double, icon: GradientDrawable, anchorBottom: Boolean = false) {
        Marker(map).apply {
            position = GeoPoint(lat, lng)
            setAnchor(
                Marker.ANCHOR_CENTER,
                if (anchorBottom) Marker.ANCHOR_BOTTOM else Marker.ANCHOR_CENTER,
            )
            this.icon = icon
        }.also { overlays.add(it) }
    }

    val delivery = if (isValidCoord(deliveryLat, deliveryLng)) {
        MapPoint(deliveryLat!!, deliveryLng!!)
    } else {
        null
    }
    val courier = if (isValidCoord(courierLat, courierLng)) {
        MapPoint(courierLat!!, courierLng!!)
    } else {
        null
    }

    delivery?.let { addMarker(it.lat, it.lng, deliveryIcon, anchorBottom = true) }
    courier?.let { addMarker(it.lat, it.lng, courierIcon) }

    val roadGeo = routePoints
        .filter { isValidCoord(it.latitude, it.longitude) }
        .map { GeoPoint(it.latitude, it.longitude) }

    val linePoints = when {
        roadGeo.size >= 2 -> roadGeo
        delivery != null && courier != null -> listOf(
            GeoPoint(courier.lat, courier.lng),
            GeoPoint(delivery.lat, delivery.lng),
        )
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
    }

    val cameraPoints = buildList {
        addAll(linePoints)
        delivery?.let { add(GeoPoint(it.lat, it.lng)) }
        courier?.let { add(GeoPoint(it.lat, it.lng)) }
    }.distinctBy { "${it.latitude},${it.longitude}" }

    fun runCamera() {
        if (map.width <= 0 || map.height <= 0) {
            map.post { runCamera() }
            return
        }
        applyCamera(map, cameraPoints)
        map.invalidate()
    }

    runCamera()
}

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
) {
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val mapRef = remember { mutableStateOf<MapView?>(null) }
    val deliveryIcon = remember { markerDrawable(DELIVERY_COLOR, 26) }
    val courierIcon = remember { markerDrawable(COURIER_COLOR, 28) }

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

    AndroidView(
        modifier = modifier,
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
                setTileSource(MapTileSources.source(MapLayerId.STANDARD, isDark))
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
            updateMapContent(
                map = map,
                deliveryLat = deliveryLat,
                deliveryLng = deliveryLng,
                courierLat = courierLat,
                courierLng = courierLng,
                routePoints = routePoints,
                isDark = isDark,
                interactive = interactive,
                deliveryIcon = deliveryIcon,
                courierIcon = courierIcon,
            )
        },
        onRelease = { map ->
            map.onPause()
            map.onDetach()
            mapRef.value = null
        },
    )
}
