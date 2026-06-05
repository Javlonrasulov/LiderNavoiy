package uz.distributor.crm.presentation.clients

import android.graphics.drawable.GradientDrawable
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import org.osmdroid.events.MapEventsReceiver
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.views.overlay.Marker
import uz.distributor.crm.map.MapLayerId
import uz.distributor.crm.map.MapTileSources

private val NAVOIY = GeoPoint(40.0843, 65.3791)
private const val PIN_COLOR = 0xFFEF4444.toInt()

@Composable
fun LocationPickerMap(
    latitude: Double?,
    longitude: Double?,
    isDark: Boolean,
    onLocationSelected: (Double, Double) -> Unit,
    modifier: Modifier = Modifier,
) {
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val mapRef = remember { mutableStateOf<MapView?>(null) }
    val markerRef = remember { mutableStateOf<Marker?>(null) }
    val pinIcon = remember {
        GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(PIN_COLOR)
            setStroke(3, android.graphics.Color.WHITE)
            setSize(28, 28)
        }
    }

    fun updateMarker(map: MapView, lat: Double, lng: Double) {
        markerRef.value?.let { map.overlays.remove(it) }
        markerRef.value = Marker(map).apply {
            position = GeoPoint(lat, lng)
            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
            icon = pinIcon
            isDraggable = true
            setOnMarkerDragListener(object : Marker.OnMarkerDragListener {
                override fun onMarkerDrag(marker: Marker) {}
                override fun onMarkerDragEnd(marker: Marker) {
                    onLocationSelected(marker.position.latitude, marker.position.longitude)
                }
                override fun onMarkerDragStart(marker: Marker) {}
            })
        }.also { map.overlays.add(it) }
        map.controller.animateTo(GeoPoint(lat, lng))
        map.invalidate()
    }

    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            MapView(ctx).apply {
                setMultiTouchControls(true)
                setTileSource(MapTileSources.source(MapLayerId.STANDARD, isDark))
                controller.setZoom(16.0)
                val start = if (latitude != null && longitude != null) {
                    GeoPoint(latitude, longitude)
                } else NAVOIY
                controller.setCenter(start)

                overlays.add(
                    MapEventsOverlay(object : MapEventsReceiver {
                        override fun singleTapConfirmedHelper(p: GeoPoint?): Boolean {
                            p ?: return false
                            updateMarker(this@apply, p.latitude, p.longitude)
                            onLocationSelected(p.latitude, p.longitude)
                            return true
                        }
                        override fun longPressHelper(p: GeoPoint?) = false
                    }),
                )

                if (latitude != null && longitude != null) {
                    updateMarker(this, latitude, longitude)
                }
                mapRef.value = this
            }
        },
        update = { map ->
            map.setTileSource(MapTileSources.source(MapLayerId.STANDARD, isDark))
            if (latitude != null && longitude != null) {
                val current = markerRef.value?.position
                if (current == null ||
                    kotlin.math.abs(current.latitude - latitude) > 0.00001 ||
                    kotlin.math.abs(current.longitude - longitude) > 0.00001
                ) {
                    updateMarker(map, latitude, longitude)
                }
            }
        },
    )

    DisposableEffect(lifecycle) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> mapRef.value?.onResume()
                Lifecycle.Event.ON_PAUSE -> mapRef.value?.onPause()
                else -> Unit
            }
        }
        lifecycle.addObserver(observer)
        onDispose {
            lifecycle.removeObserver(observer)
            mapRef.value?.onPause()
        }
    }
}
