package uz.distributor.crm.presentation.clients

import android.annotation.SuppressLint
import android.graphics.drawable.GradientDrawable
import android.view.MotionEvent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import org.osmdroid.events.MapEventsReceiver
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polygon
import uz.distributor.crm.map.MapDefaults
import uz.distributor.crm.map.MapLayerId
import uz.distributor.crm.map.MapTileSources

private val NAVOIY = GeoPoint(MapDefaults.NAVOIY_LAT, MapDefaults.NAVOIY_LNG)
private const val PIN_COLOR = 0xFFEF4444.toInt()
private const val RADIUS_COLOR = 0xFF6366F1.toInt()
private const val RADIUS_FILL = 0x2E6366F1

/** Manager `MapLayerSwitcher` yorliqlari; berilsa xaritada qatlam va zoom tugmalari chiqadi. */
data class MapControlLabels(
    val standard: String,
    val satellite: String,
)

@SuppressLint("ClickableViewAccessibility")
@Composable
fun LocationPickerMap(
    latitude: Double?,
    longitude: Double?,
    isDark: Boolean,
    onLocationSelected: (Double, Double) -> Unit,
    modifier: Modifier = Modifier,
    radiusMeters: Int? = null,
    controls: MapControlLabels? = null,
    pinColor: Int = PIN_COLOR,
    initialZoom: Double = 14.0,
) {
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val mapRef = remember { mutableStateOf<MapView?>(null) }
    val markerRef = remember { mutableStateOf<Marker?>(null) }
    val circleRef = remember { mutableStateOf<Polygon?>(null) }
    val appliedLayer = remember { mutableStateOf<String?>(null) }
    var layer by remember { mutableStateOf(if (controls != null) MapLayerId.SATELLITE else MapLayerId.STANDARD) }
    val currentOnSelected by rememberUpdatedState(onLocationSelected)
    val currentRadius by rememberUpdatedState(radiusMeters)
    val pinIcon = remember(pinColor) {
        GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(pinColor)
            setStroke(3, android.graphics.Color.WHITE)
            setSize(28, 28)
        }
    }

    fun redrawCircle(map: MapView, center: GeoPoint?) {
        circleRef.value?.let { map.overlays.remove(it) }
        circleRef.value = null
        val meters = currentRadius ?: return
        if (center == null) return
        circleRef.value = Polygon(map).apply {
            points = Polygon.pointsAsCircle(center, meters.coerceAtLeast(10).toDouble())
            fillPaint.color = RADIUS_FILL
            outlinePaint.color = RADIUS_COLOR
            outlinePaint.strokeWidth = 4f
            infoWindow = null
            setOnClickListener { _, _, _ -> false }
        }.also { map.overlays.add(0, it) }
    }

    fun updateMarker(map: MapView, lat: Double, lng: Double, animate: Boolean = true) {
        markerRef.value?.let { map.overlays.remove(it) }
        markerRef.value = Marker(map).apply {
            position = GeoPoint(lat, lng)
            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
            icon = pinIcon
            isDraggable = true
            setOnMarkerDragListener(object : Marker.OnMarkerDragListener {
                override fun onMarkerDrag(marker: Marker) {}
                override fun onMarkerDragEnd(marker: Marker) {
                    redrawCircle(map, marker.position)
                    currentOnSelected(marker.position.latitude, marker.position.longitude)
                }
                override fun onMarkerDragStart(marker: Marker) {}
            })
        }.also { map.overlays.add(it) }
        redrawCircle(map, GeoPoint(lat, lng))
        if (animate) map.controller.animateTo(GeoPoint(lat, lng))
        map.invalidate()
    }

    fun applyLayer(map: MapView) {
        val key = "${layer.key}:$isDark"
        if (appliedLayer.value == key) return
        appliedLayer.value = key
        map.setTileSource(MapTileSources.source(layer, isDark))
    }

    Box(modifier.clipToBounds()) {
        AndroidView(
            modifier = Modifier
                .fillMaxSize()
                .clipToBounds(),
            factory = { ctx ->
                MapView(ctx).apply {
                    setMultiTouchControls(true)
                    if (controls != null) {
                        zoomController.setVisibility(
                            org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER,
                        )
                    }
                    applyLayer(this)
                    controller.setZoom(initialZoom)
                    val start = if (latitude != null && longitude != null) {
                        GeoPoint(latitude, longitude)
                    } else NAVOIY
                    controller.setCenter(start)
                    // Scroll ichida xaritani surish sahifani aylantirmasin
                    setOnTouchListener { v, event ->
                        if (event.actionMasked == MotionEvent.ACTION_DOWN) {
                            v.parent?.requestDisallowInterceptTouchEvent(true)
                        }
                        false
                    }

                    overlays.add(
                        MapEventsOverlay(object : MapEventsReceiver {
                            override fun singleTapConfirmedHelper(p: GeoPoint?): Boolean {
                                p ?: return false
                                updateMarker(this@apply, p.latitude, p.longitude)
                                currentOnSelected(p.latitude, p.longitude)
                                return true
                            }
                            override fun longPressHelper(p: GeoPoint?) = false
                        }),
                    )

                    if (latitude != null && longitude != null) {
                        updateMarker(this, latitude, longitude, animate = false)
                    }
                    mapRef.value = this
                }
            },
            update = { map ->
                applyLayer(map)
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

        if (controls != null) {
            MapLayerSwitcher(
                active = layer,
                labels = controls,
                isDark = isDark,
                onChange = { layer = it },
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 8.dp, bottom = 10.dp),
            )
            MapZoomButtons(
                onZoomIn = { mapRef.value?.controller?.zoomIn() },
                onZoomOut = { mapRef.value?.controller?.zoomOut() },
                isDark = isDark,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 10.dp, bottom = 10.dp),
            )
        }
    }

    LaunchedEffect(radiusMeters) {
        val map = mapRef.value ?: return@LaunchedEffect
        redrawCircle(map, markerRef.value?.position)
        map.invalidate()
    }

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

