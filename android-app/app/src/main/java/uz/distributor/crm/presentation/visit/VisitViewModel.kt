package uz.distributor.crm.presentation.visit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.CartRepository
import uz.distributor.crm.data.repository.ProductRepository
import uz.distributor.crm.domain.model.CartItem
import uz.distributor.crm.domain.model.Product
import javax.inject.Inject

data class VisitUiState(
    val categories: List<String> = emptyList(),
    val products: List<Product> = emptyList(),
    val selectedCategory: String? = null,
    val cart: List<CartItem> = emptyList(),
    val cartTotal: Double = 0.0,
    val isLoading: Boolean = true,
    val clientId: String = "",
)

@HiltViewModel
class VisitViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(VisitUiState())
    val uiState = _uiState.asStateFlow()

    fun init(clientId: String) {
        _uiState.update { it.copy(clientId = clientId) }
        load()
    }

    fun selectCategory(cat: String) {
        viewModelScope.launch {
            val products = productRepository.getByCategory(cat)
            _uiState.update { it.copy(selectedCategory = cat, products = products) }
        }
    }

    fun addProduct(product: Product) {
        viewModelScope.launch {
            cartRepository.addToCart(product, 1.0)
            refreshCart()
        }
    }

    fun updateQty(productId: String, qty: Double) {
        viewModelScope.launch {
            cartRepository.updateQty(productId, qty)
            refreshCart()
        }
    }

    private fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            productRepository.getProducts(true)
            val cats = productRepository.getCategories()
            val first = cats.firstOrNull()
            val products = if (first != null) productRepository.getByCategory(first) else emptyList()
            refreshCart()
            _uiState.update {
                it.copy(categories = cats, selectedCategory = first, products = products, isLoading = false)
            }
        }
    }

    private suspend fun refreshCart() {
        val cart = cartRepository.getCart()
        _uiState.update { it.copy(cart = cart, cartTotal = cartRepository.getTotal()) }
    }
}
