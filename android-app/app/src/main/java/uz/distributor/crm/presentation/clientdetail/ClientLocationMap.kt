package uz.distributor.crm.presentation.clientdetail

import android.graphics.drawable.GradientDrawable
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import uz.distributor.crm.map.MapDefaults
import uz.distributor.crm.map.MapLayerId
import uz.distributor.crm.map.MapTileSources

private val NAVOIY = GeoPoint(MapDefaults.NAVOIY_LAT, MapDefaults.NAVOIY_LNG)
private const val PIN_COLOR = 0xFF6366F1.toInt()

@Composable
fun ClientLocationMap(
    latitude: Double?,
    longitude: Double?,
    isDark: Boolean = false,
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

    LaunchedEffect(latitude, longitude) {
        val map = mapRef.value ?: return@LaunchedEffect
        markerRef.value?.let { map.overlays.remove(it) }
        markerRef.value = null
        if (latitude != null && longitude != null) {
            val point = GeoPoint(latitude, longitude)
            markerRef.value = Marker(map).apply {
                position = point
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                icon = pinIcon
            }.also { map.overlays.add(it) }
            map.controller.setCenter(point)
            map.controller.setZoom(15.0)
        } else {
            map.controller.setCenter(NAVOIY)
            map.controller.setZoom(12.0)
        }
        map.invalidate()
    }

    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            MapView(ctx).apply {
                setMultiTouchControls(true)
                setTileSource(MapTileSources.source(MapLayerId.STANDARD, isDark))
                controller.setZoom(14.0)
                val start = if (latitude != null && longitude != null) {
                    GeoPoint(latitude, longitude)
                } else NAVOIY
                controller.setCenter(start)
                mapRef.value = this
            }
        },
        onRelease = { map ->
            map.onPause()
            map.onDetach()
        },
    )
}
