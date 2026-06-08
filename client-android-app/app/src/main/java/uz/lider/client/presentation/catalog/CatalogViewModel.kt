package uz.lider.client.presentation.catalog

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

enum class CatalogSort { DEFAULT, PRICE_ASC, PRICE_DESC, RATING }

data class CatalogUiState(
    val loading: Boolean = true,
    val products: List<Product> = emptyList(),
    val categories: List<String> = emptyList(),
    val search: String = "",
    val activeCategoryIndex: Int = 0,
    val sort: CatalogSort = CatalogSort.DEFAULT,
    val sortMenuOpen: Boolean = false,
    val favorites: Set<String> = emptySet(),
    val addToCartProduct: Product? = null,
)

@HiltViewModel
class CatalogViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CatalogUiState())
    val uiState: StateFlow<CatalogUiState> = _uiState.asStateFlow()
    val cartCount: Int get() = cartRepository.itemCount

    init {
        load()
    }

    fun load(category: String? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            val products = productRepository.getProducts(category)
            val categories = productRepository.getCategories()
            _uiState.update { it.copy(loading = false, products = products, categories = categories) }
        }
    }

    fun onSearchChange(value: String) = _uiState.update { it.copy(search = value) }

    fun onCategorySelected(index: Int) {
        _uiState.update { it.copy(activeCategoryIndex = index) }
        val category = if (index == 0) null else _uiState.value.categories.getOrNull(index - 1)
        load(category)
    }

    fun onSortChange(sort: CatalogSort) = _uiState.update { it.copy(sort = sort, sortMenuOpen = false) }

    fun toggleSortMenu() = _uiState.update { it.copy(sortMenuOpen = !it.sortMenuOpen) }

    fun toggleFavorite(productId: String) {
        _uiState.update { state ->
            val fav = state.favorites.toMutableSet()
            if (fav.contains(productId)) fav.remove(productId) else fav.add(productId)
            state.copy(favorites = fav)
        }
    }

    fun showAddToCart(product: Product) = _uiState.update { it.copy(addToCartProduct = product) }

    fun dismissAddToCart() = _uiState.update { it.copy(addToCartProduct = null) }

    fun confirmAddToCart(qty: Double) {
        val product = _uiState.value.addToCartProduct ?: return
        val image = productRepository.resolveImageUrl(product.imageUrl)
        cartRepository.addProduct(product, qty = qty, imageUrl = image)
        dismissAddToCart()
    }

    fun filteredProducts(): List<Product> {
        val state = _uiState.value
        val query = state.search.trim().lowercase()
        val category = if (state.activeCategoryIndex == 0) {
            null
        } else {
            state.categories.getOrNull(state.activeCategoryIndex - 1)
        }
        var list = state.products.filter { product ->
            val matchCat = category == null || product.category == category
            val matchSearch = query.isEmpty() ||
                product.name.lowercase().contains(query) ||
                product.code.lowercase().contains(query)
            matchCat && matchSearch
        }
        list = when (state.sort) {
            CatalogSort.PRICE_ASC -> list.sortedBy { it.price }
            CatalogSort.PRICE_DESC -> list.sortedByDescending { it.price }
            CatalogSort.RATING -> list.sortedByDescending { it.name }
            CatalogSort.DEFAULT -> list
        }
        return list
    }

    fun resolveImage(url: String?) = productRepository.resolveImageUrl(url)
}
