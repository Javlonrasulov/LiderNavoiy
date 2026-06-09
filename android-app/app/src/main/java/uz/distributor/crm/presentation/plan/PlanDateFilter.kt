package uz.distributor.crm.presentation.plan

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters

enum class PlanDatePreset {
    TODAY, WEEK, MONTH, ALL, CUSTOM,
}

data class PlanDateRange(
    val start: LocalDate,
    val end: LocalDate,
    val isCustom: Boolean = false,
)

object PlanDateFilter {
    private val displayFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy")

    fun thisMonthRange(today: LocalDate = LocalDate.now()): PlanDateRange =
        PlanDateRange(start = today.withDayOfMonth(1), end = today, isCustom = true)

    fun todayRange(today: LocalDate = LocalDate.now()): PlanDateRange =
        PlanDateRange(start = today, end = today, isCustom = true)

    fun thisWeekRange(today: LocalDate = LocalDate.now()): PlanDateRange {
        val start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        return PlanDateRange(start = start, end = today, isCustom = true)
    }

    fun monthGrid(month: YearMonth): List<LocalDate?> {
        val firstDay = month.atDay(1)
        val leading = (firstDay.dayOfWeek.value - DayOfWeek.MONDAY.value + 7) % 7
        val daysInMonth = month.lengthOfMonth()
        val cells = mutableListOf<LocalDate?>()
        repeat(leading) { cells += null }
        for (day in 1..daysInMonth) cells += month.atDay(day)
        while (cells.size % 7 != 0) cells += null
        return cells
    }

    fun normalizeRange(
        start: LocalDate,
        end: LocalDate,
        today: LocalDate = LocalDate.now(),
    ): PlanDateRange {
        var rangeStart = minOf(start, end)
        var rangeEnd = maxOf(start, end)
        if (rangeEnd.isAfter(today)) rangeEnd = today
        if (rangeStart.isAfter(today)) rangeStart = today
        return PlanDateRange(start = rangeStart, end = rangeEnd, isCustom = true)
    }

    fun isFuture(date: LocalDate, today: LocalDate = LocalDate.now()): Boolean =
        date.isAfter(today)

    fun toStartMillis(date: LocalDate): Long =
        date.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()

    fun fromMillis(millis: Long): LocalDate =
        Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDate()

    fun formatRange(range: PlanDateRange): String =
        "${range.start.format(displayFormatter)} — ${range.end.format(displayFormatter)}"
}
