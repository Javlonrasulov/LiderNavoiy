package uz.distributor.crm.presentation.products

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.repository.ProductRepository
import uz.distributor.crm.domain.model.Product
import javax.inject.Inject

enum class ProductsViewMode { CARD, TABLE }

data class ProductsUiState(
    val products: List<Product> = emptyList(),
    val categories: List<String> = emptyList(),
    val selectedCategory: String? = null,
    val searchQuery: String = "",
    val stockOnly: Boolean = false,
    val viewMode: ProductsViewMode = ProductsViewMode.CARD,
    val isLoading: Boolean = true,
    val error: String? = null,
) {
    val filteredProducts: List<Product>
        get() {
            val q = searchQuery.trim().lowercase()
            return products.filter { product ->
                val cat = product.categoryFilterKey()
                if (selectedCategory != null && cat != selectedCategory) return@filter false
                if (stockOnly && product.stockBalance <= 0) return@filter false
                if (q.isEmpty()) return@filter true
                product.name.lowercase().contains(q) ||
                    product.code.lowercase().contains(q) ||
                    product.category.lowercase().contains(q) ||
                    (product.brand?.lowercase()?.contains(q) == true)
            }
        }

    val totalCount: Int get() = products.size
}

@HiltViewModel
class ProductsViewModel @Inject constructor(
    private val productRepository: ProductRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProductsUiState())
    val uiState = _uiState.asStateFlow()

    init { loadProducts() }

    fun onSearchChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun selectCategory(category: String?) {
        _uiState.update { it.copy(selectedCategory = category) }
    }

    fun setStockOnly(enabled: Boolean) {
        _uiState.update { it.copy(stockOnly = enabled) }
    }

    fun toggleViewMode() {
        _uiState.update {
            val next = if (it.viewMode == ProductsViewMode.CARD) ProductsViewMode.TABLE else ProductsViewMode.CARD
            it.copy(viewMode = next)
        }
    }

    fun refresh() = loadProducts(forceRefresh = true)

    private fun loadProducts(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val products = productRepository.getProducts(forceRefresh)
                val categories = products
                    .map { it.categoryFilterKey() }
                    .filter { it.isNotBlank() }
                    .distinct()
                    .sorted()
                _uiState.update {
                    it.copy(
                        products = products,
                        categories = categories,
                        isLoading = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = ApiErrorMapper.toKey(e))
                }
            }
        }
    }
}

internal fun Product.categoryFilterKey(): String =
    brand?.takeIf { it.isNotBlank() } ?: category
