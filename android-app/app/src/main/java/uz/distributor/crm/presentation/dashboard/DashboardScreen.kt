package uz.distributor.crm.presentation.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.components.AppLanguageDropdownMenu
import uz.distributor.crm.presentation.components.NavTab
import uz.distributor.crm.presentation.navigation.bottomNavHeight
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinDashboardHeader
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.sherinPageBackground
import java.text.DecimalFormat

@Composable
fun DashboardScreen(
    onNavigate: (NavTab) -> Unit,
    onClientsClick: () -> Unit = {},
    onAddClientClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    onOrderSummaryClick: () -> Unit = {},
    onProductsClick: () -> Unit = {},
    onClientOrdersClick: () -> Unit = {},
    onVisitsClick: () -> Unit = {},
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val darkMode by viewModel.darkMode.collectAsState()
    val formatter = remember { DecimalFormat("#,###") }
    val lang = LocalAppLanguage.current
    val isDark = darkMode
    var showLangMenu by remember { mutableStateOf(false) }
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.reload()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val displayAgentName = when {
        state.isLoading && state.user == null -> AppStrings.loadingData(lang)
        !state.user?.fullName.isNullOrBlank() -> state.user!!.fullName
        else -> AppStrings.agentUnavailable(lang)
    }
    val displayCompanyName = state.user?.companyName?.takeIf { it.isNotBlank() }
        ?: AppStrings.loginTitle(lang)

    val cartValue = if (state.cartTotal > 0) {
        "${formatter.format(state.cartTotal.toLong())} (${state.cartItemsCount} ${AppStrings.items(lang)})"
    } else "0"

    val statItems = buildList {
        add(StatItem(AppStrings.clientsList(lang), "${state.stats.totalClients} / ${state.stats.visitedClients} / ${state.stats.pendingClients}", Icons.Default.Person, Color(0xFF10B981), badge = "${String.format("%.1f", state.stats.clientProgressPercent)}%", onClick = onClientsClick))
        add(
            StatItem(
                AppStrings.clientOrders(lang),
                "${state.stats.pendingClientOrders}",
                Icons.Default.LocalShipping,
                Color(0xFFEA580C),
                badge = if (state.stats.pendingClientOrders > 0) "${state.stats.pendingClientOrders}" else null,
                onClick = onClientOrdersClick,
            ),
        )
        add(StatItem(AppStrings.visitCount(lang), "${state.stats.visitCount} / ${state.stats.completedVisits} / ${state.stats.pendingVisits}", Icons.Default.CalendarMonth, Color(0xFFF97316), badge = "${state.stats.visitProgressPercent.toInt()}%", onClick = onVisitsClick))
        add(StatItem(AppStrings.totalSales(lang), cartValue, Icons.Default.ShoppingCart, Color(0xFF3B82F6), cartBadge = if (state.cartItemsCount > 0) "${state.cartItemsCount}" else null, onClick = onOrderSummaryClick))
        add(StatItem(AppStrings.products(lang), "${state.productCount}", Icons.Default.LocalOffer, Color(0xFF8B5CF6), onClick = onProductsClick))
        add(StatItem(AppStrings.returns(lang), "0", Icons.Default.Inventory2, Color(0xFFEF4444)))
        add(StatItem(AppStrings.cashPayments(lang), "0", Icons.Default.Payments, Color(0xFF10B981)))
        add(StatItem(AppStrings.clickPayments(lang), "0", Icons.Default.CreditCard, Color(0xFF6366F1)))
        add(StatItem(AppStrings.terminalPayments(lang), "0", Icons.Default.CheckCircle, Color(0xFF06B6D4)))
        add(StatItem(AppStrings.bonusStickers(lang), "0", Icons.Default.EmojiEvents, Color(0xFFEC4899)))
    }
    val displayed = if (state.showAll) statItems else statItems.take(4)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(sherinPageBackground(isDark)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(bottom = bottomNavHeight() + 16.dp),
        ) {
            SherinDashboardHeader(
                companyName = displayCompanyName,
                agentName = displayAgentName,
                isDark = isDark,
                onProfileClick = onProfileClick,
                onLanguageClick = { showLangMenu = true },
                onThemeClick = viewModel::toggleDarkMode,
                languageMenu = {
                    AppLanguageDropdownMenu(
                        expanded = showLangMenu,
                        onDismissRequest = { showLangMenu = false },
                        current = lang,
                        isDark = isDark,
                        onSelect = viewModel::setLanguage,
                    )
                },
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        displayAgentName,
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(AppStrings.totalSales(lang), color = Color.White.copy(0.8f), fontSize = 14.sp)
                        Spacer(Modifier.width(8.dp))
                        SherinGlassIconButton(
                            onClick = viewModel::toggleBalance,
                            icon = if (state.showBalance) Icons.Default.Visibility else Icons.Outlined.VisibilityOff,
                            size = 32.dp,
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            if (state.showBalance) formatter.format(state.stats.totalSales.toLong()) else "•••••••",
                            color = Color.White,
                            fontSize = 48.sp,
                            fontWeight = FontWeight.Normal,
                            letterSpacing = (-1).sp,
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(AppStrings.sumCurrency(lang), color = Color.White.copy(0.7f), fontSize = 20.sp, modifier = Modifier.padding(bottom = 8.dp))
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(state.formattedDate, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(24.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                    ) {
                        SherinQuickAction(
                            icon = Icons.Default.Add,
                            label = AppStrings.add(lang),
                            onClick = onAddClientClick,
                        )
                        SherinRefreshAction(
                            label = when (state.refreshButtonState) {
                                RefreshButtonState.SUCCESS -> AppStrings.refreshDone(lang)
                                else -> AppStrings.refresh(lang)
                            },
                            state = state.refreshButtonState,
                            onClick = viewModel::refresh,
                        )
                        SherinQuickAction(Icons.Default.Info, AppStrings.details(lang)) {}
                        SherinQuickAction(Icons.Default.MoreHoriz, AppStrings.more(lang)) {}
                    }
                }
            }

            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                state.error?.let { errorKey ->
                    DashboardErrorCard(
                        title = AppStrings.dashboardLoadFailedTitle(lang),
                        message = AppStrings.apiError(lang, errorKey),
                        retryLabel = AppStrings.retryLoad(lang),
                        isDark = isDark,
                        onRetry = viewModel::refresh,
                    )
                    Spacer(Modifier.height(12.dp))
                }
                if (state.showRefreshResult && state.refreshUpdates.isNotEmpty()) {
                    RefreshResultCard(
                        updates = state.refreshUpdates,
                        title = AppStrings.refreshUpdatesTitle(lang),
                        isDark = isDark,
                        onDismiss = viewModel::dismissRefreshResult,
                    )
                    Spacer(Modifier.height(12.dp))
                }
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    color = if (isDark) SherinColors.CardDark else Color.White,
                    shadowElevation = if (isDark) 0.dp else 12.dp,
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        displayed.forEachIndexed { index, item ->
                            SherinStatRow(item, isDark)
                            if (index < displayed.lastIndex) Spacer(Modifier.height(12.dp))
                        }
                        TextButton(
                            onClick = viewModel::toggleShowAll,
                            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                        ) {
                            Text(
                                if (state.showAll) AppStrings.hide(lang) else AppStrings.showAll(lang),
                                color = if (isDark) Color(0xFF9CA3AF) else Color(0xFF4B5563),
                                fontSize = 14.sp,
                            )
                            Icon(
                                if (state.showAll) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                null,
                                tint = if (isDark) Color(0xFF9CA3AF) else Color(0xFF4B5563),
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

private data class StatItem(
    val label: String,
    val value: String,
    val icon: ImageVector,
    val color: Color,
    val badge: String? = null,
    val cartBadge: String? = null,
    val onClick: () -> Unit = {},
)

@Composable
private fun SherinRefreshAction(
    label: String,
    state: RefreshButtonState,
    onClick: () -> Unit,
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(
            enabled = state != RefreshButtonState.LOADING,
            indication = null,
            interactionSource = interaction,
            onClick = onClick,
        ),
    ) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(CircleShape)
                .background(
                    when {
                        state == RefreshButtonState.SUCCESS -> Color(0xFF10B981).copy(0.35f)
                        pressed -> Color.White.copy(0.28f)
                        else -> Color.White.copy(0.10f)
                    },
                )
                .border(
                    1.dp,
                    when (state) {
                        RefreshButtonState.SUCCESS -> Color(0xFF10B981).copy(0.6f)
                        else -> Color.White.copy(0.20f)
                    },
                    CircleShape,
                ),
            contentAlignment = Alignment.Center,
        ) {
            when (state) {
                RefreshButtonState.LOADING -> {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                }
                RefreshButtonState.SUCCESS -> {
                    Icon(Icons.Default.Check, null, tint = Color(0xFF34D399), modifier = Modifier.size(28.dp))
                }
                RefreshButtonState.IDLE -> {
                    Icon(Icons.Default.Refresh, null, tint = Color.White, modifier = Modifier.size(24.dp))
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(label, color = Color.White.copy(0.9f), fontSize = 11.sp, textAlign = TextAlign.Center)
    }
}

@Composable
private fun DashboardErrorCard(
    title: String,
    message: String,
    retryLabel: String,
    isDark: Boolean,
    onRetry: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = if (isDark) Color(0xFF7F1D1D).copy(0.45f) else Color(0xFFFEF2F2),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isDark) Color(0xFFEF4444).copy(0.35f) else Color(0xFFFECACA),
        ),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.ErrorOutline,
                    contentDescription = null,
                    tint = Color(0xFFEF4444),
                    modifier = Modifier.size(22.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    title,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    color = if (isDark) Color.White else Color(0xFF991B1B),
                )
            }
            Spacer(Modifier.height(8.dp))
            Text(
                message,
                fontSize = 14.sp,
                lineHeight = 20.sp,
                color = if (isDark) Color(0xFFFECACA) else Color(0xFFB91C1C),
            )
            Spacer(Modifier.height(12.dp))
            TextButton(onClick = onRetry) {
                Text(retryLabel, color = SherinColors.Primary, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun RefreshResultCard(
    updates: List<String>,
    title: String,
    isDark: Boolean,
    onDismiss: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = if (isDark) Color(0xFF064E3B).copy(0.4f) else Color(0xFFECFDF5),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isDark) Color(0xFF10B981).copy(0.3f) else Color(0xFF10B981).copy(0.25f),
        ),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = Color(0xFF10B981),
                    modifier = Modifier.size(22.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    title,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    color = if (isDark) Color.White else Color(0xFF065F46),
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = null,
                        tint = if (isDark) Color(0xFF9CA3AF) else Color(0xFF6B7280),
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            updates.forEach { line ->
                Row(
                    modifier = Modifier.padding(vertical = 4.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Text("•", color = Color(0xFF10B981), fontSize = 14.sp, modifier = Modifier.padding(end = 8.dp))
                    Text(
                        line,
                        fontSize = 14.sp,
                        lineHeight = 20.sp,
                        color = if (isDark) Color(0xFFD1FAE5) else Color(0xFF047857),
                    )
                }
            }
        }
    }
}

@Composable
private fun SherinQuickAction(icon: ImageVector, label: String, onClick: () -> Unit = {}) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(
            indication = null,
            interactionSource = interaction,
            onClick = onClick,
        ),
    ) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(CircleShape)
                .background(Color.White.copy(if (pressed) 0.28f else 0.10f))
                .border(1.dp, Color.White.copy(0.20f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = Color.White, modifier = Modifier.size(24.dp))
        }
        Spacer(Modifier.height(8.dp))
        Text(label, color = Color.White.copy(0.9f), fontSize = 11.sp, textAlign = TextAlign.Center)
    }
}

