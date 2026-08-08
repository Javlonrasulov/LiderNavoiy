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
import uz.distributor.crm.data.repository.PromotionsRepository
import uz.distributor.crm.domain.model.CartItem
import uz.distributor.crm.domain.model.Product
import uz.distributor.crm.domain.model.ProductPromotion
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
    /** productId → aksiya (admindan kelgan, mahsulot yonida badge sifatida ko'rsatiladi) */
    val promotionsByProductId: Map<String, ProductPromotion> = emptyMap(),
    /** Barcha aktiv aksiyalar (banner + Ha/Yo‘q) */
    val activePromotions: List<ProductPromotion> = emptyList(),
    /** Agent X bosib yopgan banner promo id lari */
    val dismissedBannerIds: Set<String> = emptySet(),
    /** Sessionda Yo‘q deb belgilangan aksiyalar */
    val declinedPromoIds: Set<String> = emptySet(),
    /** Ha/Yo‘q dialog uchun kutayotgan aksiya */
    val pendingPromoOffer: ProductPromotion? = null,
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
        get() = cart.filter { it.promotionId == null }.map { it.productId }.toSet()

    val selectedInList: List<Product>
        get() = filteredProducts.filter { it.id in cartProductIds }

    val unselectedInList: List<Product>
        get() = filteredProducts.filter { it.id !in cartProductIds }

    val selectedProduct: Product?
        get() = filteredProducts.find { it.id == selectedProductId }
            ?: allProducts.find { it.id == selectedProductId }

    fun cartCountForCategory(category: String): Int =
        cart.count { it.category == category && it.promotionId == null }

    val selectedProductIndex: Int
        get() = filteredProducts.indexOfFirst { it.id == selectedProductId }

    val detailLineTotal: Double
        get() = (selectedProduct?.price ?: 0.0) * detailQuantity

    fun cartQtyFor(productId: String): Double =
        cart.find { it.productId == productId && it.promotionId == null }?.quantity ?: 0.0

    val visiblePromoBanners: List<ProductPromotion>
        get() = activePromotions.filter {
            it.hasReward() && it.id !in dismissedBannerIds
        }
}

