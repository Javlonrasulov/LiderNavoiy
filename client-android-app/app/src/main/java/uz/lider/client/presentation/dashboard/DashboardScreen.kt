package uz.lider.client.presentation.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.NightlightRound
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.SettingsBrightness
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.data.repository.ThemeMode
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.AppStrings
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientPalette
import uz.lider.client.presentation.components.SimpleAreaChart
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.orderDisplayLabel
import uz.lider.client.presentation.components.orderStatusColor
import uz.lider.client.presentation.components.orderStatusLabel
import uz.lider.client.presentation.components.rememberClientPalette
import uz.lider.client.presentation.navigation.ClientBottomNavHeight
import uz.lider.client.presentation.navigation.ClientRoutes
import uz.lider.client.presentation.notifications.MockNotificationIds
import uz.lider.client.presentation.notifications.NotificationsViewModel
import uz.lider.client.presentation.settings.SettingsViewModel
import uz.lider.client.presentation.theme.FixedHeroBackdrop
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidGlassDropdownItem
import uz.lider.client.presentation.theme.LiquidGlassDropdownMenu
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.PremiumHeaderActionPill
import uz.lider.client.presentation.theme.PremiumHeaderButton
import uz.lider.client.presentation.theme.PremiumHeaderPillIcon
import uz.lider.client.presentation.theme.liquidGlassThemed
import uz.lider.client.presentation.tracking.OrderTrackingMapView

/** Scroll distance (px) before hero fully fades to page background. */
private const val HeroFadeScrollPx = 900f

