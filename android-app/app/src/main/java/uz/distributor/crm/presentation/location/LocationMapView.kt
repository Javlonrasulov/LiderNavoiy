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
import org.osmdroid.events.MapEventsReceiver
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import uz.distributor.crm.domain.model.Client
import uz.distributor.crm.domain.model.LocationPoint
import uz.distributor.crm.map.LatLngPoint
import uz.distributor.crm.map.MapLayerId
import uz.distributor.crm.map.MapTileSources
import uz.distributor.crm.map.RoadRoute
import uz.distributor.crm.map.RoadRouteService

/** Admin TrackingMap — Navoiy default */
private val NAVOIY_CENTER = GeoPoint(40.0843, 65.3791)
private const val NAVOIY_ZOOM = 12.0
private const val ROUTE_CASING = 0xFFFFFFFF.toInt()
private const val ROUTE_FILL = 0xFF2563EB.toInt()
private const val MARKER_PURPLE = 0xFF4F46E5.toInt()
private const val MARKER_SELECTED = 0xFF7C3AED.toInt()
private const val USER_COLOR = 0xFF2563EB.toInt()

/** GPS faqat Navoiy atrofida bo‘lsa yo‘l chiziladi (emulyator okeanga sakramasligi uchun) */
private fun isNearNavoiy(lat: Double, lng: Double): Boolean =
    lat in 39.7..40.6 && lng in 64.8..66.0

/** Xodim GPS — zamonaviy kichik ko‘k nuqta */
private fun agentLocationDrawable(density: Float): Drawable {
    val size = (18 * density).toInt().coerceAtLeast(16)
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val cx = size / 2f
    val cy = size / 2f
    // Yumshoq halo
    canvas.drawCircle(
        cx,
        cy,
        size / 2f - 0.5f * density,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x332563EB },
    )
    // Oq ring
    canvas.drawCircle(
        cx,
        cy,
        5.5f * density,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFFFFF.toInt() },
    )
    // Ichki ko‘k nuqta
    canvas.drawCircle(
        cx,
        cy,
        3.8f * density,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = USER_COLOR },
    )
    return bitmapDrawable(bmp, density)
}

private fun pinDrawable(
    density: Float,
    color: Int,
    label: String? = null,
    sizeDp: Float = 34f,
): Drawable {
    val size = (sizeDp * density).toInt().coerceAtLeast(28)
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val cx = size / 2f
    val cy = size / 2f
    val r = size / 2f - 2f * density

    canvas.drawCircle(
        cx,
        cy + density,
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
        r - 2.5f * density,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color },
    )
    if (!label.isNullOrBlank()) {
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = 0xFFFFFFFF.toInt()
            textSize = if (label.length > 2) 10f * density else 13f * density
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
    val shortName = if (name.length > 18) name.take(17) + "…" else name
    val shortAddr = address
        ?.takeIf { it.isNotBlank() }
        ?.let { if (it.length > 24) it.take(23) + "…" else it }

    val padH = (9 * density).toInt()
    val padV = (7 * density).toInt()
    val avatar = (24 * density).toInt()
    val gap = (7 * density).toInt()
    val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (isDark) 0xFFF9FAFB.toInt() else 0xFF111827.toInt()
        textSize = 12f * density
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    val addrPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (isDark) 0xFF9CA3AF.toInt() else 0xFF6B7280.toInt()
        textSize = 10f * density
    }
    val titleW = titlePaint.measureText(shortName)
    val addrW = shortAddr?.let { addrPaint.measureText(it) } ?: 0f
    val textBlockW = maxOf(titleW, addrW).toInt()
    val textBlockH = if (shortAddr != null) {
        (titlePaint.textSize + 3 * density + addrPaint.textSize).toInt()
    } else {
        titlePaint.textSize.toInt()
    }
    val contentH = maxOf(avatar, textBlockH)
    val w = padH + avatar + gap + textBlockW + padH
    val h = padV + contentH + padV + (6 * density).toInt()
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)

    val cardBottom = h - 6f * density
    val rect = RectF(2.5f * density, 2.5f * density, w - 2.5f * density, cardBottom)
    val radius = 12f * density

    canvas.drawRoundRect(
        RectF(rect.left, rect.top + 2f * density, rect.right, cardBottom + 2f * density),
        radius,
        radius,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x33000000 },
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
            strokeWidth = 2f * density
        },
    )
    val tipX = w / 2f
    val tipPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (isDark) 0xFF1F2937.toInt() else 0xFFFFFFFF.toInt()
    }
    val path = android.graphics.Path().apply {
        moveTo(tipX - 7f * density, cardBottom - 1f)
        lineTo(tipX + 7f * density, cardBottom - 1f)
        lineTo(tipX, h - 1f * density)
        close()
    }
    canvas.drawPath(path, tipPaint)
    canvas.drawPath(
        path,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = MARKER_SELECTED
            style = Paint.Style.STROKE
            strokeWidth = 1.5f * density
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
        textSize = 11f * density
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        textAlign = Paint.Align.CENTER
    }
    canvas.drawText(num, ax, ay - (numPaint.descent() + numPaint.ascent()) / 2f, numPaint)

    val textX = (padH + avatar + gap).toFloat()
    val textTop = padV + (contentH - textBlockH) / 2f
    val titleY = textTop - titlePaint.ascent()
    canvas.drawText(shortName, textX, titleY, titlePaint)
    if (shortAddr != null) {
        canvas.drawText(shortAddr, textX, titleY + 3f * density + addrPaint.textSize, addrPaint)
    }
    return bitmapDrawable(bmp, density)
}