@HiltViewModel
class VisitViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
    private val clientRepository: ClientRepository,
    private val appSettingsRepository: AppSettingsRepository,
    private val promotionsRepository: PromotionsRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(VisitUiState())
    val uiState = _uiState.asStateFlow()

    fun resolveProductImageUrl(path: String?): String = productRepository.resolveImageUrl(path)

    fun init(clientId: String) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    clientId = clientId,
                )
            }
            appSettingsRepository.setActiveClientId(clientId)
            load()
        }
    }

    /** Buyurtma yuborilgandan keyin yoki ekranga qaytganda savatchani DB dan yangilash */
    fun reloadCart() {
        viewModelScope.launch { refreshCart() }
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

    fun incrementDetailQty(step: Double = detailQtyStep()) {
        setDetailQuantity(_uiState.value.detailQuantity + step)
    }

    fun decrementDetailQty(step: Double = detailQtyStep()) {
        val minQty = step
        setDetailQuantity((_uiState.value.detailQuantity - step).coerceAtLeast(minQty))
    }

    private fun detailQtyStep(): Double {
        val unit = _uiState.value.selectedProduct?.unit.orEmpty()
        return if (unit.equals("kg", ignoreCase = true) || unit.equals("кг", ignoreCase = true)) 0.1 else 1.0
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
        val state = _uiState.value
        val product = state.selectedProduct ?: return
        val clientId = state.clientId
        if (clientId.isBlank()) return
        cartRepository.setCartQty(clientId, product, qty)
        refreshCart()
    }

    fun removeFromCart(productId: String) {
        viewModelScope.launch {
            val clientId = _uiState.value.clientId
            if (clientId.isBlank()) return@launch
            cartRepository.removeFromCart(clientId, productId)
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
            val promotionsDeferred = async { promotionsRepository.getActivePromotions() }
            val refreshed = productRepository.refreshFromApi()
            val allProducts = productRepository.getProducts()
            val cats = productRepository.getCategories()
            val client = clientDeferred.await()
            val activePromotions = promotionsDeferred.await()
            val promotionsByProductId = LinkedHashMap<String, ProductPromotion>()
            for (promo in activePromotions) {
                for (pid in promo.conditionProductIds()) {
                    if (!promotionsByProductId.containsKey(pid)) {
                        promotionsByProductId[pid] = promo
                    }
                }
            }
            val categoryCounts = buildCategoryCounts(cats, allProducts)
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
                    activePromotions = activePromotions,
                    promotionsByProductId = promotionsByProductId,
                    error = when {
                        categoryCounts.isEmpty() && !refreshed -> "products_load_failed"
                        categoryCounts.isEmpty() -> "products_not_found"
                        else -> null
                    },
                )
            }
            refreshCart()
        }
    }

    fun dismissPromoBanner(promoId: String) {
        _uiState.update { it.copy(dismissedBannerIds = it.dismissedBannerIds + promoId) }
    }

    fun acceptPromoOffer() {
        val offer = _uiState.value.pendingPromoOffer ?: return
        viewModelScope.launch {
            val clientId = _uiState.value.clientId
            val rewards = offer.resolvedRewards()
            if (rewards.isEmpty()) return@launch
            val productsById = mutableMapOf<String, uz.distributor.crm.domain.model.Product>()
            for (r in rewards) {
                val product = _uiState.value.allProducts.find { it.id == r.productId }
                    ?: productRepository.getProduct(r.productId)
                if (product != null) productsById[product.id] = product
            }
            cartRepository.setPromoRewards(clientId, offer, productsById)
            _uiState.update { it.copy(pendingPromoOffer = null) }
            refreshCart()
        }
    }

    fun declinePromoOffer() {
        val offer = _uiState.value.pendingPromoOffer ?: return
        _uiState.update {
            it.copy(
                pendingPromoOffer = null,
                declinedPromoIds = it.declinedPromoIds + offer.id,
            )
        }
    }

    private suspend fun refreshCart() {
        val clientId = _uiState.value.clientId
        val cart = if (clientId.isBlank()) emptyList() else cartRepository.getCartForClient(clientId)
        val total = if (clientId.isBlank()) 0.0 else cartRepository.getTotalForClient(clientId)
        _uiState.update { it.copy(cart = cart, cartTotal = total) }
        evaluatePromotions()
    }

    /**
     * Shartlar bajarilmasa — promo line olib tashlanadi.
     * Bajarilsa va hali qo‘shilmagan — Ha/Yo‘q dialog.
     */
    private suspend fun evaluatePromotions() {
        val state = _uiState.value
        val clientId = state.clientId
        if (clientId.isBlank()) return

        val paidQty = mutableMapOf<String, Double>()
        for (item in state.cart) {
            if (item.promotionId != null) continue
            paidQty[item.productId] = (paidQty[item.productId] ?: 0.0) + item.quantity
        }

        val presentPromoIds = state.cart.mapNotNull { it.promotionId }.toSet()

        for (promo in state.activePromotions) {
            if (!promo.hasReward()) continue
            val ok = promo.isSatisfied(paidQty)
            if (!ok && promo.id in presentPromoIds) {
                cartRepository.removePromoReward(clientId, promo.id)
            }
            if (!ok && promo.id in state.declinedPromoIds) {
                _uiState.update { it.copy(declinedPromoIds = it.declinedPromoIds - promo.id) }
            }
        }

        // cart o‘zgargan bo‘lishi mumkin
        val cartAfter = cartRepository.getCartForClient(clientId)
        val totalAfter = cartRepository.getTotalForClient(clientId)
        val paidAfter = mutableMapOf<String, Double>()
        for (item in cartAfter) {
            if (item.promotionId != null) continue
            paidAfter[item.productId] = (paidAfter[item.productId] ?: 0.0) + item.quantity
        }
        val presentAfter = cartAfter.mapNotNull { it.promotionId }.toSet()
        val declined = _uiState.value.declinedPromoIds

        var nextOffer: ProductPromotion? = _uiState.value.pendingPromoOffer
        if (nextOffer != null && (!nextOffer.isSatisfied(paidAfter) || nextOffer.id in presentAfter)) {
            nextOffer = null
        }
        if (nextOffer == null) {
            nextOffer = state.activePromotions.firstOrNull { promo ->
                promo.hasReward() &&
                    promo.isSatisfied(paidAfter) &&
                    promo.id !in presentAfter &&
                    promo.id !in declined
            }
        }

        _uiState.update {
            it.copy(
                cart = cartAfter,
                cartTotal = totalAfter,
                pendingPromoOffer = nextOffer,
            )
        }
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

        val updates = mutableListOf<String>()

        val added = after.filter { it.id !in beforeMap }
        for (p in added) {
            updates.add(AppStrings.newProductImportedLine(lang, p.name, p.stockBalance, p.unit))
        }

        val removed = before.filter { it.id !in afterIds }.map { it.name }
        if (removed.isNotEmpty()) {
            updates.add(AppStrings.productsRemovedNames(lang, removed))
        }

        val stockUp = after.mapNotNull { product ->
            val prev = beforeMap[product.id] ?: return@mapNotNull null
            val delta = product.stockBalance - prev.stockBalance
            if (delta <= 0.0001) return@mapNotNull null
            Triple(product.name, delta, product.unit)
        }.sortedByDescending { it.second }

        if (stockUp.isNotEmpty()) {
            updates.add(AppStrings.productsImportedTitle(lang))
            stockUp.take(20).forEach { (name, qty, unit) ->
                updates.add(AppStrings.productStockImportLine(lang, name, qty, unit))
            }
            if (stockUp.size > 20) {
                updates.add("+${stockUp.size - 20}")
            }
        }

        val stockDown = after.filter { product ->
            val prev = beforeMap[product.id] ?: return@filter false
            product.stockBalance < prev.stockBalance
        }.map { it.name }
        if (stockDown.isNotEmpty()) {
            updates.add(AppStrings.productsStockDecreasedNames(lang, stockDown))
        }

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
