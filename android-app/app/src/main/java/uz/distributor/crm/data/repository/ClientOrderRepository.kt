package uz.distributor.crm.data.repository

import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.data.remote.dto.OrderItemDto
import uz.distributor.crm.data.remote.dto.SendToWarehouseRequest
import uz.distributor.crm.data.remote.dto.UpdateOrderItemsRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ClientOrderRepository @Inject constructor(
    private val api: ApiService,
    private val cartRepository: CartRepository,
    private val appSettingsRepository: AppSettingsRepository,
) {
    suspend fun getPendingClientOrders(): List<OrderDto> =
        api.getClientOrders(status = "pending")

    suspend fun getAllClientOrders(): List<OrderDto> =
        api.getClientOrders(status = null)

    suspend fun sendToWarehouse(orderId: String, isUrgent: Boolean = false): OrderDto =
        api.sendOrderToWarehouse(orderId, SendToWarehouseRequest(isUrgent = isUrgent))

    suspend fun rejectOrder(orderId: String): OrderDto =
        api.rejectClientOrder(orderId)

    suspend fun updateItems(orderId: String, items: List<OrderItemDto>): OrderDto =
        api.updateClientOrderItems(orderId, UpdateOrderItemsRequest(items))

    /** Buyurtmani tahrirlash: savatchani to'ldiradi va edit rejimini yoqadi */
    suspend fun beginEdit(order: OrderDto) {
        cartRepository.seedCartFromOrderItems(order.items)
        appSettingsRepository.setActiveClientId(order.clientId)
        appSettingsRepository.setEditingClientOrderId(order.id)
    }
}
