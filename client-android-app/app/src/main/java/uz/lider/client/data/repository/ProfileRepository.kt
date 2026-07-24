package uz.lider.client.data.repository

import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.ClientProfileDto
import uz.lider.client.domain.model.ClientProfile
import uz.lider.client.domain.model.ContactPerson
import uz.lider.client.data.remote.dto.ContactPersonDto
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

    suspend fun getAllOrders() = orderRepository.getOrders()

    suspend fun getDashboardData(): DashboardData {
        // Parallel — callers should prefer fetching once; kept for compatibility.
        return coroutineScope {
            val profileDeferred = async { getProfile() }
            val ordersDeferred = async { getAllOrders() }
            val profile = profileDeferred.await()
            val orders = ordersDeferred.await()
            val effectiveProfile = profile ?: ClientProfile(
                id = "",
                code = "",
                name = "",
                balance = 0.0,
                totalPurchases = 0.0,
                orderCount = orders.size,
            )
            DashboardData(
                profile = effectiveProfile,
                recentOrders = orders.take(5),
                totalPurchases = profile?.totalPurchases ?: 0.0,
                orderCount = profile?.orderCount ?: orders.size,
                balance = profile?.balance ?: 0.0,
            )
        }
    }

    private fun ContactPersonDto.toDomain(): ContactPerson? {
        val personName = name?.trim().orEmpty()
        if (personName.isEmpty()) return null
        return ContactPerson(
            userId = userId?.trim(),
            name = personName,
            position = position?.trim(),
            phone = phone?.trim(),
        )
    }

    private fun ClientProfileDto.toDomain() = ClientProfile(
        id = id,
        code = code,
        name = name,
        fullName = fullName,
        phone = phone,
        address = address,
        category = category,
        balance = balance,
        totalPurchases = totalPurchases,
        orderCount = orderCount,
        agentName = agentName,
        agentPosition = agentPosition,
        agentPhone = agentPhone,
        agentUserId = agentUserId,
        deliveryPerson = deliveryPerson?.toDomain(),
    )
}