@Composable
private fun SherinStatRow(item: StatItem, isDark: Boolean) {
    val rowBg = if (isDark) SherinColors.CardRowDark.copy(alpha = 0.5f) else SherinColors.CardRowLight
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(rowBg)
            .clickable(onClick = item.onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(48.dp).clip(CircleShape).background(item.color),
            contentAlignment = Alignment.Center,
        ) {
            Icon(item.icon, null, tint = Color.White, modifier = Modifier.size(24.dp))
        }
        Spacer(Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(item.label, fontSize = 14.sp, color = if (isDark) Color(0xFF9CA3AF) else Color(0xFF6B7280))
            Text(item.value, fontSize = 20.sp, fontWeight = FontWeight.Medium, color = if (isDark) Color.White else Color.Black)
        }
        item.badge?.let {
            Surface(shape = RoundedCornerShape(50), color = Color(0xFF10B981)) {
                Text(it, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp), color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Medium)
            }
            Spacer(Modifier.width(8.dp))
        }
        item.cartBadge?.let {
            Surface(shape = RoundedCornerShape(50), color = Color(0xFF3B82F6)) {
                Text(it, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp), color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Medium)
            }
            Spacer(Modifier.width(8.dp))
        }
        Box(
            modifier = Modifier.size(32.dp).clip(CircleShape).background(if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = if (isDark) Color(0xFF9CA3AF) else Color(0xFF6B7280), modifier = Modifier.size(16.dp))
        }
    }
}
