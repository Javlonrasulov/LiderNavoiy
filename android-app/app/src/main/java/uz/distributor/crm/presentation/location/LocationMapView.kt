package uz.distributor.crm.presentation.location

import android.graphics.drawable.GradientDrawable
import android.view.View
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filterNotNull
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import uz.distributor.crm.domain.model.Client
import uz.distributor.crm.domain.model.LocationPoint
import uz.distributor.crm.map.MapLayerId
import uz.distributor.crm.map.MapTileSources

/** Admin TrackingMap — Navoiy default */
private val NAVOIY_CENTER = GeoPoint(40.0843, 65.3791)
private const val NAVOIY_ZOOM = 12.0
private const val ROUTE_COLOR = 0xFF6366F1.toInt()
private const val CLIENT_SELECTED = 0xFF6366F1.toInt()
private const val CLIENT_DEFAULT = 0xFF9CA3AF.toInt()
private const val USER_COLOR = 0xFF3B82F6.toInt()

private fun markerDrawable(color: Int, sizeDp: Int = 24): GradientDrawable =
    GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(color)
        setStroke(3, android.graphics.Color.WHITE)
        setSize(sizeDp, sizeDp)
    }

private fun LocationPoint?.near(other: LocationPoint?, epsilon: Double = 0.00015): Boolean {
    if (this == null && other == null) return true
    if (this == null || other == null) return false
    return kotlin.math.abs(latitude - other.latitude) < epsilon &&
        kotlin.math.abs(longitude - other.longitude) < epsilon
}

private fun updateRoute(
    map: MapView,
    routeLineRef: MutableState<Polyline?>,
    loc: LocationPoint?,
    selId: String?,
    onMap: List<Client>,
) {
    val overlays = map.overlays
    routeLineRef.value?.let { overlays.remove(it) }
    routeLineRef.value = null
    val selected = selId?.let { id -> onMap.find { it.id == id } }
    if (selected != null && loc != null) {
        routeLineRef.value = Polyline().apply {
            setPoints(
                listOf(
                    GeoPoint(loc.latitude, loc.longitude),
                    GeoPoint(selected.latitude!!, selected.longitude!!),
                ),
            )
            outlinePaint.color = ROUTE_COLOR
            outlinePaint.strokeWidth = 8f
        }.also { overlays.add(it) }
    }
}

