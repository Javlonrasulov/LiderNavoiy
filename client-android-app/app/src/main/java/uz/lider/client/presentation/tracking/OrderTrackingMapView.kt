package uz.lider.client.presentation.tracking

import android.graphics.drawable.GradientDrawable
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
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
import uz.lider.client.map.MapDefaults
import uz.lider.client.map.MapLayerId
import uz.lider.client.map.MapTileSources

private val NAVOIY = GeoPoint(MapDefaults.NAVOIY_LAT, MapDefaults.NAVOIY_LNG)
private const val NAVOIY_ZOOM = 12.0
private const val ROUTE_COLOR = 0xFF6366F1.toInt()
private const val DELIVERY_COLOR = 0xFF6366F1.toInt()
private const val COURIER_COLOR = 0xFF3B82F6.toInt()

private fun markerDrawable(color: Int, sizeDp: Int = 24): GradientDrawable =
    GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(color)
        setStroke(3, android.graphics.Color.WHITE)
        setSize(sizeDp, sizeDp)
    }

@Composable
fun OrderTrackingMapView(
    deliveryLat: Double?,
    deliveryLng: Double?,
    courierLat: Double?,
    courierLng: Double?,
    isDark: Boolean,
    modifier: Modifier = Modifier,
) {
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val mapRef = remember { mutableStateOf<MapView?>(null) }
    val deliveryMarkerRef = remember { mutableStateOf<Marker?>(null) }
    val courierMarkerRef = remember { mutableStateOf<Marker?>(null) }
    val routeLineRef = remember { mutableStateOf<Polyline?>(null) }
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

    LaunchedEffect(deliveryLat, deliveryLng, courierLat, courierLng, isDark) {
        val map = mapRef.value ?: return@LaunchedEffect
        map.setTileSource(MapTileSources.source(MapLayerId.STANDARD, isDark))

        val overlays = map.overlays
        routeLineRef.value?.let { overlays.remove(it) }
        routeLineRef.value = null

        fun upsertMarker(
            ref: androidx.compose.runtime.MutableState<Marker?>,
            lat: Double?,
            lng: Double?,
            icon: GradientDrawable,
            anchorBottom: Boolean = false,
        ) {
            ref.value?.let { overlays.remove(it) }
            ref.value = null
            if (lat != null && lng != null) {
                ref.value = Marker(map).apply {
                    position = GeoPoint(lat, lng)
                    setAnchor(
                        Marker.ANCHOR_CENTER,
                        if (anchorBottom) Marker.ANCHOR_BOTTOM else Marker.ANCHOR_CENTER,
                    )
                    this.icon = icon
                }.also { overlays.add(it) }
            }
        }

        upsertMarker(deliveryMarkerRef, deliveryLat, deliveryLng, deliveryIcon, anchorBottom = true)
        upsertMarker(courierMarkerRef, courierLat, courierLng, courierIcon)

        val points = buildList {
            if (deliveryLat != null && deliveryLng != null) add(GeoPoint(deliveryLat, deliveryLng))
            if (courierLat != null && courierLng != null) add(GeoPoint(courierLat, courierLng))
        }

        if (points.size == 2) {
            routeLineRef.value = Polyline().apply {
                setPoints(points)
                outlinePaint.color = ROUTE_COLOR
                outlinePaint.strokeWidth = 8f
            }.also { overlays.add(it) }
            val box = BoundingBox.fromGeoPoints(points)
            map.zoomToBoundingBox(box.increaseByScale(1.35f), true)
        } else if (points.size == 1) {
            map.controller.setCenter(points.first())
            map.controller.setZoom(15.0)
        } else {
            map.controller.setCenter(NAVOIY)
            map.controller.setZoom(NAVOIY_ZOOM)
        }

        map.invalidate()
    }

    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            MapView(ctx).apply {
                setMultiTouchControls(true)
                isTilesScaledToDpi = false
                setHorizontalMapRepetitionEnabled(false)
                setVerticalMapRepetitionEnabled(false)
                setLayerType(View.LAYER_TYPE_HARDWARE, null)
                setTileSource(MapTileSources.source(MapLayerId.STANDARD, isDark))
                controller.setCenter(NAVOIY)
                controller.setZoom(NAVOIY_ZOOM)
                mapRef.value = this
            }
        },
        onRelease = { map ->
            map.onPause()
            map.onDetach()
        },
    )
}