@Composable
private fun MapLayerSwitcher(
    active: MapLayerId,
    labels: MapControlLabels,
    isDark: Boolean,
    onChange: (MapLayerId) -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(10.dp)
    Row(
        modifier = modifier
            .shadow(4.dp, shape)
            .clip(shape)
            .background(if (isDark) Color(0xE0111827) else Color(0xEBFFFFFF))
            .border(1.dp, if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB), shape)
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        listOf(MapLayerId.STANDARD to labels.standard, MapLayerId.SATELLITE to labels.satellite)
            .forEach { (id, label) ->
                val selected = id == active
                Surface(
                    onClick = { onChange(id) },
                    shape = RoundedCornerShape(7.dp),
                    color = if (selected) Color(0xFF6366F1) else Color.Transparent,
                ) {
                    Text(
                        label,
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            selected -> Color.White
                            isDark -> Color(0xFFD1D5DB)
                            else -> Color(0xFF4B5563)
                        },
                    )
                }
            }
    }
}

@Composable
private fun MapZoomButtons(
    onZoomIn: () -> Unit,
    onZoomOut: () -> Unit,
    isDark: Boolean,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(8.dp)
    val bg = if (isDark) Color(0xFF111827) else Color.White
    val fg = if (isDark) Color(0xFFE5E7EB) else Color(0xFF111827)
    val divider = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    Column(
        modifier = modifier
            .shadow(4.dp, shape)
            .clip(shape)
            .background(bg)
            .border(1.dp, divider, shape),
    ) {
        listOf("+" to onZoomIn, "−" to onZoomOut).forEachIndexed { index, (symbol, action) ->
            if (index > 0) Box(Modifier.size(34.dp, 1.dp).background(divider))
            Surface(onClick = action, color = Color.Transparent, modifier = Modifier.size(34.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Text(symbol, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = fg)
                }
            }
        }
    }
}