@OptIn(FlowPreview::class)
@Composable
fun LocationMapView(
    clients: List<Client>,
    agentLocation: LocationPoint?,
    selectedClientId: String?,
    isDark: Boolean,
    activeLayer: MapLayerId = MapTileSources.defaultLayer,
    onClientSelected: (Client) -> Unit,
    modifier: Modifier = Modifier,
) {
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val mapViewRef = remember { mutableStateOf<MapView?>(null) }
    val clientMarkers = remember { mutableStateMapOf<String, Marker>() }
    val userMarkerRef = remember { mutableStateOf<Marker?>(null) }
    val routeLineRef = remember { mutableStateOf<Polyline?>(null) }
    val appliedLayer = remember { mutableStateOf<MapLayerId?>(null) }
    val appliedDark = remember { mutableStateOf<Boolean?>(null) }
    val selectedClientIdState = rememberUpdatedState(selectedClientId)

    val iconDefault = remember { markerDrawable(CLIENT_DEFAULT) }
    val iconSelected = remember { markerDrawable(CLIENT_SELECTED) }
    val iconAgent = remember { markerDrawable(USER_COLOR, sizeDp = 28) }

    val onClientSelectedState = rememberUpdatedState(onClientSelected)
    val clientsById = remember(clients) { clients.associateBy { it.id } }

    DisposableEffect(lifecycle) {
        fun startMap() = mapViewRef.value?.onResume()
        fun stopMap() = mapViewRef.value?.onPause()
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

    fun applyTileSource(map: MapView) {
        if (appliedLayer.value == activeLayer && appliedDark.value == isDark) return
        map.setTileSource(MapTileSources.source(activeLayer, isDark))
        appliedLayer.value = activeLayer
        appliedDark.value = isDark
    }

    // Kamera faqat mijoz tanlanganda o'zgaradi
    LaunchedEffect(selectedClientId) {
        val map = mapViewRef.value ?: return@LaunchedEffect
        val onMap = clients.filter { it.latitude != null && it.longitude != null }
        val selected = selectedClientId?.let { id -> onMap.find { it.id == id } }
        val controller = map.controller
        when {
            selected != null && agentLocation != null -> {
                controller.setCenter(
                    GeoPoint(
                        (agentLocation.latitude + selected.latitude!!) / 2,
                        (agentLocation.longitude + selected.longitude!!) / 2,
                    ),
                )
                controller.setZoom(14.0)
            }
            selected != null -> {
                controller.setCenter(GeoPoint(selected.latitude!!, selected.longitude!!))
                controller.setZoom(15.0)
            }
            else -> {
                controller.setCenter(NAVOIY_CENTER)
                controller.setZoom(NAVOIY_ZOOM)
            }
        }
    }

    LaunchedEffect(activeLayer, isDark) {
        mapViewRef.value?.let { applyTileSource(it) }
    }

    // Mijoz markerlari — clients yoki tanlov o'zgarganda
    LaunchedEffect(clients, selectedClientId) {
        val map = mapViewRef.value ?: return@LaunchedEffect
        val overlays = map.overlays
        val onMap = clients.filter { it.latitude != null && it.longitude != null }
        val newIds = onMap.map { it.id }.toSet()

        (clientMarkers.keys - newIds).forEach { id ->
            clientMarkers.remove(id)?.let { overlays.remove(it) }
        }

        onMap.forEach { client ->
            val point = GeoPoint(client.latitude!!, client.longitude!!)
            val selected = client.id == selectedClientId
            val marker = clientMarkers[client.id] ?: Marker(map).also { created ->
                created.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                created.setOnMarkerClickListener { _, _ ->
                    clientsById[client.id]?.let { onClientSelectedState.value(it) }
                    true
                }
                clientMarkers[client.id] = created
                overlays.add(created)
            }
            if (marker.position != point) marker.position = point
            val icon = if (selected) iconSelected else iconDefault
            if (marker.icon !== icon) marker.icon = icon
        }

        updateRoute(map, routeLineRef, agentLocation, selectedClientId, onMap)
        map.invalidate()
    }

    // Agent nuqtasi — GPS tez-tez keladi, debounce + minimal yangilash
    LaunchedEffect(Unit) {
        snapshotFlow { agentLocation }
            .distinctUntilChanged { a, b -> a.near(b) }
            .debounce(2_000)
            .filterNotNull()
            .collect { loc ->
                val map = mapViewRef.value ?: return@collect
                val point = GeoPoint(loc.latitude, loc.longitude)
                val userMark = userMarkerRef.value ?: Marker(map).also {
                    it.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                    it.icon = iconAgent
                    userMarkerRef.value = it
                    map.overlays.add(it)
                }
                if (userMark.position != point) {
                    userMark.position = point
                }
                val onMap = clients.filter { it.latitude != null && it.longitude != null }
                updateRoute(map, routeLineRef, loc, selectedClientIdState.value, onMap)
                map.invalidate()
            }
    }

    AndroidView(
        factory = { ctx ->
            MapView(ctx).apply {
                setMultiTouchControls(true)
                isTilesScaledToDpi = false
                setHorizontalMapRepetitionEnabled(false)
                setVerticalMapRepetitionEnabled(false)
                setLayerType(View.LAYER_TYPE_HARDWARE, null)
                applyTileSource(this)
                mapViewRef.value = this
                controller.setCenter(NAVOIY_CENTER)
                controller.setZoom(NAVOIY_ZOOM)
            }
        },
        modifier = modifier,
        onRelease = { map ->
            map.onPause()
            map.onDetach()
        },
    )
}
