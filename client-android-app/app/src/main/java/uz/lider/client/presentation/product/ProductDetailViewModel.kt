package uz.lider.client.presentation.product

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.CartRepository
import uz.lider.client.data.repository.ProductRepository
import uz.lider.client.domain.model.Product
import javax.inject.Inject

data class ProductReview(val user: String, val rating: Int, val comment: String, val date: String)

data class ProductDetailUiState(
    val loading: Boolean = true,
    val product: Product? = null,
    val qty: Double = 1.0,
    val liked: Boolean = false,
    val tab: String = "info",
)

@HiltViewModel
class ProductDetailViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProductDetailUiState())
    val uiState: StateFlow<ProductDetailUiState> = _uiState.asStateFlow()

    fun load(productId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            val product = productRepository.getProduct(productId)
            _uiState.update { it.copy(loading = false, product = product) }
        }
    }

    fun incQty() = _uiState.update { it.copy(qty = it.qty + 1.0) }
    fun decQty() = _uiState.update { it.copy(qty = (it.qty - 1.0).coerceAtLeast(1.0)) }
    fun setTab(tab: String) = _uiState.update { it.copy(tab = tab) }
    fun toggleLike() = _uiState.update { it.copy(liked = !it.liked) }

    fun addToCart() {
        val product = _uiState.value.product ?: return
        val qty = _uiState.value.qty
        val image = productRepository.resolveImageUrl(product.imageUrl)
        cartRepository.addProduct(product, qty = qty, imageUrl = image)
    }

    fun isInCart(): Boolean {
        val id = _uiState.value.product?.id ?: return false
        return cartRepository.items.value.any { it.id == id }
    }

    fun resolveImage(url: String?) = productRepository.resolveImageUrl(url)
}
