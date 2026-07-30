package uz.distributor.crm.presentation.location

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.view.View
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filterNotNull
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import uz.distributor.crm.domain.model.Client
import uz.distributor.crm.domain.model.LocationPoint
import uz.distributor.crm.map.MapLayerId
import uz.distributor.crm.map.MapTileSources
import uz.distributor.crm.map.RoadRouteService

/** Admin TrackingMap — Navoiy default */
private val NAVOIY_CENTER = GeoPoint(40.0843, 65.3791)
private const val NAVOIY_ZOOM = 12.0
private const val ROUTE_COLOR = 0xFF6366F1.toInt()
private const val MARKER_PURPLE = 0xFF4F46E5.toInt()
private const val MARKER_SELECTED = 0xFF7C3AED.toInt()
private const val USER_COLOR = 0xFF2563EB.toInt()

/** GPS faqat Navoiy atrofida bo‘lsa yo‘l chiziladi (emulyator okeanga sakramasligi uchun) */
private fun isNearNavoiy(lat: Double, lng: Double): Boolean =
    lat in 39.7..40.6 && lng in 64.8..66.0

private fun pinDrawable(
    density: Float,
    color: Int,
    label: String? = null,
    sizeDp: Float = 48f,
): Drawable {
    val size = (sizeDp * density).toInt().coerceAtLeast(40)
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val cx = size / 2f
    val cy = size / 2f
    val r = size / 2f - 2.5f * density

    canvas.drawCircle(
        cx,
        cy + 1.5f * density,
        r,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = 0x55000000 },
    )
    canvas.drawCircle(
        cx,
        cy,
        r,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = 0xFFFFFFFF.toInt() },
    )
    canvas.drawCircle(
        cx,
        cy,
        r - 3f * density,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color },
    )
    if (!label.isNullOrBlank()) {
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = 0xFFFFFFFF.toInt()
            textSize = if (label.length > 2) 13f * density else 17f * density
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        val textY = cy - (textPaint.descent() + textPaint.ascent()) / 2f
        canvas.drawText(label, cx, textY, textPaint)
    }
    return bitmapDrawable(bmp, density)
}

private fun labeledMarkerDrawable(
    density: Float,
    name: String,
    address: String?,
    stopNumber: String?,
    isDark: Boolean,
): Drawable {
    val shortName = if (name.length > 26) name.take(25) + "…" else name
    val shortAddr = address
        ?.takeIf { it.isNotBlank() }
        ?.let { if (it.length > 32) it.take(31) + "…" else it }

    val padH = (14 * density).toInt()
    val padV = (12 * density).toInt()
    val avatar = (36 * density).toInt()
    val gap = (12 * density).toInt()
    val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (isDark) 0xFFF9FAFB.toInt() else 0xFF111827.toInt()
        textSize = 16f * density
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    val addrPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (isDark) 0xFF9CA3AF.toInt() else 0xFF6B7280.toInt()
        textSize = 13f * density
    }
    val titleW = titlePaint.measureText(shortName)
    val addrW = shortAddr?.let { addrPaint.measureText(it) } ?: 0f
    val textBlockW = maxOf(titleW, addrW).toInt()
    val textBlockH = if (shortAddr != null) {
        (titlePaint.textSize + 5 * density + addrPaint.textSize).toInt()
    } else {
        titlePaint.textSize.toInt()
    }
    val contentH = maxOf(avatar, textBlockH)
    val w = padH + avatar + gap + textBlockW + padH
    val h = padV + contentH + padV + (8 * density).toInt()
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)

    val cardBottom = h - 8f * density
    val rect = RectF(3f * density, 3f * density, w - 3f * density, cardBottom)
    val radius = 16f * density

    canvas.drawRoundRect(
        RectF(rect.left, rect.top + 2.5f * density, rect.right, cardBottom + 2.5f * density),
        radius,
        radius,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x40000000 },
    )
    canvas.drawRoundRect(
        rect,
        radius,
        radius,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = if (isDark) 0xFF1F2937.toInt() else 0xFFFFFFFF.toInt()
        },
    )
    canvas.drawRoundRect(
        rect,
        radius,
        radius,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = MARKER_SELECTED
            style = Paint.Style.STROKE
            strokeWidth = 2.5f * density
        },
    )
    val tipX = w / 2f
    val tipPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (isDark) 0xFF1F2937.toInt() else 0xFFFFFFFF.toInt()
    }
    val path = android.graphics.Path().apply {
        moveTo(tipX - 9f * density, cardBottom - 1f)
        lineTo(tipX + 9f * density, cardBottom - 1f)
        lineTo(tipX, h - 1.5f * density)
        close()
    }
    canvas.drawPath(path, tipPaint)
    canvas.drawPath(
        path,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = MARKER_SELECTED
            style = Paint.Style.STROKE
            strokeWidth = 2f * density
        },
    )

    val ax = padH + avatar / 2f
    val ay = padV + contentH / 2f
    canvas.drawCircle(
        ax,
        ay,
        avatar / 2f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = MARKER_SELECTED },
    )
    val num = stopNumber ?: "•"
    val numPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFFFFF.toInt()
        textSize = 15f * density
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        textAlign = Paint.Align.CENTER
    }
    canvas.drawText(num, ax, ay - (numPaint.descent() + numPaint.ascent()) / 2f, numPaint)

    val textX = (padH + avatar + gap).toFloat()
    val textTop = padV + (contentH - textBlockH) / 2f
    val titleY = textTop - titlePaint.ascent()
    canvas.drawText(shortName, textX, titleY, titlePaint)
    if (shortAddr != null) {
        canvas.drawText(shortAddr, textX, titleY + 5f * density + addrPaint.textSize, addrPaint)
    }
    return bitmapDrawable(bmp, density)
}