private fun bitmapDrawable(bmp: Bitmap, density: Float, densityDpi: Int = (density * 160f).toInt()): BitmapDrawable =
    BitmapDrawable(null, bmp).apply {
        setTargetDensity(densityDpi.coerceIn(120, 640))
    }

private fun distanceBadgeDrawable(density: Float, kmText: String): Drawable {
    val padH = (6 * density).toInt()
    val padV = (3 * density).toInt()
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFFFFF.toInt()
        textSize = 9.5f * density
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    val tw = paint.measureText(kmText).toInt()
    val w = (padH * 2 + tw).coerceAtLeast((26 * density).toInt())
    val h = padV * 2 + paint.textSize.toInt()
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val rect = RectF(0.5f * density, 0.5f * density, w - 0.5f * density, h - 0.5f * density)
    canvas.drawRoundRect(
        RectF(rect.left, rect.top + 0.6f * density, rect.right, rect.bottom + 0.6f * density),
        h / 2f,
        h / 2f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x28000000 },
    )
    canvas.drawRoundRect(
        rect,
        h / 2f,
        h / 2f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ROUTE_FILL },
    )
    // Yupqa oq border
    canvas.drawRoundRect(
        rect,
        h / 2f,
        h / 2f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFFFFFFFF.toInt()
            style = Paint.Style.STROKE
            strokeWidth = 1.2f * density
        },
    )
    val ty = h / 2f - (paint.descent() + paint.ascent()) / 2f
    canvas.drawText(kmText, padH.toFloat(), ty, paint)
    return bitmapDrawable(bmp, density)
}

private fun clearRouteOverlays(
    map: MapView,
    routeCasingRef: MutableState<Polyline?>,
    routeLineRef: MutableState<Polyline?>,
    distanceMarkerRef: MutableState<Marker?>,
) {
    routeCasingRef.value?.let { map.overlays.remove(it) }
    routeCasingRef.value = null
    routeLineRef.value?.let { map.overlays.remove(it) }
    routeLineRef.value = null
    distanceMarkerRef.value?.let { map.overlays.remove(it) }
    distanceMarkerRef.value = null
}

/** Google/Apple Maps uslubidagi yo‘l: oq kontur + ko‘k chiziq */
private fun styleRoutePaint(paint: Paint, color: Int, widthPx: Float) {
    paint.color = color
    paint.strokeWidth = widthPx
    paint.isAntiAlias = true
    paint.style = Paint.Style.STROKE
    paint.strokeCap = Paint.Cap.ROUND
    paint.strokeJoin = Paint.Join.ROUND
}

private fun formatKm(km: Double): String =
    when {
        km < 1 -> String.format("%.0f m", km * 1000)
        km < 10 -> String.format("%.1f km", km)
        else -> String.format("%.0f km", km)
    }

private fun fallbackStraightRoute(
    fromLat: Double,
    fromLng: Double,
    toLat: Double,
    toLng: Double,
): RoadRoute {
    val km = RoadRouteService.haversineM(fromLat, fromLng, toLat, toLng) / 1000.0
    return RoadRoute(
        points = listOf(
            LatLngPoint(fromLat, fromLng),
            LatLngPoint(toLat, toLng),
        ),
        distanceKm = km,
        durationMinutes = (km / 0.4).toInt().coerceAtLeast(1),
    )
}

