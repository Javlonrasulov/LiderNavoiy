package uz.lider.client.data.repository

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import uz.lider.client.domain.model.CartItem
import uz.lider.client.domain.model.Product
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CartRepository @Inject constructor() {
    private val _items = MutableStateFlow<List<CartItem>>(emptyList())
    val items: StateFlow<List<CartItem>> = _items.asStateFlow()

    val itemCount: Int
        get() {
            val sum = _items.value.sumOf { it.qty }
            return if (sum % 1.0 == 0.0) sum.toInt() else kotlin.math.ceil(sum).toInt()
        }

    fun addProduct(product: Product, qty: Double = 1.0, imageUrl: String = "") {
        val item = CartItem(
            id = product.id,
            name = product.name,
            sku = product.code,
            price = product.price,
            qty = qty,
            brand = product.brand.orEmpty(),
            image = imageUrl,
            unit = product.unit,
        )
        addItem(item)
    }

    fun addItem(item: CartItem) {
        _items.update { current ->
            val existing = current.find { it.id == item.id }
            if (existing != null) {
                current.map {
                    if (it.id == item.id) it.copy(qty = it.qty + item.qty) else it
                }
            } else {
                current + item
            }
        }
    }

    fun updateQty(productId: String, qty: Double) {
        if (qty <= 0) {
            removeItem(productId)
            return
        }
        _items.update { current ->
            current.map { if (it.id == productId) it.copy(qty = qty) else it }
        }
    }

    fun removeItem(productId: String) {
        _items.update { current -> current.filter { it.id != productId } }
    }

    fun clear() {
        _items.value = emptyList()
    }

    fun totalAmount(): Double = _items.value.sumOf { it.price * it.qty }
}
