package uz.distributor.crm.data.repository

import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import uz.distributor.crm.data.local.AppDatabase
import uz.distributor.crm.data.local.CartItemEntity
import uz.distributor.crm.data.local.PendingOrderEntity
import uz.distributor.crm.data.local.PendingVisitEntity
import uz.distributor.crm.data.local.SyncStatus
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.CreateOrderRequest
import uz.distributor.crm.data.remote.dto.CreateVisitRequest
import uz.distributor.crm.data.remote.dto.OrderItemDto
import uz.distributor.crm.data.remote.dto.UpdateOrderItemsRequest
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

    /** Barcha klientlar bo'yicha savatcha (dashboard badge va h.k.) */
    suspend fun getCart(): List<CartItem> = db.cartDao().getAll().map { it.toDomain() }

    suspend fun getCartForClient(clientId: String): List<CartItem> =
        db.cartDao().getByClient(clientId).map { it.toDomain() }

    /** Klient ID → mahsulotlar */
    suspend fun getCartGroupedByClient(): Map<String, List<CartItem>> =
        getCart().groupBy { it.clientId }.filterKeys { it.isNotBlank() }

    suspend fun addToCart(clientId: String, product: uz.distributor.crm.domain.model.Product, qty: Double) {
        setCartQty(clientId, product, qty)
    }

    suspend fun setCartQty(clientId: String, product: uz.distributor.crm.domain.model.Product, qty: Double) {
        if (clientId.isBlank()) return
        if (qty <= 0) {
            db.cartDao().delete(clientId, product.id)
        } else {
            db.cartDao().insert(
                CartItemEntity(
                    clientId = clientId,
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

    suspend fun removeFromCart(clientId: String, productId: String) {
        db.cartDao().delete(clientId, productId)
    }

    suspend fun updateQty(clientId: String, productId: String, qty: Double) {
        val item = db.cartDao().getByClient(clientId).find { it.productId == productId } ?: return
        val normalized = (Math.round(qty * 1000.0) / 1000.0)
        if (normalized <= 0) db.cartDao().delete(clientId, productId)
        else db.cartDao().insert(item.copy(quantity = normalized))
    }

    suspend fun clearCart() = db.cartDao().clear()

    suspend fun clearClientCart(clientId: String) = db.cartDao().clearClient(clientId)

    /** Klient buyurtmasini tahrirlash uchun shu klient savatchasini seed qiladi */
    suspend fun seedCartFromOrderItems(clientId: String, items: List<OrderItemDto>) {
        if (clientId.isBlank()) return
        db.cartDao().clearClient(clientId)
        for (it in items) {
            if (it.quantity <= 0) continue
            db.cartDao().insert(
                CartItemEntity(
                    clientId = clientId,
                    productId = it.productId,
                    productCode = it.productCode,
                    productName = it.productName,
                    price = it.price,
                    quantity = it.quantity,
                    unit = it.unit,
                    category = null,
                ),
            )
        }
    }

    suspend fun getTotal(): Double = db.cartDao().getAll().sumOf { it.price * it.quantity }

    suspend fun getTotalForClient(clientId: String): Double =
        db.cartDao().getByClient(clientId).sumOf { it.price * it.quantity }

    /** Pending klient buyurtmasini savatcha mazmuni bilan yangilaydi (yangi order yaratmaydi) */
    suspend fun saveCartToClientOrder(orderId: String, clientId: String): Result<Unit> {
        val items = db.cartDao().getByClient(clientId)
        if (items.isEmpty()) return Result.failure(Exception("Savatcha bo'sh"))
        val orderItems = items.map {
            OrderItemDto(it.productId, it.productCode, it.productName, it.quantity, it.price, it.unit)
        }
        return try {
            api.updateClientOrderItems(orderId, UpdateOrderItemsRequest(orderItems))
            db.cartDao().clearClient(clientId)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitOrder(clientId: String, visitId: String? = null): Result<Unit> {
        if (clientId.isBlank()) {
            return Result.failure(Exception("Klient tanlanmagan"))
        }
        val items = db.cartDao().getByClient(clientId)
        if (items.isEmpty()) return Result.failure(Exception("Savatcha bo'sh"))

        val orderItems = items.map {
            OrderItemDto(it.productId, it.productCode, it.productName, it.quantity, it.price, it.unit)
        }
        val total = items.sumOf { it.price * it.quantity }
        val offlineId = UUID.randomUUID().toString()

        return try {
            api.createOrder(CreateOrderRequest(clientId, visitId, orderItems))
            try {
                api.createVisit(CreateVisitRequest(
                    clientId = clientId,
                    visitedAt = isoFormat.format(Date()),
                    orderTotal = total,
                ))
            } catch (_: Exception) {
                db.pendingVisitDao().insert(PendingVisitEntity(
                    offlineId = offlineId, clientId = clientId,
                    visitedAt = System.currentTimeMillis(), checkInLat = null, checkInLng = null,
                    orderTotal = total,
                ))
            }
            db.cartDao().clearClient(clientId)
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
            db.cartDao().clearClient(clientId)
            Result.success(Unit)
        }
    }

    /** Barcha klientlarning joriy savatchalarini yuboradi */
    suspend fun submitAllDrafts(): Result<Int> {
        val grouped = getCartGroupedByClient()
        if (grouped.isEmpty()) return Result.failure(Exception("Savatcha bo'sh"))
        var submitted = 0
        var lastError: Exception? = null
        for ((clientId, _) in grouped) {
            val result = submitOrder(clientId)
            result.fold(
                onSuccess = { submitted++ },
                onFailure = { e -> lastError = e as? Exception ?: Exception(e) },
            )
        }
        return if (submitted > 0) Result.success(submitted)
        else Result.failure(lastError ?: Exception("Yuborib bo'lmadi"))
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
        clientId = clientId,
        productId = productId,
        productCode = productCode,
        productName = productName,
        price = price,
        quantity = quantity,
        unit = unit,
        category = category,
    )
}
