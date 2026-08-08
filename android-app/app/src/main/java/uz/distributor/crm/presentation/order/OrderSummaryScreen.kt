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
    val isEditingClientOrder = !state.editingClientOrderId.isNullOrBlank()

    LaunchedEffect(clientId) { viewModel.init(clientId) }

    val pageBg = sherinPageBackground(isDark)
    val cardBg = if (isDark) SherinColors.CardRowDark else Color.White
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.error) {
        val key = state.error ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(AppStrings.apiError(lang, key))
        viewModel.clearError()
    }

    Box(Modifier.fillMaxSize()) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(pageBg),
    ) {
        OrderSalesHeader(
            isDark = isDark,
            selectedTab = state.tab,
            lang = lang,
            onBack = {
                if (isEditingClientOrder) {
                    // Orqaga: o'zgarishlarni saqlab, klient buyurtmalariga qaytish
                    viewModel.saveEditAndExit(onDone)
                } else {
                    onBack()
                }
            },
            onTabSelect = viewModel::selectTab,
            hideSentTab = isEditingClientOrder,
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
                onEditClient = onEditClient,
                onSubmit = {
                    viewModel.submit {
                        // submit ichida editing flag tozalanadi — oldindan tekshiramiz
                        if (isEditingClientOrder) onDone()
                    }
                },
                submitLabel = if (isEditingClientOrder) {
                    AppStrings.saveClientOrderEdits(lang)
                } else {
                    AppStrings.sendOrder(lang)
                },
                addProductsLabel = if (isEditingClientOrder) {
                    AppStrings.addProductsToClientOrder(lang)
                } else {
                    null
                },
                modifier = Modifier.weight(1f).fillMaxWidth(),
            )
            OrderSummaryTab.SENT -> SentOrdersContent(
                orders = state.sentOrders,
                expandedOrders = state.expandedSentOrders,
                isLoading = state.isLoadingSent,
                fmt = fmt,
                stockFmt = stockFmt,
                lang = lang,
                isDark = isDark,
                cardBg = cardBg,
                titleColor = titleColor,
                onToggleOrder = viewModel::toggleSentOrderExpanded,
                modifier = Modifier.weight(1f).fillMaxWidth(),
            )
        }
    }

    SnackbarHost(
        hostState = snackbarHostState,
        modifier = Modifier
            .align(Alignment.BottomCenter)
            .padding(16.dp),
    )
    } // Box
}

