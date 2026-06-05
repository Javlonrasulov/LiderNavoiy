package uz.distributor.crm.presentation.order

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.domain.model.CartItem
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.navigation.BottomNavHeight
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.sherinHeroBrush
import uz.distributor.crm.presentation.theme.sherinPageBackground
import java.text.DecimalFormat

private val PrimaryBlue = Color(0xFF2B7FFF)
private val TotalBarBg = Color(0xFFF0F7FF)
private val TotalBarBorder = Color(0xFFD6E8FF)
private val SubText = Color(0xFF8E8E93)
private val CardBorder = Color(0xFFE5E7EB)

@Composable
fun OrderSummaryScreen(
    clientId: String,
    onBack: () -> Unit,
    onDone: () -> Unit,
    onEditClient: (String) -> Unit = {},
    viewModel: OrderViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val fmt = remember { DecimalFormat("#,###") }
    val stockFmt = remember { DecimalFormat("#,##0.##") }
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f

    LaunchedEffect(clientId) { viewModel.init(clientId) }

    val pageBg = sherinPageBackground(isDark)
    val cardBg = if (isDark) SherinColors.CardRowDark else Color.White
    val titleColor = if (isDark) Color.White else Color(0xFF111827)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(pageBg)
            .padding(bottom = BottomNavHeight),
    ) {
        OrderSalesHeader(
            isDark = isDark,
            selectedTab = state.tab,
            lang = lang,
            onBack = onBack,
            onTabSelect = viewModel::selectTab,
        )

        when (state.tab) {
            OrderSummaryTab.CURRENT -> CurrentOrderContent(
                state = state,
                fmt = fmt,
                stockFmt = stockFmt,
                lang = lang,
                isDark = isDark,
                cardBg = cardBg,
                titleColor = titleColor,
                onToggleClient = viewModel::toggleClientExpanded,
                onToggleItem = viewModel::toggleItemExpanded,
                onUpdateQty = viewModel::updateQty,
                onRemoveItem = viewModel::removeItem,
                onEditClient = { onEditClient(state.clientId) },
                onSubmit = { viewModel.submit() },
            )
            OrderSummaryTab.SENT -> SentOrdersContent(
                orders = state.sentOrders,
                isLoading = state.isLoadingSent,
                fmt = fmt,
                lang = lang,
                isDark = isDark,
                cardBg = cardBg,
                titleColor = titleColor,
            )
        }
    }

    state.error?.let { key ->
        LaunchedEffect(key) {
            // error surfaced via snackbar could be added later
        }
    }
}

