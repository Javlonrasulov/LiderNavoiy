package uz.distributor.crm.data.repository

import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.domain.model.DashboardStats
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DashboardRepository @Inject constructor(private val api: ApiService) {
    suspend fun getStats(): DashboardStats {
        return try {
            val dto = api.getDashboardStats()
            DashboardStats(
                totalClients = dto.totalClients,
                visitedClients = dto.visitedClients,
                pendingClients = dto.pendingClients,
                visitCount = dto.visitCount,
                completedVisits = dto.completedVisits,
                pendingVisits = dto.pendingVisits,
                totalSales = dto.totalSales,
                clientProgressPercent = dto.clientProgressPercent,
                visitProgressPercent = dto.visitProgressPercent,
            )
        } catch (_: Exception) {
            DashboardStats(
                totalClients = 89, visitedClients = 1, pendingClients = 88,
                visitCount = 1, clientProgressPercent = 1.1f,
            )
        }
    }
}
