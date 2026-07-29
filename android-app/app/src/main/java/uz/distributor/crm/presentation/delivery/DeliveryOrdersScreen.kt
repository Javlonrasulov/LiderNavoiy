package uz.distributor.crm.presentation.delivery

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DragHandle
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.hilt.navigation.compose.hiltViewModel
import sh.calvin.reorderable.ReorderableItem
import sh.calvin.reorderable.rememberReorderableLazyListState
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage

private val Accent = Color(0xFF6366F1)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryOrdersScreen(
    onOrderClick: (String) -> Unit,
    onDebtsClick: () -> Unit = {},
    viewModel: DeliveryOrdersViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val state by viewModel.uiState.collectAsState()
    val bg = if (isDark) Color(0xFF0E1621) else Color(0xFFF3F4F6)
    val cardBg = if (isDark) Color(0xFF17212B) else Color.White
    val textPrimary = if (isDark) Color.White else Color.Black
    val textMuted = if (isDark) Color(0xFF8E9BA7) else Color(0xFF6B7280)
    val haptic = LocalHapticFeedback.current

    // Parent Column allaqachon BottomNav + system bars uchun joy ajratgan —
    // Scaffold navigationBars inseti bo‘shliq / kesilish hosil qilmasin.
    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                title = {
                    DeliverySectionTabs(
                        selectedDebts = false,
                        lang = lang,
                        onDelivery = {},
                        onDebts = onDebtsClick,
                    )
                },
                actions = {
                    val onWayCount = state.orders.count { it.status == "on_way" }
                    if (onWayCount > 0) {
                        Text(
                            "$onWayCount",
                            color = Accent,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            modifier = Modifier.padding(end = 4.dp),
                        )
                    }
                    IconButton(onClick = viewModel::load) {
                        Icon(Icons.Default.Refresh, contentDescription = null, tint = textPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = if (isDark) Color(0xFF17212B) else Color.White,
                ),
            )
        },
        containerColor = bg,
    ) { padding ->
        Box(
            Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.isLoading -> {
                    CircularProgressIndicator(
                        Modifier.align(Alignment.Center),
                        color = Accent,
                    )
                }
                state.orders.isEmpty() -> {
                    Column(
                        Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Icon(
                            Icons.Default.LocalShipping,
                            null,
                            tint = textMuted,
                            modifier = Modifier.size(56.dp),
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            AppStrings.noDeliveryOrders(lang),
                            color = textMuted,
                            fontSize = 15.sp,
                        )
                    }
                }
                else -> {
                    val onWayOrders = state.orders.filter { it.status == "on_way" }
                    if (onWayOrders.isEmpty()) {
                        Column(
                            Modifier
                                .fillMaxSize()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                        ) {
                            Icon(
                                Icons.Default.LocalShipping,
                                null,
                                tint = textMuted,
                                modifier = Modifier.size(56.dp),
                            )
                            Spacer(Modifier.height(12.dp))
                            Text(
                                AppStrings.noDeliveryOrders(lang),
                                color = textMuted,
                                fontSize = 15.sp,
                            )
                        }
                    } else {
                    val onWayIds = onWayOrders.map { it.id }
                    val lazyListState = rememberLazyListState()
                    val reorderableState = rememberReorderableLazyListState(lazyListState) { from, to ->
                        viewModel.onWayDragMove(from.index, to.index)
                    }

                    LazyColumn(
                        state = lazyListState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(
                            start = 16.dp,
                            end = 16.dp,
                            top = 16.dp,
                            bottom = 20.dp,
                        ),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(onWayOrders, key = { it.id }) { order ->
                            val onWayIndex = onWayIds.indexOf(order.id)
                            val stopNumber = if (onWayIndex >= 0) onWayIndex + 1 else null
                            val canReorder = true

                            ReorderableItem(
                                reorderableState,
                                key = order.id,
                                enabled = canReorder,
                            ) { isDragging ->
                                val elevation by animateDpAsState(
                                    targetValue = if (isDragging) 14.dp else 1.dp,
                                    label = "cardElev",
                                )
                                val scale by animateFloatAsState(
                                    targetValue = if (isDragging) 1.04f else 1f,
                                    label = "cardScale",
                                )
                                DeliveryOrderCard(
                                    order = order,
                                    stopNumber = stopNumber,
                                    canReorder = canReorder,
                                    isDragging = isDragging,
                                    cardBg = cardBg,
                                    textPrimary = textPrimary,
                                    textMuted = textMuted,
                                    lang = lang,
                                    modifier = Modifier
                                        .zIndex(if (isDragging) 1f else 0f)
                                        .graphicsLayer {
                                            scaleX = scale
                                            scaleY = scale
                                        }
                                        .shadow(elevation, RoundedCornerShape(16.dp))
                                        .then(
                                            Modifier.longPressDraggableHandle(
                                                onDragStarted = {
                                                    haptic.performHapticFeedback(
                                                        HapticFeedbackType.LongPress,
                                                    )
                                                },
                                                onDragStopped = {
                                                    viewModel.persistCurrentOnWayOrder()
                                                },
                                            ),
                                        ),
                                    onCardClick = { onOrderClick(order.id) },
                                )
                            }
                        }
                    }
                    }
                }
            }

            state.error?.let { err ->
                Snackbar(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp),
                    action = {
                        TextButton(onClick = viewModel::clearError) {
                            Text("OK")
                        }
                    },
                ) {
                    Text(AppStrings.apiError(lang, err))
                }
            }
        }
    }
}

