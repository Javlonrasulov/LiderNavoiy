package uz.lider.client.presentation.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.OrderStatus
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientPalette
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.orderDisplayLabel
import uz.lider.client.presentation.components.orderStatusColor
import uz.lider.client.presentation.components.orderStatusLabel
import uz.lider.client.presentation.components.rememberClientPalette
import uz.lider.client.presentation.navigation.ClientBottomNavHeight
import uz.lider.client.presentation.navigation.ClientRoutes
import uz.lider.client.presentation.theme.FixedHeroBackdrop
import uz.lider.client.presentation.theme.GlassFilterChip
import uz.lider.client.presentation.theme.GlassSearchField
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.PremiumHeaderActionPill
import uz.lider.client.presentation.theme.PremiumHeaderButton
import uz.lider.client.presentation.theme.PremiumHeaderPillIcon
import uz.lider.client.presentation.theme.liquidGlassThemed

/** Scroll distance (px) before hero fully fades to page background. */
private const val HeroFadeScrollPx = 700f

@Composable
fun OrdersScreen(
    onNavigate: (String) -> Unit,
    onOpenDrawer: () -> Unit = {},
    viewModel: OrdersViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val lang = LocalAppLanguage.current
    val palette = rememberClientPalette()
    val orders = state.visibleOrders
    val allOrders = state.orders
    val activeCount = allOrders.count {
        val s = OrderStatus.fromKey(it.status)
        s != OrderStatus.DELIVERED && s != OrderStatus.CANCELLED
    }
    val totalAmount = orders.sumOf { it.totalAmount }
    val filters = listOf(
        "all" to localized("ord_all"),
        "onway" to localized("ord_status_onway"),
        "delivered" to localized("ord_status_delivered"),
        "packing" to localized("ord_status_packing"),
        "warehouse" to localized("ord_status_warehouse"),
        "received" to localized("ord_status_received"),
        "cancelled" to localized("ord_status_cancelled"),
    )
    val listState = rememberLazyListState()
    val density = LocalDensity.current
    val fadeProgress by remember {
        derivedStateOf {
            val index = listState.firstVisibleItemIndex
            val offset = listState.firstVisibleItemScrollOffset
            val approx = when {
                index == 0 -> offset.toFloat()
                else -> offset + index * with(density) { 160.dp.toPx() }
            }
            (approx / HeroFadeScrollPx).coerceIn(0f, 1f)
        }
    }

    LiquidBackground(modifier = Modifier.fillMaxSize()) {
        if (state.loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LiquidGlass.Indigo)
            }
        } else {
            Box(Modifier.fillMaxSize()) {
                FixedHeroBackdrop(
                    fadeProgress = fadeProgress,
                    height = 480.dp,
                    modifier = Modifier.align(Alignment.TopCenter),
                )

                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = ClientBottomNavHeight + 16.dp),
                ) {
                    item {
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .statusBarsPadding()
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                        ) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                PremiumHeaderButton(
                                    icon = Icons.Default.Menu,
                                    onClick = onOpenDrawer,
                                    contentDescription = "Menu",
                                )
                                PremiumHeaderActionPill {
                                    PremiumHeaderPillIcon(
                                        icon = Icons.Default.Refresh,
                                        onClick = viewModel::load,
                                    )
                                }
                            }
                            Spacer(Modifier.height(28.dp))
                            Text(
                                localized("ord_title"),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 28.sp,
                                lineHeight = 34.sp,
                            )
                            Text(
                                "${orders.size} ${localized("ord_count")}",
                                color = Color.White.copy(alpha = 0.90f),
                                fontSize = 15.sp,
                                lineHeight = 22.sp,
                            )
                            Spacer(Modifier.height(20.dp))
                        }
                    }

                    item {
                        GlassSearchField(
                            value = state.search,
                            onValueChange = viewModel::onSearchChange,
                            placeholder = localized("ord_search"),
                            leadingIcon = Icons.Default.Search,
                            modifier = Modifier.padding(horizontal = 16.dp),
                        )
                        Spacer(Modifier.height(12.dp))
                    }

                    item {
                        Row(
                            Modifier
                                .horizontalScroll(rememberScrollState())
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            filters.forEach { (filterKey, label) ->
                                key(filterKey) {
                                    GlassFilterChip(
                                        label = label,
                                        selected = state.statusFilter == filterKey,
                                        onClick = { viewModel.onStatusFilterChange(filterKey) },
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(10.dp))
                        Text(
                            "${orders.size} ${localized("ord_count")}",
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 13.sp,
                            modifier = Modifier.padding(horizontal = 16.dp),
                        )
                        Spacer(Modifier.height(16.dp))
                    }

                    item {
                        Box(
                            Modifier
                                .padding(horizontal = 16.dp)
                                .fillMaxWidth()
                                .shadow(
                                    elevation = 16.dp,
                                    shape = RoundedCornerShape(LiquidGlass.RadiusCard),
                                    ambientColor = LiquidGlass.ShadowAmbient,
                                    spotColor = LiquidGlass.ShadowSpot,
                                )
                                .clip(RoundedCornerShape(LiquidGlass.RadiusCard))
                                .background(LiquidGlass.GradientPrimary)
                                .padding(20.dp),
                        ) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        localized("dash_active_orders"),
                                        color = Color.White.copy(alpha = 0.75f),
                                        fontSize = 13.sp,
                                    )
                                    Text(
                                        "$activeCount",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 28.sp,
                                        lineHeight = 34.sp,
                                    )
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        "${formatMoney(totalAmount)} ${localized("com_som")}",
                                        color = Color.White.copy(alpha = 0.90f),
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                }
                                Box(
                                    Modifier
                                        .size(56.dp)
                                        .clip(RoundedCornerShape(18.dp))
                                        .background(Color.White.copy(alpha = 0.22f)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        Icons.Default.LocalShipping,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(28.dp),
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(20.dp))
                    }

                    item(key = "orders-header-${state.statusFilter}-${orders.size}") {
                        Text(
                            "${orders.size} ${localized("ord_count")}",
                            color = LiquidTheme.text,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp,
                            modifier = Modifier.padding(horizontal = 16.dp),
                        )
                        Spacer(Modifier.height(12.dp))
                    }

                    if (orders.isEmpty()) {
                        item(key = "orders-empty") {
                            Box(
                                Modifier
                                    .padding(horizontal = 16.dp)
                                    .fillMaxWidth()
                                    .liquidGlassThemed()
                                    .padding(28.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Box(
                                        Modifier
                                            .size(52.dp)
                                            .clip(CircleShape)
                                            .background(LiquidGlass.Indigo.copy(alpha = 0.15f)),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(
                                            Icons.Default.ShoppingBag,
                                            contentDescription = null,
                                            tint = LiquidGlass.Indigo,
                                            modifier = Modifier.size(24.dp),
                                        )
                                    }
                                    Spacer(Modifier.height(12.dp))
                                    Text(
                                        localized("ord_empty"),
                                        color = LiquidTheme.textMuted,
                                        fontSize = 14.sp,
                                        textAlign = TextAlign.Center,
                                    )
                                }
                            }
                        }
                    } else {
                        items(orders, key = { it.id }) { order ->
                            Box(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                                OrderCard(
                                    order = order,
                                    lang = lang,
                                    palette = palette,
                                    onClick = { onNavigate(ClientRoutes.orderTracking(order.id)) },
                                    onReorder = { onNavigate(ClientRoutes.CATALOG) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderCard(
    order: ClientOrder,
    lang: AppLanguage,
    palette: ClientPalette,
    onClick: () -> Unit,
    onReorder: () -> Unit,
) {
    val status = orderStatusLabel(lang, order.status)
    val color = orderStatusColor(order.status, palette)
    val product = order.items.firstOrNull()?.productName ?: order.id
    val delivered = OrderStatus.fromKey(order.status) == OrderStatus.DELIVERED

    Column(
        Modifier
            .fillMaxWidth()
            .liquidGlassThemed(radius = LiquidGlass.RadiusWidget)
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f),
            ) {
                Box(
                    Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(color.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.ShoppingBag,
                        contentDescription = null,
                        tint = color,
                        modifier = Modifier.size(20.dp),
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        orderDisplayLabel(lang, order.id),
                        color = LiquidTheme.text,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        order.createdAt.take(10),
                        color = LiquidTheme.textMuted,
                        fontSize = 12.sp,
                    )
                }
            }
            Spacer(Modifier.width(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    status,
                    color = color,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    modifier = Modifier
                        .clip(RoundedCornerShape(LiquidGlass.RadiusChip))
                        .background(color.copy(alpha = 0.16f))
                        .padding(horizontal = 10.dp, vertical = 5.dp),
                )
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = LiquidTheme.textMuted,
                )
            }
        }

        Spacer(Modifier.height(12.dp))

        Text(
            product,
            color = LiquidTheme.textMuted,
            fontSize = 13.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(6.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "${order.items.size} ${localized("ord_items")}",
                color = LiquidTheme.textMuted,
                fontSize = 12.sp,
            )
            Text(
                "${formatMoney(order.totalAmount)} ${localized("com_som")}",
                color = LiquidTheme.text,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
            )
        }

        if (delivered) {
            Spacer(Modifier.height(12.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(LiquidGlass.RadiusButton))
                    .background(LiquidGlass.GradientPrimary)
                    .clickable(onClick = onReorder)
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Icon(
                        Icons.Default.Refresh,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp),
                    )
                    Text(
                        localized("ord_reorder"),
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}
