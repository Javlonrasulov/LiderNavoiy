package uz.lider.client.presentation.dashboard

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DateRangePicker
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDateRangePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.AppStrings
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientScreenBox
import uz.lider.client.presentation.components.ClientTabScaffold
import uz.lider.client.presentation.components.SimpleAreaChart
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.orderDisplayLabel
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.orderStatusColor
import uz.lider.client.presentation.components.orderStatusLabel
import uz.lider.client.presentation.components.rememberClientPalette
import uz.lider.client.presentation.navigation.ClientRoutes
import uz.lider.client.presentation.settings.SettingsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onNavigate: (String) -> Unit,
    viewModel: DashboardViewModel = hiltViewModel(),
    settingsViewModel: SettingsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val lang = LocalAppLanguage.current
    val palette = rememberClientPalette()
    val t = remember(lang) { { key: String -> AppStrings.t(lang, key) } }
    var showDatePicker by remember { mutableStateOf(false) }
    val filtered = state.filtered
    val periodLabel = if (state.dateRange.isCustom) {
        DashboardDateFilter.formatRange(state.dateRange)
    } else {
        "${t("dash_last_month")} • ${DashboardDateFilter.formatRange(state.dateRange)}"
    }

    if (showDatePicker) {
        val pickerState = rememberDateRangePickerState(
            initialSelectedStartDateMillis = DashboardDateFilter.toStartMillis(state.dateRange.start),
            initialSelectedEndDateMillis = DashboardDateFilter.toStartMillis(state.dateRange.end),
        )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        val start = pickerState.selectedStartDateMillis
                        val end = pickerState.selectedEndDateMillis ?: start
                        if (start != null && end != null) {
                            viewModel.setDateRange(start, end)
                        }
                        showDatePicker = false
                    },
                ) {
                    Text(t("dash_apply_dates"))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) {
                    Text(t("com_cancel"))
                }
            },
        ) {
            DateRangePicker(
                state = pickerState,
                title = {
                    Text(
                        t("dash_select_dates"),
                        modifier = Modifier.padding(start = 24.dp, top = 16.dp),
                    )
                },
            )
        }
    }

    ClientTabScaffold(
        titleContent = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(t("nav_home"), fontWeight = FontWeight.Bold, color = palette.text)
                IconButton(
                    onClick = { showDatePicker = true },
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(Icons.Default.CalendarMonth, contentDescription = t("dash_select_dates"), tint = palette.primary)
                }
            }
        },
        bottomPadding = true,
        actions = { DashboardHeaderActions(settingsViewModel) },
    ) { padding ->
        if (state.loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = palette.primary)
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    Text(
                        periodLabel,
                        color = palette.primary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(palette.primary.copy(alpha = 0.1f))
                            .clickable { showDatePicker = true }
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                    )
                }

                item {
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(t("dash_welcome"), color = palette.textMuted, fontSize = 14.sp)
                            Text(
                                state.data?.profile?.fullName ?: state.data?.profile?.name ?: "—",
                                color = palette.text,
                                fontWeight = FontWeight.Bold,
                                fontSize = 22.sp,
                            )
                        }
                        Box(
                            Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(palette.primary.copy(alpha = 0.12f))
                                .clickable { onNavigate(ClientRoutes.NOTIFICATIONS) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Default.Notifications, null, tint = palette.primary)
                            Box(
                                Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(6.dp)
                                    .size(8.dp)
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(palette.accent),
                            )
                        }
                    }
                }

                item {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(24.dp))
                            .background(
                                Brush.linearGradient(
                                    listOf(Color(0xFF7C4DFF), Color(0xFFFF4DFF), Color(0xFF00D4FF)),
                                ),
                            )
                            .padding(20.dp),
                    ) {
                        Column {
                            Text(t("dash_total_purchases"), color = Color.White.copy(alpha = 0.7f), fontSize = 13.sp)
                            Text(
                                "${formatMoney(filtered.totalPurchases)} ${t("com_som")}",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 28.sp,
                            )
                            Spacer(Modifier.height(8.dp))
                            SimpleAreaChart(
                                filtered.chartValues,
                                strokeColor = Color.White,
                                fillColor = Color.White.copy(alpha = 0.35f),
                            )
                        }
                    }
                }

                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatCard(Icons.Default.CreditCard, t("dash_debt"), formatMoney(state.data?.balance ?: 2_500_000.0), t("com_som"), palette.danger, Modifier.weight(1f))
                        StatCard(Icons.Default.CardGiftcard, t("dash_bonus"), "4,850", "ball", palette.success, Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(12.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatCard(Icons.Default.ShoppingBag, t("dash_active_orders"), "${filtered.activeOrderCount}", "ta", palette.secondary, Modifier.weight(1f))
                        StatCard(Icons.Default.Star, t("dash_discount_level"), "VIP", "Gold", palette.warning, Modifier.weight(1f))
                    }
                }

                item {
                    Text(t("dash_quick_actions"), color = palette.textMuted, fontSize = 14.sp)
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        QuickAction(Icons.Default.ShoppingCart, t("dash_order"), palette.primary) { onNavigate(ClientRoutes.CATALOG) }
                        QuickAction(Icons.Default.ShoppingBag, t("nav_orders"), palette.secondary) { onNavigate(ClientRoutes.ORDERS) }
                        QuickAction(Icons.Default.CreditCard, t("dash_payment"), palette.accent) { onNavigate(ClientRoutes.DEBT) }
                        QuickAction(Icons.Default.TrendingUp, t("dash_promotions"), palette.warning) { onNavigate(ClientRoutes.PROMOTIONS) }
                    }
                }

                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text(t("dash_latest_promotions"), color = palette.text, fontWeight = FontWeight.SemiBold)
                        Row(Modifier.clickable { onNavigate(ClientRoutes.PROMOTIONS) }, verticalAlignment = Alignment.CenterVertically) {
                            Text(t("dash_see_all"), color = palette.primary, fontSize = 14.sp)
                            Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = palette.primary, modifier = Modifier.size(16.dp))
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        PromoCard(promoTitle(lang, 0), promoDesc(lang, 0), "🎁", listOf(Color(0xFF7C4DFF), Color(0xFFFF4DFF)))
                        PromoCard(promoTitle(lang, 1), promoDesc(lang, 1), "💰", listOf(Color(0xFF00D4FF), Color(0xFF7C4DFF)))
                    }
                }

                item {
                    Text(t("dash_recent_orders"), color = palette.text, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                }

                val orders = filtered.recentOrders
                items(orders.take(3), key = { it.id }) { order ->
                    RecentOrderRow(order, lang, palette) { onNavigate(ClientRoutes.orderTracking(order.id)) }
                }
            }
        }
    }
}