@Composable
private fun DeliveryOrderCard(
    order: OrderDto,
    stopNumber: Int?,
    canReorder: Boolean,
    isDragging: Boolean,
    cardBg: Color,
    textPrimary: Color,
    textMuted: Color,
    lang: AppLanguage,
    modifier: Modifier = Modifier,
    onCardClick: () -> Unit,
) {
    val context = LocalContext.current
    val name = order.clientName ?: AppStrings.clientFallback(lang)
    val address = order.clientAddress?.takeIf { it.isNotBlank() }
    val phone = order.clientPhone?.takeIf { it.isNotBlank() }
    val canNavigate = (order.clientLatitude != null && order.clientLongitude != null) ||
        !order.clientAddress.isNullOrBlank()

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = cardBg),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (stopNumber != null) {
                    Box(
                        Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(Accent),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "$stopNumber",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                }
                Text(
                    name,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 17.sp,
                    color = textPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier
                        .weight(1f)
                        .clickable(enabled = !isDragging, onClick = onCardClick),
                )
                if (canReorder) {
                    Icon(
                        Icons.Default.DragHandle,
                        contentDescription = null,
                        tint = if (isDragging) Accent else textMuted,
                        modifier = Modifier
                            .size(28.dp)
                            .padding(start = 4.dp),
                    )
                }
            }
            if (order.needsPaymentFollowUp) {
                Spacer(Modifier.height(6.dp))
                Text(
                    "${AppStrings.deliveryCollectPayment(lang)} · ${AppStrings.deliveryRemaining(lang)}: ${
                        java.text.DecimalFormat("#,###").format(order.remainingBalance)
                    }",
                    color = Color(0xFFDC2626),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                order.dueAt?.takeIf { it.isNotBlank() }?.let { due ->
                    formatDueAtDisplay(due)?.let { formatted ->
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "${AppStrings.deliveryPromisedUntil(lang)}: $formatted",
                            color = Color(0xFFD97706),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }

            Column(Modifier.clickable(enabled = !isDragging, onClick = onCardClick)) {
                if (address != null) {
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.Top) {
                        Icon(
                            Icons.Default.Place,
                            null,
                            tint = textMuted,
                            modifier = Modifier
                                .size(16.dp)
                                .padding(top = 2.dp),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            address,
                            color = textMuted,
                            fontSize = 14.sp,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                if (phone != null) {
                    Spacer(Modifier.height(10.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            phone,
                            color = textPrimary,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.weight(1f),
                        )
                        Box(
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(Accent.copy(alpha = 0.12f))
                                .clickable(enabled = !isDragging) {
                                    context.startActivity(
                                        Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")),
                                    )
                                },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Default.Phone,
                                contentDescription = AppStrings.deliveryCallClient(lang),
                                tint = Accent,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    }
                }
            }

            if (canNavigate) {
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = { openNavigation(context, order) },
                    enabled = !isDragging,
                    colors = ButtonDefaults.buttonColors(containerColor = Accent),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(vertical = 12.dp),
                ) {
                    Icon(
                        Icons.Default.Navigation,
                        null,
                        modifier = Modifier.size(18.dp),
                        tint = Color.White,
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        AppStrings.deliveryNavigate(lang),
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                    )
                }
            }
        }
    }
}

internal fun openNavigation(context: Context, order: OrderDto) {
    val hasCoords = order.clientLatitude != null && order.clientLongitude != null
    val uri = if (hasCoords) {
        Uri.parse("google.navigation:q=${order.clientLatitude},${order.clientLongitude}&mode=d")
    } else {
        Uri.parse("google.navigation:q=${Uri.encode(order.clientAddress.orEmpty())}&mode=d")
    }
    val intent = Intent(Intent.ACTION_VIEW, uri)
    intent.setPackage("com.google.android.apps.maps")
    if (intent.resolveActivity(context.packageManager) != null) {
        context.startActivity(intent)
        return
    }
    val fallback = if (hasCoords) {
        Uri.parse(
            "yandexnavi://build_route_on_map?lat_to=${order.clientLatitude}&lon_to=${order.clientLongitude}",
        )
    } else {
        Uri.parse("geo:0,0?q=${Uri.encode(order.clientAddress.orEmpty())}")
    }
    try {
        context.startActivity(Intent(Intent.ACTION_VIEW, fallback))
    } catch (_: Exception) {
        context.startActivity(
            Intent(
                Intent.ACTION_VIEW,
                Uri.parse(
                    "https://maps.google.com/?q=${order.clientLatitude ?: ""},${order.clientLongitude ?: ""}",
                ),
            ),
        )
    }
}
