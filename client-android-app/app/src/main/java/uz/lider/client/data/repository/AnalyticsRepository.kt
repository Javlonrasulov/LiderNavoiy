package uz.lider.client.data.repository

import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.ClientAnalyticsDto
import uz.lider.client.domain.model.AnalyticsCategoryShare
import uz.lider.client.domain.model.AnalyticsMonthlyPoint
import uz.lider.client.domain.model.AnalyticsTopProduct
import uz.lider.client.domain.model.AnalyticsWeeklyPoint
import uz.lider.client.domain.model.ClientAnalytics
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AnalyticsRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getAnalytics(period: String): ClientAnalytics? {
        return try {
            api.getAnalytics(period).toDomain()
        } catch (_: Exception) {
            null
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
            AnalyticsTopProduct(it.name, it.share)
        },
    )
}