@Composable
private fun StatCard(icon: ImageVector, label: String, value: String, unit: String, color: Color, modifier: Modifier = Modifier) {
    val palette = rememberClientPalette()
    Column(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(palette.card)
            .padding(14.dp),
    ) {
        Icon(icon, null, tint = color, modifier = Modifier.size(18.dp))
        Spacer(Modifier.height(8.dp))
        Text(label, color = palette.textMuted, fontSize = 11.sp)
        Text(value, color = palette.text, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Text(unit, color = palette.textMuted, fontSize = 11.sp)
    }
}

@Composable
private fun QuickAction(icon: ImageVector, label: String, color: Color, onClick: () -> Unit) {
    val palette = rememberClientPalette()
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable(onClick = onClick)) {
        Box(
            Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(color.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = color)
        }
        Spacer(Modifier.height(4.dp))
        Text(label, color = palette.textMuted, fontSize = 10.sp, maxLines = 1)
    }
}

@Composable
private fun DashboardHeaderActions(settingsViewModel: SettingsViewModel) {
    val darkMode by settingsViewModel.darkMode.collectAsState()
    val language by settingsViewModel.language.collectAsState()
    var showLangMenu by remember { mutableStateOf(false) }
    val palette = rememberClientPalette()

    IconButton(onClick = { settingsViewModel.toggleDarkMode() }) {
        Icon(
            imageVector = if (darkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
            contentDescription = null,
            tint = palette.primary,
        )
    }
    Box {
        IconButton(onClick = { showLangMenu = true }) {
            Icon(Icons.Default.Language, contentDescription = null, tint = palette.primary)
        }
        DropdownMenu(expanded = showLangMenu, onDismissRequest = { showLangMenu = false }) {
            AppLanguage.menuOrder.forEach { option ->
                DropdownMenuItem(
                    text = {
                        Text(
                            option.menuLabel,
                            fontWeight = if (language == option) FontWeight.SemiBold else FontWeight.Normal,
                        )
                    },
                    onClick = {
                        settingsViewModel.setLanguage(option)
                        showLangMenu = false
                    },
                )
            }
        }
    }
}

@Composable
private fun PromoCard(title: String, desc: String, emoji: String, colors: List<Color>) {
    Box(
        Modifier
            .width(240.dp)
            .height(108.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Brush.linearGradient(colors))
            .padding(16.dp),
    ) {
        Text(emoji, modifier = Modifier.align(Alignment.TopEnd), fontSize = 24.sp)
        Column(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(end = 36.dp),
        ) {
            Text(title, color = Color.White, fontWeight = FontWeight.SemiBold, maxLines = 2)
            Spacer(Modifier.height(4.dp))
            Text(
                desc,
                color = Color.White.copy(alpha = 0.75f),
                fontSize = 12.sp,
                lineHeight = 16.sp,
                maxLines = 2,
            )
        }
    }
}

@Composable
private fun RecentOrderRow(order: ClientOrder, lang: AppLanguage, palette: uz.lider.client.presentation.components.ClientPalette, onClick: () -> Unit) {
    val status = orderStatusLabel(lang, order.status)
    val color = orderStatusColor(order.status, palette)
    val product = order.items.firstOrNull()?.productName ?: order.id
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(palette.card)
            .clickable(onClick = onClick)
            .padding(14.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                orderDisplayLabel(lang, order.id),
                color = palette.text,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.width(8.dp))
            Text(status, color = color, fontSize = 12.sp, maxLines = 1)
        }
        Text(product, color = palette.textMuted, fontSize = 13.sp)
        Text("${formatMoney(order.totalAmount)} ${AppStrings.t(lang, "com_som")}", color = palette.text, fontWeight = FontWeight.Bold)
    }
}

private fun promoTitle(lang: AppLanguage, index: Int) = when (index) {
    0 -> when (lang) {
        AppLanguage.RU -> "Летняя скидка"
        AppLanguage.EN -> "Summer Sale"
        else -> "Yozgi chegirma"
    }
    else -> "Cashback 5%"
}

private fun promoDesc(lang: AppLanguage, index: Int) = when (index) {
    0 -> when (lang) {
        AppLanguage.RU -> "Скидка 20% на Coca Cola"
        AppLanguage.EN -> "20% off Coca Cola"
        else -> "Coca Colaga 20% chegirma"
    }
    else -> when (lang) {
        AppLanguage.RU -> "При покупке от 100 000 сум"
        AppLanguage.EN -> "On orders over 100,000"
        else -> "100,000 so'mdan yuqori xaridlarda"
    }
}

