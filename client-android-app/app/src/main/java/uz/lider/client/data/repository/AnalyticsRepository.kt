package uz.lider.client.data.repository

import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.ClientAnalyticsDto
import uz.lider.client.domain.model.AnalyticsCategoryShare
import uz.lider.client.domain.model.AnalyticsMonthlyPoint
import uz.lider.client.domain.model.AnalyticsTopProduct
import uz.lider.client.domain.model.AnalyticsWeeklyPoint
import uz.lider.client.domain.model.ClientAnalytics
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.Product
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.round

@Singleton
class AnalyticsRepository @Inject constructor(
    private val api: ApiService,
    private val orderRepository: OrderRepository,
    private val productRepository: ProductRepository,
) {
    suspend fun getAnalytics(period: String): ClientAnalytics? {
        return try {
            api.getAnalytics(period).toDomain()
        } catch (_: Exception) {
            buildLocalAnalytics(period)
        }
    }

    private suspend fun buildLocalAnalytics(period: String): ClientAnalytics? {
        return try {
            val orders = orderRepository.getOrders().filter { it.status != "cancelled" }
            val products = productRepository.getProducts()
            computeAnalytics(period, orders, products)
        } catch (_: Exception) {
            null
        }
    }

    private fun computeAnalytics(
        period: String,
        orders: List<ClientOrder>,
        products: List<Product>,
    ): ClientAnalytics {
        val zone = ZoneId.systemDefault()
        val now = LocalDate.now(zone)
        val periodStart = periodStart(now, period)
        val prevStart = previousPeriodStart(periodStart, period)

        val productsById = products.associateBy { it.id }
        val productsByCode = products.associateBy { it.code }

        fun orderDate(order: ClientOrder): LocalDate = parseOrderDate(order.createdAt, zone)

        fun inPeriod(date: LocalDate, start: LocalDate, end: LocalDate) =
            !date.isBefore(start) && date.isBefore(end)

        val currentOrders = orders.filter { inPeriod(orderDate(it), periodStart, now.plusDays(1)) }
        val previousOrders = orders.filter { inPeriod(orderDate(it), prevStart, periodStart) }

        val currentTotal = currentOrders.sumOf { it.totalAmount }
        val previousTotal = previousOrders.sumOf { it.totalAmount }
        val currentCount = currentOrders.size
        val previousCount = previousOrders.size
        val currentQty = totalQuantity(currentOrders)
        val previousQty = totalQuantity(previousOrders)
        val avgCheck = if (currentCount > 0) currentTotal / currentCount else 0.0
        val prevAvgCheck = if (previousCount > 0) previousTotal / previousCount else 0.0

        val monthlyPurchases = buildMonthlyPurchases(orders, now, zone, 6)
        val weeklyDynamics = buildWeeklyDynamics(orders, now, zone)
        // Top / kategoriyalar — tanlangan davrdagi haqiqiy sotuvlardan
        val categories = buildCategoryBreakdown(
            orders, productsById, productsByCode, periodStart, now.plusDays(1), zone,
        )
        val topProducts = buildTopProducts(
            orders, productsById, productsByCode, periodStart, now.plusDays(1), zone, 10,
        )

        return ClientAnalytics(
            period = period,
            totalPurchases = currentTotal,
            totalPurchasesTrend = percentChange(currentTotal, previousTotal),
            orderCount = currentCount,
            orderCountTrend = percentChange(currentCount.toDouble(), previousCount.toDouble()),
            avgCheck = avgCheck,
            avgCheckTrend = percentChange(avgCheck, prevAvgCheck),
            totalQuantity = currentQty.toDouble(),
            totalQuantityTrend = percentChange(currentQty.toDouble(), previousQty.toDouble()),
            monthlyPurchases = monthlyPurchases,
            weeklyDynamics = weeklyDynamics,
            categories = categories,
            topProducts = topProducts,
        )
    }

    private fun periodStart(now: LocalDate, period: String): LocalDate = when (period) {
        "week" -> now.minusDays(7)
        "year" -> now.minusYears(1)
        else -> now.withDayOfMonth(1)
    }

    private fun previousPeriodStart(currentStart: LocalDate, period: String): LocalDate = when (period) {
        "week" -> currentStart.minusDays(7)
        "year" -> currentStart.minusYears(1)
        else -> currentStart.minusMonths(1)
    }

    private fun percentChange(current: Double, previous: Double): Double {
        if (previous <= 0) return if (current > 0) 100.0 else 0.0
        return round(((current - previous) / previous) * 1000) / 10.0
    }

    private fun totalQuantity(orders: List<ClientOrder>): Int =
        orders.sumOf { order -> order.items.sumOf { it.quantity.toInt() } }

    private fun resolveProduct(
        productId: String,
        productCode: String,
        productsById: Map<String, Product>,
        productsByCode: Map<String, Product>,
    ): Product? = productsById[productId] ?: productsByCode[productCode]

    private fun buildMonthlyPurchases(
        orders: List<ClientOrder>,
        now: LocalDate,
        zone: ZoneId,
        months: Int,
    ): List<AnalyticsMonthlyPoint> {
        val buckets = (months - 1 downTo 0).map { offset ->
            val d = now.minusMonths(offset.toLong()).withDayOfMonth(1)
            Triple(d.year, d.monthValue, 0.0)
        }.toMutableList()
        for (order in orders) {
            val created = parseOrderDate(order.createdAt, zone)
            val idx = buckets.indexOfFirst { it.first == created.year && it.second == created.monthValue }
            if (idx >= 0) {
                val (y, m, amt) = buckets[idx]
                buckets[idx] = Triple(y, m, amt + order.totalAmount)
            }
        }
        return buckets.map { (y, m, amt) -> AnalyticsMonthlyPoint(y, m, round(amt).toDouble()) }
    }

    private fun buildWeeklyDynamics(
        orders: List<ClientOrder>,
        now: LocalDate,
        zone: ZoneId,
    ): List<AnalyticsWeeklyPoint> {
        val buckets = (6 downTo 0).associate { offset ->
            val d = now.minusDays(offset.toLong())
            d.toString() to 0.0
        }.toMutableMap()
        for (order in orders) {
            val key = parseOrderDate(order.createdAt, zone).toString()
            if (buckets.containsKey(key)) {
                buckets[key] = buckets.getValue(key) + order.totalAmount
            }
        }
        return buckets.map { (date, amount) -> AnalyticsWeeklyPoint(date, round(amount).toDouble()) }
    }

    private fun buildCategoryBreakdown(
        orders: List<ClientOrder>,
        productsById: Map<String, Product>,
        productsByCode: Map<String, Product>,
        start: LocalDate,
        end: LocalDate,
        zone: ZoneId,
    ): List<AnalyticsCategoryShare> {
        val totals = mutableMapOf<String, Double>()
        var grandTotal = 0.0
        for (order in orders) {
            val created = parseOrderDate(order.createdAt, zone)
            if (created.isBefore(start) || !created.isBefore(end)) continue
            for (item in order.items) {
                val product = resolveProduct(item.productId, item.productCode, productsById, productsByCode)
                val category = product?.category?.takeIf { it.isNotBlank() } ?: "Boshqa"
                val lineTotal = item.quantity * item.price
                totals[category] = (totals[category] ?: 0.0) + lineTotal
                grandTotal += lineTotal
            }
        }
        if (grandTotal <= 0) return emptyList()
        return totals.entries
            .map { (name, amount) ->
                AnalyticsCategoryShare(name, round((amount / grandTotal) * 1000) / 10.0)
            }
            .sortedByDescending { it.share }
            .take(6)
    }

    private fun buildTopProducts(
        orders: List<ClientOrder>,
        productsById: Map<String, Product>,
        productsByCode: Map<String, Product>,
        start: LocalDate,
        end: LocalDate,
        zone: ZoneId,
        limit: Int,
    ): List<AnalyticsTopProduct> {
        data class Acc(var name: String, var quantity: Double, var amount: Double, var unit: String)
        val totals = mutableMapOf<String, Acc>()
        var grandQty = 0.0
        for (order in orders) {
            val created = parseOrderDate(order.createdAt, zone)
            if (created.isBefore(start) || !created.isBefore(end)) continue
            for (item in order.items) {
                val product = resolveProduct(item.productId, item.productCode, productsById, productsByCode)
                val key = product?.id ?: item.productCode.ifBlank { item.productName }
                val name = product?.name ?: item.productName
                if (name.isBlank()) continue
                val qty = item.quantity
                if (qty <= 0) continue
                val lineTotal = qty * item.price
                val existing = totals[key]
                if (existing != null) {
                    existing.quantity += qty
                    existing.amount += lineTotal
                } else {
                    totals[key] = Acc(
                        name = name,
                        quantity = qty,
                        amount = lineTotal,
                        unit = product?.unit ?: item.unit,
                    )
                }
                grandQty += qty
            }
        }
        if (grandQty <= 0) return emptyList()
        return totals.values
            .map {
                AnalyticsTopProduct(
                    name = it.name,
                    share = round((it.quantity / grandQty) * 1000) / 10.0,
                    quantity = round(it.quantity * 1000) / 1000.0,
                    amount = round(it.amount),
                    unit = it.unit,
                )
            }
            .sortedWith(compareByDescending<AnalyticsTopProduct> { it.quantity }.thenByDescending { it.amount })
            .take(limit)
    }

    private fun parseOrderDate(createdAt: String, zone: ZoneId): LocalDate {
        return try {
            Instant.parse(createdAt).atZone(zone).toLocalDate()
        } catch (_: Exception) {
            LocalDate.parse(createdAt.take(10))
        }
    }

    private fun ClientAnalyticsDto.toDomain() = ClientAnalytics(
        period = period,
        totalPurchases = totalPurchases,
        totalPurchasesTrend = totalPurchasesTrend,
        orderCount = orderCount,
        orderCountTrend = orderCountTrend,
        avgCheck = avgCheck,
        avgCheckTrend = avgCheckTrend,
        totalQuantity = totalQuantity,
        totalQuantityTrend = totalQuantityTrend,
        monthlyPurchases = monthlyPurchases.map {
            AnalyticsMonthlyPoint(it.year, it.month, it.amount)
        },
        weeklyDynamics = weeklyDynamics.map {
            AnalyticsWeeklyPoint(it.date, it.amount)
        },
        categories = categories.map {
            AnalyticsCategoryShare(it.name, it.share)
        },
        topProducts = topProducts.map {
            AnalyticsTopProduct(
                name = it.name,
                share = it.share,
                quantity = it.quantity,
                amount = it.amount,
                unit = it.unit.orEmpty(),
            )
        },
    )
}
