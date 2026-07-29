package uz.lider.client.data.repository

import uz.lider.client.data.local.SelectedOrgHolder
import uz.lider.client.data.remote.ApiErrorMapper
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.ClientOrderDto
import uz.lider.client.data.remote.dto.CreateOrderRequest
import uz.lider.client.data.remote.dto.OrderItemDto
import uz.lider.client.data.remote.dto.OrderTrackingDto
import uz.lider.client.domain.model.CartItem
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.DeliveryPersonTracking
import uz.lider.client.domain.model.OrderItem
import uz.lider.client.domain.model.OrderTrackingDetails
import uz.lider.client.domain.model.RouteStopInfo
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrderRepository @Inject constructor(
    private val api: ApiService,
    private val selectedOrgHolder: SelectedOrgHolder,
) {
    /** companyId=null — barcha membership org buyurtmalari (dashboard fleet). */
    suspend fun getOrders(companyId: String? = null): List<ClientOrder> {
        return try {
            api.getOrders(companyId = companyId).map { it.toDomain() }
        } catch (_: Exception) {
            emptyList()
        }
    }

    /** Tanlangan org bo‘yicha buyurtmalar (katalog/buyurtmalar ekrani). */
    suspend fun getOrdersForSelectedOrg(): List<ClientOrder> {
        val companyId = selectedOrgHolder.getSelectedCompanyId()
        return getOrders(companyId = companyId)
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
            val companyId = selectedOrgHolder.getSelectedCompanyId()
            Result.success(
                api.createOrder(CreateOrderRequest(items), companyId = companyId).toDomain(),
            )
        } catch (e: Exception) {
            Result.failure(Exception(ApiErrorMapper.toKey(e)))
        }
    }

    suspend fun getOrder(id: String): ClientOrder? {
        return getOrders().firstOrNull { it.id == id }
    }

    suspend fun getOrderTracking(orderId: String): OrderTrackingDetails? {
        return try {
            api.getOrderTracking(orderId).toDomain()
        } catch (_: Exception) {
            null
        }
    }

    private fun OrderTrackingDto.toDomain() = OrderTrackingDetails(
        orderId = orderId,
        status = status,
        totalAmount = totalAmount,
        deliveryAddress = deliveryAddress,
        deliveryLatitude = deliveryLatitude,
        deliveryLongitude = deliveryLongitude,
        distanceKm = distanceKm,
        etaMinutes = etaMinutes,
        deliveryPerson = deliveryPerson?.let {
            DeliveryPersonTracking(
                userId = it.userId,
                distributorId = it.distributorId,
                name = it.name,
                position = it.position,
                phone = it.phone,
                isOnline = it.isOnline,
                latitude = it.latitude,
                longitude = it.longitude,
                lastLocationAt = it.lastLocationAt,
            )
        },
        companyId = companyId,
        companyName = companyName,
        companyShortName = companyShortName,
        routeStops = routeStops.map {
            RouteStopInfo(
                sequence = it.sequence,
                latitude = it.latitude,
                longitude = it.longitude,
                isYou = it.isYou,
            )
        },
        stopsBeforeYou = stopsBeforeYou,
        yourSequence = yourSequence,
        totalStops = totalStops,
    )

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
        companyId = companyId,
        companyName = companyName,
        companyShortName = companyShortName,
    )
}
