package uz.distributor.crm.presentation.plan

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

private val Accent = Color(0xFF3B82F6)
private val AccentGradient = Brush.linearGradient(
    listOf(Color(0xFF312E81), Color(0xFF1E40AF), Color(0xFF0E7490)),
)

@Composable
fun PlanDateRangeDialog(
    visible: Boolean,
    isDark: Boolean,
    onDismiss: () -> Unit,
    onApply: (startMillis: Long, endMillis: Long) -> Unit,
    onClear: () -> Unit,
    onPreset: (PlanDatePreset) -> Unit,
    initialStartMillis: Long?,
    initialEndMillis: Long?,
) {
    if (!visible) return

    val lang = LocalAppLanguage.current
    val today = remember { LocalDate.now() }
    val glassShape = RoundedCornerShape(24.dp)
    val glassFill = if (isDark) Color(0xFF111827).copy(alpha = 0.97f) else Color.White.copy(alpha = 0.97f)
    val glassBorder = Color.White.copy(alpha = if (isDark) 0.18f else 0.65f)
    val textColor = if (isDark) Color.White else Color(0xFF111827)
    val mutedColor = if (isDark) Color(0xFF9CA3AF) else Color(0xFF6B7280)

    val currentMonth = YearMonth.from(today)
    var displayMonth by remember(visible) {
        val initial = initialStartMillis?.let { YearMonth.from(PlanDateFilter.fromMillis(it)) }
            ?: currentMonth
        mutableStateOf(if (initial.isAfter(currentMonth)) currentMonth else initial)
    }
    var rangeStart by remember(visible) {
        mutableStateOf(
            initialStartMillis?.let { PlanDateFilter.fromMillis(it) }
                ?.takeUnless { PlanDateFilter.isFuture(it, today) },
        )
    }
    var rangeEnd by remember(visible) {
        mutableStateOf(
            initialEndMillis?.let { PlanDateFilter.fromMillis(it) }
                ?.takeUnless { PlanDateFilter.isFuture(it, today) },
        )
    }
    var selectedPreset by remember(visible) { mutableStateOf<PlanDatePreset?>(null) }

    fun applyRange(range: PlanDateRange, preset: PlanDatePreset) {
        val clamped = PlanDateFilter.normalizeRange(range.start, range.end, today)
        rangeStart = clamped.start
        rangeEnd = clamped.end
        selectedPreset = preset
        val endMonth = YearMonth.from(clamped.end)
        displayMonth = if (endMonth.isAfter(currentMonth)) currentMonth else endMonth
        if (preset == PlanDatePreset.CUSTOM) {
            onApply(
                PlanDateFilter.toStartMillis(clamped.start),
                PlanDateFilter.toStartMillis(clamped.end),
            )
        }
        onPreset(preset)
        onDismiss()
    }

    fun applyCurrentSelection() {
        val start = rangeStart ?: return
        val end = rangeEnd ?: start
        applyRange(PlanDateFilter.normalizeRange(start, end, today), PlanDatePreset.CUSTOM)
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        val view = LocalView.current
        SideEffect {
            val window = (view.parent as? DialogWindowProvider)?.window ?: return@SideEffect
            window.setBackgroundDrawable(ColorDrawable(android.graphics.Color.TRANSPARENT))
            window.setDimAmount(0.42f)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                window.setBackgroundBlurRadius(80)
            }
        }

        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(Accent.copy(alpha = 0.10f), Color.Black.copy(alpha = 0.28f)),
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
                    .shadow(24.dp, glassShape, ambientColor = Accent.copy(0.28f), spotColor = Accent.copy(0.35f))
                    .clip(glassShape)
                    .background(glassFill)
                    .border(1.dp, glassBorder, glassShape)
                    .padding(16.dp)
                    .clickable(
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() },
                        onClick = {},
                    ),
            ) {
                Text(
                    AppStrings.planDateRange(lang),
                    color = mutedColor,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.sp,
                )
                Spacer(Modifier.height(12.dp))

                PresetGrid(
                    selected = selectedPreset,
                    isDark = isDark,
                    labels = listOf(
                        PlanDatePreset.TODAY to AppStrings.planPresetToday(lang),
                        PlanDatePreset.WEEK to AppStrings.planPresetWeek(lang),
                        PlanDatePreset.MONTH to AppStrings.planPresetMonth(lang),
                        PlanDatePreset.ALL to AppStrings.planPresetAll(lang),
                    ),
                    onSelect = { preset ->
                        when (preset) {
                            PlanDatePreset.TODAY -> applyRange(PlanDateFilter.todayRange(), preset)
                            PlanDatePreset.WEEK -> applyRange(PlanDateFilter.thisWeekRange(), preset)
                            PlanDatePreset.MONTH -> applyRange(PlanDateFilter.thisMonthRange(), preset)
                            PlanDatePreset.ALL -> {
                                onClear()
                                onPreset(preset)
                                onDismiss()
                            }
                            PlanDatePreset.CUSTOM -> Unit
                        }
                    },
                )

                Spacer(Modifier.height(14.dp))

                val canGoNext = displayMonth.isBefore(YearMonth.from(today))
                MonthHeader(
                    label = formatMonthYear(lang, displayMonth),
                    mutedColor = mutedColor,
                    textColor = textColor,
                    canGoNext = canGoNext,
                    onPrev = { displayMonth = displayMonth.minusMonths(1) },
                    onNext = { if (canGoNext) displayMonth = displayMonth.plusMonths(1) },
                )

                Spacer(Modifier.height(8.dp))
                WeekdayRow(labels = weekdayLabels(lang), mutedColor = mutedColor)
                Spacer(Modifier.height(4.dp))

                CalendarGrid(
                    month = displayMonth,
                    today = today,
                    rangeStart = rangeStart,
                    rangeEnd = rangeEnd,
                    textColor = textColor,
                    mutedColor = mutedColor,
                    onDayClick = { date ->
                        if (PlanDateFilter.isFuture(date, today)) return@CalendarGrid
                        selectedPreset = PlanDatePreset.CUSTOM
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
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        AppStrings.planClearDates(lang),
                        color = mutedColor,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .clickable {
                                rangeStart = null
                                rangeEnd = null
                                selectedPreset = null
                                onClear()
                                onPreset(PlanDatePreset.ALL)
                                onDismiss()
                            }
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                    )
                    Text(
                        AppStrings.planPresetToday(lang),
                        color = Accent,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .clickable { applyRange(PlanDateFilter.todayRange(), PlanDatePreset.TODAY) }
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun PresetGrid(
    selected: PlanDatePreset?,
    isDark: Boolean,
    labels: List<Pair<PlanDatePreset, String>>,
    onSelect: (PlanDatePreset) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        labels.chunked(2).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { (preset, label) ->
                    PresetChip(
                        label = label,
                        selected = selected == preset,
                        isDark = isDark,
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
    isDark: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(14.dp)
    Box(
        modifier = modifier
            .height(40.dp)
            .clip(shape)
            .then(
                if (selected) Modifier.background(AccentGradient)
                else Modifier
                    .background(if (isDark) Color.White.copy(0.08f) else Color(0xFFF3F4F6))
                    .border(1.dp, Color.White.copy(alpha = if (isDark) 0.18f else 0.65f), shape),
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = if (selected) Color.White else if (isDark) Color.White else Color(0xFF111827),
            fontSize = 13.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun MonthHeader(
    label: String,
    mutedColor: Color,
    textColor: Color,
    canGoNext: Boolean,
    onPrev: () -> Unit,
    onNext: () -> Unit,
) {
    val nextTint = if (canGoNext) mutedColor else mutedColor.copy(alpha = 0.35f)
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onPrev, modifier = Modifier.size(32.dp)) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, null, tint = mutedColor)
        }
        Text(label, color = textColor, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
        IconButton(onClick = onNext, enabled = canGoNext, modifier = Modifier.size(32.dp)) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = nextTint)
        }
    }
}

@Composable
private fun WeekdayRow(labels: List<String>, mutedColor: Color) {
    Row(Modifier.fillMaxWidth()) {
        labels.forEach { label ->
            Text(label, Modifier.weight(1f), textAlign = TextAlign.Center, color = mutedColor, fontSize = 11.sp, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun CalendarGrid(
    month: YearMonth,
    today: LocalDate,
    rangeStart: LocalDate?,
    rangeEnd: LocalDate?,
    textColor: Color,
    mutedColor: Color,
    onDayClick: (LocalDate) -> Unit,
) {
    val cells = remember(month) { PlanDateFilter.monthGrid(month) }
    val normalized = if (rangeStart != null && rangeEnd != null) {
        PlanDateFilter.normalizeRange(rangeStart, rangeEnd)
    } else null

    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        cells.chunked(7).forEach { week ->
            Row(Modifier.fillMaxWidth()) {
                week.forEach { date ->
                    Box(Modifier.weight(1f).aspectRatio(1f), contentAlignment = Alignment.Center) {
                        if (date != null) {
                            val isFuture = PlanDateFilter.isFuture(date, today)
                            DayCell(
                                date = date,
                                isToday = date == today,
                                isDisabled = isFuture,
                                inRange = !isFuture && normalized?.let { date >= it.start && date <= it.end } == true,
                                isStart = !isFuture && (date == normalized?.start || (rangeStart != null && rangeEnd == null && date == rangeStart)),
                                isEnd = !isFuture && date == normalized?.end,
                                textColor = textColor,
                                mutedColor = mutedColor,
                                onClick = { if (!isFuture) onDayClick(date) },
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
    isDisabled: Boolean,
    inRange: Boolean,
    isStart: Boolean,
    isEnd: Boolean,
    textColor: Color,
    mutedColor: Color,
    onClick: () -> Unit,
) {
    val isEdge = isStart || isEnd
    Box(Modifier.fillMaxSize().padding(1.dp), contentAlignment = Alignment.Center) {
        if (inRange && !isEdge) {
            Box(Modifier.fillMaxSize().background(Accent.copy(alpha = 0.14f)))
        }
        if (isStart && inRange) {
            Box(Modifier.align(Alignment.CenterStart).fillMaxSize(0.5f).background(Accent.copy(alpha = 0.14f)))
        }
        if (isEnd && inRange) {
            Box(Modifier.align(Alignment.CenterEnd).fillMaxSize(0.5f).background(Accent.copy(alpha = 0.14f)))
        }
        Box(
            modifier = Modifier
                .size(34.dp)
                .clip(CircleShape)
                .then(
                    when {
                        isDisabled -> Modifier
                        isEdge -> Modifier.background(Accent)
                        isToday -> Modifier.border(1.5.dp, Accent, CircleShape)
                        else -> Modifier
                    },
                )
                .then(if (!isDisabled) Modifier.clickable(onClick = onClick) else Modifier),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "${date.dayOfMonth}",
                color = when {
                    isDisabled -> mutedColor.copy(alpha = 0.35f)
                    isEdge -> Color.White
                    isToday -> Accent
                    else -> textColor
                },
                fontSize = 13.sp,
                fontWeight = if (!isDisabled && (isEdge || isToday)) FontWeight.SemiBold else FontWeight.Normal,
            )
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
