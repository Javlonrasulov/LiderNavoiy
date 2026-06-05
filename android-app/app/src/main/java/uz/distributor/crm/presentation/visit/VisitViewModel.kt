package uz.distributor.crm.presentation.visit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.CartRepository
import uz.distributor.crm.data.repository.ClientRepository
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
    val clientName: String? = null,
    val error: String? = null,
)

@HiltViewModel
class VisitViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
    private val clientRepository: ClientRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(VisitUiState())
    val uiState = _uiState.asStateFlow()

    fun init(clientId: String) {
        _uiState.update { it.copy(clientId = clientId) }
        load()
    }

    fun selectCategory(cat: String) {
        viewModelScope.launch {
            val products = if (cat == ALL_CATEGORY) {
                productRepository.getProducts()
            } else {
                productRepository.getByCategory(cat)
            }
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

    fun retry() = load()

    private fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            val clientId = _uiState.value.clientId
            val clientDeferred = async {
                if (clientId.isNotBlank()) clientRepository.getClientDetail(clientId) else null
            }
            val refreshed = productRepository.refreshFromApi()
            val allProducts = productRepository.getProducts()
            val cats = productRepository.getCategories()
            val client = clientDeferred.await()
            val effectiveCats = cats.ifEmpty {
                if (allProducts.isNotEmpty()) listOf(ALL_CATEGORY) else emptyList()
            }
            val first = effectiveCats.firstOrNull()
            val products = when (first) {
                ALL_CATEGORY, null -> allProducts
                else -> productRepository.getByCategory(first)
            }
            refreshCart()
            _uiState.update {
                it.copy(
                    clientName = client?.name,
                    categories = effectiveCats,
                    selectedCategory = first,
                    products = products,
                    isLoading = false,
                    error = when {
                        effectiveCats.isEmpty() && !refreshed ->
                            "Mahsulotlar yuklanmadi. Backend ishlayaptimi va internet bormi?"
                        effectiveCats.isEmpty() ->
                            "Mahsulotlar topilmadi. Seed: npx ts-node scripts/seed.ts"
                        else -> null
                    },
                )
            }
        }
    }

    private suspend fun refreshCart() {
        val cart = cartRepository.getCart()
        _uiState.update { it.copy(cart = cart, cartTotal = cartRepository.getTotal()) }
    }

    companion object {
        const val ALL_CATEGORY = "__all__"
    }
}
