package uz.lider.client.presentation.analytics

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import uz.lider.client.presentation.components.ClientTabScaffold
import uz.lider.client.presentation.components.HorizontalProgressBar
import uz.lider.client.presentation.components.SimpleAreaChart
import uz.lider.client.presentation.components.SimpleBarChart
import uz.lider.client.presentation.components.clientCard
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.rememberClientPalette

@Composable
fun AnalyticsScreen(
    onNavigate: (String) -> Unit,
    viewModel: AnalyticsViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val palette = rememberClientPalette()
    val state by viewModel.uiState.collectAsState()
    val data = state.data

    ClientTabScaffold(title = localized("an_title"), bottomPadding = true) { padding ->
        if (state.loading && data == null) {
            Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = palette.primary)
            }
            return@ClientTabScaffold
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    Row(Modifier.clip(RoundedCornerShape(12.dp)).background(palette.surface2).padding(4.dp)) {
                        listOf(
                            "week" to localized("an_week"),
                            "month" to localized("an_month"),
                            "year" to localized("an_year"),
                        ).forEach { (key, label) ->
                            Box(
                                Modifier
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (state.period == key) palette.primary else Color.Transparent)
                                    .clickable { viewModel.setPeriod(key) }
                                    .padding(horizontal = 12.dp, vertical = 6.dp),
                            ) {
                                Text(
                                    label,
                                    color = if (state.period == key) Color.White else palette.textMuted,
                                    fontSize = 12.sp,
                                )
                            }
                        }
                    }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    KpiCard(
                        localized("an_total"),
                        formatMoney(data?.totalPurchases ?: 0.0),
                        localized("com_som"),
                        data?.totalPurchasesTrend ?: 0.0,
                        palette.primary,
                        Modifier.weight(1f),
                    )
                    KpiCard(
                        localized("an_orders"),
                        "${data?.orderCount ?: 0}",
                        "ta",
                        data?.orderCountTrend ?: 0.0,
                        palette.secondary,
                        Modifier.weight(1f),
                    )
                }
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    KpiCard(
                        localized("an_avg_check"),
                        formatMoney(data?.avgCheck ?: 0.0),
                        localized("com_som"),
                        data?.avgCheckTrend ?: 0.0,
                        palette.accent,
                        Modifier.weight(1f),
                    )
                    KpiCard(
                        localized("an_goods"),
                        formatMoney(data?.totalQuantity ?: 0.0),
                        unitLabel(lang),
                        data?.totalQuantityTrend ?: 0.0,
                        palette.success,
                        Modifier.weight(1f),
                    )
                }
            }
            item {
                Column(Modifier.clientCard(palette).padding(16.dp)) {
                    Text(localized("an_monthly_chart"), color = palette.text, fontWeight = FontWeight.SemiBold)
                    val monthly = data?.monthlyPurchases.orEmpty()
                    val monthlyValues = monthly.map { it.amount.toFloat() }
                    val monthlyLabels = monthly.map { monthShortName(lang, it.month) }
                    SimpleBarChart(
                        values = monthlyValues.ifEmpty { listOf(0f) },
                        labels = monthlyLabels.ifEmpty { emptyList() },
                        barColor = palette.primary,
                        heightDp = 140,
                        labelColor = palette.textMuted,
                    )
                }
            }
            item {
                Column(Modifier.clientCard(palette).padding(16.dp)) {
                    Text(localized("an_weekly"), color = palette.text, fontWeight = FontWeight.SemiBold)
                    val weeklyValues = data?.weeklyDynamics.orEmpty().map { it.amount.toFloat() }
                    SimpleAreaChart(
                        values = if (weeklyValues.size >= 2) weeklyValues else listOf(0f, 0f),
                        strokeColor = palette.secondary,
                        fillColor = palette.secondary.copy(alpha = 0.3f),
                        heightDp = 100,
                    )
                }
            }
            item {
                Column(Modifier.clientCard(palette).padding(16.dp)) {
                    Text(localized("an_by_category"), color = palette.text, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(12.dp))
                    val categories = data?.categories.orEmpty()
                    if (categories.isEmpty()) {
                        Text(
                            if (state.loadFailed) localized("an_load_error") else localized("an_no_data"),
                            color = palette.textMuted,
                            fontSize = 13.sp,
                        )
                    } else {
                        val colors = listOf(palette.primary, palette.secondary, palette.accent, palette.warning, palette.success, palette.danger)
                        categories.forEachIndexed { index, category ->
                            Row(
                                Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    category.name,
                                    color = palette.text,
                                    modifier = Modifier.width(120.dp),
                                    fontSize = 13.sp,
                                )
                                HorizontalProgressBar(
                                    (category.share / 100.0).toFloat(),
                                    colors[index % colors.size],
                                    palette.surface2,
                                    Modifier.weight(1f),
                                )
                                Text(" ${category.share}%", color = palette.textMuted, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
            item {
                Column(Modifier.clientCard(palette).padding(16.dp)) {
                    Text(localized("an_top_products"), color = palette.text, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    val topProducts = data?.topProducts.orEmpty()
                    if (topProducts.isEmpty()) {
                        Text(
                            if (state.loadFailed) localized("an_load_error") else localized("an_no_data"),
                            color = palette.textMuted,
                            fontSize = 13.sp,
                        )
                    } else {
                        topProducts.forEach { product ->
                            Row(
                                Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(product.name, color = palette.text, fontSize = 13.sp)
                                Text(
                                    "${product.share}%",
                                    color = palette.primary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
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
private fun KpiCard(
    label: String,
    value: String,
    unit: String,
    trend: Double,
    color: Color,
    modifier: Modifier = Modifier,
) {
    val palette = rememberClientPalette()
    Column(modifier.clientCard(palette).padding(14.dp)) {
        Text(label, color = palette.textMuted, fontSize = 11.sp)
        Text(value, color = palette.text, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Text(unit, color = palette.textMuted, fontSize = 11.sp)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (trend >= 0) Icons.Default.TrendingUp else Icons.Default.TrendingDown,
                null,
                tint = if (trend >= 0) palette.success else palette.danger,
                modifier = Modifier.height(14.dp),
            )
            Text(
                " ${kotlin.math.abs(trend)}%",
                color = if (trend >= 0) palette.success else palette.danger,
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
