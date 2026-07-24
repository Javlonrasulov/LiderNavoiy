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
import uz.lider.client.data.repository.FavoritesRepository
import uz.lider.client.data.repository.ProductRepository
import uz.lider.client.domain.model.Product
import javax.inject.Inject

enum class CatalogSort { DEFAULT, PRICE_ASC, PRICE_DESC, RATING }

enum class CatalogViewMode { GRID, LIST }

data class CatalogUiState(
    val loading: Boolean = true,
    val allProducts: List<Product> = emptyList(),
    val categories: List<String> = emptyList(),
    val search: String = "",
    val activeCategoryIndex: Int = 0,
    val sort: CatalogSort = CatalogSort.DEFAULT,
    val sortMenuOpen: Boolean = false,
    val viewMode: CatalogViewMode = CatalogViewMode.GRID,
    val favorites: Set<String> = emptySet(),
    val addToCartProduct: Product? = null,
)

@HiltViewModel
class CatalogViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
    private val favoritesRepository: FavoritesRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CatalogUiState())
    val uiState: StateFlow<CatalogUiState> = _uiState.asStateFlow()
    val cartCount: Int get() = cartRepository.itemCount

    companion object {
        const val INDEX_ALL = 0
        const val INDEX_FAVORITES = 1
    }

    init {
        load()
        viewModelScope.launch {
            favoritesRepository.favoriteIds.collect { ids ->
                _uiState.update { it.copy(favorites = ids) }
            }
        }
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            reloadQuiet()
            _uiState.update { it.copy(loading = false) }
        }
    }

    suspend fun refresh() {
        reloadQuiet()
    }

    private suspend fun reloadQuiet() {
        val allProducts = productRepository.getProducts(null)
        val categories = productRepository.getCategories()
        _uiState.update {
            it.copy(allProducts = allProducts, categories = categories)
        }
    }

    fun onSearchChange(value: String) = _uiState.update { it.copy(search = value) }

    fun onCategorySelected(index: Int) = _uiState.update { it.copy(activeCategoryIndex = index) }

    fun onSortChange(sort: CatalogSort) = _uiState.update { it.copy(sort = sort, sortMenuOpen = false) }

    fun toggleSortMenu() = _uiState.update { it.copy(sortMenuOpen = !it.sortMenuOpen) }

    fun toggleViewMode() = _uiState.update {
        it.copy(
            viewMode = if (it.viewMode == CatalogViewMode.GRID) {
                CatalogViewMode.LIST
            } else {
                CatalogViewMode.GRID
            },
        )
    }

    fun toggleFavorite(productId: String) {
        viewModelScope.launch {
            favoritesRepository.toggle(productId)
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
        var list = when (state.activeCategoryIndex) {
            INDEX_FAVORITES -> state.allProducts.filter { it.id in state.favorites }
            INDEX_ALL -> state.allProducts
            else -> {
                val category = state.categories.getOrNull(state.activeCategoryIndex - 2)
                state.allProducts.filter { category == null || it.category == category }
            }
        }
        if (query.isNotEmpty()) {
            list = list.filter { product ->
                product.name.lowercase().contains(query) ||
                    product.code.lowercase().contains(query)
            }
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
