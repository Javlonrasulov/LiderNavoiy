package uz.distributor.crm.data.repository

import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.OrderDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeliveryRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getAssignedOrders(): List<OrderDto> = api.getDeliveryOrders()
}
