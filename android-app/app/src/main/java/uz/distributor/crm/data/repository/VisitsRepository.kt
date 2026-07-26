package uz.distributor.crm.data.repository

import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.VisitDto
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class VisitsRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getTodayVisits(): List<VisitDto> {
        val zone = ZoneId.of("Asia/Tashkent")
        val today = LocalDate.now(zone)
        val from = today.atStartOfDay(zone).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        val to = today.plusDays(1).atStartOfDay(zone).minusNanos(1)
            .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        return api.getVisits(from = from, to = to)
            .sortedByDescending { it.visitedAt }
    }
}