private fun bitmapDrawable(bmp: Bitmap, density: Float, densityDpi: Int = (density * 160f).toInt()): BitmapDrawable =
    BitmapDrawable(null, bmp).apply {
        setTargetDensity(densityDpi.coerceIn(120, 640))
    }

private fun LocationPoint?.near(other: LocationPoint?, epsilon: Double = 0.00015): Boolean {
    if (this == null && other == null) return true
    if (this == null || other == null) return false
    return kotlin.math.abs(latitude - other.latitude) < epsilon &&
        kotlin.math.abs(longitude - other.longitude) < epsilon
}

private fun distanceBadgeDrawable(density: Float, kmText: String): Drawable {
    val padH = (16 * density).toInt()
    val padV = (10 * density).toInt()
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFFFFF.toInt()
        textSize = 16f * density
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    val tw = paint.measureText(kmText).toInt()
    val w = padH * 2 + tw
    val h = padV * 2 + paint.textSize.toInt()
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val rect = RectF(1f, 1f, w - 1f, h - 1f)
    canvas.drawRoundRect(
        RectF(rect.left, rect.top + density, rect.right, rect.bottom + density),
        h / 2f,
        h / 2f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x44000000 },
    )
    canvas.drawRoundRect(
        rect,
        h / 2f,
        h / 2f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = MARKER_PURPLE },
    )
    val ty = h / 2f - (paint.descent() + paint.ascent()) / 2f
    canvas.drawText(kmText, padH.toFloat(), ty, paint)
    return bitmapDrawable(bmp, density)
}

private fun clearRouteOverlays(
    map: MapView,
    routeLineRef: MutableState<Polyline?>,
    distanceMarkerRef: MutableState<Marker?>,
) {
    routeLineRef.value?.let { map.overlays.remove(it) }
    routeLineRef.value = null
    distanceMarkerRef.value?.let { map.overlays.remove(it) }
    distanceMarkerRef.value = null
}

