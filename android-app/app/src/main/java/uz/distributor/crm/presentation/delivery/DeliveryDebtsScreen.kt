package uz.distributor.crm.presentation.delivery

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.plan.PlanDateFilter
import java.text.DecimalFormat
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

private val Accent = Color(0xFF3B82F6)
private val DeliveryAccent = Color(0xFF6366F1)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryDebtsScreen(
    onBackToDelivery: () -> Unit,
    onOrderClick: (String) -> Unit,
    viewModel: DeliveryDebtsViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val state by viewModel.uiState.collectAsState()
    val bg = if (isDark) Color(0xFF0E1621) else Color(0xFFF3F4F6)
    val cardBg = if (isDark) Color(0xFF17212B) else Color.White
    val textPrimary = if (isDark) Color.White else Color.Black
    val textMuted = if (isDark) Color(0xFF8E9BA7) else Color(0xFF6B7280)
    val formatter = remember { DecimalFormat("#,###") }

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                title = {
                    DeliverySectionTabs(
                        selectedDebts = true,
                        lang = lang,
                        onDelivery = onBackToDelivery,
                        onDebts = {},
                    )
                },
                actions = {
                    val n = state.debts.size
                    if (n > 0) {
                        Text(
                            "$n",
                            color = Accent,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            modifier = Modifier.padding(end = 4.dp),
                        )
                    }
                    IconButton(onClick = viewModel::load) {
                        Icon(Icons.Default.Refresh, null, tint = textPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = if (isDark) Color(0xFF17212B) else Color.White,
                ),
            )
        },
        containerColor = bg,
    ) { padding ->
        Box(
            Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.isLoading -> {
                    CircularProgressIndicator(Modifier.align(Alignment.Center), color = Accent)
                }
                else -> {
                    var displayMonth by remember(state.selectedDate) {
                        mutableStateOf(YearMonth.from(state.selectedDate))
                    }
                    val selectedCount = state.countsByDate[state.selectedDate] ?: 0
                    LazyColumn(
                        Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        item {
                            DebtsMonthCalendar(
                                month = displayMonth,
                                selected = state.selectedDate,
                                counts = state.countsByDate,
                                isDark = isDark,
                                textPrimary = textPrimary,
                                textMuted = textMuted,
                                lang = lang,
                                onPrev = { displayMonth = displayMonth.minusMonths(1) },
                                onNext = { displayMonth = displayMonth.plusMonths(1) },
                                onSelect = viewModel::selectDate,
                            )
                        }
                        item {
                            Text(
                                AppStrings.deliveryDebtsCount(lang, selectedCount),
                                color = textMuted,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                        if (state.selectedDebts.isEmpty()) {
                            item {
                                Column(
                                    Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 32.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    Icon(
                                        Icons.Default.AccountBalanceWallet,
                                        null,
                                        tint = textMuted,
                                        modifier = Modifier.size(48.dp),
                                    )
                                    Spacer(Modifier.height(10.dp))
                                    Text(AppStrings.noDeliveryDebts(lang), color = textMuted, fontSize = 14.sp)
                                }
                            }
                        } else {
                            items(state.selectedDebts, key = { it.id }) { order ->
                                DebtOrderCard(
                                    order = order,
                                    cardBg = cardBg,
                                    textPrimary = textPrimary,
                                    textMuted = textMuted,
                                    lang = lang,
                                    formatter = formatter,
                                    onClick = { onOrderClick(order.id) },
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
internal fun DeliverySectionTabs(
    selectedDebts: Boolean,
    lang: AppLanguage,
    onDelivery: () -> Unit,
    onDebts: () -> Unit,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            AppStrings.deliveryOrdersTitle(lang),
            fontWeight = if (!selectedDebts) FontWeight.Bold else FontWeight.Medium,
            fontSize = 18.sp,
            color = if (!selectedDebts) DeliveryAccent else Color(0xFF9CA3AF),
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .clickable(onClick = onDelivery)
                .padding(horizontal = 4.dp, vertical = 2.dp),
        )
        Spacer(Modifier.width(14.dp))
        Text(
            AppStrings.deliveryDebtsTitle(lang),
            fontWeight = if (selectedDebts) FontWeight.Bold else FontWeight.Medium,
            fontSize = 18.sp,
            color = if (selectedDebts) Accent else Color(0xFF9CA3AF),
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .clickable(onClick = onDebts)
                .padding(horizontal = 4.dp, vertical = 2.dp),
        )
    }
}

@Composable
private fun DebtsMonthCalendar(
    month: YearMonth,
    selected: LocalDate,
    counts: Map<LocalDate, Int>,
    isDark: Boolean,
    textPrimary: Color,
    textMuted: Color,
    lang: AppLanguage,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onSelect: (LocalDate) -> Unit,
) {
    val glassFill = if (isDark) Color(0xFF111827) else Color.White
    val glassBorder = if (isDark) Color.White.copy(alpha = 0.12f) else Color.White.copy(alpha = 0.65f)

    Column(
        Modifier
            .fillMaxWidth()
            .shadow(8.dp, RoundedCornerShape(20.dp))
            .clip(RoundedCornerShape(20.dp))
            .background(glassFill)
            .border(1.dp, glassBorder, RoundedCornerShape(20.dp))
            .padding(14.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onPrev, modifier = Modifier.size(32.dp)) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, null, tint = textMuted)
            }
            Text(
                formatMonthYear(lang, month),
                color = textPrimary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
            )
            IconButton(onClick = onNext, modifier = Modifier.size(32.dp)) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = textMuted)
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth()) {
            weekdayLabels(lang).forEach { label ->
                Text(
                    label,
                    Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    color = textMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
        Spacer(Modifier.height(4.dp))
        val cells = remember(month) { PlanDateFilter.monthGrid(month) }
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            cells.chunked(7).forEach { week ->
                Row(Modifier.fillMaxWidth()) {
                    week.forEach { date ->
                        Box(
                            Modifier
                                .weight(1f)
                                .aspectRatio(0.85f),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (date != null) {
                                val count = counts[date] ?: 0
                                val isSelected = date == selected
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .clip(RoundedCornerShape(10.dp))
                                        .clickable { onSelect(date) }
                                        .padding(vertical = 2.dp),
                                    verticalArrangement = Arrangement.Center,
                                ) {
                                    Box(
                                        Modifier
                                            .size(30.dp)
                                            .clip(CircleShape)
                                            .then(
                                                when {
                                                    isSelected -> Modifier.background(Accent)
                                                    date == LocalDate.now() ->
                                                        Modifier.border(1.5.dp, Accent, CircleShape)
                                                    else -> Modifier
                                                },
                                            ),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text(
                                            "${date.dayOfMonth}",
                                            color = when {
                                                isSelected -> Color.White
                                                date == LocalDate.now() -> Accent
                                                else -> textPrimary
                                            },
                                            fontSize = 13.sp,
                                            fontWeight = if (isSelected || date == LocalDate.now()) {
                                                FontWeight.SemiBold
                                            } else {
                                                FontWeight.Normal
                                            },
                                        )
                                    }
                                    Text(
                                        if (count > 0) "$count" else " ",
                                        color = if (count > 0) {
                                            if (isSelected) Accent else Accent.copy(alpha = 0.85f)
                                        } else {
                                            Color.Transparent
                                        },
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        lineHeight = 11.sp,
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

@Composable
private fun DebtOrderCard(
    order: OrderDto,
    cardBg: Color,
    textPrimary: Color,
    textMuted: Color,
    lang: AppLanguage,
    formatter: DecimalFormat,
    onClick: () -> Unit,
) {
    val context = LocalContext.current
    val name = order.clientName ?: AppStrings.clientFallback(lang)
    val phone = order.clientPhone?.takeIf { it.isNotBlank() }
    val address = order.clientAddress?.takeIf { it.isNotBlank() }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = cardBg),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(name, fontWeight = FontWeight.SemiBold, fontSize = 17.sp, color = textPrimary, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(6.dp))
            Text(
                "${AppStrings.deliveryRemaining(lang)}: ${formatter.format(order.remainingBalance)} so'm",
                color = Color(0xFFD97706),
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
            )
            if (address != null) {
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.Top) {
                    Icon(Icons.Default.Place, null, tint = textMuted, modifier = Modifier.size(16.dp).padding(top = 2.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(address, color = textMuted, fontSize = 14.sp, modifier = Modifier.weight(1f))
                }
            }
            if (phone != null) {
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Text(phone, color = textPrimary, fontSize = 15.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(Accent.copy(alpha = 0.12f))
                            .clickable {
                                context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Default.Phone, null, tint = Accent, modifier = Modifier.size(20.dp))
                    }
                }
            }
        }
    }
}

private fun weekdayLabels(lang: AppLanguage): List<String> = when (lang) {
    AppLanguage.UZ_CYRILLIC -> listOf("Дш", "Се", "Чо", "Па", "Жу", "Ша", "Як")
    AppLanguage.RUS -> listOf("Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс")
    else -> listOf("Du", "Se", "Cho", "Pa", "Ju", "Sha", "Yak")
}

private fun formatMonthYear(lang: AppLanguage, month: YearMonth): String {
    val locale = when (lang) {
        AppLanguage.RUS -> Locale("ru")
        AppLanguage.UZ_CYRILLIC -> Locale("uz")
        else -> Locale("uz")
    }
    val monthName = month.month.getDisplayName(TextStyle.FULL_STANDALONE, locale)
        .replaceFirstChar { if (it.isLowerCase()) it.titlecase(locale) else it.toString() }
    return "$monthName ${month.year}"
}
