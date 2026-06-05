package uz.distributor.crm.presentation.visit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.AppSettingsRepository
import uz.distributor.crm.data.repository.CartRepository
import uz.distributor.crm.data.repository.ClientRepository
import uz.distributor.crm.data.repository.ProductRepository
import uz.distributor.crm.domain.model.CartItem
import uz.distributor.crm.domain.model.Product
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import javax.inject.Inject

enum class VisitViewLevel { CATEGORIES, PRODUCTS, PRODUCT_DETAIL }

enum class VisitRefreshButtonState { IDLE, LOADING, SUCCESS }

data class CategoryWithCount(val name: String, val count: Int)

data class VisitUiState(
    val viewLevel: VisitViewLevel = VisitViewLevel.CATEGORIES,
    val categoryCounts: List<CategoryWithCount> = emptyList(),
    val allProducts: List<Product> = emptyList(),
    val products: List<Product> = emptyList(),
    val selectedCategory: String? = null,
    val selectedProductId: String? = null,
    val detailQuantity: Double = 0.0,
    val detailNote: String = "",
    val selectedSectionExpanded: Boolean = true,
    val allSectionExpanded: Boolean = true,
    val searchQuery: String = "",
    val showAllProducts: Boolean = true,
    val cart: List<CartItem> = emptyList(),
    val cartTotal: Double = 0.0,
    val isLoading: Boolean = true,
    val clientId: String = "",
    val clientName: String? = null,
    val error: String? = null,
    val refreshButtonState: VisitRefreshButtonState = VisitRefreshButtonState.IDLE,
    val refreshUpdates: List<String> = emptyList(),
    val showRefreshResult: Boolean = false,
    val detailCartJustSaved: Boolean = false,
    val focusDetailQuantity: Boolean = false,
    val showCartSheet: Boolean = false,
) {
    val filteredProducts: List<Product>
        get() = VisitViewModel.filterProducts(products, searchQuery, showAllProducts)

    val totalProductCount: Int
        get() = when (selectedCategory) {
            VisitViewModel.ALL_CATEGORY -> allProducts.size
            null -> allProducts.size
            else -> allProducts.count { it.category == selectedCategory }
        }

    val cartProductIds: Set<String>
        get() = cart.map { it.productId }.toSet()

    val selectedInList: List<Product>
        get() = filteredProducts.filter { it.id in cartProductIds }

    val unselectedInList: List<Product>
        get() = filteredProducts.filter { it.id !in cartProductIds }

    val selectedProduct: Product?
        get() = filteredProducts.find { it.id == selectedProductId }
            ?: allProducts.find { it.id == selectedProductId }

    fun cartCountForCategory(category: String): Int =
        cart.count { it.category == category }

    val selectedProductIndex: Int
        get() = filteredProducts.indexOfFirst { it.id == selectedProductId }

    val detailLineTotal: Double
        get() = (selectedProduct?.price ?: 0.0) * detailQuantity

    fun cartQtyFor(productId: String): Double =
        cart.find { it.productId == productId }?.quantity ?: 0.0
}

