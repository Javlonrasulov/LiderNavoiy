package uz.lider.client.presentation.analytics

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientPullToRefresh
import uz.lider.client.presentation.components.AnalyticsTrendChart
import uz.lider.client.presentation.components.ChartPoint
import uz.lider.client.presentation.components.ChartVisualStyle
import uz.lider.client.presentation.components.HorizontalProgressBar
import uz.lider.client.presentation.components.formatChartAmount
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.localized
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale
import uz.lider.client.presentation.dashboard.DashboardDateFilter
import uz.lider.client.presentation.dashboard.DashboardDateRangeDialog
import uz.lider.client.presentation.navigation.clientBottomContentPadding
import uz.lider.client.presentation.theme.GlassFilterChip
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.PremiumHeaderActionPill
import uz.lider.client.presentation.theme.PremiumHeaderButton
import uz.lider.client.presentation.theme.PremiumHeaderPillIcon
import uz.lider.client.presentation.theme.liquidGlassThemed

@Composable
fun AnalyticsScreen(
    onNavigate: (String) -> Unit,
    onOpenDrawer: () -> Unit = {},
    viewModel: AnalyticsViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val state by viewModel.uiState.collectAsState()
    val data = state.data
    val periodLabel = when {
        state.customStartDate != null && state.customEndDate != null ->
            "${state.customStartDate} – ${state.customEndDate}"
        state.period == "week" -> localized("an_week")
        state.period == "year" -> localized("an_year")
        else -> localized("an_month")
    }

    // Kalendar dialog
    DashboardDateRangeDialog(
        visible = state.showCalendar,
        onDismiss = { viewModel.closeCalendar() },
        onApply = { startMs, endMs ->
            val start = DashboardDateFilter.fromMillis(startMs)
            val end = DashboardDateFilter.fromMillis(endMs)
            viewModel.applyDateRange(start, end)
        },
        onClear = { viewModel.clearDateRange() },
        initialStartMillis = state.customStartDate?.let {
            it.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
        },
        initialEndMillis = state.customEndDate?.let {
            it.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
        },
        salesDays = state.salesDays,
        title = localized("an_title"),
        applyLabel = localized("dash_apply_dates"),
        cancelLabel = localized("com_cancel"),
    )

    LiquidBackground(modifier = Modifier.fillMaxSize()) {
        if (state.loading && data == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LiquidGlass.Indigo)
            }
        } else {
            ClientPullToRefresh(onRefresh = { viewModel.refreshSuspend() }) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        end = 16.dp,
                        bottom = clientBottomContentPadding(),
                    ),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    item {
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .statusBarsPadding()
                                .padding(vertical = 10.dp),
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
                                        icon = Icons.Default.CalendarMonth,
                                        onClick = { viewModel.openCalendar() },
                                    )
                                }
                            }
                            Spacer(Modifier.height(16.dp))
                            Text(
                                localized("an_title"),
                                color = LiquidTheme.text,
                                fontWeight = FontWeight.Bold,
                                fontSize = 26.sp,
                                lineHeight = 32.sp,
                            )
                            Text(
                                periodLabel,
                                modifier = Modifier.clickable { viewModel.openCalendar() },
                                color = LiquidTheme.textMuted,
                                fontSize = 14.sp,
                                lineHeight = 20.sp,
                            )
                            Spacer(Modifier.height(12.dp))
                        }
                    }

                    item {
                        Row(
                            Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (state.customStartDate != null) {
                                // Custom range chip — bosilsa tozalanadi
                                Box(
                                    Modifier
                                        .clip(RoundedCornerShape(20.dp))
                                        .background(LiquidGlass.Indigo.copy(alpha = 0.18f))
                                        .clickable { viewModel.clearDateRange() }
                                        .padding(horizontal = 14.dp, vertical = 8.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    ) {
                                        Text(
                                            "${state.customStartDate} – ${state.customEndDate}",
                                            color = LiquidGlass.Indigo,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                        Icon(
                                            Icons.Default.Close,
                                            contentDescription = "Tozalash",
                                            tint = LiquidGlass.Indigo,
                                            modifier = Modifier.size(14.dp),
                                        )
                                    }
                                }
                            } else {
                                listOf(
                                    "week" to localized("an_week"),
                                    "month" to localized("an_month"),
                                    "year" to localized("an_year"),
                                ).forEach { (key, label) ->
                                    GlassFilterChip(
                                        label = label,
                                        selected = state.period == key,
                                        onClick = { viewModel.setPeriod(key) },
                                    )
                                }
                            }
                        }
                    }

                    // KPI cards — glass with colored gradient icon area and trend arrows
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            KpiCard(
                                label = localized("an_total"),
                                value = formatMoney(data?.totalPurchases ?: 0.0),
                                unit = localized("com_som"),
                                trend = data?.totalPurchasesTrend ?: 0.0,
                                accentColor = LiquidGlass.Indigo,
                                modifier = Modifier.weight(1f),
                            )
                            KpiCard(
                                label = localized("an_orders"),
                                value = "${data?.orderCount ?: 0}",
                                unit = "ta",
                                trend = data?.orderCountTrend ?: 0.0,
                                accentColor = LiquidGlass.Violet,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        Spacer(Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            KpiCard(
                                label = localized("an_avg_check"),
                                value = formatMoney(data?.avgCheck ?: 0.0),
                                unit = localized("com_som"),
                                trend = data?.avgCheckTrend ?: 0.0,
                                accentColor = LiquidGlass.Cyan,
                                modifier = Modifier.weight(1f),
                            )
                            KpiCard(
                                label = localized("an_goods"),
                                value = formatMoney(data?.totalQuantity ?: 0.0),
                                unit = unitLabel(lang),
                                trend = data?.totalQuantityTrend ?: 0.0,
                                accentColor = LiquidGlass.Emerald,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }

                    // Chart style — ustun / to'lqin / aylana (oylik xaridlar tepasida)
                    item {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                localized("an_chart_view"),
                                color = LiquidTheme.textMuted,
                                fontSize = 12.sp,
                            )
                            Row(
                                Modifier
                                    .liquidGlassThemed(radius = LiquidGlass.RadiusChip)
                                    .padding(4.dp),
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                listOf(
                                    ChartVisualStyle.BAR to localized("an_style_bar"),
                                    ChartVisualStyle.WAVE to localized("an_style_wave"),
                                    ChartVisualStyle.CIRCLE to localized("an_style_circle"),
                                ).forEach { (style, label) ->
                                    GlassFilterChip(
                                        label = label,
                                        selected = state.chartStyle == style,
                                        onClick = { viewModel.setChartStyle(style) },
                                    )
                                }
                            }
                        }
                    }

                    // Monthly bar chart — glass container, gradient-tinted bars
                    item {
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .liquidGlassThemed()
                                .padding(16.dp),
                        ) {
                            Text(
                                localized("an_monthly_chart"),
                                color = LiquidTheme.text,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(8.dp))
                            val monthly = data?.monthlyPurchases.orEmpty()
                            val som = localized("com_som")
                            val monthlyPoints = monthly.map {
                                ChartPoint(
                                    value = it.amount.toFloat(),
                                    label = monthShortName(lang, it.month),
                                    amountLabel = formatChartAmount(it.amount, som),
                                )
                            }.ifEmpty { listOf(ChartPoint(0f, "-", formatChartAmount(0.0, som))) }
                            val segmentColors = listOf(
                                LiquidGlass.Indigo, LiquidGlass.Violet, LiquidGlass.Cyan,
                                LiquidGlass.Emerald, LiquidGlass.Amber, LiquidGlass.Rose,
                            )
                            AnalyticsTrendChart(
                                points = monthlyPoints,
                                style = state.chartStyle,
                                primaryColor = LiquidGlass.Indigo,
                                secondaryColor = LiquidGlass.Violet,
                                heightDp = if (state.chartStyle == ChartVisualStyle.CIRCLE) 0 else 140,
                                labelColor = LiquidTheme.textMuted,
                                valueColor = LiquidTheme.text,
                                segmentColors = segmentColors,
                                centerLabel = localized("com_som"),
                            )
                        }
                    }

                    // Weekly area chart — glass container, cyan gradient fill
                    item {
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .liquidGlassThemed()
                                .padding(16.dp),
                        ) {
                            Text(
                                localized("an_weekly"),
                                color = LiquidTheme.text,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(8.dp))
                            val weekly = data?.weeklyDynamics.orEmpty()
                            val weeklySom = localized("com_som")
                            val weeklySegmentColors = listOf(
                                LiquidGlass.Cyan, LiquidGlass.Indigo, LiquidGlass.Violet,
                                LiquidGlass.Emerald, LiquidGlass.Amber, LiquidGlass.Rose, LiquidGlass.Pink,
                            )
                            val weeklyPoints = weekly.map {
                                ChartPoint(
                                    value = it.amount.toFloat(),
                                    label = dayShortName(lang, it.date),
                                    amountLabel = formatChartAmount(it.amount, weeklySom),
                                )
                            }.ifEmpty {
                                listOf(
                                    ChartPoint(0f, "-", formatChartAmount(0.0, weeklySom)),
                                    ChartPoint(0f, "-", formatChartAmount(0.0, weeklySom)),
                                )
                            }
                            AnalyticsTrendChart(
                                points = weeklyPoints,
                                style = state.chartStyle,
                                primaryColor = LiquidGlass.Cyan,
                                secondaryColor = LiquidGlass.Indigo,
                                heightDp = if (state.chartStyle == ChartVisualStyle.CIRCLE) 0 else 110,
                                labelColor = LiquidTheme.textMuted,
                                valueColor = LiquidTheme.text,
                                segmentColors = weeklySegmentColors,
                                centerLabel = localized("com_som"),
                            )
                        }
                    }

                    // Category bars — glass with gradient progress
                    item {
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .liquidGlassThemed()
                                .padding(16.dp),
                        ) {
                            Text(
                                localized("an_by_category"),
                                color = LiquidTheme.text,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(12.dp))
                            val categories = data?.categories.orEmpty()
                            if (categories.isEmpty()) {
                                Text(
                                    if (state.loadFailed) localized("an_load_error") else localized("an_no_data"),
                                    color = LiquidTheme.textMuted,
                                    fontSize = 13.sp,
                                )
                            } else {
                                val accentColors = listOf(
                                    LiquidGlass.Indigo,
                                    LiquidGlass.Violet,
                                    LiquidGlass.Cyan,
                                    LiquidGlass.Amber,
                                    LiquidGlass.Emerald,
                                    LiquidGlass.Rose,
                                )
                                categories.forEachIndexed { index, category ->
                                    Row(
                                        Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            category.name,
                                            color = LiquidTheme.text,
                                            modifier = Modifier.width(120.dp),
                                            fontSize = 13.sp,
                                        )
                                        HorizontalProgressBar(
                                            progress = (category.share / 100.0).toFloat(),
                                            color = accentColors[index % accentColors.size],
                                            trackColor = Color.White.copy(alpha = 0.10f),
                                            modifier = Modifier.weight(1f),
                                        )
                                        Text(
                                            " ${category.share}%",
                                            color = LiquidTheme.textMuted,
                                            fontSize = 12.sp,
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Top products — Top 10 ochiq, qolgani yashirin
                    item {
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .liquidGlassThemed()
                                .padding(16.dp),
                        ) {
                            Text(
                                localized("an_top_products"),
                                color = LiquidTheme.text,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(10.dp))
                            val topProducts = data?.topProducts.orEmpty()
                            val top10 = topProducts.take(10)
                            val rest = topProducts.drop(10)
                            var expanded by remember { mutableStateOf(false) }

                            if (topProducts.isEmpty()) {
                                Text(
                                    if (state.loadFailed) localized("an_load_error") else localized("an_no_data"),
                                    color = LiquidTheme.textMuted,
                                    fontSize = 13.sp,
                                )
                            } else {
                                top10.forEachIndexed { index, product ->
                                    TopProductRow(
                                        rank = index + 1,
                                        name = product.name,
                                        share = product.share,
                                        quantityLabel = if (product.quantity > 0) {
                                            "${formatMoney(product.quantity)} ${product.unit.ifBlank { "" }}".trim()
                                        } else null,
                                        emphasized = true,
                                    )
                                }

                                if (rest.isNotEmpty()) {
                                    if (expanded) {
                                        Spacer(Modifier.height(4.dp))
                                        rest.forEachIndexed { i, product ->
                                            TopProductRow(
                                                rank = i + 11,
                                                name = product.name,
                                                share = product.share,
                                                quantityLabel = if (product.quantity > 0) {
                                                    "${formatMoney(product.quantity)} ${product.unit.ifBlank { "" }}".trim()
                                                } else null,
                                                emphasized = false,
                                            )
                                        }
                                    }

                                    Spacer(Modifier.height(10.dp))
                                    Box(
                                        Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(LiquidGlass.RadiusChip))
                                            .background(LiquidGlass.Indigo.copy(alpha = 0.10f))
                                            .clickable { expanded = !expanded }
                                            .padding(horizontal = 12.dp, vertical = 10.dp),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text(
                                            if (expanded) {
                                                localized("an_show_less")
                                            } else {
                                                "${localized("an_show_more")} (+${rest.size})"
                                            },
                                            color = LiquidGlass.Indigo,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                    }
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
private fun TopProductRow(
    rank: Int,
    name: String,
    share: Double,
    quantityLabel: String?,
    emphasized: Boolean,
) {
    val rankColor = when (rank) {
        1 -> LiquidGlass.Amber
        2 -> LiquidGlass.Cyan
        3 -> LiquidGlass.Violet
        else -> if (emphasized) LiquidGlass.Indigo else LiquidTheme.textMuted
    }
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = if (emphasized) 7.dp else 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            Modifier
                .size(if (emphasized) 28.dp else 24.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(rankColor.copy(alpha = if (emphasized) 0.18f else 0.10f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "$rank",
                color = rankColor,
                fontWeight = FontWeight.Bold,
                fontSize = if (emphasized) 12.sp else 11.sp,
            )
        }
        Column(Modifier.weight(1f)) {
            Text(
                name,
                color = LiquidTheme.text,
                fontSize = if (emphasized) 14.sp else 12.sp,
                fontWeight = if (emphasized) FontWeight.Bold else FontWeight.Medium,
                maxLines = 2,
            )
            if (quantityLabel != null) {
                Text(
                    quantityLabel,
                    color = LiquidTheme.textMuted,
                    fontSize = 11.sp,
                )
            }
        }
        Text(
            "${share}%",
            color = if (emphasized) LiquidGlass.Cyan else LiquidTheme.textMuted,
            fontWeight = FontWeight.Bold,
            fontSize = if (emphasized) 13.sp else 12.sp,
        )
    }
}

@Composable
private fun KpiCard(
    label: String,
    value: String,
    unit: String,
    trend: Double,
    accentColor: Color,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .liquidGlassThemed()
            .padding(14.dp),
    ) {
        Box(
            Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(accentColor.copy(alpha = 0.22f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                if (trend >= 0) Icons.Default.TrendingUp else Icons.Default.TrendingDown,
                null,
                tint = accentColor,
                modifier = Modifier.size(20.dp),
            )
        }
        Spacer(Modifier.height(8.dp))
        Text(label, color = LiquidTheme.textMuted, fontSize = 11.sp)
        Text(value, color = LiquidTheme.text, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Text(unit, color = LiquidTheme.textMuted, fontSize = 11.sp)
        Spacer(Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (trend >= 0) Icons.Default.TrendingUp else Icons.Default.TrendingDown,
                null,
                tint = if (trend >= 0) LiquidGlass.Emerald else LiquidGlass.Rose,
                modifier = Modifier.size(14.dp),
            )
            Text(
                " ${kotlin.math.abs(trend)}%",
                color = if (trend >= 0) LiquidGlass.Emerald else LiquidGlass.Rose,
                fontSize = 11.sp,
            )
        }
    }
}

private fun unitLabel(lang: AppLanguage) = when (lang) {
    AppLanguage.RU -> "единиц"
    AppLanguage.EN -> "units"
    else -> "birlik"
}

private fun dayShortName(lang: AppLanguage, date: String): String {
    return try {
        val d = LocalDate.parse(date.take(10))
        val locale = when (lang) {
            AppLanguage.RU, AppLanguage.UZ_KRIL -> Locale("ru")
            AppLanguage.EN -> Locale.ENGLISH
            else -> Locale("uz")
        }
        d.dayOfWeek.getDisplayName(TextStyle.SHORT, locale).take(3)
    } catch (_: Exception) {
        date.takeLast(5)
    }
}

private fun monthShortName(lang: AppLanguage, month: Int): String {
    val index = (month - 1).coerceIn(0, 11)
    val names = when (lang) {
        AppLanguage.RU, AppLanguage.UZ_KRIL -> listOf(
            "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
            "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
        )
        AppLanguage.EN -> listOf(
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        )
        else -> listOf(
            "Yan", "Fev", "Mar", "Apr", "May", "Iyn",
            "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek",
        )
    }
    return names[index]
}
