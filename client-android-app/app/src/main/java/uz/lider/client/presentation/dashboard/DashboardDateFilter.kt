package uz.lider.client.presentation.dashboard

import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.OrderStatus
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

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
)

object DashboardDateFilter {
    private val displayFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy")

    fun lastMonthRange(today: LocalDate = LocalDate.now()): DashboardDateRange {
        val firstDayLastMonth = today.minusMonths(1).withDayOfMonth(1)
        val lastDayLastMonth = today.withDayOfMonth(1).minusDays(1)
        return DashboardDateRange(start = firstDayLastMonth, end = lastDayLastMonth, isCustom = false)
    }

    fun toStartMillis(date: LocalDate): Long =
        date.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()

    fun toEndMillis(date: LocalDate): Long =
        date.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli() - 1

    fun fromMillis(millis: Long): LocalDate =
        Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDate()

    fun formatRange(range: DashboardDateRange): String =
        "${range.start.format(displayFormatter)} — ${range.end.format(displayFormatter)}"

    fun parseOrderDate(createdAt: String): LocalDate? = try {
        when {
            createdAt.length >= 10 -> LocalDate.parse(createdAt.take(10))
            else -> null
        }
    } catch (_: Exception) {
        null
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
        return DashboardFiltered(
            totalPurchases = purchases,
            activeOrderCount = activeCount,
            recentOrders = inRange.take(5),
            chartValues = buildChartValues(inRange, range),
        )
    }

    private fun buildChartValues(orders: List<ClientOrder>, range: DashboardDateRange): List<Float> {
        val totalDays = ChronoUnit.DAYS.between(range.start, range.end).toInt() + 1
        val pointCount = minOf(totalDays, 7).coerceAtLeast(2)
        if (orders.isEmpty()) return List(pointCount) { 0f }

        return (0 until pointCount).map { index ->
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
    }
}