@Composable
private fun OrderSalesHeader(
    isDark: Boolean,
    selectedTab: OrderSummaryTab,
    lang: AppLanguage,
    onBack: () -> Unit,
    onTabSelect: (OrderSummaryTab) -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(sherinHeroBrush(isDark)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 24.dp),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SherinGlassIconButton(
                    onClick = onBack,
                    icon = Icons.AutoMirrored.Filled.ArrowBack,
                    size = 40.dp,
                )
                Text(
                    AppStrings.totalSales(lang),
                    modifier = Modifier.weight(1f),
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
                Spacer(Modifier.width(40.dp))
            }

            Spacer(Modifier.height(8.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                OrderHeaderTab(
                    label = AppStrings.currentOrder(lang),
                    selected = selectedTab == OrderSummaryTab.CURRENT,
                    onClick = { onTabSelect(OrderSummaryTab.CURRENT) },
                )
                OrderHeaderTab(
                    label = AppStrings.sentOrders(lang),
                    selected = selectedTab == OrderSummaryTab.SENT,
                    onClick = { onTabSelect(OrderSummaryTab.SENT) },
                )
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun OrderHeaderTab(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier.clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            label,
            color = if (selected) Color.White else Color.White.copy(alpha = 0.55f),
            fontSize = 14.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
        )
        Spacer(Modifier.height(8.dp))
        if (selected) {
            Box(
                Modifier
                    .width(48.dp)
                    .height(3.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(Color.White),
            )
        } else {
            Spacer(Modifier.height(3.dp))
        }
    }
}

@Composable
private fun CurrentOrderContent(
    state: OrderUiState,
    fmt: DecimalFormat,
    stockFmt: DecimalFormat,
    lang: AppLanguage,
    isDark: Boolean,
    cardBg: Color,
    titleColor: Color,
    onToggleClient: () -> Unit,
    onToggleItem: (String) -> Unit,
    onUpdateQty: (String, Double) -> Unit,
    onRemoveItem: (String) -> Unit,
    onEditClient: () -> Unit,
    onSubmit: () -> Unit,
) {
    if (state.items.isEmpty()) {
        Box(
            Modifier
                .fillMaxSize()
                .padding(16.dp),
            contentAlignment = Alignment.Center,
        ) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = cardBg,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, if (isDark) Color(0xFF374151) else CardBorder, RoundedCornerShape(16.dp)),
            ) {
                Column(
                    Modifier.padding(48.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(
                        Icons.Outlined.CheckCircle,
                        contentDescription = null,
                        tint = SubText,
                        modifier = Modifier.size(56.dp),
                    )
                    Spacer(Modifier.height(16.dp))
                    Text(
                        AppStrings.cartEmptyHint(lang),
                        color = SubText,
                        fontSize = 14.sp,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
        }
        return
    }

    Column(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                ClientOrderCard(
                    clientCode = state.clientCode,
                    clientName = state.clientName,
                    items = state.items,
                    productBrands = state.productBrands,
                    expanded = state.clientExpanded,
                    expandedItems = state.expandedItems,
                    fmt = fmt,
                    stockFmt = stockFmt,
                    lang = lang,
                    isDark = isDark,
                    cardBg = cardBg,
                    titleColor = titleColor,
                    onToggleClient = onToggleClient,
                    onToggleItem = onToggleItem,
                    onUpdateQty = onUpdateQty,
                    onRemoveItem = onRemoveItem,
                    onEditClient = onEditClient,
                )
            }
        }

        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            TotalSummaryBar(
                total = state.total,
                fmt = fmt,
                lang = lang,
                isDark = isDark,
            )
            Button(
                onClick = onSubmit,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                enabled = !state.isSubmitting && state.clientId.isNotBlank(),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue),
            ) {
                if (state.isSubmitting) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.dp,
                    )
                } else {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        AppStrings.sendOrder(lang),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

@Composable
private fun ClientOrderCard(
    clientCode: String,
    clientName: String,
    items: List<CartItem>,
    productBrands: Map<String, String>,
    expanded: Boolean,
    expandedItems: Set<String>,
    fmt: DecimalFormat,
    stockFmt: DecimalFormat,
    lang: AppLanguage,
    isDark: Boolean,
    cardBg: Color,
    titleColor: Color,
    onToggleClient: () -> Unit,
    onToggleItem: (String) -> Unit,
    onUpdateQty: (String, Double) -> Unit,
    onRemoveItem: (String) -> Unit,
    onEditClient: () -> Unit,
) {
    val borderColor = if (isDark) Color(0xFF374151) else CardBorder

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = cardBg,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, borderColor, RoundedCornerShape(16.dp)),
    ) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onToggleClient)
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    if (clientCode.isNotBlank()) {
                        Text(clientCode, color = SubText, fontSize = 12.sp)
                    }
                    Text(
                        clientName.ifBlank { "—" },
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = titleColor,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFEFF6FF))
                        .clickable(onClick = onEditClient),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.Edit,
                        contentDescription = null,
                        tint = PrimaryBlue,
                        modifier = Modifier.size(18.dp),
                    )
                }
                Spacer(Modifier.width(4.dp))
                Icon(
                    if (expanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                    contentDescription = null,
                    tint = SubText,
                    modifier = Modifier.size(24.dp),
                )
            }

            if (expanded) {
                HorizontalDivider(color = borderColor, thickness = 1.dp)
                items.forEachIndexed { index, item ->
                    OrderItemRow(
                        item = item,
                        brand = productBrands[item.productId].orEmpty(),
                        expanded = item.productId in expandedItems,
                        showDivider = index < items.lastIndex,
                        fmt = fmt,
                        stockFmt = stockFmt,
                        titleColor = titleColor,
                        borderColor = borderColor,
                        onToggle = { onToggleItem(item.productId) },
                        onUpdateQty = { qty -> onUpdateQty(item.productId, qty) },
                        onRemove = { onRemoveItem(item.productId) },
                    )
                }
            }
        }
    }
}

@Composable
private fun OrderItemRow(
    item: CartItem,
    brand: String,
    expanded: Boolean,
    showDivider: Boolean,
    fmt: DecimalFormat,
    stockFmt: DecimalFormat,
    titleColor: Color,
    borderColor: Color,
    onToggle: () -> Unit,
    onUpdateQty: (Double) -> Unit,
    onRemove: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onToggle),
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                if (brand.isNotBlank()) {
                    Text(
                        brand.uppercase(),
                        color = SubText,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                    )
                    Spacer(Modifier.height(2.dp))
                }
                Text(
                    "${item.productCode} — ${item.productName}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = titleColor,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                item.category?.takeIf { it.isNotBlank() }?.let { cat ->
                    Spacer(Modifier.height(2.dp))
                    Text(cat, color = SubText, fontSize = 12.sp)
                }
            }
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFFEE2E2))
                    .clickable(onClick = onRemove),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = null,
                    tint = Color(0xFFEF4444),
                    modifier = Modifier.size(18.dp),
                )
            }
            Spacer(Modifier.width(4.dp))
            Icon(
                if (expanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                contentDescription = null,
                tint = SubText,
                modifier = Modifier.size(24.dp),
            )
        }

        if (expanded) {
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    QtyButton(
                        icon = Icons.Default.Remove,
                        enabled = item.quantity > 0,
                        bg = Color.White,
                        iconTint = if (item.quantity > 0) Color(0xFF374151) else SubText,
                        borderColor = CardBorder,
                        onClick = {
                            val step = if (item.unit.equals("kg", ignoreCase = true)) 0.1 else 1.0
                            onUpdateQty((item.quantity - step).coerceAtLeast(0.0))
                        },
                    )
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            formatQty(item.quantity, stockFmt),
                            fontWeight = FontWeight.Bold,
                            fontSize = 22.sp,
                            color = titleColor,
                        )
                        Text(item.unit, color = SubText, fontSize = 12.sp)
                    }
                    QtyButton(
                        icon = Icons.Default.Add,
                        enabled = true,
                        bg = PrimaryBlue,
                        iconTint = Color.White,
                        borderColor = PrimaryBlue,
                        onClick = {
                            val step = if (item.unit.equals("kg", ignoreCase = true)) 0.1 else 1.0
                            onUpdateQty(item.quantity + step)
                        },
                    )
                }
                Spacer(Modifier.weight(1f))
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        fmt.format((item.price * item.quantity).toLong()),
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = PrimaryBlue,
                    )
                    Text(
                        "${fmt.format(item.price.toLong())} × ${formatQty(item.quantity, stockFmt)}",
                        color = SubText,
                        fontSize = 12.sp,
                    )
                }
            }
        }

        if (showDivider) {
            HorizontalDivider(
                modifier = Modifier.padding(top = 12.dp),
                color = borderColor,
                thickness = 1.dp,
            )
        }
    }
}

