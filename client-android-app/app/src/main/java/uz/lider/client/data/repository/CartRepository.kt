package uz.lider.client.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.lider.client.domain.model.CartItem
import uz.lider.client.domain.model.Product
import javax.inject.Inject
import javax.inject.Singleton

private val Context.cartDataStore by preferencesDataStore("client_cart_prefs")

@Singleton
class CartRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val gson: Gson,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val itemsKey = stringPreferencesKey("cart_items_json")

    private val _items = MutableStateFlow<List<CartItem>>(emptyList())
    val items: StateFlow<List<CartItem>> = _items.asStateFlow()

    init {
        scope.launch { restore() }
    }

    val itemCount: Int
        get() {
            val sum = _items.value.sumOf { it.qty }
            return if (sum % 1.0 == 0.0) sum.toInt() else kotlin.math.ceil(sum).toInt()
        }

    private suspend fun restore() {
        runCatching {
            val json = context.cartDataStore.data.first()[itemsKey] ?: return
            val type = object : TypeToken<List<CartItem>>() {}.type
            val list: List<CartItem> = gson.fromJson(json, type) ?: emptyList()
            _items.value = list
        }
    }

    private fun persist() {
        val snapshot = _items.value
        scope.launch {
            context.cartDataStore.edit { prefs ->
                if (snapshot.isEmpty()) {
                    prefs.remove(itemsKey)
                } else {
                    prefs[itemsKey] = gson.toJson(snapshot)
                }
            }
        }
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
        persist()
    }

    fun updateQty(productId: String, qty: Double) {
        if (qty <= 0) {
            removeItem(productId)
            return
        }
        _items.update { current ->
            current.map { if (it.id == productId) it.copy(qty = qty) else it }
        }
        persist()
    }

    fun removeItem(productId: String) {
        _items.update { current -> current.filter { it.id != productId } }
        persist()
    }

    fun clear() {
        _items.value = emptyList()
        persist()
    }

    fun totalAmount(): Double = _items.value.sumOf { it.price * it.qty }
}
