package uz.lider.client.presentation.dashboard

import android.graphics.drawable.ColorDrawable
import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
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
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.AppStrings
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassMenuColors
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle as MonthTextStyle
import java.util.Locale

@Composable
fun DashboardDateRangeDialog(
    visible: Boolean,
    onDismiss: () -> Unit,
    onApply: (startMillis: Long, endMillis: Long) -> Unit,
    onClear: () -> Unit,
    onSelectAll: () -> Unit = onClear,
    initialStartMillis: Long?,
    initialEndMillis: Long?,
    salesDays: Set<LocalDate> = emptySet(),
    /** Kun ostida qizil summa (masalan qarzdorlik). */
    dayAmounts: Map<LocalDate, Double> = emptyMap(),
    title: String,
    applyLabel: String,
    cancelLabel: String,
) {
    if (!visible) return

    val lang = LocalAppLanguage.current
    val t = remember(lang) { { key: String -> AppStrings.t(lang, key) } }
    val today = remember { LocalDate.now() }
    val glassShape = RoundedCornerShape(LiquidGlass.RadiusSheet)
    val (glassFill, glassBorder) = liquidGlassMenuColors()
    val isDark = LiquidTheme.isDark

    var displayMonth by remember(visible) {
        mutableStateOf(
            initialStartMillis?.let { YearMonth.from(DashboardDateFilter.fromMillis(it)) }
                ?: YearMonth.from(today),
        )
    }
    var rangeStart by remember(visible) {
        mutableStateOf(initialStartMillis?.let { DashboardDateFilter.fromMillis(it) })
    }
    var rangeEnd by remember(visible) {
        mutableStateOf(initialEndMillis?.let { DashboardDateFilter.fromMillis(it) })
    }
    var selectedPreset by remember(visible) { mutableStateOf<DatePreset?>(null) }

    fun applyRange(range: DashboardDateRange, preset: DatePreset) {
        rangeStart = range.start
        rangeEnd = range.end
        selectedPreset = preset
        displayMonth = YearMonth.from(range.end)
        onApply(
            DashboardDateFilter.toStartMillis(range.start),
            DashboardDateFilter.toStartMillis(range.end),
        )
        onDismiss()
    }

    fun applyCurrentSelection() {
        val start = rangeStart ?: return
        val rawEnd = rangeEnd ?: start
        val clampedStart = if (start.isAfter(today)) today else start
        val clampedEnd = if (rawEnd.isAfter(today)) today else rawEnd
        val range = DashboardDateFilter.normalizeRange(clampedStart, clampedEnd)
        applyRange(range, DatePreset.CUSTOM)
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false,
        ),
    ) {
        val view = LocalView.current
        SideEffect {
            val window = (view.parent as? DialogWindowProvider)?.window ?: return@SideEffect
            window.setBackgroundDrawable(ColorDrawable(android.graphics.Color.TRANSPARENT))
            window.setDimAmount(if (isDark) 0.72f else 0.42f)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                window.setBackgroundBlurRadius(80)
            }
        }

        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                LiquidGlass.Indigo.copy(alpha = if (isDark) 0.18f else 0.10f),
                                Color.Black.copy(alpha = if (isDark) 0.62f else 0.28f),
                            ),
                        ),
                    )
                    .clickable(
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() },
                        onClick = onDismiss,
                    ),
            )

            Column(
                modifier = Modifier
                    .width(340.dp)
                    .shadow(
                        elevation = 24.dp,
                        shape = glassShape,
                        ambientColor = LiquidGlass.Indigo.copy(alpha = 0.28f),
                        spotColor = LiquidGlass.Violet.copy(alpha = 0.35f),
                    )
                    .clip(glassShape)
                    .background(
                        if (isDark) Color(0xF21A1B2E) else glassFill,
                    )
                    .border(width = 1.dp, brush = glassBorder, shape = glassShape)
                    .padding(16.dp)
                    .clickable(
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() },
                        onClick = {},
                    ),
            ) {
                Text(
                    t("dash_date_range"),
                    color = LiquidTheme.textMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.sp,
                )
                Spacer(Modifier.height(12.dp))

                PresetGrid(
                    selected = selectedPreset,
                    labels = listOf(
                        DatePreset.TODAY to t("dash_preset_today"),
                        DatePreset.WEEK to t("dash_preset_week"),
                        DatePreset.MONTH to t("dash_preset_month"),
                        DatePreset.ALL to t("dash_preset_all"),
                    ),
                    onSelect = { preset ->
                        when (preset) {
                            DatePreset.TODAY -> applyRange(DashboardDateFilter.todayRange(), preset)
                            DatePreset.WEEK -> applyRange(DashboardDateFilter.thisWeekRange(), preset)
                            DatePreset.MONTH -> applyRange(DashboardDateFilter.thisMonthRange(), preset)
                            DatePreset.ALL -> {
                                onSelectAll()
                                onDismiss()
                            }
                            DatePreset.CUSTOM -> Unit
                        }
                    },
                )

                Spacer(Modifier.height(14.dp))

                MonthHeader(
                    label = formatMonthYear(lang, displayMonth),
                    canGoNext = displayMonth < YearMonth.from(today),
                    onPrev = { displayMonth = displayMonth.minusMonths(1) },
                    onNext = {
                        val next = displayMonth.plusMonths(1)
                        if (!next.isAfter(YearMonth.from(today))) {
                            displayMonth = next
                        }
                    },
                )

                Spacer(Modifier.height(8.dp))

                WeekdayRow(labels = weekdayLabels(lang))

                Spacer(Modifier.height(4.dp))

                CalendarGrid(
                    month = displayMonth,
                    today = today,
                    rangeStart = rangeStart,
                    rangeEnd = rangeEnd,
                    salesDays = salesDays,
                    dayAmounts = dayAmounts,
                    onDayClick = { date ->
                        if (date.isAfter(today)) return@CalendarGrid
                        selectedPreset = DatePreset.CUSTOM
                        when {
                            rangeStart == null || rangeEnd != null -> {
                                rangeStart = date
                                rangeEnd = null
                            }
                            date.isBefore(rangeStart) -> {
                                rangeEnd = rangeStart
                                rangeStart = date
                                applyCurrentSelection()
                            }
                            else -> {
                                rangeEnd = date
                                applyCurrentSelection()
                            }
                        }
                    },
                )

                Spacer(Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        t("dash_clear_dates"),
                        color = LiquidTheme.textMuted,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .clickable {
                                rangeStart = null
                                rangeEnd = null
                                selectedPreset = null
                                onClear()
                                onDismiss()
                            }
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                    )
                    Text(
                        t("dash_preset_today"),
                        color = LiquidGlass.Indigo,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .clickable {
                                applyRange(DashboardDateFilter.todayRange(), DatePreset.TODAY)
                            }
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun PresetGrid(
    selected: DatePreset?,
    labels: List<Pair<DatePreset, String>>,
    onSelect: (DatePreset) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        labels.chunked(2).forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                row.forEach { (preset, label) ->
                    PresetChip(
                        label = label,
                        selected = selected == preset,
                        modifier = Modifier.weight(1f),
                        onClick = { onSelect(preset) },
                    )
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun PresetChip(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(14.dp)
    Box(
        modifier = modifier
            .height(40.dp)
            .clip(shape)
            .then(
                if (selected) {
                    Modifier.background(LiquidGlass.GradientPrimary)
                } else {
                    Modifier
                        .background(
                            if (LiquidTheme.isDark) Color.White.copy(alpha = 0.08f)
                            else Color.White.copy(alpha = 0.55f),
                        )
                        .border(
                            1.dp,
                            Color.White.copy(alpha = if (LiquidTheme.isDark) 0.18f else 0.65f),
                            shape,
                        )
                },
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = if (selected) Color.White else LiquidTheme.text,
            fontSize = 13.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun MonthHeader(
    label: String,
    canGoNext: Boolean,
    onPrev: () -> Unit,
    onNext: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onPrev, modifier = Modifier.size(32.dp)) {
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                contentDescription = null,
                tint = LiquidTheme.textMuted,
            )
        }
        Text(label, color = LiquidTheme.text, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
        IconButton(
            onClick = onNext,
            enabled = canGoNext,
            modifier = Modifier.size(32.dp),
        ) {
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = if (canGoNext) LiquidTheme.textMuted else LiquidTheme.textMuted.copy(alpha = 0.28f),
            )
        }
    }
}

@Composable
private fun WeekdayRow(labels: List<String>) {
    Row(Modifier.fillMaxWidth()) {
        labels.forEach { label ->
            Text(
                label,
                modifier = Modifier.weight(1f),
                textAlign = TextAlign.Center,
                color = LiquidTheme.textMuted,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}

@Composable
private fun CalendarGrid(
    month: YearMonth,
    today: LocalDate,
    rangeStart: LocalDate?,
    rangeEnd: LocalDate?,
    salesDays: Set<LocalDate>,
    dayAmounts: Map<LocalDate, Double>,
    onDayClick: (LocalDate) -> Unit,
) {
    val cells = remember(month) { DashboardDateFilter.monthGrid(month) }
    val normalized = if (rangeStart != null && rangeEnd != null) {
        DashboardDateFilter.normalizeRange(rangeStart, rangeEnd)
    } else null
    val showAmounts = dayAmounts.isNotEmpty()

    Column(verticalArrangement = Arrangement.spacedBy(if (showAmounts) 2.dp else 4.dp)) {
        cells.chunked(7).forEach { week ->
            Row(modifier = Modifier.fillMaxWidth()) {
                week.forEach { date ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .then(
                                if (showAmounts) Modifier.padding(vertical = 2.dp)
                                else Modifier.aspectRatio(1f),
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (date != null) {
                            val enabled = !date.isAfter(today)
                            DayCell(
                                date = date,
                                isToday = date == today,
                                enabled = enabled,
                                inRange = enabled && normalized?.let { date >= it.start && date <= it.end } == true,
                                isStart = enabled && (
                                    date == normalized?.start ||
                                        (rangeStart != null && rangeEnd == null && date == rangeStart)
                                    ),
                                isEnd = enabled && date == normalized?.end,
                                hasSales = enabled && salesDays.contains(date) && !showAmounts,
                                dayAmount = if (enabled) dayAmounts[date] else null,
                                reserveAmountSpace = showAmounts,
                                onClick = { if (enabled) onDayClick(date) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DayCell(
    date: LocalDate,
    isToday: Boolean,
    enabled: Boolean,
    inRange: Boolean,
    isStart: Boolean,
    isEnd: Boolean,
    hasSales: Boolean,
    dayAmount: Double?,
    reserveAmountSpace: Boolean,
    onClick: () -> Unit,
) {
    val isEdge = isStart || isEnd
    val amount = dayAmount?.takeIf { it > 0 }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 1.dp)
            .then(if (enabled) Modifier.clickable(onClick = onClick) else Modifier),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(if (reserveAmountSpace) 28.dp else 34.dp)
                .clip(CircleShape)
                .then(
                    when {
                        !enabled -> Modifier
                        isEdge -> Modifier.background(LiquidGlass.Indigo)
                        inRange -> Modifier.background(LiquidGlass.Indigo.copy(alpha = 0.18f))
                        isToday -> Modifier.border(1.5.dp, LiquidGlass.Indigo, CircleShape)
                        else -> Modifier
                    },
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "${date.dayOfMonth}",
                color = when {
                    !enabled -> LiquidTheme.textMuted.copy(alpha = 0.28f)
                    isEdge -> Color.White
                    isToday -> LiquidGlass.Indigo
                    inRange -> LiquidGlass.Indigo
                    else -> LiquidTheme.text
                },
                style = TextStyle(
                    fontSize = if (reserveAmountSpace) 12.sp else 13.sp,
                    fontWeight = if (isEdge || isToday || inRange) FontWeight.SemiBold else FontWeight.Normal,
                    textAlign = TextAlign.Center,
                    platformStyle = PlatformTextStyle(includeFontPadding = false),
                    lineHeightStyle = LineHeightStyle(
                        alignment = LineHeightStyle.Alignment.Center,
                        trim = LineHeightStyle.Trim.Both,
                    ),
                ),
            )
        }

        when {
            amount != null -> {
                Text(
                    text = uz.lider.client.presentation.components.formatCompactMoney(amount),
                    color = if (isEdge) Color(0xFFFF8A9A) else LiquidGlass.Rose,
                    fontSize = 7.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    textAlign = TextAlign.Center,
                    style = TextStyle(
                        platformStyle = PlatformTextStyle(includeFontPadding = false),
                    ),
                )
            }
            hasSales && enabled -> {
                Box(
                    modifier = Modifier
                        .padding(top = 2.dp)
                        .size(5.dp)
                        .clip(CircleShape)
                        .background(if (isEdge) Color.White else LiquidGlass.Indigo),
                )
            }
            reserveAmountSpace -> {
                Spacer(modifier = Modifier.height(10.dp))
            }
        }
    }
}

private fun weekdayLabels(lang: AppLanguage): List<String> = when (lang) {
    AppLanguage.UZ_KRIL -> listOf("Дш", "Се", "Чо", "Па", "Жу", "Ша", "Як")
    AppLanguage.RU -> listOf("Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс")
    AppLanguage.EN -> listOf("Mo", "Tu", "We", "Th", "Fr", "Sa", "Su")
    else -> listOf("Du", "Se", "Cho", "Pa", "Ju", "Sha", "Yak")
}

private fun formatMonthYear(lang: AppLanguage, month: YearMonth): String {
    val locale = when (lang) {
        AppLanguage.RU -> Locale("ru")
        AppLanguage.EN -> Locale.ENGLISH
        AppLanguage.UZ_KRIL -> Locale("uz")
        else -> Locale("uz")
    }
    val monthName = month.month.getDisplayName(MonthTextStyle.FULL_STANDALONE, locale)
        .replaceFirstChar { if (it.isLowerCase()) it.titlecase(locale) else it.toString() }
    return "$monthName ${month.year}"
}