@Composable
fun LocationMapView(
    clients: List<Client>,
    agentLocation: LocationPoint?,
    selectedClientId: String?,
    isDark: Boolean,
    activeLayer: MapLayerId = MapTileSources.defaultLayer,
    onClientSelected: (Client) -> Unit,
    onSelectionCleared: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val context = LocalContext.current
    val density = context.resources.displayMetrics.density
    val mapViewRef = remember { mutableStateOf<MapView?>(null) }
    val clientMarkers = remember { mutableStateMapOf<String, Marker>() }
    val userMarkerRef = remember { mutableStateOf<Marker?>(null) }
    val routeCasingRef = remember { mutableStateOf<Polyline?>(null) }
    val routeLineRef = remember { mutableStateOf<Polyline?>(null) }
    val distanceMarkerRef = remember { mutableStateOf<Marker?>(null) }
    val appliedLayer = remember { mutableStateOf<MapLayerId?>(null) }
    val appliedDark = remember { mutableStateOf<Boolean?>(null) }
    val selectedClientIdState = rememberUpdatedState(selectedClientId)
    val initialCameraDone = remember { mutableStateOf(false) }

    val iconAgent = remember(density) { agentLocationDrawable(density) }

    val onClientSelectedState = rememberUpdatedState(onClientSelected)
    val onSelectionClearedState = rememberUpdatedState(onSelectionCleared)
    val clientsById = remember(clients) { clients.associateBy { it.id } }
    val clientsByIdState = rememberUpdatedState(clientsById)
    val isDarkState = rememberUpdatedState(isDark)
    /** Marker bosilgandan keyin MapEventsOverlay tanlovni darhol o‘chirmasin */
    val ignoreMapClearUntil = remember { mutableLongStateOf(0L) }
    val mapInstance = mapViewRef.value

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
                    ignoreMapClearUntil.longValue = System.currentTimeMillis() + 400L
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
                pinDrawable(density, MARKER_PURPLE, label = stopLabel, sizeDp = 34f)
            }
        }

        map.invalidate()
    }

    // Xodim → tanlangan nuqta: yo‘l marshruti + kichik km
    LaunchedEffect(selectedClientId, agentLocation, mapInstance) {
        val map = mapInstance ?: return@LaunchedEffect
        clearRouteOverlays(map, routeCasingRef, routeLineRef, distanceMarkerRef)
        map.invalidate()

        val selected = selectedClientId?.let { id ->
            clients.find { it.id == id && it.latitude != null && it.longitude != null }
        } ?: return@LaunchedEffect
        val loc = agentLocation ?: return@LaunchedEffect

        val fromLat = loc.latitude
        val fromLng = loc.longitude
        val toLat = selected.latitude!!
        val toLng = selected.longitude!!
        val distKm = RoadRouteService.haversineM(fromLat, fromLng, toLat, toLng) / 1000.0
        // Juda uzoq GPS (okean/emulyator) — chizilmasin
        if (distKm > 80.0) return@LaunchedEffect

        val route = RoadRouteService.fetchDrivingRoute(fromLat, fromLng, toLat, toLng)
            ?: fallbackStraightRoute(fromLat, fromLng, toLat, toLng)

        if (selectedClientIdState.value != selected.id) return@LaunchedEffect

        val geoPoints = route.points.map { GeoPoint(it.latitude, it.longitude) }
        val casingW = (10f * density).coerceIn(12f, 18f)
        val fillW = (6f * density).coerceIn(7f, 11f)

        val casing = Polyline().apply {
            setPoints(geoPoints)
            styleRoutePaint(outlinePaint, ROUTE_CASING, casingW)
        }
        val fill = Polyline().apply {
            setPoints(geoPoints)
            styleRoutePaint(outlinePaint, ROUTE_FILL, fillW)
        }
        map.overlays.add(casing)
        map.overlays.add(fill)
        routeCasingRef.value = casing
        routeLineRef.value = fill

        val mid = geoPoints[geoPoints.size / 2]
        val badge = Marker(map).apply {
            position = mid
            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
            setInfoWindow(null)
            icon = distanceBadgeDrawable(density, formatKm(route.distanceKm))
            setOnMarkerClickListener { _, _ -> true }
        }
        map.overlays.add(badge)
        distanceMarkerRef.value = badge

        try {
            val box = BoundingBox.fromGeoPoints(geoPoints)
            map.zoomToBoundingBox(box, true, (56 * density).toInt())
        } catch (_: Exception) {
            map.controller.animateTo(GeoPoint(toLat, toLng))
        }
        map.invalidate()
    }

    // Xodim joylashuvi (ko‘k nuqta)
    LaunchedEffect(agentLocation, mapInstance) {
        val map = mapInstance ?: return@LaunchedEffect
        val loc = agentLocation
        if (loc == null) {
            userMarkerRef.value?.let { mark ->
                map.overlays.remove(mark)
                userMarkerRef.value = null
                map.invalidate()
            }
            return@LaunchedEffect
        }
        val point = GeoPoint(loc.latitude, loc.longitude)
        val userMark = userMarkerRef.value ?: Marker(map).also {
            it.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
            it.setInfoWindow(null)
            it.title = "Xodim"
            userMarkerRef.value = it
            map.overlays.add(it)
        }
        userMark.icon = iconAgent
        if (userMark.position != point) userMark.position = point
        map.invalidate()
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
                // Pastki overlay: marker bosilmasa — tanlov yopiladi
                overlays.add(
                    0,
                    MapEventsOverlay(object : MapEventsReceiver {
                        override fun singleTapConfirmedHelper(p: GeoPoint?): Boolean {
                            if (System.currentTimeMillis() < ignoreMapClearUntil.longValue) {
                                return false
                            }
                            if (selectedClientIdState.value != null) {
                                onSelectionClearedState.value()
                            }
                            return false
                        }
                        override fun longPressHelper(p: GeoPoint?) = false
                    }),
                )
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
