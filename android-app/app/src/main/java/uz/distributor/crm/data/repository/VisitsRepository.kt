package uz.distributor.crm.data.repository

import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.data.remote.dto.VisitDto
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.abs

@Singleton
class VisitsRepository @Inject constructor(
    private val api: ApiService,
) {
    private val zone = ZoneId.of("Asia/Tashkent")
    private val formatter = DateTimeFormatter.ISO_OFFSET_DATE_TIME

    suspend fun getVisitsInRange(from: LocalDate, to: LocalDate): List<VisitDto> {
        val fromIso = from.atStartOfDay(zone).format(formatter)
        val toIso = to.plusDays(1).atStartOfDay(zone).minusNanos(1).format(formatter)
        val visits = api.getVisits(from = fromIso, to = toIso)
            .sortedByDescending { it.visitedAt }

        val orders = try {
            api.getOrders()
        } catch (_: Exception) {
            emptyList()
        }

        return visits.map { visit -> enrichWithOrder(visit, orders) }
    }

    private fun enrichWithOrder(visit: VisitDto, orders: List<OrderDto>): VisitDto {
        if (!visit.orderStatus.isNullOrBlank()) return visit

        val orderIdFromNotes = visit.notes
            ?.takeIf { it.startsWith("client_order:") }
            ?.removePrefix("client_order:")
            ?.trim()
            ?.takeIf { it.isNotBlank() }

        val matched = orders.firstOrNull { it.id == visit.orderId }
            ?: orderIdFromNotes?.let { id -> orders.firstOrNull { it.id == id } }
            ?: orders.firstOrNull { it.visitId == visit.id }
            ?: findLooseMatch(visit, orders)

        if (matched == null) return visit

        return visit.copy(
            orderId = matched.id,
            orderStatus = matched.status,
            orderSource = matched.source ?: visit.orderSource,
            fromClientOrder = visit.fromClientOrder ||
                matched.source.equals("client", ignoreCase = true) ||
                !orderIdFromNotes.isNullOrBlank(),
            orderTotal = if (visit.orderTotal > 0) visit.orderTotal else matched.totalAmount,
        )
    }

    private fun findLooseMatch(visit: VisitDto, orders: List<OrderDto>): OrderDto? {
        val visitDay = parseDay(visit.visitedAt) ?: return null
        return orders.firstOrNull { order ->
            if (order.clientId != visit.clientId) return@firstOrNull false
            val orderDay = parseDay(order.createdAt) ?: return@firstOrNull false
            if (orderDay != visitDay) return@firstOrNull false
            if (!order.visitId.isNullOrBlank() && order.visitId != visit.id) return@firstOrNull false
            visit.orderTotal <= 0 || abs(order.totalAmount - visit.orderTotal) < 0.01
        }
    }

    private fun parseDay(iso: String): LocalDate? = try {
        Instant.parse(iso).atZone(zone).toLocalDate()
    } catch (_: Exception) {
        try {
            LocalDate.parse(iso.take(10))
        } catch (_: Exception) {
            null
        }
    }
}
