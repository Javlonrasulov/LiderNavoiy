package uz.lider.client.presentation.tracking

import android.graphics.drawable.GradientDrawable
import android.view.View
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
import uz.lider.client.map.MapDefaults
import uz.lider.client.map.MapLayerId
import uz.lider.client.map.MapTileSources

private val NAVOIY = GeoPoint(MapDefaults.NAVOIY_LAT, MapDefaults.NAVOIY_LNG)
private const val NAVOIY_ZOOM = 13.0
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

private fun isValidCoord(lat: Double?, lng: Double?): Boolean =
    lat != null && lng != null && lat in -90.0..90.0 && lng in -180.0..180.0 &&
        !(lat == 0.0 && lng == 0.0)

private data class MapPoint(val lat: Double, val lng: Double)

private fun updateMapContent(
    map: MapView,
    deliveryLat: Double?,
    deliveryLng: Double?,
    courierLat: Double?,
    courierLng: Double?,
    isDark: Boolean,
    deliveryIcon: GradientDrawable,
    courierIcon: GradientDrawable,
) {
    map.setTileSource(MapTileSources.source(MapLayerId.STANDARD, isDark))

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

    val points = buildList {
        delivery?.let { add(GeoPoint(it.lat, it.lng)) }
        courier?.let { add(GeoPoint(it.lat, it.lng)) }
    }

    when (points.size) {
        2 -> {
            Polyline().apply {
                setPoints(points)
                outlinePaint.color = ROUTE_COLOR
                outlinePaint.strokeWidth = 8f
            }.also { overlays.add(it) }
            val box = BoundingBox.fromGeoPoints(points)
            map.zoomToBoundingBox(box.increaseByScale(1.35f), true)
        }
        1 -> {
            map.controller.setCenter(points.first())
            map.controller.setZoom(15.0)
        }
        else -> {
            map.controller.setCenter(NAVOIY)
            map.controller.setZoom(NAVOIY_ZOOM)
        }
    }

    map.invalidate()
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
        update = { map ->
            updateMapContent(
                map = map,
                deliveryLat = deliveryLat,
                deliveryLng = deliveryLng,
                courierLat = courierLat,
                courierLng = courierLng,
                isDark = isDark,
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
