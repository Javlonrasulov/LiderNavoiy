package uz.lider.client.data.repository

import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.ClientProfileDto
import uz.lider.client.domain.model.ClientProfile
import uz.lider.client.domain.model.DashboardData
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProfileRepository @Inject constructor(
    private val api: ApiService,
    private val orderRepository: OrderRepository,
) {
    suspend fun getProfile(): ClientProfile? {
        return try {
            api.getProfile().toDomain()
        } catch (_: Exception) {
            null
        }
    }

    suspend fun getDashboardData(): DashboardData? {
        val profile = getProfile() ?: return null
        val orders = orderRepository.getOrders()
        return DashboardData(
            profile = profile,
            recentOrders = orders.take(5),
            totalPurchases = profile.totalPurchases,
            orderCount = profile.orderCount,
            balance = profile.balance,
        )
    }

    private fun ClientProfileDto.toDomain() = ClientProfile(
        id = id,
        code = code,
        name = name,
        fullName = fullName,
        phone = phone,
        balance = balance,
        totalPurchases = totalPurchases,
        orderCount = orderCount,
        agentName = agentName,
    )
}
