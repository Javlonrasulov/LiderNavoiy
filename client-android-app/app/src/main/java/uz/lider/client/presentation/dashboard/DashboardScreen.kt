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
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
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
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.SettingsBrightness
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalContext
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
import uz.lider.client.map.MapTileSources
import uz.lider.client.map.OrgMapColors
import uz.lider.client.presentation.components.ClientPalette
import uz.lider.client.presentation.components.ClientPullToRefresh
import uz.lider.client.presentation.components.OrgSwitcherChips
import uz.lider.client.presentation.components.PaymentPhotoReminderBanner
import uz.lider.client.presentation.components.SimpleAreaChart
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.orderDisplayLabel
import uz.lider.client.presentation.components.orderStatusColor
import uz.lider.client.presentation.components.orderStatusLabel
import uz.lider.client.presentation.components.rememberClientPalette
import uz.lider.client.presentation.map.MapLayerPicker
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
import uz.lider.client.presentation.theme.TextTone
import uz.lider.client.presentation.theme.liquidGlassThemed
import uz.lider.client.presentation.tracking.OrderTrackingMapView

/** Scroll distance (px) before hero is fully blurred + whitewashed. */
private const val HeroFadeScrollPx = 320f

/** Fallback hero height until “Jami xaridlar” is measured. */
private val HeroHeightFallback = 420.dp