@HiltViewModel
class VisitViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
    private val clientRepository: ClientRepository,
    private val appSettingsRepository: AppSettingsRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(VisitUiState())
    val uiState = _uiState.asStateFlow()

    fun resolveProductImageUrl(path: String?): String = productRepository.resolveImageUrl(path)

    fun init(clientId: String) {
        _uiState.update { it.copy(clientId = clientId) }
        viewModelScope.launch { appSettingsRepository.setActiveClientId(clientId) }
        load()
    }

    fun openCategory(cat: String) {
        viewModelScope.launch {
            val products = if (cat == ALL_CATEGORY) {
                _uiState.value.allProducts
            } else {
                productRepository.getByCategory(cat)
            }
            _uiState.update {
                it.copy(
                    viewLevel = VisitViewLevel.PRODUCTS,
                    selectedCategory = cat,
                    products = products,
                    searchQuery = "",
                    selectedProductId = null,
                    showCartSheet = false,
                )
            }
        }
    }

    fun backToCategories() {
        _uiState.update {
            it.copy(
                viewLevel = VisitViewLevel.CATEGORIES,
                selectedCategory = null,
                products = emptyList(),
                searchQuery = "",
                selectedProductId = null,
            )
        }
    }

    fun openProduct(product: Product, focusQuantity: Boolean = false) {
        viewModelScope.launch { applyOpenProduct(product, focusQuantity) }
    }

    fun openProductById(productId: String, focusQuantity: Boolean = false) {
        viewModelScope.launch {
            val product = resolveProduct(productId) ?: return@launch
            applyOpenProduct(product, focusQuantity)
        }
    }

    private suspend fun applyOpenProduct(product: Product, focusQuantity: Boolean) {
        val category = product.category.ifBlank { ALL_CATEGORY }
        val products = if (category == ALL_CATEGORY) {
            _uiState.value.allProducts
        } else {
            productRepository.getByCategory(category)
        }
        val cartQty = _uiState.value.cartQtyFor(product.id)
        _uiState.update {
            it.copy(
                viewLevel = VisitViewLevel.PRODUCT_DETAIL,
                selectedCategory = category,
                products = products,
                selectedProductId = product.id,
                detailQuantity = cartQty,
                detailNote = "",
                detailCartJustSaved = false,
                focusDetailQuantity = focusQuantity,
                showCartSheet = false,
            )
        }
    }

    fun editCartItem(productId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(showCartSheet = false) }
            delay(200)
            val product = resolveProduct(productId) ?: return@launch
            applyOpenProduct(product, focusQuantity = true)
        }
    }

    private suspend fun resolveProduct(productId: String): Product? {
        _uiState.value.allProducts.find { it.id == productId }?.let { return it }
        _uiState.value.filteredProducts.find { it.id == productId }?.let { return it }
        return productRepository.getProduct(productId)
    }

    fun clearFocusDetailQuantity() {
        _uiState.update { it.copy(focusDetailQuantity = false) }
    }

    fun backFromProductDetail() {
        _uiState.update {
            it.copy(
                viewLevel = VisitViewLevel.PRODUCTS,
                selectedProductId = null,
                detailQuantity = 0.0,
                detailNote = "",
            )
        }
    }

    fun navigateProduct(delta: Int) {
        val state = _uiState.value
        val index = state.selectedProductIndex
        if (index < 0) return
        val nextIndex = index + delta
        if (nextIndex !in state.filteredProducts.indices) return
        openProduct(state.filteredProducts[nextIndex])
    }

    fun setDetailQuantity(qty: Double) {
        val clamped = qty.coerceAtLeast(0.0)
        _uiState.update { it.copy(detailQuantity = clamped) }
        viewModelScope.launch { persistDetailQuantity(clamped) }
    }

    fun incrementDetailQty(step: Double = 1.0) {
        setDetailQuantity(_uiState.value.detailQuantity + step)
    }

    fun decrementDetailQty(step: Double = 1.0) {
        setDetailQuantity((_uiState.value.detailQuantity - step).coerceAtLeast(0.0))
    }

    fun setDetailNote(note: String) {
        _uiState.update { it.copy(detailNote = note) }
    }

    fun addDetailToCart() {
        val qty = _uiState.value.detailQuantity
        if (qty <= 0) return
        viewModelScope.launch {
            persistDetailQuantity(qty)
            _uiState.update { it.copy(detailCartJustSaved = true) }
            delay(2500)
            _uiState.update {
                if (it.detailCartJustSaved) it.copy(detailCartJustSaved = false) else it
            }
        }
    }

    private suspend fun persistDetailQuantity(qty: Double) {
        val product = _uiState.value.selectedProduct ?: return
        cartRepository.setCartQty(product, qty)
        refreshCart()
    }

    fun removeFromCart(productId: String) {
        viewModelScope.launch {
            cartRepository.removeFromCart(productId)
            refreshCart()
            if (_uiState.value.selectedProductId == productId) {
                _uiState.update { it.copy(detailQuantity = 0.0) }
            }
        }
    }

    fun toggleSelectedSection() {
        _uiState.update { it.copy(selectedSectionExpanded = !it.selectedSectionExpanded) }
    }

    fun toggleAllSection() {
        _uiState.update { it.copy(allSectionExpanded = !it.allSectionExpanded) }
    }

    fun openCartSheet() {
        _uiState.update { it.copy(showCartSheet = true) }
    }

    fun closeCartSheet() {
        _uiState.update { it.copy(showCartSheet = false) }
    }

    fun setSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun toggleShowAllProducts() {
        _uiState.update { it.copy(showAllProducts = !it.showAllProducts) }
    }

    fun retry() = load()

    fun dismissRefreshResult() {
        _uiState.update { it.copy(showRefreshResult = false) }
    }

    fun refresh() {
        if (_uiState.value.refreshButtonState == VisitRefreshButtonState.LOADING) return
        if (_uiState.value.isLoading) return
        viewModelScope.launch {
            val before = _uiState.value.allProducts
            val current = _uiState.value
            val lang = appSettingsRepository.language.first()
            _uiState.update {
                it.copy(
                    refreshButtonState = VisitRefreshButtonState.LOADING,
                    showRefreshResult = false,
                )
            }

            val refreshed = productRepository.refreshFromApi()
            val allProducts = productRepository.getProducts()
            val cats = productRepository.getCategories()
            val categoryCounts = buildCategoryCounts(cats, allProducts)
            val products = when {
                current.viewLevel != VisitViewLevel.CATEGORIES && current.selectedCategory != null -> {
                    if (current.selectedCategory == ALL_CATEGORY) allProducts
                    else productRepository.getByCategory(current.selectedCategory)
                }
                else -> current.products
            }
            refreshCart()

            val updates = if (before.isEmpty()) {
                listOf(AppStrings.refreshDone(lang))
            } else {
                buildProductUpdates(before, allProducts, lang)
            }

            _uiState.update {
                it.copy(
                    allProducts = allProducts,
                    categoryCounts = categoryCounts,
                    products = products,
                    refreshButtonState = VisitRefreshButtonState.SUCCESS,
                    refreshUpdates = updates,
                    showRefreshResult = true,
                    error = when {
                        categoryCounts.isEmpty() && !refreshed -> "products_load_failed"
                        categoryCounts.isEmpty() -> "products_not_found"
                        else -> null
                    },
                )
            }
            delay(2500)
            _uiState.update {
                if (it.refreshButtonState == VisitRefreshButtonState.SUCCESS) {
                    it.copy(refreshButtonState = VisitRefreshButtonState.IDLE)
                } else {
                    it
                }
            }
        }
    }

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
            val categoryCounts = buildCategoryCounts(cats, allProducts)
            refreshCart()
            _uiState.update {
                it.copy(
                    clientName = client?.name,
                    allProducts = allProducts,
                    categoryCounts = categoryCounts,
                    viewLevel = VisitViewLevel.CATEGORIES,
                    selectedCategory = null,
                    products = emptyList(),
                    searchQuery = "",
                    selectedProductId = null,
                    isLoading = false,
                    error = when {
                        categoryCounts.isEmpty() && !refreshed -> "products_load_failed"
                        categoryCounts.isEmpty() -> "products_not_found"
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

    private fun buildCategoryCounts(
        categories: List<String>,
        allProducts: List<Product>,
    ): List<CategoryWithCount> {
        if (allProducts.isEmpty()) return emptyList()
        val countsByCategory = allProducts
            .groupBy { it.category.ifBlank { ALL_CATEGORY } }
            .mapValues { (_, items) -> items.size }
        val ordered = categories.mapNotNull { cat ->
            val count = countsByCategory[cat] ?: return@mapNotNull null
            CategoryWithCount(cat, count)
        }
        if (ordered.isNotEmpty()) return ordered
        return countsByCategory.map { (cat, count) ->
            CategoryWithCount(if (cat == ALL_CATEGORY) ALL_CATEGORY else cat, count)
        }.sortedBy { it.name }
    }

    private fun buildProductUpdates(
        before: List<Product>,
        after: List<Product>,
        lang: AppLanguage,
    ): List<String> {
        val beforeMap = before.associateBy { it.id }
        val afterIds = after.map { it.id }.toSet()

        val added = after.filter { it.id !in beforeMap }.map { it.name }
        val removed = before.filter { it.id !in afterIds }.map { it.name }
        val stockUp = after.filter { product ->
            val prev = beforeMap[product.id] ?: return@filter false
            product.stockBalance > prev.stockBalance
        }.map { it.name }
        val stockDown = after.filter { product ->
            val prev = beforeMap[product.id] ?: return@filter false
            product.stockBalance < prev.stockBalance
        }.map { it.name }

        val updates = mutableListOf<String>()
        if (added.isNotEmpty()) updates.add(AppStrings.productsAddedNames(lang, added))
        if (removed.isNotEmpty()) updates.add(AppStrings.productsRemovedNames(lang, removed))
        if (stockUp.isNotEmpty()) updates.add(AppStrings.productsStockIncreasedNames(lang, stockUp))
        if (stockDown.isNotEmpty()) updates.add(AppStrings.productsStockDecreasedNames(lang, stockDown))
        if (updates.isEmpty()) updates.add(AppStrings.noNewUpdates(lang))
        return updates
    }

    companion object {
        const val ALL_CATEGORY = "__all__"

        fun filterProducts(
            products: List<Product>,
            query: String,
            showAll: Boolean,
        ): List<Product> {
            val q = query.trim().lowercase()
            return products.filter { product ->
                val matchesQuery = q.isEmpty() ||
                    product.name.lowercase().contains(q) ||
                    product.code.lowercase().contains(q)
                val matchesStock = showAll || product.stockBalance > 0
                matchesQuery && matchesStock
            }
        }
    }
}
