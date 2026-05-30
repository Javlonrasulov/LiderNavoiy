package uz.distributor.crm.presentation.location

import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.yandex.mapkit.MapKitFactory
import com.yandex.mapkit.geometry.Point
import com.yandex.mapkit.geometry.Polyline
import com.yandex.mapkit.map.CameraPosition
import com.yandex.mapkit.map.InputListener
import com.yandex.mapkit.map.Map
import com.yandex.mapkit.map.PlacemarkMapObject
import com.yandex.mapkit.map.PolylineMapObject
import com.yandex.mapkit.mapview.MapView
import uz.distributor.crm.domain.model.Client
import uz.distributor.crm.domain.model.LocationPoint

private val NAVOIY_CENTER = Point(40.0844, 65.3792)
private const val ROUTE_COLOR = 0xFF6366F1.toInt()

@Composable
fun LocationMapView(
    clients: List<Client>,
    agentLocation: LocationPoint?,
    selectedClientId: String?,
    isDark: Boolean,
    onClientSelected: (Client) -> Unit,
    modifier: Modifier = Modifier,
) {
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val mapViewRef = remember { mutableStateOf<MapView?>(null) }
    val clientMarks = remember { mutableStateMapOf<String, PlacemarkMapObject>() }
    val userMarkRef = remember { mutableStateOf<PlacemarkMapObject?>(null) }
    val routeLineRef = remember { mutableStateOf<PolylineMapObject?>(null) }

    DisposableEffect(lifecycle) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> MapKitFactory.getInstance().onStart()
                Lifecycle.Event.ON_STOP -> MapKitFactory.getInstance().onStop()
                else -> Unit
            }
        }
        lifecycle.addObserver(observer)
        onDispose {
            lifecycle.removeObserver(observer)
            mapViewRef.value?.onStop()
        }
    }

    LaunchedEffect(isDark) {
        mapViewRef.value?.mapWindow?.map?.isNightModeEnabled = isDark
    }

    LaunchedEffect(clients, selectedClientId, agentLocation) {
        val map = mapViewRef.value?.mapWindow?.map ?: return@LaunchedEffect
        val objects = map.mapObjects

        val onMap = clients.filter { it.latitude != null && it.longitude != null }
        val existingIds = clientMarks.keys.toSet()
        val newIds = onMap.map { it.id }.toSet()
        (existingIds - newIds).forEach { id ->
            clientMarks.remove(id)?.let { objects.remove(it) }
        }
        onMap.forEach { client ->
            val point = Point(client.latitude!!, client.longitude!!)
            val mark = clientMarks[client.id] ?: objects.addPlacemark(point).also { created ->
                clientMarks[client.id] = created
                created.addTapListener { _, _ ->
                    onClientSelected(client)
                    true
                }
            }
            mark.geometry = point
            mark.zIndex = if (client.id == selectedClientId) 2f else 1f
        }

        agentLocation?.let { loc ->
            val userPoint = Point(loc.latitude, loc.longitude)
            val userMark = userMarkRef.value ?: objects.addPlacemark(userPoint).also {
                it.zIndex = 3f
                userMarkRef.value = it
            }
            userMark.geometry = userPoint
        }

        routeLineRef.value?.let { objects.remove(it) }
        routeLineRef.value = null

        val selected = onMap.find { it.id == selectedClientId }
        if (selected != null && agentLocation != null) {
            val linePoints = Polyline(
                listOf(
                    Point(agentLocation.latitude, agentLocation.longitude),
                    Point(selected.latitude!!, selected.longitude!!),
                ),
            )
            routeLineRef.value = objects.addPolyline(linePoints).apply {
                setStrokeColor(ROUTE_COLOR)
                strokeWidth = 5f
                zIndex = 0.5f
            }
            map.move(
                CameraPosition(
                    Point(
                        (agentLocation.latitude + selected.latitude!!) / 2,
                        (agentLocation.longitude + selected.longitude!!) / 2,
                    ),
                    14f,
                    0f,
                    0f,
                ),
            )
        } else if (agentLocation != null) {
            map.move(CameraPosition(Point(agentLocation.latitude, agentLocation.longitude), 15f, 0f, 0f))
        } else if (onMap.isNotEmpty()) {
            val first = onMap.first()
            map.move(CameraPosition(Point(first.latitude!!, first.longitude!!), 13f, 0f, 0f))
        }
    }

    AndroidView(
        factory = { ctx ->
            MapView(ctx).apply {
                mapViewRef.value = this
                onStart()
                mapWindow.map.isNightModeEnabled = isDark
                mapWindow.map.move(CameraPosition(NAVOIY_CENTER, 12f, 0f, 0f))
                mapWindow.map.addInputListener(object : InputListener {
                    override fun onMapTap(map: Map, point: Point) {}
                    override fun onMapLongTap(map: Map, point: Point) {}
                })
            }
        },
        modifier = modifier,
        update = { view -> view.mapWindow.map.isNightModeEnabled = isDark },
    )
}