@Composable
private fun QtyButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    enabled: Boolean,
    bg: Color,
    iconTint: Color,
    borderColor: Color,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        color = bg,
        modifier = Modifier
            .size(44.dp)
            .border(1.dp, borderColor, RoundedCornerShape(12.dp)),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
private fun TotalSummaryBar(
    total: Double,
    fmt: DecimalFormat,
    lang: AppLanguage,
    isDark: Boolean,
) {
    val bg = if (isDark) Color(0xFF1E3A5F) else TotalBarBg
    val border = if (isDark) Color(0xFF2563EB) else TotalBarBorder
    val textColor = if (isDark) Color(0xFF93C5FD) else PrimaryBlue

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = bg,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, border, RoundedCornerShape(14.dp)),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                AppStrings.total(lang),
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = textColor,
            )
            Text(
                "${fmt.format(total.toLong())} ${AppStrings.productSomShort(lang)}",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = textColor,
            )
        }
    }
}

@Composable
private fun SentOrdersContent(
    orders: List<SentOrderUi>,
    isLoading: Boolean,
    fmt: DecimalFormat,
    lang: AppLanguage,
    isDark: Boolean,
    cardBg: Color,
    titleColor: Color,
) {
    when {
        isLoading -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = PrimaryBlue)
            }
        }
        orders.isEmpty() -> {
            Box(
                Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                contentAlignment = Alignment.Center,
            ) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = cardBg,
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(
                            1.dp,
                            if (isDark) Color(0xFF374151) else CardBorder,
                            RoundedCornerShape(16.dp),
                        ),
                ) {
                    Column(
                        Modifier.padding(48.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(
                            Icons.Outlined.CheckCircle,
                            contentDescription = null,
                            tint = SubText,
                            modifier = Modifier.size(56.dp),
                        )
                        Spacer(Modifier.height(16.dp))
                        Text(
                            AppStrings.noSentOrdersToday(lang),
                            color = SubText,
                            fontSize = 14.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        )
                    }
                }
            }
        }
        else -> {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(orders, key = { it.id }) { order ->
                    SentOrderCard(
                        order = order,
                        fmt = fmt,
                        lang = lang,
                        isDark = isDark,
                        cardBg = cardBg,
                        titleColor = titleColor,
                    )
                }
            }
        }
    }
}

@Composable
private fun SentOrderCard(
    order: SentOrderUi,
    fmt: DecimalFormat,
    lang: AppLanguage,
    isDark: Boolean,
    cardBg: Color,
    titleColor: Color,
) {
    val borderColor = if (isDark) Color(0xFF374151) else CardBorder

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = cardBg,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, borderColor, RoundedCornerShape(16.dp)),
    ) {
        Column(Modifier.padding(16.dp)) {
            if (order.clientCode.isNotBlank()) {
                Text(order.clientCode, color = SubText, fontSize = 12.sp)
            }
            Text(
                order.clientName.ifBlank { "—" },
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = titleColor,
            )
            Spacer(Modifier.height(8.dp))
            order.items.forEach { item ->
                Text(
                    "${item.productCode} · ${item.productName} — ${formatQty(item.quantity, DecimalFormat("#,##0.##"))} ${item.unit}",
                    fontSize = 13.sp,
                    color = if (isDark) Color(0xFFD1D5DB) else Color(0xFF374151),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = Color(0xFF22C55E),
                    modifier = Modifier.size(20.dp),
                )
                Text(
                    "${fmt.format(order.total.toLong())} ${AppStrings.productSomShort(lang)}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = PrimaryBlue,
                )
            }
        }
    }
}

private fun formatQty(qty: Double, fmt: DecimalFormat): String =
    if (qty % 1.0 == 0.0) qty.toInt().toString() else fmt.format(qty)
