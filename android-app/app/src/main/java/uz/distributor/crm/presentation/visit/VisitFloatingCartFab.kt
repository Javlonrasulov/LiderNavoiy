package uz.distributor.crm.presentation.visit

import android.content.Context
import android.provider.Settings
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import kotlinx.coroutines.launch
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import kotlin.math.roundToInt

private const val FAB_PREFS = "visit_floating_cart_fab"
private const val KEY_X = "x_px"
private const val KEY_Y = "y_px"
private val FabBlue = Color(0xFF4F6BED)
private val BadgeGreen = Color(0xFF10B981)
private val HideRed = Color(0xFFE11D48)
private val HideRedHot = Color(0xFFF43F5E)

@Composable
fun VisitFloatingCartFab(
    count: Int,
    dropZoneVisible: Boolean,
    lang: AppLanguage,
    onClick: () -> Unit,
    onDragStart: () -> Unit,
    onDropHide: () -> Unit,
    onCancelDrop: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val scope = rememberCoroutineScope()

    val fabSize = 54.dp
    val badgeOverhang = 22.dp
    val hitBox = fabSize + badgeOverhang * 2
    val edgePad = 16.dp
    val bottomReserve = 100.dp

    val fabSizePx = with(density) { fabSize.toPx() }
    val hitBoxPx = with(density) { hitBox.toPx() }
    val edgePadPx = with(density) { edgePad.toPx() }
    val bottomReservePx = with(density) { bottomReserve.toPx() }
    val dropTargetSize = 56.dp
    val dropTargetSizePx = with(density) { dropTargetSize.toPx() }

    var fabX by remember { mutableFloatStateOf(Float.NaN) }
    var fabY by remember { mutableFloatStateOf(Float.NaN) }
    var dragging by remember { mutableStateOf(false) }
    var overDrop by remember { mutableStateOf(false) }
    val hideScale = remember { Animatable(1f) }
    val hideAlpha = remember { Animatable(1f) }

    val onClickState by rememberUpdatedState(onClick)
    val onDragStartState by rememberUpdatedState(onDragStart)
    val onDropHideState by rememberUpdatedState(onDropHide)
    val onCancelDropState by rememberUpdatedState(onCancelDrop)

    val animationsEnabled = remember(context) {
        runCatching {
            Settings.Global.getFloat(
                context.contentResolver,
                Settings.Global.ANIMATOR_DURATION_SCALE,
                1f,
            ) > 0f
        }.getOrDefault(true)
    }

    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .zIndex(8f),
    ) {
        val maxW = constraints.maxWidth.toFloat().coerceAtLeast(1f)
        val maxH = constraints.maxHeight.toFloat().coerceAtLeast(1f)

        fun clampPos(x: Float, y: Float, allowDropReach: Boolean = false): Offset {
            val bottom = if (allowDropReach) with(density) { 44.dp.toPx() } else bottomReservePx
            val maxX = (maxW - hitBoxPx - edgePadPx).coerceAtLeast(edgePadPx)
            val maxY = (maxH - hitBoxPx - bottom).coerceAtLeast(edgePadPx)
            return Offset(
                x.coerceIn(edgePadPx, maxX),
                y.coerceIn(edgePadPx, maxY),
            )
        }

        fun defaultPos(): Offset = clampPos(
            maxW - hitBoxPx - with(density) { 14.dp.toPx() },
            maxH - hitBoxPx - bottomReservePx,
        )

        fun persist(x: Float, y: Float) {
            context.getSharedPreferences(FAB_PREFS, Context.MODE_PRIVATE)
                .edit()
                .putFloat(KEY_X, x)
                .putFloat(KEY_Y, y)
                .apply()
        }

        LaunchedEffect(maxW, maxH) {
            if (maxW <= 1f || maxH <= 1f) return@LaunchedEffect
            if (fabX.isNaN() || fabY.isNaN()) {
                val prefs = context.getSharedPreferences(FAB_PREFS, Context.MODE_PRIVATE)
                val sx = prefs.getFloat(KEY_X, Float.NaN)
                val sy = prefs.getFloat(KEY_Y, Float.NaN)
                val pos = if (!sx.isNaN() && !sy.isNaN()) clampPos(sx, sy) else defaultPos()
                fabX = pos.x
                fabY = pos.y
            } else {
                val pos = clampPos(fabX, fabY)
                fabX = pos.x
                fabY = pos.y
            }
        }

        val dropCenterX = maxW / 2f
        val dropCenterY = maxH - bottomReservePx - dropTargetSizePx / 2f - with(density) { 4.dp.toPx() }

        fun fabCenter(): Offset = Offset(fabX + hitBoxPx / 2f, fabY + hitBoxPx / 2f)

        fun isOverDropZone(): Boolean {
            val c = fabCenter()
            // Markaz atrofida kengroq qabul zonasi — barmoq/FAB biroz uzoqroq bo‘lsa ham
            val reachX = dropTargetSizePx * 1.6f
            val reachY = dropTargetSizePx * 1.8f + fabSizePx * 0.35f
            return kotlin.math.abs(c.x - dropCenterX) <= reachX &&
                kotlin.math.abs(c.y - dropCenterY) <= reachY
        }

        if (dropZoneVisible || dragging) {
            FloatingCartHideTarget(
                overDrop = overDrop,
                animationsEnabled = animationsEnabled,
                modifier = Modifier
                    .offset {
                        IntOffset(
                            (dropCenterX - dropTargetSizePx / 2f).roundToInt(),
                            (dropCenterY - dropTargetSizePx / 2f).roundToInt(),
                        )
                    }
                    .size(dropTargetSize)
                    .zIndex(6f),
            )
        }

        if (!fabX.isNaN() && !fabY.isNaN() && hideAlpha.value > 0.01f) {
            Box(
                modifier = Modifier
                    .offset { IntOffset(fabX.roundToInt(), fabY.roundToInt()) }
                    .size(hitBox)
                    .zIndex(10f)
                    .semantics {
                        contentDescription = AppStrings.quickCartTitle(lang)
                    }
                    .pointerInput(maxW, maxH) {
                        awaitEachGesture {
                            val down = awaitFirstDown(requireUnconsumed = false)
                            var isDragging = false
                            var wasOver = false
                            var total = Offset.Zero
                            val touchSlop = viewConfiguration.touchSlop

                            while (true) {
                                val event = awaitPointerEvent()
                                val change = event.changes.firstOrNull { it.id == down.id } ?: break

                                if (!change.pressed) {
                                    if (!isDragging) {
                                        onClickState()
                                    } else {
                                        val dropped = wasOver || isOverDropZone()
                                        dragging = false
                                        overDrop = false
                                        if (dropped) {
                                            scope.launch {
                                                hideScale.animateTo(0.12f, tween(150))
                                                hideAlpha.animateTo(0f, tween(100))
                                                onDropHideState()
                                                hideScale.snapTo(1f)
                                                hideAlpha.snapTo(1f)
                                            }
                                        } else {
                                            val parked = clampPos(fabX, fabY, allowDropReach = false)
                                            fabX = parked.x
                                            fabY = parked.y
                                            persist(fabX, fabY)
                                            onCancelDropState()
                                        }
                                    }
                                    break
                                }

                                val delta = change.positionChange()
                                if (delta != Offset.Zero) {
                                    total += delta
                                    if (!isDragging && total.getDistance() > touchSlop) {
                                        isDragging = true
                                        dragging = true
                                        onDragStartState()
                                    }
                                    if (isDragging) {
                                        change.consume()
                                        val next = clampPos(
                                            fabX + delta.x,
                                            fabY + delta.y,
                                            allowDropReach = true,
                                        )
                                        fabX = next.x
                                        fabY = next.y
                                        wasOver = isOverDropZone()
                                        overDrop = wasOver
                                    }
                                }
                            }
                        }
                    },
            ) {
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .size(fabSize)
                        .graphicsLayer {
                            scaleX = hideScale.value
                            scaleY = hideScale.value
                            alpha = hideAlpha.value
                            clip = false
                            shadowElevation = 8f
                            shape = CircleShape
                        }
                        .background(FabBlue, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Outlined.ShoppingCart,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(24.dp),
                    )
                }
            }

            // Badge hitBox tashqarisida, yuqori zIndex — Surface elevation ostida qolmasin
            Box(
                modifier = Modifier
                    .offset {
                        IntOffset(
                            (fabX + hitBoxPx - with(density) { 28.dp.toPx() }).roundToInt(),
                            (fabY + with(density) { 2.dp.toPx() }).roundToInt(),
                        )
                    }
                    .graphicsLayer {
                        scaleX = hideScale.value
                        scaleY = hideScale.value
                        alpha = hideAlpha.value
                        clip = false
                        shadowElevation = 10f
                        shape = CircleShape
                    }
                    .zIndex(20f),
            ) {
                CartCountBadge(count = count)
            }
        }
    }
}

