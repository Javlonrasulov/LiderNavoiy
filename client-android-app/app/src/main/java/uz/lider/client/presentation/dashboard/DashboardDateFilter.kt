package uz.lider.client.presentation.dashboard

import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.OrderStatus
import uz.lider.client.domain.model.OrgPurchaseShare
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters

enum class DatePreset {
    TODAY, WEEK, MONTH, ALL, CUSTOM,
}

data class DashboardDateRange(
    val start: LocalDate,
    val end: LocalDate,
    val isCustom: Boolean = false,
)

data class DashboardFiltered(
    val totalPurchases: Double,
    val activeOrderCount: Int,
    val recentOrders: List<ClientOrder>,
    val chartValues: List<Float>,
    /** Grafik pastidagi kunlar (masalan 22.07) */
    val chartLabels: List<String> = emptyList(),
    val purchasesByOrg: List<OrgPurchaseShare> = emptyList(),
)

object DashboardDateFilter {
    private val displayFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy")

    fun lastMonthRange(today: LocalDate = LocalDate.now()): DashboardDateRange {
        // Default: joriy oy — «oxirgi buyurtmalar / xaridlar» bo‘sh qolmasin
        return DashboardDateRange(
            start = today.withDayOfMonth(1),
            end = today,
            isCustom = false,
        )
    }

    fun todayRange(today: LocalDate = LocalDate.now()): DashboardDateRange =
        DashboardDateRange(start = today, end = today, isCustom = true)

    fun thisWeekRange(today: LocalDate = LocalDate.now()): DashboardDateRange {
        val start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        return DashboardDateRange(start = start, end = today, isCustom = true)
    }

    fun thisMonthRange(today: LocalDate = LocalDate.now()): DashboardDateRange =
        DashboardDateRange(
            start = today.withDayOfMonth(1),
            end = today,
            isCustom = true,
        )

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

    fun normalizeRange(start: LocalDate, end: LocalDate): DashboardDateRange =
        DashboardDateRange(
            start = minOf(start, end),
            end = maxOf(start, end),
            isCustom = true,
        )

    fun toStartMillis(date: LocalDate): Long =
        date.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()

    fun toEndMillis(date: LocalDate): Long =
        date.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli() - 1

    fun fromMillis(millis: Long): LocalDate =
        Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDate()

    fun formatRange(range: DashboardDateRange): String =
        "${range.start.format(displayFormatter)} — ${range.end.format(displayFormatter)}"

    fun parseOrderDate(createdAt: String): LocalDate? {
        val raw = createdAt.trim()
        if (raw.isEmpty()) return null
        return try {
            when {
                // 2026-07-28 or 2026-07-28T12:00:00.000Z
                raw.length >= 10 && raw[4] == '-' && raw[7] == '-' ->
                    LocalDate.parse(raw.take(10))
                // 28.07.2026
                raw.length >= 10 && raw[2] == '.' && raw[5] == '.' ->
                    LocalDate.parse(raw.take(10), DateTimeFormatter.ofPattern("dd.MM.yyyy"))
                // epoch millis
                raw.all { it.isDigit() } && raw.length >= 10 ->
                    Instant.ofEpochMilli(raw.toLong()).atZone(ZoneId.systemDefault()).toLocalDate()
                else -> Instant.parse(raw).atZone(ZoneId.systemDefault()).toLocalDate()
            }
        } catch (_: Exception) {
            null
        }
    }

    fun filterOrders(orders: List<ClientOrder>, range: DashboardDateRange): List<ClientOrder> =
        orders.filter { order ->
            val date = parseOrderDate(order.createdAt) ?: return@filter false
            !date.isBefore(range.start) && !date.isAfter(range.end)
        }