@Composable
private fun OrderSalesHeader(
    isDark: Boolean,
    selectedTab: OrderSummaryTab,
    lang: AppLanguage,
    onBack: () -> Unit,
    onTabSelect: (OrderSummaryTab) -> Unit,
    hideSentTab: Boolean = false,
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
                    if (hideSentTab) AppStrings.editClientOrderTitle(lang) else AppStrings.totalSales(lang),
                    modifier = Modifier.weight(1f),
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
                Spacer(Modifier.width(40.dp))
            }

            Spacer(Modifier.height(8.dp))

            if (!hideSentTab) {
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
            } else {
                Spacer(Modifier.height(12.dp))
            }
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
    onToggleClient: (String) -> Unit,
    onToggleItem: (String) -> Unit,
    onUpdateQty: (String, String, Double) -> Unit,
    onRemoveItem: (String, String, String?) -> Unit,
    onEditClient: (String) -> Unit,
    onSubmit: () -> Unit,
    submitLabel: String = AppStrings.sendOrder(lang),
    addProductsLabel: String? = null,
    modifier: Modifier = Modifier,
) {
    if (state.drafts.isEmpty()) {
        Column(modifier.fillMaxSize()) {
            Box(
                Modifier
                    .weight(1f)
                    .fillMaxWidth()
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
                        if (addProductsLabel != null && state.clientId.isNotBlank()) {
                            Spacer(Modifier.height(16.dp))
                            Button(
                                onClick = { onEditClient(state.clientId) },
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue),
                            ) {
                                Icon(Icons.Default.Add, null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(addProductsLabel)
                            }
                        }
                    }
                }
            }
        }
        return
    }

    Column(modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentPadding = PaddingValues(
                start = 16.dp,
                end = 16.dp,
                top = 16.dp,
                bottom = 16.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(state.drafts, key = { it.clientId }) { draft ->
                ClientOrderCard(
                    clientCode = draft.clientCode,
                    clientName = draft.clientName,
                    items = draft.items,
                    productBrands = draft.productBrands,
                    clientTotal = draft.total,
                    expanded = draft.clientId in state.expandedClients,
                    expandedItems = state.expandedItems,
                    fmt = fmt,
                    stockFmt = stockFmt,
                    lang = lang,
                    isDark = isDark,
                    cardBg = cardBg,
                    titleColor = titleColor,
                    onToggleClient = { onToggleClient(draft.clientId) },
                    onToggleItem = onToggleItem,
                    onUpdateQty = { productId, qty -> onUpdateQty(draft.clientId, productId, qty) },
                    onRemoveItem = { productId, promotionId ->
                        onRemoveItem(draft.clientId, productId, promotionId)
                    },
                    onEditClient = { onEditClient(draft.clientId) },
                )
            }
        }

        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = if (isDark) SherinColors.CardDark else Color.White,
            shadowElevation = 12.dp,
        ) {
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
                if (addProductsLabel != null && state.clientId.isNotBlank()) {
                    OutlinedButton(
                        onClick = { onEditClient(state.clientId) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = PrimaryBlue),
                    ) {
                        Icon(Icons.Default.Add, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(addProductsLabel, fontWeight = FontWeight.SemiBold)
                    }
                }
                Button(
                    onClick = onSubmit,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    enabled = !state.isSubmitting && state.hasDrafts,
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
                            if (addProductsLabel != null) Icons.Default.Check else Icons.AutoMirrored.Filled.Send,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            submitLabel,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
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
    clientTotal: Double,
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
    onRemoveItem: (String, String?) -> Unit,
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
                    Text(
                        clientName.ifBlank { "—" },
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = titleColor,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (clientCode.isNotBlank()) {
                        Spacer(Modifier.height(2.dp))
                        Text(clientCode, color = SubText, fontSize = 11.sp)
                    }
                }
                Text(
                    "${fmt.format(clientTotal.toLong())} ${AppStrings.productSomShort(lang)}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = PrimaryBlue,
                )
                Spacer(Modifier.width(8.dp))
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
                    val itemKey = cartItemKey(item)
                    OrderItemRow(
                        item = item,
                        brand = productBrands[item.productId].orEmpty(),
                        expanded = itemKey in expandedItems,
                        showDivider = index < items.lastIndex,
                        fmt = fmt,
                        stockFmt = stockFmt,
                        lang = lang,
                        titleColor = titleColor,
                        borderColor = borderColor,
                        onToggle = { onToggleItem(itemKey) },
                        onUpdateQty = { qty -> onUpdateQty(item.productId, qty) },
                        onRemove = {
                            onRemoveItem(item.productId, item.promotionId)
                        },
                    )
                }
                TotalSummaryBar(
                    total = clientTotal,
                    fmt = fmt,
                    lang = lang,
                    isDark = isDark,
                    label = AppStrings.total(lang),
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                )
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
    lang: AppLanguage,
    titleColor: Color,
    borderColor: Color,
    onToggle: () -> Unit,
    onUpdateQty: (Double) -> Unit,
    onRemove: () -> Unit,
) {
    val isPromo = !item.promotionId.isNullOrBlank()
    val isFree = item.isFree || (isPromo && item.price == 0.0)
    val lineTotal = item.price * item.quantity
    val promoBg = if (isPromo) {
        if (borderColor == Color(0xFF374151)) Color(0xFF2E1065).copy(alpha = 0.35f) else Color(0xFFF5F3FF)
    } else {
        Color.Transparent
    }
    val accent = if (isPromo) Color(0xFF7C3AED) else PrimaryBlue
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(promoBg)
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onToggle),
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    if (brand.isNotBlank()) {
                        Text(
                            brand.uppercase(),
                            color = SubText,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                    if (isPromo) {
                        OrderPromoBadge(
                            label = if (isFree) {
                                AppStrings.orderPromoFreeBadge(lang)
                            } else {
                                AppStrings.orderPromoBadge(lang)
                            },
                        )
                    }
                }
                if (brand.isNotBlank() || isPromo) {
                    Spacer(Modifier.height(2.dp))
                }
                Text(
                    "${item.productCode} - ${item.productName}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = titleColor,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    when {
                        isFree -> "${formatQty(item.quantity, stockFmt)} ${item.unit} · ${AppStrings.orderPromoFreePrice(lang)}"
                        else -> "${formatQty(item.quantity, stockFmt)} ${item.unit} x ${fmt.format(item.price.toLong())}"
                    },
                    color = if (isPromo) accent else SubText,
                    fontSize = 12.sp,
                    fontWeight = if (isPromo) FontWeight.Medium else FontWeight.Normal,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    if (isFree) {
                        AppStrings.orderPromoFreePrice(lang)
                    } else {
                        "${fmt.format(lineTotal.toLong())} ${AppStrings.productSomShort(lang)}"
                    },
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = accent,
                )
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

        if (expanded && !isPromo) {
            Spacer(Modifier.height(12.dp))
            val step = qtyStepForUnit(item.unit)
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
                        enabled = item.quantity > step,
                        bg = Color.White,
                        iconTint = if (item.quantity > step) Color(0xFF374151) else SubText,
                        borderColor = CardBorder,
                        onClick = {
                            onUpdateQty((item.quantity - step).coerceAtLeast(step))
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
                            onUpdateQty(item.quantity + step)
                        },
                    )
                }
                Spacer(Modifier.weight(1f))
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        fmt.format(lineTotal.toLong()),
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
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .border(1.dp, borderColor, RoundedCornerShape(12.dp))
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(22.dp))
    }
}

