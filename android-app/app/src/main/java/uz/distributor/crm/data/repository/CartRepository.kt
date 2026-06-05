package uz.distributor.crm.data.repository

import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import uz.distributor.crm.data.local.AppDatabase
import uz.distributor.crm.data.local.CartItemEntity
import uz.distributor.crm.data.local.PendingOrderEntity
import uz.distributor.crm.data.local.PendingVisitEntity
import uz.distributor.crm.data.local.SyncStatus
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.CreateOrderRequest
import uz.distributor.crm.data.remote.dto.CreateVisitRequest
import uz.distributor.crm.data.remote.dto.OrderItemDto
import uz.distributor.crm.domain.model.CartItem
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CartRepository @Inject constructor(
    private val db: AppDatabase,
    private val api: ApiService,
    private val gson: Gson,
) {
    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    fun observeCart(): Flow<List<CartItem>> = kotlinx.coroutines.flow.flow {
        emit(db.cartDao().getAll().map { it.toDomain() })
    }

    suspend fun getCart(): List<CartItem> = db.cartDao().getAll().map { it.toDomain() }

    suspend fun addToCart(product: uz.distributor.crm.domain.model.Product, qty: Double) {
        setCartQty(product, qty)
    }

    suspend fun setCartQty(product: uz.distributor.crm.domain.model.Product, qty: Double) {
        if (qty <= 0) {
            db.cartDao().delete(product.id)
        } else {
            db.cartDao().insert(
                CartItemEntity(
                    productId = product.id,
                    productCode = product.code,
                    productName = product.name,
                    price = product.price,
                    quantity = qty,
                    unit = product.unit,
                    category = product.category,
                ),
            )
        }
    }

    suspend fun removeFromCart(productId: String) {
        db.cartDao().delete(productId)
    }

    suspend fun updateQty(productId: String, qty: Double) {
        val item = db.cartDao().getAll().find { it.productId == productId } ?: return
        if (qty <= 0) db.cartDao().delete(productId)
        else db.cartDao().insert(item.copy(quantity = qty))
    }

    suspend fun clearCart() = db.cartDao().clear()

    suspend fun getTotal(): Double = db.cartDao().getAll().sumOf { it.price * it.quantity }

    suspend fun submitOrder(clientId: String, visitId: String? = null): Result<Unit> {
        val items = db.cartDao().getAll()
        if (items.isEmpty()) return Result.failure(Exception("Savatcha bo'sh"))

        val orderItems = items.map {
            OrderItemDto(it.productId, it.productCode, it.productName, it.quantity, it.price, it.unit)
        }
        val total = items.sumOf { it.price * it.quantity }
        val offlineId = UUID.randomUUID().toString()

        return try {
            api.createOrder(CreateOrderRequest(clientId, visitId, orderItems))
            api.createVisit(CreateVisitRequest(
                clientId = clientId,
                visitedAt = isoFormat.format(Date()),
                orderTotal = total,
            ))
            db.cartDao().clear()
            Result.success(Unit)
        } catch (e: Exception) {
            db.pendingOrderDao().insert(PendingOrderEntity(
                offlineId = offlineId, clientId = clientId,
                itemsJson = gson.toJson(orderItems), totalAmount = total,
            ))
            db.pendingVisitDao().insert(PendingVisitEntity(
                offlineId = offlineId, clientId = clientId,
                visitedAt = System.currentTimeMillis(), checkInLat = null, checkInLng = null,
                orderTotal = total,
            ))
            db.cartDao().clear()
            Result.success(Unit)
        }
    }

    suspend fun syncPending(): Int {
        var synced = 0
        for (order in db.pendingOrderDao().getPending()) {
            try {
                val items = gson.fromJson(order.itemsJson, Array<OrderItemDto>::class.java).toList()
                api.createOrder(CreateOrderRequest(order.clientId, null, items, order.offlineId))
                db.pendingOrderDao().updateStatus(order.offlineId, SyncStatus.SYNCED.name)
                synced++
            } catch (_: Exception) { }
        }
        for (visit in db.pendingVisitDao().getPending()) {
            try {
                api.createVisit(CreateVisitRequest(
                    clientId = visit.clientId,
                    visitedAt = isoFormat.format(Date(visit.visitedAt)),
                    orderTotal = visit.orderTotal,
                ))
                db.pendingVisitDao().updateStatus(visit.offlineId, SyncStatus.SYNCED.name)
            } catch (_: Exception) { }
        }
        return synced
    }

    private fun CartItemEntity.toDomain() = CartItem(
        productId, productCode, productName, price, quantity, unit, category,
    )
}