    fun computeFiltered(orders: List<ClientOrder>, range: DashboardDateRange): DashboardFiltered {
        val inRange = filterOrders(orders, range)
        val purchases = inRange
            .filter { OrderStatus.fromKey(it.status) != OrderStatus.CANCELLED }
            .sumOf { it.totalAmount }
        val activeCount = inRange.count {
            val status = OrderStatus.fromKey(it.status)
            status != OrderStatus.DELIVERED && status != OrderStatus.CANCELLED
        }
        val chart = buildChart(inRange, range)
        val byOrg = inRange
            .filter { OrderStatus.fromKey(it.status) != OrderStatus.CANCELLED }
            .groupBy { it.companyId.orEmpty() }
            .filterKeys { it.isNotEmpty() }
            .map { (companyId, list) ->
                OrgPurchaseShare(
                    companyId = companyId,
                    shortName = list.firstOrNull()?.companyShortName
                        ?: list.firstOrNull()?.companyName
                        ?: companyId,
                    name = list.firstOrNull()?.companyName.orEmpty(),
                    total = list.sumOf { it.totalAmount },
                )
            }
            .sortedByDescending { it.total }
        return DashboardFiltered(
            totalPurchases = purchases,
            activeOrderCount = activeCount,
            recentOrders = inRange.take(5),
            chartValues = chart.values,
            chartLabels = chart.labels,
            purchasesByOrg = byOrg,
        )
    }

    /**
     * Kalender (oy) ichida nuqta ko'rinishi uchun:
     * `createdAt` bo'yicha savdo bo'lgan kunlar (cancelled bo'lmagan).
     */
    fun saleDays(orders: List<ClientOrder>): Set<LocalDate> {
        return orders
            .filter { OrderStatus.fromKey(it.status) != OrderStatus.CANCELLED }
            .mapNotNull { parseOrderDate(it.createdAt) }
            .toSet()
    }

    private data class ChartSeries(
        val values: List<Float>,
        val labels: List<String>,
    )

    private fun buildChart(orders: List<ClientOrder>, range: DashboardDateRange): ChartSeries {
        val totalDays = ChronoUnit.DAYS.between(range.start, range.end).toInt() + 1
        val dayFmt = DateTimeFormatter.ofPattern("dd.MM")

        // ≤7 kun: har bir kun alohida; undan ko‘p: 7 ta bucket
        if (totalDays <= 7) {
            val labels = (0 until totalDays).map { i ->
                range.start.plusDays(i.toLong()).format(dayFmt)
            }
            val values = (0 until totalDays).map { i ->
                val day = range.start.plusDays(i.toLong())
                orders
                    .filter { parseOrderDate(it.createdAt) == day }
                    .sumOf { it.totalAmount }
                    .toFloat()
            }
            // SimpleAreaChart kamida 2 nuqta kutadi
            return if (values.size == 1) {
                ChartSeries(
                    values = listOf(values[0], values[0]),
                    labels = listOf(labels[0], labels[0]),
                )
            } else {
                ChartSeries(values = values, labels = labels)
            }
        }

        val pointCount = 7
        val labels = (0 until pointCount).map { index ->
            val bucketStart = range.start.plusDays((index * totalDays) / pointCount.toLong())
            bucketStart.format(dayFmt)
        }
        if (orders.isEmpty()) {
            return ChartSeries(values = List(pointCount) { 0f }, labels = labels)
        }

        val values = (0 until pointCount).map { index ->
            val bucketStart = range.start.plusDays((index * totalDays) / pointCount.toLong())
            val bucketEnd = if (index == pointCount - 1) {
                range.end
            } else {
                range.start.plusDays(((index + 1) * totalDays) / pointCount.toLong() - 1)
            }
            orders
                .filter { order ->
                    val date = parseOrderDate(order.createdAt) ?: return@filter false
                    !date.isBefore(bucketStart) && !date.isAfter(bucketEnd)
                }
                .sumOf { it.totalAmount }
                .toFloat()
        }
        return ChartSeries(values = values, labels = labels)
    }

    /** Barcha buyurtmalar oralig‘i (bo‘sh bo‘lsa — joriy oy). */
    fun allOrdersRange(orders: List<ClientOrder>, today: LocalDate = LocalDate.now()): DashboardDateRange {
        val dates = orders.mapNotNull { parseOrderDate(it.createdAt) }
        if (dates.isEmpty()) return lastMonthRange(today)
        return DashboardDateRange(
            start = dates.minOrNull()!!,
            end = maxOf(dates.maxOrNull()!!, today),
            isCustom = true,
        )
    }
}