@Composable
fun DashboardScreen(
    onNavigate: (String) -> Unit,
    onOpenDrawer: () -> Unit = {},
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
    var showLiveMapFullscreen by remember { mutableStateOf(false) }
    val filtered = state.filtered
    val live = state.liveDelivery
    val periodLabel = DashboardDateFilter.formatRange(state.dateRange)
    val listState = rememberLazyListState()
    val density = LocalDensity.current
    val isDark = LiquidTheme.isDark
    val fadeProgress by remember {
        derivedStateOf {
            val index = listState.firstVisibleItemIndex
            val offset = listState.firstVisibleItemScrollOffset
            // Approximate scrolled distance: first items are in the hero zone
            val approx = when {
                index == 0 -> offset.toFloat()
                else -> offset + index * with(density) { 180.dp.toPx() }
            }
            (approx / HeroFadeScrollPx).coerceIn(0f, 1f)
        }
    }

    if (showLiveMapFullscreen && live != null) {
        DashboardLiveMapFullscreen(
            live = live,
            isDark = isDark,
            title = t("dash_live_delivery"),
            onDismiss = { showLiveMapFullscreen = false },
            onOpenTracking = {
                showLiveMapFullscreen = false
                onNavigate(ClientRoutes.orderTracking(live.orderId))
            },
        )
    }

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

    LiquidBackground(modifier = Modifier.fillMaxSize()) {
        if (state.loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LiquidGlass.Indigo)
            }
        } else {
            Box(Modifier.fillMaxSize()) {
                // Fixed hero — stays while content scrolls; fades only after deep scroll
                FixedHeroBackdrop(
                    fadeProgress = fadeProgress,
                    height = 560.dp,
                    modifier = Modifier.align(Alignment.TopCenter),
                )

                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = ClientBottomNavHeight + 16.dp),
                    verticalArrangement = Arrangement.spacedBy(0.dp),
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
                                    DashboardHeaderPillActions(
                                        settingsViewModel = settingsViewModel,
                                        onCalendarClick = { showDatePicker = true },
                                        calendarLabel = t("dash_select_dates"),
                                    )
                                    Box {
                                        PremiumHeaderPillIcon(
                                            icon = Icons.Default.Notifications,
                                            onClick = { onNavigate(ClientRoutes.NOTIFICATIONS) },
                                        )
                                        if (hasUnreadNotifications) {
                                            Box(
                                                Modifier
                                                    .align(Alignment.TopEnd)
                                                    .padding(6.dp)
                                                    .size(8.dp)
                                                    .clip(CircleShape)
                                                    .background(LiquidGlass.Rose),
                                            )
                                        }
                                    }
                                }
                            }
                            Spacer(Modifier.height(28.dp))
                            Text(
                                t("dash_welcome"),
                                color = Color.White.copy(alpha = 0.90f),
                                fontSize = 15.sp,
                                lineHeight = 22.sp,
                            )
                            Text(
                                state.clientName,
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 28.sp,
                                lineHeight = 34.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                            live?.let { delivery ->
                                Spacer(Modifier.height(16.dp))
                                LiveDeliveryMapCard(
                                    live = delivery,
                                    isDark = isDark,
                                    title = t("dash_live_delivery"),
                                    watchLabel = t("dash_live_watch"),
                                    distanceLabel = "${t("track_distance")}: ${delivery.distanceLabel}",
                                    etaLabel = "${t("dash_live_eta")}: ${delivery.etaLabel}",
                                    onOpenFullscreen = { showLiveMapFullscreen = true },
                                    onOpenTracking = {
                                        onNavigate(ClientRoutes.orderTracking(delivery.orderId))
                                    },
                                )
                            }
                            Spacer(Modifier.height(20.dp))
                        }
                    }

                    if (state.dateRange.isCustom) {
                        item {
                            Box(
                                Modifier
                                    .padding(horizontal = 16.dp)
                                    .padding(bottom = 12.dp)
                                    .clip(RoundedCornerShape(LiquidGlass.RadiusChip))
                                    .background(LiquidGlass.GradientPrimary)
                                    .clickable { showDatePicker = true }
                                    .padding(horizontal = 16.dp, vertical = 8.dp),
                            ) {
                                Text(
                                    periodLabel,
                                    color = Color.White,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }

                    // Premium service slider over hero
                    item {
                        Text(
                            t("dash_quick_actions"),
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp,
                            modifier = Modifier.padding(horizontal = 16.dp),
                        )
                        Spacer(Modifier.height(12.dp))
                        Row(
                            Modifier
                                .horizontalScroll(rememberScrollState())
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            PremiumServiceCard(
                                icon = Icons.Default.ShoppingCart,
                                label = t("dash_order"),
                                accent = LiquidGlass.Indigo,
                            ) { onNavigate(ClientRoutes.CATALOG) }
                            PremiumServiceCard(
                                icon = Icons.Default.ShoppingBag,
                                label = t("nav_orders"),
                                accent = LiquidGlass.Violet,
                            ) { onNavigate(ClientRoutes.ORDERS) }
                            PremiumServiceCard(
                                icon = Icons.Default.CreditCard,
                                label = t("dash_payment"),
                                accent = LiquidGlass.Cyan,
                            ) { onNavigate(ClientRoutes.DEBT) }
                            PremiumServiceCard(
                                icon = Icons.Default.TrendingUp,
                                label = t("dash_promotions"),
                                accent = LiquidGlass.Amber,
                            ) { onNavigate(ClientRoutes.PROMOTIONS) }
                        }
                        Spacer(Modifier.height(16.dp))
                    }

                    // Total purchases — still over hero zone
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
                            Column {
                                Text(
                                    t("dash_total_purchases"),
                                    color = Color.White.copy(alpha = 0.75f),
                                    fontSize = 13.sp,
                                )
                                Text(
                                    "${formatMoney(filtered.totalPurchases)} ${t("com_som")}",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 28.sp,
                                    lineHeight = 34.sp,
                                )
                                Spacer(Modifier.height(8.dp))
                                SimpleAreaChart(
                                    filtered.chartValues,
                                    strokeColor = Color.White,
                                    fillColor = Color.White.copy(alpha = 0.35f),
                                )
                            }
                        }
                        Spacer(Modifier.height(20.dp))
                    }

                    // Below: content on page bg (hero already fading)
                    item {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            StatCard(
                                Icons.Default.CreditCard,
                                t("dash_debt"),
                                formatMoney(state.data?.balance ?: 0.0),
                                t("com_som"),
                                LiquidGlass.Rose,
                                Modifier.weight(1f),
                            )
                            StatCard(
                                Icons.Default.CardGiftcard,
                                t("dash_bonus"),
                                "4,850",
                                "ball",
                                LiquidGlass.Emerald,
                                Modifier.weight(1f),
                            )
                        }
                        Spacer(Modifier.height(12.dp))
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            StatCard(
                                Icons.Default.ShoppingBag,
                                t("dash_active_orders"),
                                "${filtered.activeOrderCount}",
                                "ta",
                                LiquidGlass.Cyan,
                                Modifier.weight(1f),
                            )
                            StatCard(
                                Icons.Default.Star,
                                t("dash_discount_level"),
                                "VIP",
                                "Gold",
                                LiquidGlass.Amber,
                                Modifier.weight(1f),
                            )
                        }
                        Spacer(Modifier.height(20.dp))
                    }

                    item {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                t("dash_latest_promotions"),
                                color = LiquidTheme.text,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 16.sp,
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
                        Spacer(Modifier.height(12.dp))
                        Row(
                            Modifier
                                .horizontalScroll(rememberScrollState())
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            PromoCard(
                                promoTitle(lang, 0),
                                promoDesc(lang, 0),
                                "🎁",
                                listOf(LiquidGlass.Indigo, LiquidGlass.Violet),
                            )
                            PromoCard(
                                promoTitle(lang, 1),
                                promoDesc(lang, 1),
                                "💰",
                                listOf(LiquidGlass.Cyan, LiquidGlass.Indigo),
                            )
                        }
                        Spacer(Modifier.height(20.dp))
                    }

                    item {
                        Text(
                            t("dash_recent_orders"),
                            color = LiquidTheme.text,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp,
                            modifier = Modifier.padding(horizontal = 16.dp),
                        )
                        Spacer(Modifier.height(12.dp))
                    }

                    val orders = filtered.recentOrders
                    if (orders.isEmpty()) {
                        item {
                            Box(
                                Modifier
                                    .padding(horizontal = 16.dp)
                                    .fillMaxWidth()
                                    .liquidGlassThemed()
                                    .padding(24.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    t("ord_empty"),
                                    color = LiquidTheme.textMuted,
                                    fontSize = 14.sp,
                                    textAlign = TextAlign.Center,
                                )
                            }
                        }
                    } else {
                        items(orders.take(3), key = { it.id }) { order ->
                            Box(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                                RecentOrderRow(order, lang, palette) {
                                    onNavigate(ClientRoutes.orderTracking(order.id))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PremiumServiceCard(
    icon: ImageVector,
    label: String,
    accent: Color,
    onClick: () -> Unit,
) {
    val isDark = LiquidTheme.isDark
    val shape = RoundedCornerShape(26.dp)
    val glassFill = if (isDark) Color.White.copy(alpha = 0.12f) else Color.White.copy(alpha = 0.78f)
    val labelFill = if (isDark) Color.Black.copy(alpha = 0.28f) else Color.White.copy(alpha = 0.55f)

    Box(
        modifier = Modifier
            .width(126.dp)
            .height(158.dp)
            .shadow(
                elevation = 12.dp,
                shape = shape,
                ambientColor = accent.copy(alpha = 0.18f),
                spotColor = accent.copy(alpha = 0.22f),
            )
            .clip(shape)
            .background(glassFill)
            .border(
                width = 1.dp,
                brush = Brush.linearGradient(
                    listOf(
                        Color.White.copy(alpha = if (isDark) 0.40f else 0.95f),
                        accent.copy(alpha = 0.28f),
                        Color.White.copy(alpha = if (isDark) 0.12f else 0.45f),
                    ),
                ),
                shape = shape,
            )
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick,
            ),
    ) {
        // Soft accent wash (not a solid color block)
        Box(
            Modifier
                .fillMaxWidth()
                .height(108.dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            accent.copy(alpha = if (isDark) 0.38f else 0.28f),
                            accent.copy(alpha = 0.08f),
                            Color.Transparent,
                        ),
                        radius = 160f,
                    ),
                ),
        )

        Column(
            Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                // Soft glow behind icon
                Box(
                    Modifier
                        .size(72.dp)
                        .background(
                            Brush.radialGradient(
                                listOf(
                                    accent.copy(alpha = 0.35f),
                                    Color.Transparent,
                                ),
                            ),
                            CircleShape,
                        ),
                )
                Box(
                    Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(
                            Brush.linearGradient(
                                listOf(
                                    accent.copy(alpha = 0.92f),
                                    accent.copy(alpha = 0.70f),
                                ),
                            ),
                        )
                        .border(
                            1.dp,
                            Color.White.copy(alpha = 0.35f),
                            RoundedCornerShape(18.dp),
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, null, tint = Color.White, modifier = Modifier.size(28.dp))
                }
            }

            // Frosted label strip — translucent, not solid white slab
            Box(
                Modifier
                    .fillMaxWidth()
                    .background(labelFill)
                    .border(
                        width = 0.5.dp,
                        color = Color.White.copy(alpha = if (isDark) 0.12f else 0.50f),
                    )
                    .padding(horizontal = 8.dp, vertical = 11.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    label,
                    color = LiquidTheme.text,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                    maxLines = 2,
                    lineHeight = 15.sp,
                    overflow = TextOverflow.Ellipsis,
                )
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
            .liquidGlassThemed(radius = LiquidGlass.RadiusWidget)
            .padding(14.dp),
    ) {
        Box(
            Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(iconColor.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = iconColor, modifier = Modifier.size(16.dp))
        }
        Spacer(Modifier.height(10.dp))
        Text(label, color = LiquidTheme.textMuted, fontSize = 11.sp, lineHeight = 14.sp)
        Text(value, color = LiquidTheme.text, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Text(unit, color = LiquidTheme.textMuted, fontSize = 11.sp)
    }
}

@Composable
private fun DashboardHeaderPillActions(
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

    PremiumHeaderPillIcon(
        icon = Icons.Outlined.CalendarMonth,
        onClick = onCalendarClick,
        contentDescription = calendarLabel,
    )
    Box {
        PremiumHeaderPillIcon(
            icon = themeIcon,
            onClick = { showThemeMenu = true },
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
        PremiumHeaderPillIcon(
            icon = Icons.Default.Language,
            onClick = { showLangMenu = true },
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

@Composable
private fun PromoCard(title: String, desc: String, emoji: String, colors: List<Color>) {
    Box(
        Modifier
            .width(240.dp)
            .height(112.dp)
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

@Composable
private fun LiveDeliveryMapCard(
    live: LiveDeliveryUi,
    isDark: Boolean,
    title: String,
    watchLabel: String,
    distanceLabel: String,
    etaLabel: String,
    onOpenFullscreen: () -> Unit,
    onOpenTracking: () -> Unit,
) {
    val tracking = live.tracking
    val person = tracking.deliveryPerson
    val shape = RoundedCornerShape(LiquidGlass.RadiusCard)

    Column(
        Modifier
            .fillMaxWidth()
            .shadow(
                elevation = 14.dp,
                shape = shape,
                ambientColor = LiquidGlass.ShadowAmbient,
                spotColor = LiquidGlass.ShadowSpot,
            )
            .clip(shape)
            .background(if (isDark) Color.Black.copy(alpha = 0.35f) else Color.White.copy(alpha = 0.88f))
            .border(
                1.dp,
                Brush.linearGradient(
                    listOf(
                        Color.White.copy(alpha = 0.70f),
                        LiquidGlass.Indigo.copy(alpha = 0.30f),
                    ),
                ),
                shape,
            ),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f),
            ) {
                Box(
                    Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(LiquidGlass.GradientPrimary),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.LocalShipping,
                        null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp),
                    )
                }
                Column {
                    Text(
                        title,
                        color = LiquidTheme.text,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                    )
                    Text(
                        listOf(distanceLabel, etaLabel).joinToString(" · "),
                        color = LiquidTheme.textMuted,
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                IconButton(
                    onClick = onOpenFullscreen,
                    modifier = Modifier
                        .size(36.dp)
                        .liquidGlassThemed(radius = 12.dp),
                ) {
                    Icon(
                        Icons.Default.Fullscreen,
                        contentDescription = watchLabel,
                        tint = LiquidGlass.Indigo,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }

        Box(
            Modifier
                .fillMaxWidth()
                .height(168.dp)
                .clickable(
                    indication = null,
                    interactionSource = remember { MutableInteractionSource() },
                    onClick = onOpenTracking,
                ),
        ) {
            OrderTrackingMapView(
                deliveryLat = tracking.deliveryLatitude,
                deliveryLng = tracking.deliveryLongitude,
                courierLat = person?.latitude,
                courierLng = person?.longitude,
                routePoints = live.routePoints,
                isDark = isDark,
                interactive = false,
                modifier = Modifier.fillMaxSize(),
            )
            Box(
                Modifier
                    .align(Alignment.BottomEnd)
                    .padding(10.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(LiquidGlass.GradientPrimary)
                    .clickable(onClick = onOpenTracking)
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            ) {
                Text(
                    watchLabel,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp,
                )
            }
        }
    }
}

@Composable
private fun DashboardLiveMapFullscreen(
    live: LiveDeliveryUi,
    isDark: Boolean,
    title: String,
    onDismiss: () -> Unit,
    onOpenTracking: () -> Unit,
) {
    val tracking = live.tracking
    val person = tracking.deliveryPerson
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false,
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
        ),
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Color.Black),
        ) {
            OrderTrackingMapView(
                deliveryLat = tracking.deliveryLatitude,
                deliveryLng = tracking.deliveryLongitude,
                courierLat = person?.latitude,
                courierLng = person?.longitude,
                routePoints = live.routePoints,
                isDark = isDark,
                interactive = true,
                modifier = Modifier.fillMaxSize(),
            )
            Row(
                Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .size(44.dp)
                        .liquidGlassThemed(radius = 12.dp),
                ) {
                    Icon(Icons.Default.Close, null, tint = Color.White)
                }
                Text(
                    title,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    modifier = Modifier
                        .liquidGlassThemed(radius = 12.dp)
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                )
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .size(44.dp)
                        .liquidGlassThemed(radius = 12.dp),
                ) {
                    Icon(Icons.Default.FullscreenExit, null, tint = Color.White)
                }
            }
            Column(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.55f))
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    "${live.distanceLabel} · ETA ${live.etaLabel}",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                )
                Spacer(Modifier.height(10.dp))
                Box(
                    Modifier
                        .clip(RoundedCornerShape(LiquidGlass.RadiusButton))
                        .background(LiquidGlass.GradientPrimary)
                        .clickable(onClick = onOpenTracking)
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                ) {
                    Text(
                        title,
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}