@Composable
private fun CartCountBadge(count: Int) {
    val label = if (count > 99) "99+" else count.coerceAtLeast(0).toString()
    val single = label.length == 1
    Box(
        modifier = Modifier
            .then(
                if (single) Modifier.size(26.dp)
                else Modifier
                    .height(26.dp)
                    .widthIn(min = 34.dp)
                    .padding(horizontal = 7.dp),
            )
            .background(
                color = BadgeGreen,
                shape = if (single) CircleShape else RoundedCornerShape(12.dp),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            color = Color.White,
            style = TextStyle(
                fontSize = if (label == "99+") 9.sp else 11.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                platformStyle = PlatformTextStyle(includeFontPadding = false),
                lineHeight = 14.sp,
                lineHeightStyle = LineHeightStyle(
                    alignment = LineHeightStyle.Alignment.Center,
                    trim = LineHeightStyle.Trim.Both,
                ),
            ),
            maxLines = 1,
        )
    }
}

@Composable
private fun FloatingCartHideTarget(
    overDrop: Boolean,
    animationsEnabled: Boolean,
    modifier: Modifier = Modifier,
) {
    val pulse = if (animationsEnabled && !overDrop) {
        val t = rememberInfiniteTransition(label = "hidePulse")
        t.animateFloat(
            initialValue = 0.40f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = 1450, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse,
            ),
            label = "hideAlpha",
        ).value
    } else {
        1f
    }

    Box(
        modifier = modifier.graphicsLayer {
            alpha = if (overDrop) 1f else pulse
            scaleX = if (overDrop) 1.2f else 1f
            scaleY = if (overDrop) 1.2f else 1f
            clip = false
        },
        contentAlignment = Alignment.Center,
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            shape = CircleShape,
            color = if (overDrop) HideRedHot else HideRed,
            shadowElevation = if (overDrop) 10.dp else 4.dp,
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                Icon(
                    imageVector = Icons.Outlined.ShoppingCart,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(26.dp),
                )
            }
        }
    }
}
