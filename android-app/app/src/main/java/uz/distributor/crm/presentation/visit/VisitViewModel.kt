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
import uz.distributor.crm.domain.model.PromotionReward
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import javax.inject.Inject

enum class VisitViewLevel { CATEGORIES, PRODUCTS, PRODUCT_DETAIL, PROMOTIONS }

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
    val detailPromoQuantity: Double = 0.0,
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
    /** Sessionda modal yopilgan / saqlangan aksiyalar (qayta ochilmasin) */
    val bonusModalShownIds: Set<String> = emptySet(),
    /** 100% bo‘lganda ochiladigan sovg‘a modal */
    val bonusModalPromotion: ProductPromotion? = null,
    /** Modal ichidagi draft miqdorlar (rewardProductId → qty) */
    val bonusModalDraftQtys: Map<String, Double> = emptyMap(),
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

    fun paidQtyMap(): Map<String, Double> {
        val map = mutableMapOf<String, Double>()
        for (item in cart) {
            if (item.promotionId != null) continue
            map[item.productId] = (map[item.productId] ?: 0.0) + item.quantity
        }
        return map
    }

    /** Tanlangan mahsulot shart sifatida qatnashgan aksiya */
    val detailPromotion: ProductPromotion?
        get() {
            val pid = selectedProductId ?: return null
            val promo = promotionsByProductId[pid] ?: return null
            return promo.takeIf { it.hasReward() }
        }

    val detailPromoReward: PromotionReward?
        get() {
            val pid = selectedProductId ?: return null
            return detailPromotion?.primaryRewardFor(pid)
        }

    val detailPromoThreshold: Double
        get() {
            val pid = selectedProductId ?: return 0.0
            return detailPromotion?.conditionBuyQtyFor(pid) ?: 0.0
        }

    val detailPromoMax: Double
        get() = detailPromoReward?.quantity ?: 0.0

    val detailPromoUnlocked: Boolean
        get() {
            val promo = detailPromotion ?: return false
            return promo.isSatisfied(paidQtyMapWithDetail())
        }

    fun cartPromoQtyFor(promotionId: String, productId: String): Double =
        cart.find { it.promotionId == promotionId && it.productId == productId }?.quantity ?: 0.0

    private fun paidQtyMapWithDetail(): Map<String, Double> {
        val map = mutableMapOf<String, Double>()
        for (item in cart) {
            if (item.promotionId != null) continue
            map[item.productId] = (map[item.productId] ?: 0.0) + item.quantity
        }
        val pid = selectedProductId
        if (pid != null) {
            map[pid] = detailQuantity
        }
        return map
    }

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

    fun openPromotionsTab() {
        _uiState.update {
            it.copy(
                viewLevel = VisitViewLevel.PROMOTIONS,
                selectedCategory = null,
                products = emptyList(),
                selectedProductId = null,
                detailQuantity = 0.0,
                detailPromoQuantity = 0.0,
                detailNote = "",
                showCartSheet = false,
            )
        }
    }

    fun openProductsTab() {
        backToCategories()
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
        val state = _uiState.value
        val cartQty = state.cartQtyFor(product.id)
        val promo = state.promotionsByProductId[product.id]?.takeIf { it.hasReward() }
        val reward = promo?.primaryRewardFor(product.id)
        val promoQty = if (promo != null && reward != null) {
            state.cartPromoQtyFor(promo.id, reward.productId)
        } else {
            0.0
        }
        _uiState.update {
            it.copy(
                viewLevel = VisitViewLevel.PRODUCT_DETAIL,
                selectedCategory = category,
                products = products,
                selectedProductId = product.id,
                detailQuantity = cartQty,
                detailPromoQuantity = promoQty,
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
                detailPromoQuantity = 0.0,
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
        viewModelScope.launch {
            persistDetailQuantity(clamped)
            syncPromoQtyAfterPaidChange()
        }
    }

    fun incrementDetailQty(step: Double = detailQtyStep()) {
        setDetailQuantity(_uiState.value.detailQuantity + step)
    }

    fun decrementDetailQty(step: Double = detailQtyStep()) {
        val minQty = step
        setDetailQuantity((_uiState.value.detailQuantity - step).coerceAtLeast(minQty))
    }

    fun setDetailPromoQuantity(qty: Double) {
        val state = _uiState.value
        if (!state.detailPromoUnlocked) return
        val max = state.detailPromoMax
        if (max <= 0) return
        val clamped = qty.coerceIn(0.0, max)
        _uiState.update { it.copy(detailPromoQuantity = clamped) }
        viewModelScope.launch { persistDetailPromoQuantity(clamped) }
    }

    fun incrementDetailPromoQty(step: Double = detailQtyStep()) {
        if (!_uiState.value.detailPromoUnlocked) return
        setDetailPromoQuantity(_uiState.value.detailPromoQuantity + step)
    }

    fun decrementDetailPromoQty(step: Double = detailQtyStep()) {
        if (!_uiState.value.detailPromoUnlocked) return
        setDetailPromoQuantity((_uiState.value.detailPromoQuantity - step).coerceAtLeast(0.0))
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

    private suspend fun persistDetailPromoQuantity(qty: Double) {
        val state = _uiState.value
        val promo = state.detailPromotion ?: return
        val reward = state.detailPromoReward ?: return
        val clientId = state.clientId
        if (clientId.isBlank()) return
        if (!state.detailPromoUnlocked) return
        val rewardProduct = state.allProducts.find { it.id == reward.productId }
            ?: productRepository.getProduct(reward.productId)
            ?: return
        cartRepository.setPromoRewardQty(clientId, promo, rewardProduct, qty)
        refreshCart()
    }

    /** Oddiy miqdor thresholddan pastga tushsa — aksiya miqdorini tozalash */
    private suspend fun syncPromoQtyAfterPaidChange() {
        val state = _uiState.value
        if (state.detailPromotion == null) return
        if (!state.detailPromoUnlocked && state.detailPromoQuantity > 0) {
            _uiState.update { it.copy(detailPromoQuantity = 0.0) }
            // evaluatePromotions cart dagi promo qatorni olib tashlaydi
        } else if (state.detailPromoUnlocked) {
            val promo = state.detailPromotion ?: return
            val reward = state.detailPromoReward ?: return
            val cartPromo = state.cartPromoQtyFor(promo.id, reward.productId)
            if (kotlin.math.abs(cartPromo - state.detailPromoQuantity) > 0.0001) {
                _uiState.update { it.copy(detailPromoQuantity = cartPromo) }
            }
        }
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

    fun setBonusModalQty(rewardProductId: String, qty: Double) {
        val promo = _uiState.value.bonusModalPromotion ?: return
        val reward = promo.resolvedRewards().find { it.productId == rewardProductId } ?: return
        val clamped = qty.coerceIn(0.0, reward.quantity)
        _uiState.update {
            it.copy(bonusModalDraftQtys = it.bonusModalDraftQtys + (rewardProductId to clamped))
        }
    }

    fun incrementBonusModalQty(rewardProductId: String) {
        val state = _uiState.value
        val current = state.bonusModalDraftQtys[rewardProductId] ?: 0.0
        setBonusModalQty(rewardProductId, current + 1.0)
    }

    fun decrementBonusModalQty(rewardProductId: String) {
        val state = _uiState.value
        val current = state.bonusModalDraftQtys[rewardProductId] ?: 0.0
        setBonusModalQty(rewardProductId, (current - 1.0).coerceAtLeast(0.0))
    }

    fun dismissBonusModal() {
        val promo = _uiState.value.bonusModalPromotion ?: return
        _uiState.update {
            it.copy(
                bonusModalPromotion = null,
                bonusModalDraftQtys = emptyMap(),
                bonusModalShownIds = it.bonusModalShownIds + promo.id,
            )
        }
    }

    fun saveBonusModal() {
        val state = _uiState.value
        val promo = state.bonusModalPromotion ?: return
        viewModelScope.launch {
            val clientId = state.clientId
            if (clientId.isBlank()) return@launch
            if (!promo.isSatisfied(state.paidQtyMap())) return@launch
            for (reward in promo.resolvedRewards()) {
                val product = state.allProducts.find { it.id == reward.productId }
                    ?: productRepository.getProduct(reward.productId)
                    ?: continue
                val qty = state.bonusModalDraftQtys[reward.productId] ?: 0.0
                cartRepository.setPromoRewardQty(clientId, promo, product, qty.coerceIn(0.0, reward.quantity))
            }
            _uiState.update {
                it.copy(
                    bonusModalPromotion = null,
                    bonusModalDraftQtys = emptyMap(),
                    bonusModalShownIds = it.bonusModalShownIds + promo.id,
                )
            }
            refreshCart()
            val primary = promo.primaryRewardFor(state.selectedProductId.orEmpty())
            if (primary != null && state.selectedProductId != null) {
                val saved = _uiState.value.cartPromoQtyFor(promo.id, primary.productId)
                _uiState.update { it.copy(detailPromoQuantity = saved) }
            }
        }
    }

    /** Aksiya tabidan sovg‘a miqdorini o‘zgartirish (faqat 100% da) */
    fun setPromotionRewardQty(promotionId: String, rewardProductId: String, qty: Double) {
        viewModelScope.launch {
            val state = _uiState.value
            val clientId = state.clientId
            if (clientId.isBlank()) return@launch
            val promo = state.activePromotions.find { it.id == promotionId } ?: return@launch
            if (!promo.hasReward()) return@launch
            if (!promo.isSatisfied(state.paidQtyMap())) return@launch
            val reward = promo.resolvedRewards().find { it.productId == rewardProductId } ?: return@launch
            val product = state.allProducts.find { it.id == rewardProductId }
                ?: productRepository.getProduct(rewardProductId)
                ?: return@launch
            val clamped = qty.coerceIn(0.0, reward.quantity)
            cartRepository.setPromoRewardQty(clientId, promo, product, clamped)
            refreshCart()
            if (state.selectedProductId != null && state.detailPromoReward?.productId == rewardProductId) {
                _uiState.update { it.copy(detailPromoQuantity = clamped) }
            }
        }
    }

    fun incrementPromotionRewardQty(promotionId: String, rewardProductId: String) {
        val state = _uiState.value
        val current = state.cartPromoQtyFor(promotionId, rewardProductId)
        val step = 1.0
        setPromotionRewardQty(promotionId, rewardProductId, current + step)
    }

    fun decrementPromotionRewardQty(promotionId: String, rewardProductId: String) {
        val state = _uiState.value
        val current = state.cartPromoQtyFor(promotionId, rewardProductId)
        setPromotionRewardQty(promotionId, rewardProductId, (current - 1.0).coerceAtLeast(0.0))
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
     * 100% bo‘lganda — sovg‘a modal (sahifadan qat’i nazar).
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
        var shownIds = state.bonusModalShownIds

        for (promo in state.activePromotions) {
            if (!promo.hasReward()) continue
            val ok = promo.isSatisfied(paidQty)
            if (!ok && promo.id in presentPromoIds) {
                cartRepository.removePromoReward(clientId, promo.id)
            }
            if (!ok && promo.id in shownIds) {
                shownIds = shownIds - promo.id
            }
        }

        val cartAfter = cartRepository.getCartForClient(clientId)
        val totalAfter = cartRepository.getTotalForClient(clientId)

        val paidAfter = mutableMapOf<String, Double>()
        for (item in cartAfter) {
            if (item.promotionId != null) continue
            paidAfter[item.productId] = (paidAfter[item.productId] ?: 0.0) + item.quantity
        }

        var nextDetailPromoQty = state.detailPromoQuantity
        val selectedId = state.selectedProductId
        val detailPromo = selectedId?.let { state.promotionsByProductId[it]?.takeIf { p -> p.hasReward() } }
        if (detailPromo != null && selectedId != null) {
            val reward = detailPromo.primaryRewardFor(selectedId)
            if (reward != null) {
                val stillPresent = cartAfter.any {
                    it.promotionId == detailPromo.id && it.productId == reward.productId
                }
                if (!stillPresent && nextDetailPromoQty > 0) {
                    nextDetailPromoQty = 0.0
                } else if (stillPresent) {
                    nextDetailPromoQty = cartAfter
                        .find { it.promotionId == detailPromo.id && it.productId == reward.productId }
                        ?.quantity ?: 0.0
                }
            }
        }

        var bonusModal = state.bonusModalPromotion
        var bonusDrafts = state.bonusModalDraftQtys
        if (bonusModal != null && !bonusModal.isSatisfied(paidAfter)) {
            bonusModal = null
            bonusDrafts = emptyMap()
        }
        if (bonusModal == null) {
            val candidate = state.activePromotions.firstOrNull { promo ->
                promo.hasReward() &&
                    promo.isSatisfied(paidAfter) &&
                    promo.id !in shownIds
            }
            if (candidate != null) {
                bonusModal = candidate
                bonusDrafts = candidate.resolvedRewards().associate { reward ->
                    val have = cartAfter
                        .find { it.promotionId == candidate.id && it.productId == reward.productId }
                        ?.quantity ?: 0.0
                    reward.productId to have
                }
            }
        }

        _uiState.update {
            it.copy(
                cart = cartAfter,
                cartTotal = totalAfter,
                detailPromoQuantity = nextDetailPromoQty,
                bonusModalShownIds = shownIds,
                bonusModalPromotion = bonusModal,
                bonusModalDraftQtys = bonusDrafts,
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
            updates.add(AppStrings.newProductImportedLine(lang, p.name))
        }

        val removed = before.filter { it.id !in afterIds }.map { it.name }
        if (removed.isNotEmpty()) {
            updates.add(AppStrings.productsRemovedNames(lang, removed))
        }

        val stockUp = after.mapNotNull { product ->
            val prev = beforeMap[product.id] ?: return@mapNotNull null
            val delta = product.stockBalance - prev.stockBalance
            if (delta <= 0.0001) return@mapNotNull null
            product.name to delta
        }.sortedByDescending { it.second }

        if (stockUp.isNotEmpty()) {
            updates.add(AppStrings.productsImportedTitle(lang))
            stockUp.take(20).forEach { (name, _) ->
                updates.add(AppStrings.productStockImportLine(lang, name))
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
