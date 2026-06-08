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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.NightlightRound
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.SettingsBrightness
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
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
import uz.lider.client.data.repository.ThemeMode
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.AppStrings
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientPalette
import uz.lider.client.presentation.components.ClientTabScaffold
import uz.lider.client.presentation.components.SimpleAreaChart
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.orderDisplayLabel
import uz.lider.client.presentation.components.orderStatusColor
import uz.lider.client.presentation.components.orderStatusLabel
import uz.lider.client.presentation.components.rememberClientPalette
import uz.lider.client.presentation.navigation.ClientRoutes
import uz.lider.client.presentation.notifications.MockNotificationIds
import uz.lider.client.presentation.notifications.NotificationsViewModel
import uz.lider.client.presentation.settings.SettingsViewModel
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidGlassDropdownItem
import uz.lider.client.presentation.theme.LiquidGlassDropdownMenu
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassThemed

@Composable
fun DashboardScreen(
    onNavigate: (String) -> Unit,
    viewModel: DashboardViewModel = hiltViewModel(),
    settingsViewModel: SettingsViewModel = hiltViewModel(),
    notificationsViewModel: NotificationsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val readNotificationIds by notificationsViewModel.readIds.collectAsState()
    val hasUnreadNotifications = MockNotificationIds.all.any { it !in readNotificationIds }
    val lang = LocalAppLanguage.current
    val palette = rememberClientPalette()
    val t = remember(lang) { { key: String -> AppStrings.t(lang, key) } }
    var showDatePicker by remember { mutableStateOf(false) }
    val filtered = state.filtered
    val periodLabel = DashboardDateFilter.formatRange(state.dateRange)

    DashboardDateRangeDialog(
        visible = showDatePicker,
        onDismiss = { showDatePicker = false },
        onApply = { start, end -> viewModel.setDateRange(start, end) },
        onClear = { viewModel.resetToLastMonth() },
        initialStartMillis = state.dateRange.takeIf { it.isCustom }
            ?.let { DashboardDateFilter.toStartMillis(it.start) },
        initialEndMillis = state.dateRange.takeIf { it.isCustom }
            ?.let { DashboardDateFilter.toStartMillis(it.end) },
        title = t("dash_select_dates"),
        applyLabel = t("dash_apply_dates"),
        cancelLabel = t("com_cancel"),
    )

    ClientTabScaffold(
        title = t("nav_home"),
        actions = {
            DashboardHeaderActions(
                settingsViewModel = settingsViewModel,
                onCalendarClick = { showDatePicker = true },
                calendarLabel = t("dash_select_dates"),
            )
        },
    ) { padding ->
        LiquidBackground(modifier = Modifier.fillMaxSize()) {
            if (state.loading) {
                Box(
                    Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = LiquidGlass.Indigo)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    if (state.dateRange.isCustom) {
                        item {
                            Box(
                                Modifier
                                    .clip(RoundedCornerShape(LiquidGlass.RadiusChip))
                                    .background(LiquidGlass.GradientPrimary)
                                    .clickable { showDatePicker = true }
                                    .padding(horizontal = 16.dp, vertical = 8.dp),
                            ) {
                                Text(
                                    periodLabel,
                                    color = LiquidGlass.TextWhite,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }

                    item {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(
                                    t("dash_welcome"),
                                    color = LiquidTheme.textMuted,
                                    fontSize = 14.sp,
                                )
                                Text(
                                    state.clientName,
                                    color = LiquidTheme.text,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 22.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            Box(
                                Modifier
                                    .size(44.dp)
                                    .liquidGlassThemed(radius = LiquidGlass.RadiusChip)
                                    .clickable { onNavigate(ClientRoutes.NOTIFICATIONS) },
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    Icons.Default.Notifications,
                                    null,
                                    tint = LiquidGlass.Indigo,
                                    modifier = Modifier.size(20.dp),
                                )
                                if (hasUnreadNotifications) {
                                    Box(
                                        Modifier
                                            .align(Alignment.TopEnd)
                                            .padding(8.dp)
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(LiquidGlass.Rose),
                                    )
                                }
                            }
                        }
                    }

                    item {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(LiquidGlass.RadiusCard))
                                .background(LiquidGlass.GradientPrimary)
                                .padding(20.dp),
                        ) {
                            Column {
                                Text(
                                    t("dash_total_purchases"),
                                    color = Color.White.copy(alpha = 0.70f),
                                    fontSize = 13.sp,
                                )
                                Text(
                                    "${formatMoney(filtered.totalPurchases)} ${t("com_som")}",
                                    color = LiquidGlass.TextWhite,
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
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            StatCard(
                                icon = Icons.Default.CreditCard,
                                label = t("dash_debt"),
                                value = formatMoney(state.data?.balance ?: 2_500_000.0),
                                unit = t("com_som"),
                                iconColor = LiquidGlass.Rose,
                                modifier = Modifier.weight(1f),
                            )
                            StatCard(
                                icon = Icons.Default.CardGiftcard,
                                label = t("dash_bonus"),
                                value = "4,850",
                                unit = "ball",
                                iconColor = LiquidGlass.Emerald,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        Spacer(Modifier.height(12.dp))
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            StatCard(
                                icon = Icons.Default.ShoppingBag,
                                label = t("dash_active_orders"),
                                value = "${filtered.activeOrderCount}",
                                unit = "ta",
                                iconColor = LiquidGlass.Cyan,
                                modifier = Modifier.weight(1f),
                            )
                            StatCard(
                                icon = Icons.Default.Star,
                                label = t("dash_discount_level"),
                                value = state.data?.profile?.category?.trim().takeIf { !it.isNullOrBlank() } ?: "—",
                                unit = "",
                                iconColor = LiquidGlass.Amber,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }

                    item {
                        Text(
                            t("dash_quick_actions"),
                            color = LiquidTheme.textMuted,
                            fontSize = 14.sp,
                        )
                        Spacer(Modifier.height(8.dp))
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            QuickAction(Icons.Default.ShoppingCart, t("dash_order"), LiquidGlass.Indigo) {
                                onNavigate(ClientRoutes.CATALOG)
                            }
                            QuickAction(Icons.Default.ShoppingBag, t("nav_orders"), LiquidGlass.Violet) {
                                onNavigate(ClientRoutes.ORDERS)
                            }
                            QuickAction(Icons.Default.CreditCard, t("dash_payment"), LiquidGlass.Cyan) {
                                onNavigate(ClientRoutes.DEBT)
                            }
                            QuickAction(Icons.Default.TrendingUp, t("dash_promotions"), LiquidGlass.Amber) {
                                onNavigate(ClientRoutes.PROMOTIONS)
                            }
                        }
                    }

                    item {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                t("dash_latest_promotions"),
                                color = LiquidTheme.text,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Row(
                                Modifier.clickable { onNavigate(ClientRoutes.PROMOTIONS) },
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(t("dash_see_all"), color = LiquidGlass.Indigo, fontSize = 14.sp)
                                Icon(
                                    Icons.AutoMirrored.Filled.ArrowForward,
                                    null,
                                    tint = LiquidGlass.Indigo,
                                    modifier = Modifier.size(16.dp),
                                )
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(
                            Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            PromoCard(
                                title = promoTitle(lang, 0),
                                desc = promoDesc(lang, 0),
                                emoji = "🎁",
                                colors = listOf(LiquidGlass.Indigo, LiquidGlass.Pink),
                            )
                            PromoCard(
                                title = promoTitle(lang, 1),
                                desc = promoDesc(lang, 1),
                                emoji = "💰",
                                colors = listOf(LiquidGlass.Cyan, LiquidGlass.Violet),
                            )
                        }
                    }

                    item {
                        Text(
                            t("dash_recent_orders"),
                            color = LiquidTheme.text,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Spacer(Modifier.height(8.dp))
                    }

                    val orders = filtered.recentOrders
                    items(orders.take(3), key = { it.id }) { order ->
                        RecentOrderRow(order, lang, palette) {
                            onNavigate(ClientRoutes.orderTracking(order.id))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatCard(
    icon: ImageVector,
    label: String,
    value: String,
    unit: String,
    iconColor: Color,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .liquidGlassThemed()
            .padding(14.dp),
    ) {
        Box(
            Modifier
                .size(34.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(iconColor.copy(alpha = 0.20f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = iconColor, modifier = Modifier.size(17.dp))
        }
        Spacer(Modifier.height(8.dp))
        Text(label, color = LiquidTheme.textMuted, fontSize = 11.sp)
        Text(value, color = LiquidTheme.text, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Text(unit, color = LiquidTheme.textMuted, fontSize = 11.sp)
    }
}

@Composable
private fun QuickAction(
    icon: ImageVector,
    label: String,
    color: Color,
    onClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        Box(
            Modifier
                .size(52.dp)
                .liquidGlassThemed(radius = LiquidGlass.RadiusChip),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = color, modifier = Modifier.size(22.dp))
        }
        Spacer(Modifier.height(4.dp))
        Text(label, color = LiquidTheme.textMuted, fontSize = 10.sp, maxLines = 1)
    }
}

@Composable
private fun DashboardHeaderActions(
    settingsViewModel: SettingsViewModel,
    onCalendarClick: () -> Unit,
    calendarLabel: String,
) {
    val themeMode by settingsViewModel.themeMode.collectAsState()
    val language by settingsViewModel.language.collectAsState()
    var showThemeMenu by remember { mutableStateOf(false) }
    var showLangMenu by remember { mutableStateOf(false) }
    val themeIcon = when (themeMode) {
        ThemeMode.LIGHT -> Icons.Default.WbSunny
        ThemeMode.SYSTEM -> Icons.Default.SettingsBrightness
        ThemeMode.DARK -> Icons.Default.NightlightRound
    }
    val themeOptions = listOf(
        ThemeMode.DARK to "com_theme_dark",
        ThemeMode.LIGHT to "com_theme_light",
        ThemeMode.SYSTEM to "com_theme_system",
    )

    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        GlassHeaderIconButton(
            onClick = onCalendarClick,
            contentDescription = calendarLabel,
            icon = Icons.Outlined.CalendarMonth,
            tint = LiquidTheme.textMuted,
        )
        Box {
            GlassHeaderIconButton(
                onClick = { showThemeMenu = true },
                icon = themeIcon,
                tint = LiquidGlass.Indigo,
            )
            LiquidGlassDropdownMenu(
                expanded = showThemeMenu,
                onDismissRequest = { showThemeMenu = false },
            ) {
                themeOptions.forEach { (mode, labelKey) ->
                    LiquidGlassDropdownItem(
                        text = AppStrings.t(language, labelKey),
                        selected = themeMode == mode,
                        onClick = {
                            settingsViewModel.setThemeMode(mode)
                            showThemeMenu = false
                        },
                    )
                }
            }
        }
        Box {
            GlassHeaderIconButton(
                onClick = { showLangMenu = true },
                icon = Icons.Default.Language,
                tint = LiquidGlass.Indigo,
            )
            LiquidGlassDropdownMenu(
                expanded = showLangMenu,
                onDismissRequest = { showLangMenu = false },
            ) {
                AppLanguage.menuOrder.forEach { option ->
                    LiquidGlassDropdownItem(
                        text = option.menuLabel,
                        selected = language == option,
                        onClick = {
                            settingsViewModel.setLanguage(option)
                            showLangMenu = false
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun GlassHeaderIconButton(
    onClick: () -> Unit,
    icon: ImageVector,
    tint: Color,
    contentDescription: String? = null,
) {
    Box(
        modifier = Modifier
            .size(36.dp)
            .liquidGlassThemed(radius = LiquidGlass.RadiusChip),
        contentAlignment = Alignment.Center,
    ) {
        IconButton(onClick = onClick, modifier = Modifier.size(36.dp)) {
            Icon(
                icon,
                contentDescription = contentDescription,
                tint = tint,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun PromoCard(title: String, desc: String, emoji: String, colors: List<Color>) {
    Box(
        Modifier
            .width(240.dp)
            .height(108.dp)
            .clip(RoundedCornerShape(LiquidGlass.RadiusCard))
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
private fun RecentOrderRow(
    order: ClientOrder,
    lang: AppLanguage,
    palette: ClientPalette,
    onClick: () -> Unit,
) {
    val status = orderStatusLabel(lang, order.status)
    val color = orderStatusColor(order.status, palette)
    val product = order.items.firstOrNull()?.productName ?: order.id

    Column(
        Modifier
            .fillMaxWidth()
            .liquidGlassThemed()
            .clickable(onClick = onClick)
            .padding(14.dp),
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
                        .size(8.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(color),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    orderDisplayLabel(lang, order.id),
                    color = LiquidTheme.text,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(Modifier.width(8.dp))
            Text(status, color = color, fontSize = 12.sp, maxLines = 1)
        }
        Text(product, color = LiquidTheme.textMuted, fontSize = 13.sp)
        Text(
            "${formatMoney(order.totalAmount)} ${AppStrings.t(lang, "com_som")}",
            color = LiquidTheme.text,
            fontWeight = FontWeight.Bold,
        )
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
