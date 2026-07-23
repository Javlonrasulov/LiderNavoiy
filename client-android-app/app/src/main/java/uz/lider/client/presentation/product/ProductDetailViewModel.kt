package uz.lider.client.presentation.product

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.CartRepository
import uz.lider.client.data.repository.FavoritesRepository
import uz.lider.client.data.repository.ProductRatingsRepository
import uz.lider.client.data.repository.ProductRepository
import javax.inject.Inject

data class ProductDetailUiState(
    val loading: Boolean = true,
    val product: uz.lider.client.domain.model.Product? = null,
    val qty: Double = 1.0,
    val liked: Boolean = false,
    val userRating: Int? = null,
    val showFullImage: Boolean = false,
)

@HiltViewModel
class ProductDetailViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
    private val ratingsRepository: ProductRatingsRepository,
    private val favoritesRepository: FavoritesRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProductDetailUiState())
    val uiState: StateFlow<ProductDetailUiState> = _uiState.asStateFlow()
    private var ratingJob: Job? = null
    private var favoritesJob: Job? = null

    fun load(productId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            reloadQuiet(productId)
            _uiState.update { it.copy(loading = false) }
        }
        ratingJob?.cancel()
        ratingJob = viewModelScope.launch {
            ratingsRepository.rating(productId).collect { rating ->
                _uiState.update { it.copy(userRating = rating) }
            }
        }
        favoritesJob?.cancel()
        favoritesJob = viewModelScope.launch {
            favoritesRepository.favoriteIds.collect { ids ->
                _uiState.update { it.copy(liked = productId in ids) }
            }
        }
    }

    suspend fun refresh(productId: String) {
        reloadQuiet(productId)
    }

    private suspend fun reloadQuiet(productId: String) {
        val product = productRepository.getProduct(productId)
        _uiState.update { it.copy(product = product) }
    }

    fun incQty() = _uiState.update { it.copy(qty = it.qty + 1.0) }
    fun decQty() = _uiState.update { it.copy(qty = (it.qty - 1.0).coerceAtLeast(1.0)) }

    fun toggleLike() {
        val productId = _uiState.value.product?.id ?: return
        viewModelScope.launch {
            favoritesRepository.toggle(productId)
        }
    }

    fun setRating(stars: Int) {
        val productId = _uiState.value.product?.id ?: return
        viewModelScope.launch {
            ratingsRepository.setRating(productId, stars)
        }
    }

    fun openFullImage() = _uiState.update { it.copy(showFullImage = true) }
    fun closeFullImage() = _uiState.update { it.copy(showFullImage = false) }

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
