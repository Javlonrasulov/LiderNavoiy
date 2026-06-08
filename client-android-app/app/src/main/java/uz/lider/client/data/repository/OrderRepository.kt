package uz.lider.client.data.repository

import uz.lider.client.data.remote.ApiErrorMapper
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.ClientOrderDto
import uz.lider.client.data.remote.dto.CreateOrderRequest
import uz.lider.client.data.remote.dto.OrderItemDto
import uz.lider.client.domain.model.CartItem
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.OrderItem
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrderRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getOrders(): List<ClientOrder> {
        return try {
            api.getOrders().map { it.toDomain() }
        } catch (_: Exception) {
            emptyList()
        }
    }

    suspend fun createOrder(cartItems: List<CartItem>): Result<ClientOrder> {
        return try {
            val items = cartItems.map { item ->
                OrderItemDto(
                    productId = item.id,
                    productCode = item.sku,
                    productName = item.name,
                    quantity = item.qty,
                    price = item.price,
                    unit = item.unit,
                )
            }
            Result.success(api.createOrder(CreateOrderRequest(items)).toDomain())
        } catch (e: Exception) {
            Result.failure(Exception(ApiErrorMapper.toKey(e)))
        }
    }

    suspend fun getOrder(id: String): ClientOrder? {
        return getOrders().firstOrNull { it.id == id }
    }

    private fun ClientOrderDto.toDomain() = ClientOrder(
        id = id,
        status = status,
        totalAmount = totalAmount,
        items = items.map { item ->
            OrderItem(
                productId = item.productId,
                productCode = item.productCode,
                productName = item.productName,
                quantity = item.quantity,
                price = item.price,
                unit = item.unit,
            )
        },
        createdAt = createdAt,
        updatedAt = updatedAt,
    )
}