private fun cartItemKey(item: CartItem): String =
    "${item.productId}|${item.promotionId.orEmpty()}"

@Composable
private fun OrderPromoBadge(label: String) {
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = Color(0xFF7C3AED),
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            color = Color.White,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

private fun qtyStepForUnit(unit: String): Double =
    if (unit.equals("kg", ignoreCase = true) || unit.equals("кг", ignoreCase = true)) 0.1 else 1.0

@Composable
private fun TotalSummaryBar(
    total: Double,
    fmt: DecimalFormat,
    lang: AppLanguage,
    isDark: Boolean,
    label: String = AppStrings.total(lang),
    modifier: Modifier = Modifier,
) {
    val bg = if (isDark) Color(0xFF1E3A5F) else TotalBarBg
    val border = if (isDark) Color(0xFF2563EB) else TotalBarBorder
    val textColor = if (isDark) Color(0xFF93C5FD) else PrimaryBlue

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = bg,
        modifier = modifier
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
                label,
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
    expandedOrders: Set<String>,
    isLoading: Boolean,
    fmt: DecimalFormat,
    stockFmt: DecimalFormat,
    lang: AppLanguage,
    isDark: Boolean,
    cardBg: Color,
    titleColor: Color,
    onToggleOrder: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val borderColor = if (isDark) Color(0xFF374151) else CardBorder
    val pageBg = if (isDark) SherinColors.PageBgDark else Color(0xFFF3F4F6)

    when {
        isLoading -> {
            Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = PrimaryBlue)
            }
        }
        orders.isEmpty() -> {
            Box(
                modifier
                    .fillMaxSize()
                    .background(pageBg)
                    .padding(16.dp),
                contentAlignment = Alignment.Center,
            ) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = cardBg,
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.72f)
                        .border(1.dp, borderColor, RoundedCornerShape(20.dp)),
                ) {
                    Column(
                        Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .clip(CircleShape)
                                .background(if (isDark) Color(0xFF1F2937) else Color(0xFFF3F4F6)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Outlined.CheckCircle,
                                contentDescription = null,
                                tint = if (isDark) Color(0xFF6B7280) else Color(0xFFD1D5DB),
                                modifier = Modifier.size(48.dp),
                            )
                        }
                        Spacer(Modifier.height(20.dp))
                        Text(
                            AppStrings.noSentOrdersToday(lang),
                            color = SubText,
                            fontSize = 15.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(horizontal = 32.dp),
                        )
                    }
                }
            }
        }
        else -> {
            val todayTotal = orders.sumOf { it.total }
            Column(modifier.fillMaxSize()) {
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        end = 16.dp,
                        top = 16.dp,
                        bottom = 16.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        Text(
                            AppStrings.sentOrdersTodayCount(lang, orders.size),
                            color = SubText,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(bottom = 4.dp),
                        )
                    }
                    items(orders, key = { it.id }) { order ->
                        SentOrderCard(
                            order = order,
                            expanded = order.id in expandedOrders,
                            fmt = fmt,
                            stockFmt = stockFmt,
                            lang = lang,
                            isDark = isDark,
                            cardBg = cardBg,
                            titleColor = titleColor,
                            onToggle = { onToggleOrder(order.id) },
                        )
                    }
                }

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = if (isDark) SherinColors.CardDark else Color.White,
                    shadowElevation = 12.dp,
                ) {
                    TotalSummaryBar(
                        total = todayTotal,
                        fmt = fmt,
                        lang = lang,
                        isDark = isDark,
                        label = AppStrings.sentOrdersTodayTotal(lang),
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun SentOrderCard(
    order: SentOrderUi,
    expanded: Boolean,
    fmt: DecimalFormat,
    stockFmt: DecimalFormat,
    lang: AppLanguage,
    isDark: Boolean,
    cardBg: Color,
    titleColor: Color,
    onToggle: () -> Unit,
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
                    .clickable(onClick = onToggle)
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        order.clientName.ifBlank { "—" },
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = titleColor,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        buildString {
                            if (order.clientCode.isNotBlank()) append(order.clientCode)
                            if (order.timeLabel.isNotBlank()) {
                                if (isNotEmpty()) append(" · ")
                                append(order.timeLabel)
                            }
                        },
                        color = SubText,
                        fontSize = 11.sp,
                        maxLines = 1,
                        softWrap = false,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        "${fmt.format(order.total.toLong())} ${AppStrings.productSomShort(lang)}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = PrimaryBlue,
                        maxLines = 1,
                        softWrap = false,
                    )
                    Spacer(Modifier.height(6.dp))
                    SentStatusBadge(lang = lang)
                }
                Spacer(Modifier.width(8.dp))
                Icon(
                    if (expanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                    contentDescription = null,
                    tint = SubText,
                    modifier = Modifier.size(24.dp),
                )
            }

            if (expanded) {
                HorizontalDivider(color = borderColor, thickness = 1.dp)
                order.items.forEachIndexed { index, item ->
                    SentOrderItemRow(
                        item = item,
                        brand = order.productBrands[item.productId].orEmpty(),
                        fmt = fmt,
                        stockFmt = stockFmt,
                        lang = lang,
                        titleColor = titleColor,
                        showDivider = index < order.items.lastIndex,
                        borderColor = borderColor,
                    )
                }
                TotalSummaryBar(
                    total = order.total,
                    fmt = fmt,
                    lang = lang,
                    isDark = isDark,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                )
            }
        }
    }
}

