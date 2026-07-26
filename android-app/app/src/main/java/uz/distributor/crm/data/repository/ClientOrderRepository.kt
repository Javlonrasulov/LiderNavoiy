package uz.distributor.crm.data.repository

import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.data.remote.dto.SendToWarehouseRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ClientOrderRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getPendingClientOrders(): List<OrderDto> =
        api.getClientOrders(status = "pending")

    suspend fun getAllClientOrders(): List<OrderDto> =
        api.getClientOrders(status = null)

    suspend fun sendToWarehouse(orderId: String, isUrgent: Boolean = false): OrderDto =
        api.sendOrderToWarehouse(orderId, SendToWarehouseRequest(isUrgent = isUrgent))

    suspend fun rejectOrder(orderId: String): OrderDto =
        api.rejectClientOrder(orderId)
}