@Composable
fun DashboardScreen(
    onNavigate: (String) -> Unit,
    onOpenDrawer: () -> Unit = {},
    viewModel: DashboardViewModel = hiltViewModel(),
    settingsViewModel: SettingsViewModel = hiltViewModel(),
    notificationsViewModel: NotificationsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val showMapRoutePayHint by viewModel.showMapRoutePayHint.collectAsState()
    val readNotificationIds by notificationsViewModel.readIds.collectAsState()
    val hasUnreadNotifications = MockNotificationIds.all.any { it !in readNotificationIds }
    val lang = LocalAppLanguage.current
    val palette = rememberClientPalette()
    val t = remember(lang) { { key: String -> AppStrings.t(lang, key) } }
    var showDatePicker by remember { mutableStateOf(false) }
    var showLiveMapFullscreen by remember { mutableStateOf(false) }
    val filtered = state.filtered
    val live = state.liveFleet
    val periodLabel = state.dateRange?.let { DashboardDateFilter.formatRange(it) }
    val listState = rememberLazyListState()
    val orgs = state.data?.organizations.orEmpty()
        .ifEmpty {
            filtered.purchasesByOrg.map {
                uz.lider.client.domain.model.ClientOrganization(
                    companyId = it.companyId,
                    name = it.name.ifBlank { it.shortName },
                    shortName = it.shortName,
                    clientId = "",
                )
            }
        }
    val density = LocalDensity.current
    val isDark = LiquidTheme.isDark
    val lifecycleOwner = LocalLifecycleOwner.current

    // Asosiyga qaytganda yo'ldagi xarita qayta paydo bo'lsin
    LaunchedEffect(lifecycleOwner) {
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            viewModel.onDashboardVisible()
        }
    }

    // Monotonic scroll distance — avoids LazyList index*avgSize jumps that
    // made the hero go white then show the photo again.
    var heroScrollPx by remember { mutableFloatStateOf(0f) }
    val heroScrollConnection = remember {
        object : NestedScrollConnection {
            override fun onPostScroll(
                consumed: Offset,
                available: Offset,
                source: NestedScrollSource,
            ): Offset {
                heroScrollPx = (heroScrollPx - consumed.y).coerceAtLeast(0f)
                return Offset.Zero
            }
        }
    }
    // Snap-reset when list is fully at top (pull-to-refresh / bounce)
    LaunchedEffect(listState.firstVisibleItemIndex, listState.firstVisibleItemScrollOffset) {
        if (listState.firstVisibleItemIndex == 0 && listState.firstVisibleItemScrollOffset == 0) {
            heroScrollPx = 0f
        }
    }
    val fadeProgress = (heroScrollPx / HeroFadeScrollPx).coerceIn(0f, 1f)

    // Hero height = bottom of “Jami xaridlar” card (measured at scroll top)
    var heroHeightPx by remember { mutableFloatStateOf(0f) }
    var dashboardRootCoords by remember { mutableStateOf<androidx.compose.ui.layout.LayoutCoordinates?>(null) }
    val heroHeight = if (heroHeightPx > 0f) {
        with(density) { heroHeightPx.toDp() }
    } else {
        HeroHeightFallback
    }

    if (showLiveMapFullscreen && live != null) {
        DashboardLiveMapFullscreen(
            fleet = live,
            title = if (live.orderCount > 1) t("dash_live_orders") else t("dash_live_delivery"),
            payPhotoHint = t("track_pay_photo_hint"),
            showPayPhotoHint = showMapRoutePayHint,
            onDismissPayPhotoHint = { viewModel.dismissMapRoutePayHint() },
            onDismiss = { showLiveMapFullscreen = false },
            onOpenTracking = { orderId ->
                showLiveMapFullscreen = false
                onNavigate(ClientRoutes.orderTracking(orderId))
            },
        )
    }

    // Kalendar oynasidagi kunlarda savdo bo'lgan bo'lsa, nuqta ko'rsatish uchun.
    // CANCELLED bo'lmagan buyurtmalar bo'yicha kunlar seti.
    val salesDays = remember(state.allOrders) {
        DashboardDateFilter.saleDays(state.allOrders)
    }

    DashboardDateRangeDialog(
        visible = showDatePicker,
        onDismiss = { showDatePicker = false },
        onApply = { start, end -> viewModel.setDateRange(start, end) },
        onClear = { viewModel.clearDateRange() },
        onSelectAll = { viewModel.selectAllDates() },
        initialStartMillis = state.dateRange?.let { DashboardDateFilter.toStartMillis(it.start) },
        initialEndMillis = state.dateRange?.let { DashboardDateFilter.toStartMillis(it.end) },
        salesDays = salesDays,
        title = t("dash_select_dates"),
        applyLabel = t("dash_apply_dates"),
        cancelLabel = t("com_cancel"),
    )

    val recentOrders = remember(state.allOrders) {
        state.allOrders
            .sortedByDescending { it.updatedAt.ifBlank { it.createdAt } }
            .take(3)
    }

    LiquidBackground(modifier = Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxSize()
                .nestedScroll(heroScrollConnection)
                .onGloballyPositioned { dashboardRootCoords = it },
        ) {
            // Hero only down to “Jami xaridlar” — not full screen
            FixedHeroBackdrop(
                fadeProgress = fadeProgress,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(heroHeight)
                    .align(Alignment.TopCenter),
            )

            ClientPullToRefresh(onRefresh = { viewModel.refresh() }) {
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
                            live?.let { fleet ->
                                Spacer(Modifier.height(16.dp))
                                LiveDeliveryMapCard(
                                    fleet = fleet,
                                    isDark = isDark,
                                    title = if (fleet.vehicles.size > 1 || fleet.orderCount > 1) {
                                        t("dash_live_orders")
                                    } else {
                                        t("dash_live_delivery")
                                    },
                                    watchLabel = t("dash_live_watch"),
                                    distancePrefix = t("track_distance"),
                                    stopsBeforeTemplate = t("track_stops_before"),
                                    stopsNextLabel = t("track_stops_next"),
                                    onOpenFullscreen = { showLiveMapFullscreen = true },
                                    onOpenTracking = { orderId ->
                                        onNavigate(ClientRoutes.orderTracking(orderId))
                                    },
                                )
                            }
                            Spacer(Modifier.height(20.dp))
                        }
                    }

                    // Tanlangan sana oralig‘i — faqat filtr bor bo‘lsa
                    if (periodLabel != null) {
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

                    // Total purchases — hero ends at this card’s bottom
                    item {
                        Box(
                            Modifier
                                .padding(horizontal = 16.dp)
                                .fillMaxWidth()
                                .onGloballyPositioned { cardCoords ->
                                    val root = dashboardRootCoords ?: return@onGloballyPositioned
                                    // Only lock height while list is at top (avoid shrink while scrolling)
                                    if (listState.firstVisibleItemIndex != 0 ||
                                        listState.firstVisibleItemScrollOffset > 2
                                    ) {
                                        return@onGloballyPositioned
                                    }
                                    val bottomInRoot = root.localPositionOf(
                                        cardCoords,
                                        Offset(0f, cardCoords.size.height.toFloat()),
                                    ).y
                                    val minPx = with(density) { 280.dp.toPx() }
                                    val next = bottomInRoot.coerceAtLeast(minPx)
                                    if (kotlin.math.abs(next - heroHeightPx) > 2f) {
                                        heroHeightPx = next
                                    }
                                }
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
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        t("dash_total_purchases"),
                                        color = Color.White.copy(alpha = 0.75f),
                                        fontSize = 13.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.padding(end = 8.dp),
                                    )
                                    if (orgs.size >= 2) {
                                        OrgSwitcherChips(
                                            organizations = orgs,
                                            selectedCompanyId = state.purchasesCompanyId
                                                ?: orgs.firstOrNull()?.companyId,
                                            onSelect = viewModel::selectPurchasesOrganization,
                                            onDark = true,
                                            compact = true,
                                        )
                                    }
                                }
                                Spacer(Modifier.height(8.dp))
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
                                    labels = filtered.chartLabels,
                                    labelColor = Color.White.copy(alpha = 0.75f),
                                    valueColor = Color(0xFFFFE082),
                                    modifier = Modifier.fillMaxWidth(),
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
                                formatMoney(state.data?.debt ?: 0.0),
                                t("com_som"),
                                LiquidGlass.Rose,
                                Modifier.weight(1f),
                            )
                            StatCard(
                                Icons.Default.CardGiftcard,
                                t("dash_bonus"),
                                formatMoney((state.data?.bonusPoints ?: 0).toDouble()),
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
                                "${state.data?.activeOrderCount ?: filtered.activeOrderCount}",
                                "ta",
                                LiquidGlass.Cyan,
                                Modifier.weight(1f),
                            )
                            StatCard(
                                Icons.Default.Star,
                                t("dash_discount_level"),
                                state.data?.discountLevel ?: "Standard",
                                state.data?.discountSubtitle ?: "—",
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
                        val promos = state.promotions
                        if (promos.isEmpty()) {
                            Box(
                                Modifier
                                    .padding(horizontal = 16.dp)
                                    .fillMaxWidth()
                                    .liquidGlassThemed()
                                    .padding(20.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    t("promo_empty"),
                                    color = LiquidTheme.textMuted,
                                    fontSize = 13.sp,
                                    textAlign = TextAlign.Center,
                                )
                            }
                        } else {
                            Row(
                                Modifier
                                    .horizontalScroll(rememberScrollState())
                                    .padding(horizontal = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                promos.take(6).forEach { promo ->
                                    PromoCard(
                                        title = promo.title,
                                        desc = promo.subtitle.ifBlank {
                                            promo.productName.orEmpty()
                                        },
                                        emoji = promo.emoji.ifBlank { "🎁" },
                                        colors = listOf(
                                            parsePromoHex(promo.colorStart, LiquidGlass.Indigo),
                                            parsePromoHex(promo.colorEnd, LiquidGlass.Violet),
                                        ),
                                    )
                                }
                            }
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

                    val orders = recentOrders
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
                        items(orders, key = { it.id }) { order ->
                            Box(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                                RecentOrderRow(order, lang, palette) {
                                    onNavigate(ClientRoutes.orderTracking(order.id))
                                }
                            }
                        }
                    }
                }
            }
            if (state.loading && state.data == null) {
                CircularProgressIndicator(
                    color = LiquidGlass.Indigo,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(bottom = 48.dp),
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
    val textTone by settingsViewModel.textTone.collectAsState()
    var showThemeMenu by remember { mutableStateOf(false) }
    var showLangMenu by remember { mutableStateOf(false) }
    var showToneMenu by remember { mutableStateOf(false) }
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
    val toneLabelKey = remember(textTone) {
        when (textTone) {
            TextTone.DEFAULT -> "com_tone_default"
            TextTone.INK -> "com_tone_ink"
            TextTone.NAVY -> "com_tone_navy"
            TextTone.TEAL -> "com_tone_teal"
            TextTone.VIOLET -> "com_tone_violet"
            TextTone.ROSE -> "com_tone_rose"
            TextTone.AMBER -> "com_tone_amber"
            TextTone.EMERALD -> "com_tone_emerald"
            TextTone.SLATE -> "com_tone_slate"
        }
    }

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
    Box {
        PremiumHeaderPillIcon(
            icon = Icons.Default.Palette,
            onClick = { showToneMenu = true },
            contentDescription = AppStrings.t(language, "com_text_color"),
            tint = textTone.swatch,
        )
        LiquidGlassDropdownMenu(
            expanded = showToneMenu,
            onDismissRequest = { showToneMenu = false },
        ) {
            Text(
                AppStrings.t(language, "com_text_color"),
                color = LiquidTheme.textMuted,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
            )
            Row(
                Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextTone.entries.forEach { tone ->
                    val selected = textTone == tone
                    Box(
                        Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(tone.swatch)
                            .then(
                                if (selected) {
                                    Modifier.border(2.dp, LiquidGlass.Indigo, CircleShape)
                                } else {
                                    Modifier.border(1.dp, Color.White.copy(alpha = 0.55f), CircleShape)
                                },
                            )
                            .clickable {
                                settingsViewModel.setTextTone(tone)
                                showToneMenu = false
                            },
                    )
                }
            }
            Text(
                AppStrings.t(language, toneLabelKey),
                color = LiquidTheme.text,
                fontSize = 13.sp,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            )
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
    val product = when {
        order.items.isEmpty() -> "—"
        order.items.size == 1 -> order.items.first().productName
        else -> "${order.items.first().productName} · ${order.items.size} ta"
    }

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

private fun parsePromoHex(hex: String, fallback: Color): Color {
    val cleaned = hex.trim().removePrefix("#")
    return try {
        when (cleaned.length) {
            6 -> Color(("FF$cleaned").toLong(16))
            8 -> Color(cleaned.toLong(16))
            else -> fallback
        }
    } catch (_: Exception) {
        fallback
    }
}

@Composable
private fun LiveDeliveryMapCard(
    fleet: LiveFleetUi,
    isDark: Boolean,
    title: String,
    watchLabel: String,
    distancePrefix: String,
    stopsBeforeTemplate: String,
    stopsNextLabel: String,
    onOpenFullscreen: () -> Unit,
    onOpenTracking: (String) -> Unit,
) {
    val shape = RoundedCornerShape(LiquidGlass.RadiusCard)
    var selectedVehicle by remember { mutableStateOf<LiveMapVehicle?>(null) }
    val multiOrg = fleet.vehicles.size > 1
    val vehicleLines = fleet.vehicles.map { vehicle ->
        vehicleLiveSubtitle(
            vehicle = vehicle,
            showOrgName = multiOrg,
            distancePrefix = distancePrefix,
            stopsBeforeTemplate = stopsBeforeTemplate,
            stopsNextLabel = stopsNextLabel,
        )
    }

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
                Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
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
                Column(
                    Modifier.weight(1f),
                ) {
                    Text(
                        title,
                        color = LiquidTheme.text,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                    )
                    vehicleLines.forEachIndexed { index, line ->
                        Text(
                            line,
                            color = LiquidTheme.textMuted,
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(top = if (index == 0) 0.dp else 2.dp),
                        )
                    }
                }
            }
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

        Box(
            Modifier
                .fillMaxWidth()
                .height(168.dp),
        ) {
            OrderTrackingMapView(
                vehicles = fleet.vehicles,
                interactive = true,
                compactMarkers = true,
                showRouteStops = false,
                onVehicleClick = { selectedVehicle = it },
                modifier = Modifier.fillMaxSize(),
            )
            Box(
                Modifier
                    .align(Alignment.BottomEnd)
                    .padding(10.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(LiquidGlass.GradientPrimary)
                    .clickable {
                        fleet.primaryOrderId?.let(onOpenTracking)
                    }
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

    selectedVehicle?.let { vehicle ->
        VehicleOrdersPopup(
            vehicle = vehicle,
            onDismiss = { selectedVehicle = null },
            onOpenOrder = { orderId ->
                selectedVehicle = null
                onOpenTracking(orderId)
            },
        )
    }
}

/** Bitta tashkilot qatori — keyingi manzil + km; ko‘p orgda nom bilan. */
private fun vehicleLiveSubtitle(
    vehicle: LiveMapVehicle,
    showOrgName: Boolean,
    distancePrefix: String,
    stopsBeforeTemplate: String,
    stopsNextLabel: String,
): String {
    val parts = mutableListOf<String>()
    if (showOrgName) {
        val org = vehicle.companyShortName?.trim()?.takeIf { it.isNotEmpty() }
            ?: vehicle.companyId?.trim()?.takeIf { it.isNotEmpty() }
        if (org != null) parts += org
    }
    if (vehicle.totalStops > 1) {
        parts += if (vehicle.stopsBeforeYou > 0) {
            stopsBeforeTemplate.replace("%d", vehicle.stopsBeforeYou.toString())
        } else {
            stopsNextLabel
        }
    }
    val dist = vehicle.orders
        .mapNotNull { label ->
            val n = label.distanceLabel.replace(',', '.').trim().lowercase()
            when {
                n.endsWith("km") -> n.removeSuffix("km").trim().toDoubleOrNull()
                n.endsWith("m") -> n.removeSuffix("m").trim().toDoubleOrNull()?.div(1000.0)
                else -> n.toDoubleOrNull()
            }
        }
        .maxOrNull()
        ?.let { km -> if (km < 1.0) "${(km * 1000).toInt()} m" else String.format("%.1f km", km) }
        ?: vehicle.orders.firstOrNull()?.distanceLabel?.takeIf { it.isNotBlank() && it != "—" }
    if (dist != null) {
        parts += if (showOrgName) dist else "$distancePrefix: $dist"
    }
    return parts.joinToString(" · ").ifBlank { "—" }
}

@Composable
private fun VehicleOrdersPopup(
    vehicle: LiveMapVehicle,
    onDismiss: () -> Unit,
    onOpenOrder: (String) -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(LiquidTheme.bgMid)
                .border(1.dp, Color.White.copy(alpha = 0.35f), RoundedCornerShape(18.dp))
                .padding(16.dp),
        ) {
            Text(
                vehicle.courierName,
                color = LiquidTheme.text,
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
            )
            Text(
                "Dostavkachi",
                color = LiquidTheme.textMuted,
                fontSize = 11.sp,
            )
            vehicle.courierPhone?.takeIf { it.isNotBlank() }?.let { phone ->
                val context = LocalContext.current
                Text(
                    phone,
                    color = LiquidGlass.Indigo,
                    fontSize = 13.sp,
                    modifier = Modifier
                        .padding(top = 2.dp)
                        .clickable {
                            runCatching {
                                context.startActivity(
                                    android.content.Intent(
                                        android.content.Intent.ACTION_DIAL,
                                        android.net.Uri.parse("tel:$phone"),
                                    ),
                                )
                            }
                        },
                )
            }
            Spacer(Modifier.height(12.dp))
            vehicle.orders.forEach { order ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { onOpenOrder(order.orderId) }
                        .padding(vertical = 10.dp, horizontal = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            "${formatMoney(order.amount)} so'm",
                            color = LiquidTheme.text,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                        )
                        Text(
                            order.distanceLabel,
                            color = LiquidTheme.textMuted,
                            fontSize = 11.sp,
                        )
                    }
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowForward,
                        null,
                        tint = LiquidGlass.Indigo,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun DashboardLiveMapFullscreen(
    fleet: LiveFleetUi,
    title: String,
    payPhotoHint: String,
    showPayPhotoHint: Boolean,
    onDismissPayPhotoHint: () -> Unit,
    onDismiss: () -> Unit,
    onOpenTracking: (String) -> Unit,
) {
    val overlayBg = Color(0xF00B1220)
    var selectedVehicle by remember { mutableStateOf<LiveMapVehicle?>(null) }
    var mapLayer by remember { mutableStateOf(MapTileSources.defaultLayer) }
    val navBottom = WindowInsets.navigationBars
        .asPaddingValues()
        .calculateBottomPadding()
        .coerceAtLeast(48.dp)
    val statusTop = WindowInsets.statusBars
        .asPaddingValues()
        .calculateTopPadding()
    // X / title / exit qatori (~44+padding) ostiga magazin bubble
    val storeCalloutInset = statusTop + 58.dp
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
                .background(Color(0xFFF5F7FC)),
        ) {
            OrderTrackingMapView(
                vehicles = fleet.vehicles,
                interactive = true,
                showRouteStops = true,
                mapLayer = mapLayer,
                calloutTopInset = storeCalloutInset,
                onVehicleClick = { selectedVehicle = it },
                modifier = Modifier.fillMaxSize(),
            )
            Column(
                Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter)
                    .statusBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
            ) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier
                            .size(44.dp)
                            .shadow(8.dp, CircleShape)
                            .clip(CircleShape)
                            .background(overlayBg),
                    ) {
                        Icon(Icons.Default.Close, null, tint = Color.White)
                    }
                    Text(
                        title,
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                        modifier = Modifier
                            .shadow(8.dp, RoundedCornerShape(14.dp))
                            .clip(RoundedCornerShape(14.dp))
                            .background(overlayBg)
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                    )
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier
                            .size(44.dp)
                            .shadow(8.dp, CircleShape)
                            .clip(CircleShape)
                            .background(overlayBg),
                    ) {
                        Icon(Icons.Default.FullscreenExit, null, tint = Color.White)
                    }
                }
                Spacer(Modifier.height(10.dp))
                if (showPayPhotoHint) {
                    PaymentPhotoReminderBanner(
                        text = payPhotoHint,
                        onDismiss = onDismissPayPhotoHint,
                    )
                }
            }
            MapLayerPicker(
                activeLayer = mapLayer,
                onLayerChange = { mapLayer = it },
                modifier = Modifier.align(Alignment.BottomStart),
                bottomPadding = navBottom + 72.dp,
            )
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(
                        bottom = navBottom + 16.dp,
                        start = 72.dp,
                        end = 16.dp,
                    ),
                verticalArrangement = Arrangement.spacedBy(6.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                val distLines = fleet.orgDistanceLines()
                if (distLines.size <= 1) {
                    Text(
                        distLines.firstOrNull()?.second ?: fleet.distanceLabel,
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        modifier = Modifier
                            .shadow(8.dp, RoundedCornerShape(14.dp))
                            .clip(RoundedCornerShape(14.dp))
                            .background(overlayBg)
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                    )
                } else {
                    distLines.forEach { (orgName, dist) ->
                        val accent = Color(OrgMapColors.forCompany(
                            fleet.vehicles.firstOrNull {
                                it.companyShortName == orgName || it.companyId == orgName
                            }?.companyId,
                        ))
                        Text(
                            "$orgName · $dist",
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                            modifier = Modifier
                                .shadow(8.dp, RoundedCornerShape(14.dp))
                                .clip(RoundedCornerShape(14.dp))
                                .background(overlayBg)
                                .border(1.5.dp, accent.copy(alpha = 0.85f), RoundedCornerShape(14.dp))
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                        )
                    }
                }
            }
        }
    }

    selectedVehicle?.let { vehicle ->
        VehicleOrdersPopup(
            vehicle = vehicle,
            onDismiss = { selectedVehicle = null },
            onOpenOrder = { orderId ->
                selectedVehicle = null
                onOpenTracking(orderId)
            },
        )
    }
}