@Composable
private fun SentStatusBadge(lang: AppLanguage) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color(0xFFECFDF5),
    ) {
        Row(
            Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(
                Icons.Default.CheckCircle,
                contentDescription = null,
                tint = Color(0xFF22C55E),
                modifier = Modifier.size(14.dp),
            )
            Text(
                AppStrings.orderSentBadge(lang),
                color = Color(0xFF16A34A),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun SentOrderItemRow(
    item: CartItem,
    brand: String,
    fmt: DecimalFormat,
    stockFmt: DecimalFormat,
    lang: AppLanguage,
    titleColor: Color,
    showDivider: Boolean,
    borderColor: Color,
) {
    val isPromo = !item.promotionId.isNullOrBlank()
    val isFree = item.isFree || (isPromo && item.price == 0.0)
    val accent = if (isPromo) Color(0xFF7C3AED) else PrimaryBlue
    val promoBg = if (isPromo) {
        if (borderColor == Color(0xFF374151)) Color(0xFF2E1065).copy(alpha = 0.35f) else Color(0xFFF5F3FF)
    } else {
        Color.Transparent
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(promoBg)
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    if (brand.isNotBlank()) {
                        Text(
                            brand.uppercase(),
                            color = SubText,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                    if (isPromo) {
                        OrderPromoBadge(
                            label = if (isFree) {
                                AppStrings.orderPromoFreeBadge(lang)
                            } else {
                                AppStrings.orderPromoBadge(lang)
                            },
                        )
                    }
                }
                if (brand.isNotBlank() || isPromo) {
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
            }
            Spacer(Modifier.width(12.dp))
            Column(horizontalAlignment = Alignment.End) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (isPromo) Color(0xFFEDE9FE) else Color(0xFFF0F7FF),
                ) {
                    Text(
                        "${formatQty(item.quantity, stockFmt)} ${item.unit}",
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        color = accent,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    if (isFree) {
                        AppStrings.orderPromoFreePrice(lang)
                    } else {
                        fmt.format((item.price * item.quantity).toLong())
                    },
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = accent,
                )
                if (!isFree) {
                    Text(
                        "${fmt.format(item.price.toLong())} × ${formatQty(item.quantity, stockFmt)}",
                        color = SubText,
                        fontSize = 11.sp,
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

private fun formatQty(qty: Double, fmt: DecimalFormat): String =
    if (qty % 1.0 == 0.0) qty.toInt().toString() else fmt.format(qty)