private fun formatKm(km: Double): String =
    if (km < 10) String.format("%.1f km", km) else String.format("%.0f km", km)

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
    val context = LocalContext.current
    val density = context.resources.displayMetrics.density
    val mapViewRef = remember { mutableStateOf<MapView?>(null) }
    val clientMarkers = remember { mutableStateMapOf<String, Marker>() }
    val userMarkerRef = remember { mutableStateOf<Marker?>(null) }
    val routeLineRef = remember { mutableStateOf<Polyline?>(null) }
    val distanceMarkerRef = remember { mutableStateOf<Marker?>(null) }
    val appliedLayer = remember { mutableStateOf<MapLayerId?>(null) }
    val appliedDark = remember { mutableStateOf<Boolean?>(null) }
    val selectedClientIdState = rememberUpdatedState(selectedClientId)
    val initialCameraDone = remember { mutableStateOf(false) }

    val iconDefault = remember(density) { pinDrawable(density, MARKER_PURPLE, sizeDp = 48f) }
    val iconAgent = remember(density) { pinDrawable(density, USER_COLOR, sizeDp = 52f) }

    val onClientSelectedState = rememberUpdatedState(onClientSelected)
    val clientsById = remember(clients) { clients.associateBy { it.id } }
    val clientsByIdState = rememberUpdatedState(clientsById)
    val isDarkState = rememberUpdatedState(isDark)

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

    // Tanlanganda yumshoq yaqinlash (marshrut kelguncha)
    LaunchedEffect(selectedClientId) {
        val map = mapViewRef.value ?: return@LaunchedEffect
        val selected = selectedClientId?.let { id ->
            clients.find { it.id == id && it.latitude != null && it.longitude != null }
        } ?: return@LaunchedEffect
        // Agent GPS bor bo‘lsa marshrut bounding box qiladi — bu yerda sakratmaymiz
        if (agentLocation != null && isNearNavoiy(agentLocation.latitude, agentLocation.longitude)) {
            return@LaunchedEffect
        }
        val target = GeoPoint(selected.latitude!!, selected.longitude!!)
        map.controller.animateTo(target)
        if (map.zoomLevelDouble < 13.5) {
            map.controller.setZoom(14.5)
        }
    }

    LaunchedEffect(activeLayer, isDark) {
        mapViewRef.value?.let { applyTileSource(it) }
    }

    // Birinchi marta mijozlar kelganda Navoiy / mijozlar atrofiga
    LaunchedEffect(clients) {
        val map = mapViewRef.value ?: return@LaunchedEffect
        if (initialCameraDone.value) return@LaunchedEffect
        val onMap = clients.filter {
            it.latitude != null && it.longitude != null &&
                isNearNavoiy(it.latitude, it.longitude)
        }
        if (onMap.isEmpty()) {
            map.controller.setCenter(NAVOIY_CENTER)
            map.controller.setZoom(NAVOIY_ZOOM)
            initialCameraDone.value = true
            return@LaunchedEffect
        }
        val avgLat = onMap.map { it.latitude!! }.average()
        val avgLng = onMap.map { it.longitude!! }.average()
        map.controller.setCenter(GeoPoint(avgLat, avgLng))
        map.controller.setZoom(13.0)
        initialCameraDone.value = true
    }

    LaunchedEffect(clients, selectedClientId, isDark) {
        val map = mapViewRef.value ?: return@LaunchedEffect
        val overlays = map.overlays
        val onMap = clients.filter { it.latitude != null && it.longitude != null }
        val newIds = onMap.map { it.id }.toSet()

        (clientMarkers.keys - newIds).forEach { id ->
            clientMarkers.remove(id)?.let { overlays.remove(it) }
        }

        onMap.forEachIndexed { index, client ->
            val point = GeoPoint(client.latitude!!, client.longitude!!)
            val selected = client.id == selectedClientId
            val displayName = client.name.ifBlank { client.code }.ifBlank { "Klient" }
            val stopLabel = (index + 1).toString()
            val marker = clientMarkers[client.id] ?: Marker(map).also { created ->
                created.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                created.setInfoWindow(null) // eski kulrang popup o'chiriladi
                created.relatedObject = client.id
                created.setOnMarkerClickListener { m, _ ->
                    val id = m.relatedObject as? String
                    val c = id?.let { clientsByIdState.value[it] }
                    if (c != null) onClientSelectedState.value(c)
                    true
                }
                clientMarkers[client.id] = created
                overlays.add(created)
            }
            if (marker.position != point) marker.position = point
            marker.setAnchor(
                Marker.ANCHOR_CENTER,
                if (selected) Marker.ANCHOR_BOTTOM else Marker.ANCHOR_CENTER,
            )
            marker.icon = if (selected) {
                labeledMarkerDrawable(
                    density = density,
                    name = displayName,
                    address = client.address,
                    stopNumber = stopLabel,
                    isDark = isDarkState.value,
                )
            } else {
                pinDrawable(density, MARKER_PURPLE, label = stopLabel, sizeDp = 48f)
            }
        }

        map.invalidate()
    }

    // Yo‘l marshruti + km (OSRM) — to‘g‘ri chiziq emas
    LaunchedEffect(selectedClientId, agentLocation) {
        val map = mapViewRef.value ?: return@LaunchedEffect
        clearRouteOverlays(map, routeLineRef, distanceMarkerRef)
        map.invalidate()

        val selected = selectedClientId?.let { id ->
            clients.find { it.id == id && it.latitude != null && it.longitude != null }
        }
        val loc = agentLocation
        if (selected == null || loc == null) return@LaunchedEffect
        if (!isNearNavoiy(loc.latitude, loc.longitude)) return@LaunchedEffect
        if (!isNearNavoiy(selected.latitude!!, selected.longitude!!)) return@LaunchedEffect

        val route = RoadRouteService.fetchDrivingRoute(
            fromLat = loc.latitude,
            fromLng = loc.longitude,
            toLat = selected.latitude!!,
            toLng = selected.longitude!!,
        ) ?: return@LaunchedEffect

        // Tanlov o‘zgargan bo‘lsa — eski natijani chizmaslik
        if (selectedClientIdState.value != selected.id) return@LaunchedEffect

        val geoPoints = route.points.map { GeoPoint(it.latitude, it.longitude) }
        routeLineRef.value = Polyline().apply {
            setPoints(geoPoints)
            outlinePaint.color = ROUTE_COLOR
            outlinePaint.strokeWidth = 12f
            outlinePaint.isAntiAlias = true
        }.also { map.overlays.add(it) }

        val mid = geoPoints[geoPoints.size / 2]
        distanceMarkerRef.value = Marker(map).apply {
            position = mid
            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
            setInfoWindow(null)
            icon = distanceBadgeDrawable(density, formatKm(route.distanceKm))
            setOnMarkerClickListener { _, _ -> true }
        }.also { map.overlays.add(it) }

        try {
            val box = BoundingBox.fromGeoPoints(geoPoints)
            map.zoomToBoundingBox(box, true, (72 * density).toInt())
        } catch (_: Exception) {
            map.controller.animateTo(GeoPoint(selected.latitude!!, selected.longitude!!))
        }
        map.invalidate()
    }

    LaunchedEffect(Unit) {
        snapshotFlow { agentLocation }
            .distinctUntilChanged { a, b -> a.near(b) }
            .debounce(2_000)
            .filterNotNull()
            .collect { loc ->
                val map = mapViewRef.value ?: return@collect
                if (!isNearNavoiy(loc.latitude, loc.longitude)) {
                    userMarkerRef.value?.let { mark ->
                        map.overlays.remove(mark)
                        userMarkerRef.value = null
                    }
                    return@collect
                }
                val point = GeoPoint(loc.latitude, loc.longitude)
                val userMark = userMarkerRef.value ?: Marker(map).also {
                    it.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                    it.icon = iconAgent
                    it.setInfoWindow(null)
                    it.title = "Agent"
                    userMarkerRef.value = it
                    map.overlays.add(it)
                }
                if (userMark.position != point) userMark.position = point
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
