package uz.distributor.crm.presentation.visit

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.core.tween
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.window.DialogWindowProvider
import android.view.WindowManager
import android.view.inputmethod.InputMethodManager
import android.content.Context
import androidx.core.content.getSystemService
import androidx.compose.runtime.DisposableEffect
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.gestures.detectTapGestures
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import kotlin.math.roundToInt
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import uz.distributor.crm.domain.model.CartItem
import uz.distributor.crm.domain.model.Product
import uz.distributor.crm.domain.model.ProductPromotion
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.navigation.BottomNavChrome
import uz.distributor.crm.presentation.recording.RecordingStatusRow
import uz.distributor.crm.recording.VisitRecordingUiState
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.sherinHeroBrush
import uz.distributor.crm.presentation.theme.sherinPageBackground
import uz.distributor.crm.util.UzScript
import java.text.DecimalFormat

@Composable
fun VisitScreen(
    clientId: String,
    onBack: () -> Unit,
    onOrderSummary: (String) -> Unit,
    recordingState: VisitRecordingUiState = VisitRecordingUiState(),
    viewModel: VisitViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val priceFmt = remember { DecimalFormat("#,###") }
    val stockFmt = remember { DecimalFormat("#,##0.###") }
    val totalFmt = remember { DecimalFormat("#,##0.00") }
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f

    val pageBg = sherinPageBackground(isDark)
    val cardBg = if (isDark) SherinColors.CardRowDark else Color.White
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val subColor = Color(0xFF9CA3AF)
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    val cartBarBg = if (isDark) SherinColors.CardDark else Color.White
    val snackbarHostState = remember { SnackbarHostState() }
    val lifecycleOwner = LocalLifecycleOwner.current

    LaunchedEffect(clientId) { viewModel.init(clientId) }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.reloadCart()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(state.detailCartJustSaved) {
        if (state.detailCartJustSaved) {
            snackbarHostState.showSnackbar(AppStrings.addedToCart(lang))
        }
    }

    val handleBack = {
        when (state.viewLevel) {
            VisitViewLevel.PRODUCT_DETAIL -> viewModel.backFromProductDetail()
            VisitViewLevel.PRODUCTS -> viewModel.backToCategories()
            VisitViewLevel.PROMOTIONS -> viewModel.backToCategories()
            VisitViewLevel.CATEGORIES -> onBack()
        }
    }
    BackHandler(onBack = handleBack)

    val categoriesListState = rememberLazyListState()
    val productsListState = rememberLazyListState()
    val productsChromeVisible = rememberVisitChromeVisibility(
        listState = productsListState,
        enabled = state.viewLevel == VisitViewLevel.PRODUCTS,
    )

    DisposableEffect(Unit) {
        onDispose { BottomNavChrome.reset() }
    }
    LaunchedEffect(state.viewLevel, productsChromeVisible) {
        when (state.viewLevel) {
            VisitViewLevel.PRODUCTS -> BottomNavChrome.setVisible(productsChromeVisible)
            else -> BottomNavChrome.reset()
        }
    }

    // Pastki menyu AppNavHost Column ichida joy ajratadi — bu yerda qo'shimcha padding kerak emas.
    Box(modifier = Modifier.fillMaxSize()) {
    Column(modifier = Modifier.fillMaxSize().background(pageBg)) {
        when (state.viewLevel) {
            VisitViewLevel.CATEGORIES -> VisitCategoriesHeader(
                isDark = isDark,
                activeTab = 0,
                showTabs = true,
                searchQuery = state.searchQuery,
                onSearchChange = viewModel::setSearchQuery,
                onBack = handleBack,
                onProductTabClick = viewModel::openProductsTab,
                onPromoTabClick = viewModel::openPromotionsTab,
                onCartTabClick = viewModel::openCartSheet,
                recordingState = recordingState,
            )
            VisitViewLevel.PROMOTIONS -> VisitCategoriesHeader(
                isDark = isDark,
                activeTab = 1,
                showTabs = true,
                searchQuery = null,
                onSearchChange = {},
                onBack = handleBack,
                onProductTabClick = viewModel::openProductsTab,
                onPromoTabClick = viewModel::openPromotionsTab,
                onCartTabClick = viewModel::openCartSheet,
                recordingState = recordingState,
            )
            VisitViewLevel.PRODUCT_DETAIL -> {
                val product = state.selectedProduct
                if (product != null) {
                    VisitProductDetailHeader(
                        categoryLabel = when (state.selectedCategory) {
                            VisitViewModel.ALL_CATEGORY -> AppStrings.allGoods(lang)
                            else -> state.selectedCategory.orEmpty()
                        },
                        product = product,
                        isDark = isDark,
                        lang = lang,
                        onBack = handleBack,
                        onBackToCategories = viewModel::backToCategories,
                        recordingState = recordingState,
                    )
                }
            }
            VisitViewLevel.PRODUCTS -> VisitProductsHeader(
                categoryName = when {
                    state.showAllCategories || state.selectedCategory == VisitViewModel.ALL_CATEGORY ->
                        AppStrings.allGoods(lang)
                    else -> state.selectedCategory.orEmpty()
                },
                subtitle = AppStrings.productsCount(
                    lang,
                    state.filteredProducts.size,
                    state.totalProductCount,
                ),
                searchQuery = state.searchQuery,
                showAllCategories = state.showAllCategories,
                showOutOfStock = state.showOutOfStock,
                productsGridMode = state.productsGridMode,
                productSort = state.productSort,
                alphabetLetters = state.alphabetLetters,
                alphabetAnchor = state.alphabetAnchor,
                chromeVisible = productsChromeVisible,
                isDark = isDark,
                onBack = handleBack,
                onSearchChange = viewModel::setSearchQuery,
                onToggleAllCategories = viewModel::toggleShowAllCategories,
                onToggleOutOfStock = viewModel::toggleShowOutOfStock,
                onToggleGridMode = viewModel::toggleProductsGridMode,
                onSetSort = viewModel::setProductSort,
                onAlphabetJump = viewModel::jumpToAlphabet,
                recordingState = recordingState,
            )
        }

        if (state.viewLevel == VisitViewLevel.CATEGORIES || state.viewLevel == VisitViewLevel.PROMOTIONS) {
            VisitSummaryBar(
                cartTotal = state.cartTotal,
                totalFmt = totalFmt,
                isDark = isDark,
                refreshState = state.refreshButtonState,
                onRefresh = viewModel::refresh,
                onCartClick = viewModel::openCartSheet,
            )
        }

        if (state.showRefreshResult && state.refreshUpdates.isNotEmpty()) {
            VisitRefreshResultCard(
                updates = state.refreshUpdates,
                title = AppStrings.refreshUpdatesTitle(lang),
                isDark = isDark,
                onDismiss = viewModel::dismissRefreshResult,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }

        if (state.viewLevel == VisitViewLevel.CATEGORIES) {
            VisitAllGoodsToggle(
                showAllProducts = state.showOutOfStock,
                isDark = isDark,
                label = AppStrings.showOutOfStock(lang),
                onToggleAll = viewModel::toggleShowOutOfStock,
            )
        }

        when {
            state.isLoading -> {
                Box(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = SherinColors.Primary)
                }
            }
            state.error != null -> {
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(AppStrings.apiError(lang, state.error!!), color = subColor, fontSize = 14.sp)
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = viewModel::retry,
                        colors = ButtonDefaults.buttonColors(containerColor = SherinColors.Primary),
                    ) {
                        Icon(Icons.Default.Refresh, null)
                        Spacer(Modifier.width(8.dp))
                        Text(AppStrings.reload(lang))
                    }
                }
            }
            state.viewLevel == VisitViewLevel.CATEGORIES -> {
                val stockByCategory = state.allProducts
                    .groupBy { it.category }
                    .mapValues { (_, items) -> items.any { it.stockBalance > 0 } }
                val filteredCategories = state.categoryCounts.filter { category ->
                    val hasStock = stockByCategory[category.name] == true
                    val matchesStock = state.showOutOfStock || hasStock
                    val matchesQuery = state.searchQuery.isBlank() ||
                        UzScript.matches(category.name, state.searchQuery)
                    matchesStock && matchesQuery
                }
                if (filteredCategories.isEmpty()) {
                    Box(
                        modifier = Modifier.weight(1f).fillMaxWidth(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(AppStrings.noProductsInCategory(lang), color = subColor)
                    }
                } else {
                    LazyColumn(
                        state = categoriesListState,
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        items(filteredCategories, key = { it.name }) { category ->
                            VisitCategoryCard(
                                name = category.name,
                                cartCount = state.cartCountForCategory(category.name),
                                cardBg = cardBg,
                                borderColor = borderColor,
                                titleColor = titleColor,
                                subColor = subColor,
                                onClick = { viewModel.openCategory(category.name) },
                            )
                        }
                        item {
                            VisitSeeAllCard(
                                cardBg = cardBg,
                                borderColor = borderColor,
                                label = AppStrings.seeAllGoods(lang),
                                onClick = { viewModel.openCategory(VisitViewModel.ALL_CATEGORY) },
                            )
                        }
                    }
                }
            }
            state.viewLevel == VisitViewLevel.PROMOTIONS -> {
                val promos = state.activePromotions.filter { it.hasReward() }
                val paidQty = state.paidQtyMap()
                val productNames = state.allProducts.associate { it.id to it.name }
                if (promos.isEmpty()) {
                    Box(
                        modifier = Modifier.weight(1f).fillMaxWidth(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(AppStrings.noActivePromotions(lang), color = subColor)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(promos, key = { it.id }) { promo ->
                            PromoProgressCard(
                                promotion = promo,
                                paidQtyByProduct = paidQty,
                                productNames = productNames,
                                cartPromoQty = { rewardProductId ->
                                    state.cartPromoQtyFor(promo.id, rewardProductId)
                                },
                                onIncrementReward = { rewardProductId ->
                                    viewModel.incrementPromotionRewardQty(promo.id, rewardProductId)
                                },
                                onDecrementReward = { rewardProductId ->
                                    viewModel.decrementPromotionRewardQty(promo.id, rewardProductId)
                                },
                                onRewardQtyChange = { rewardProductId, qty ->
                                    viewModel.setPromotionRewardQty(promo.id, rewardProductId, qty)
                                },
                            )
                        }
                    }
                }
            }
            state.viewLevel == VisitViewLevel.PRODUCT_DETAIL -> {
                val product = state.selectedProduct
                if (product != null) {
                    VisitProductDetailContent(
                        product = product,
                        quantity = state.detailQuantity,
                        promoQuantity = state.detailPromoQuantity,
                        promoEnabled = state.detailPromotion != null,
                        promoUnlocked = state.detailPromoUnlocked,
                        promoThreshold = state.detailPromoThreshold,
                        promoMax = state.detailPromoMax,
                        promoRewardName = state.detailPromoReward?.productName.orEmpty()
                            .ifBlank {
                                state.allProducts.find { it.id == state.detailPromoReward?.productId }?.name.orEmpty()
                            },
                        detailPromotion = state.detailPromotion?.takeIf {
                            it.id !in state.dismissedBannerIds
                        },
                        paidQtyByProduct = run {
                            val map = state.paidQtyMap().toMutableMap()
                            map[product.id] = state.detailQuantity
                            map
                        },
                        productNames = state.allProducts.associate { it.id to it.name },
                        cartPromoQty = { promoId, rewardProductId ->
                            state.cartPromoQtyFor(promoId, rewardProductId)
                        },
                        onIncrementPromoReward = { promoId, rewardProductId ->
                            viewModel.incrementPromotionRewardQty(promoId, rewardProductId)
                        },
                        onDecrementPromoReward = { promoId, rewardProductId ->
                            viewModel.decrementPromotionRewardQty(promoId, rewardProductId)
                        },
                        onSetPromoRewardQty = { promoId, rewardProductId, qty ->
                            viewModel.setPromotionRewardQty(promoId, rewardProductId, qty)
                        },
                        onDismissPromo = { promoId ->
                            viewModel.dismissPromoBanner(promoId)
                        },
                        note = state.detailNote,
                        lineTotal = state.detailLineTotal,
                        currentIndex = state.selectedProductIndex,
                        totalCount = state.filteredProducts.size,
                        prevProduct = state.filteredProducts.getOrNull(state.selectedProductIndex - 1),
                        nextProduct = state.filteredProducts.getOrNull(state.selectedProductIndex + 1),
                        priceFmt = priceFmt,
                        stockFmt = stockFmt,
                        isDark = isDark,
                        lang = lang,
                        onDecrement = { viewModel.decrementDetailQty() },
                        onIncrement = { viewModel.incrementDetailQty() },
                        onPresetQty = { qty -> viewModel.setDetailQuantityForProduct(product.id, qty) },
                        onQuantityChange = { qty -> viewModel.setDetailQuantityForProduct(product.id, qty) },
                        onPromoDecrement = { viewModel.decrementDetailPromoQty() },
                        onPromoIncrement = { viewModel.incrementDetailPromoQty() },
                        onPromoPresetQty = viewModel::setDetailPromoQuantity,
                        onPromoQuantityChange = viewModel::setDetailPromoQuantity,
                        onNoteChange = viewModel::setDetailNote,
                        onPrev = { viewModel.navigateProduct(-1) },
                        onNext = { viewModel.navigateProduct(1) },
                        onAddToCart = viewModel::addDetailToCart,
                        cart = state.cart,
                        cartJustSaved = state.detailCartJustSaved,
                        productImageUrl = viewModel.resolveProductImageUrl(product.imageUrl),
                        productImages = state.allProducts.associate {
                            it.id to viewModel.resolveProductImageUrl(it.imageUrl)
                        },
                        focusQuantity = state.focusDetailQuantity,
                        onFocusQuantityHandled = viewModel::clearFocusDetailQuantity,
                        onCartItemClick = viewModel::openProductById,
                        onEditCartItem = viewModel::editCartItem,
                        onRemoveCartItem = viewModel::removeFromCart,
                        onBackToCategory = viewModel::backFromProductDetail,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            state.filteredProducts.isEmpty() -> {
                Box(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(AppStrings.noProductsInCategory(lang), color = subColor)
                }
            }
            else -> {
                VisitProductsListContent(
                    products = state.filteredProducts,
                    cart = state.cart,
                    gridMode = state.productsGridMode,
                    alphabetAnchor = state.alphabetAnchor,
                    priceFmt = priceFmt,
                    stockFmt = stockFmt,
                    cardBg = cardBg,
                    borderColor = borderColor,
                    titleColor = titleColor,
                    subColor = subColor,
                    lang = lang,
                    isDark = isDark,
                    promotionsByProductId = state.promotionsByProductId,
                    resolveImageUrl = viewModel::resolveProductImageUrl,
                    listState = productsListState,
                    onProductClick = viewModel::openProduct,
                    onIncrementQty = viewModel::incrementListProductQty,
                    onDecrementQty = viewModel::decrementListProductQty,
                    onSetQty = viewModel::setListProductQty,
                    onAlphabetHandled = viewModel::clearAlphabetAnchor,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        if (state.viewLevel != VisitViewLevel.PRODUCT_DETAIL) {
        Surface(shadowElevation = 8.dp, color = cartBarBg) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "${state.cart.size} ${AppStrings.items(lang)}",
                        fontSize = 13.sp,
                        color = subColor,
                    )
                    Text(
                        "${priceFmt.format(state.cartTotal.toLong())} ${AppStrings.sumCurrency(lang)}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = titleColor,
                    )
                }
                Button(
                    onClick = { onOrderSummary(clientId) },
                    enabled = state.cart.isNotEmpty(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = SherinColors.Primary,
                        disabledContainerColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB),
                    ),
                ) {
                    Text(AppStrings.order(lang))
                }
            }
        }
        }
    }

    if (state.showFloatingCart) {
        VisitFloatingCartFab(
            count = state.paidCartItemCount,
            dropZoneVisible = state.showFabDropZone,
            lang = lang,
            onClick = viewModel::openQuickCartModal,
            onDragStart = viewModel::showFabDropZone,
            onDropHide = viewModel::hideFloatingCartForClient,
            onCancelDrop = viewModel::hideFabDropZone,
            modifier = Modifier.fillMaxSize(),
        )
    }

    SnackbarHost(
        hostState = snackbarHostState,
        modifier = Modifier
            .align(Alignment.BottomCenter)
            .padding(bottom = 8.dp),
    )

    if (state.showCartSheet) {
        VisitCartSheet(
            cart = state.cart,
            productImages = state.allProducts.associate {
                it.id to viewModel.resolveProductImageUrl(it.imageUrl)
            },
            priceFmt = priceFmt,
            stockFmt = stockFmt,
            isDark = isDark,
            lang = lang,
            titleColor = titleColor,
            cardBg = cardBg,
            borderColor = borderColor,
            recordingState = recordingState,
            onDismiss = viewModel::closeCartSheet,
            onItemClick = viewModel::openProductById,
            onEditItem = viewModel::editCartItem,
            onRemoveItem = viewModel::removeFromCart,
        )
    }

    if (state.showQuickCartModal) {
        VisitQuickCartModal(
            cart = state.cart.filter { it.promotionId == null },
            productImages = state.allProducts.associate {
                it.id to viewModel.resolveProductImageUrl(it.imageUrl)
            },
            priceFmt = priceFmt,
            stockFmt = stockFmt,
            isDark = isDark,
            lang = lang,
            onDismiss = viewModel::closeQuickCartModal,
            onRemoveItem = viewModel::removeFromCart,
        )
    }

    state.bonusModalPromotion?.let { promo ->
        PromoBonusModal(
            promotion = promo,
            draftQtys = state.bonusModalDraftQtys,
            productNames = state.allProducts.associate { it.id to it.name },
            lang = lang,
            onIncrement = viewModel::incrementBonusModalQty,
            onDecrement = viewModel::decrementBonusModalQty,
            onQuantityChange = viewModel::setBonusModalQty,
            onSave = viewModel::saveBonusModal,
            onDismiss = viewModel::dismissBonusModal,
        )
    }
    }
}

@Composable
private fun PromoBonusModal(
    promotion: ProductPromotion,
    draftQtys: Map<String, Double>,
    productNames: Map<String, String>,
    lang: AppLanguage,
    onIncrement: (rewardProductId: String) -> Unit,
    onDecrement: (rewardProductId: String) -> Unit,
    onQuantityChange: (rewardProductId: String, qty: Double) -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit,
) {
    val startColor = remember(promotion.colorStart) {
        runCatching {
            Color(android.graphics.Color.parseColor(promotion.colorStart))
        }.getOrDefault(Color(0xFF6366F1))
    }
    val endColor = remember(promotion.colorEnd) {
        runCatching {
            Color(android.graphics.Color.parseColor(promotion.colorEnd))
        }.getOrDefault(Color(0xFF9333EA))
    }
    val rewards = promotion.resolvedRewards()

    fun fmtQty(v: Double): String =
        if (v % 1.0 == 0.0) v.toInt().toString() else String.format("%.1f", v)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = true,
        ),
    ) {
        val dialogView = LocalView.current
        DisposableEffect(dialogView) {
            val window = (dialogView.parent as? DialogWindowProvider)?.window
            window?.setSoftInputMode(
                WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE or
                    WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE,
            )
            onDispose { }
        }
        Column(
            Modifier
                .fillMaxWidth(0.92f)
                .clip(RoundedCornerShape(20.dp))
                .background(Brush.verticalGradient(listOf(startColor, endColor)))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        promotion.title,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        AppStrings.promoBonusReadyHint(lang),
                        color = Color.White.copy(0.9f),
                        fontSize = 13.sp,
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = null, tint = Color.White)
                }
            }

            rewards.forEach { reward ->
                val name = reward.productName.ifBlank {
                    productNames[reward.productId].orEmpty()
                }.ifBlank { "…" }
                val current = draftQtys[reward.productId] ?: 0.0
                val maxQ = reward.quantity
                val priceLabel = if (reward.price <= 0) AppStrings.promoFree(lang)
                else reward.price.toLong().toString()

                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.White.copy(0.18f))
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            "${promotion.emoji} $name",
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            "max ${fmtQty(maxQ)} · $priceLabel",
                            color = Color.White.copy(0.8f),
                            fontSize = 11.sp,
                        )
                    }
                    VisitQtyButton(
                        icon = Icons.Default.Remove,
                        enabled = current > 0,
                        tint = Color.White,
                        bg = Color.White.copy(0.22f),
                        onClick = { onDecrement(reward.productId) },
                    )
                    VisitCompactEditableQty(
                        quantity = current,
                        maxQuantity = maxQ,
                        textColor = Color.White,
                        onQuantityChange = { qty -> onQuantityChange(reward.productId, qty) },
                    )
                    VisitQtyButton(
                        icon = Icons.Default.Add,
                        enabled = current < maxQ,
                        tint = Color.White,
                        bg = Color.White.copy(0.28f),
                        onClick = { onIncrement(reward.productId) },
                    )
                }
            }

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                    border = BorderStroke(1.dp, Color.White.copy(0.5f)),
                ) {
                    Text(AppStrings.promoBonusModalSkip(lang))
                }
                Button(
                    onClick = onSave,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = startColor,
                    ),
                ) {
                    Text(AppStrings.promoBonusModalSave(lang), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VisitCartSheet(
    cart: List<CartItem>,
    productImages: Map<String, String>,
    priceFmt: DecimalFormat,
    stockFmt: DecimalFormat,
    isDark: Boolean,
    lang: AppLanguage,
    titleColor: Color,
    cardBg: Color,
    borderColor: Color,
    recordingState: VisitRecordingUiState = VisitRecordingUiState(),
    onDismiss: () -> Unit,
    onItemClick: (String) -> Unit,
    onEditItem: (String) -> Unit,
    onRemoveItem: (String) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = if (isDark) SherinColors.CardDark else Color.White,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 24.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    AppStrings.cartPreviewTitle(lang, cart.size),
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = if (isDark) Color.White else Color(0xFF111827),
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = null)
                }
            }
            RecordingStatusRow(
                state = recordingState,
                onDarkHeader = isDark,
                modifier = Modifier.padding(top = 4.dp, bottom = 4.dp),
            )
            Spacer(Modifier.height(8.dp))
            if (cart.isEmpty()) {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(AppStrings.cartEmpty(lang), color = subColor, fontSize = 14.sp)
                }
            } else {
                cart.forEach { item ->
                    VisitDetailCartRow(
                        item = item,
                        isCurrent = false,
                        imageUrl = productImages[item.productId].orEmpty(),
                        priceFmt = priceFmt,
                        stockFmt = stockFmt,
                        lang = lang,
                        titleColor = titleColor,
                        onClick = { onItemClick(item.productId) },
                        onEdit = { onEditItem(item.productId) },
                        onRemove = { onRemoveItem(item.productId) },
                    )
                }
            }
        }
    }
}

@Composable
private fun VisitProductDetailHeader(
    categoryLabel: String,
    product: Product,
    isDark: Boolean,
    lang: AppLanguage,
    onBack: () -> Unit,
    onBackToCategories: () -> Unit,
    recordingState: VisitRecordingUiState = VisitRecordingUiState(),
) {
    Box(Modifier.fillMaxWidth().background(sherinHeroBrush(isDark))) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(top = 36.dp, bottom = 20.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SherinGlassIconButton(
                    onClick = onBack,
                    icon = Icons.AutoMirrored.Filled.ArrowBack,
                    size = 40.dp,
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 12.dp),
                ) {
                    Text(
                        categoryLabel.uppercase(),
                        color = Color.White.copy(0.75f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 1.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "${product.code} — ${product.name}",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                VisitCategoriesGlassChip(
                    label = AppStrings.backToCategories(lang),
                    onClick = onBackToCategories,
                )
            }
            RecordingStatusRow(
                state = recordingState,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
    }
}

/** Header o‘ngidagi premium glass chip — kategoriyalar sahifasiga */
@Composable
private fun VisitCategoriesGlassChip(
    label: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(Color.White.copy(alpha = 0.14f))
            .border(1.dp, Color.White.copy(alpha = 0.28f), RoundedCornerShape(20.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(
            Icons.Default.Apps,
            contentDescription = label,
            tint = Color.White,
            modifier = Modifier.size(16.dp),
        )
        Text(
            label,
            color = Color.White,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.2.sp,
            maxLines = 1,
        )
    }
}

@Composable
private fun VisitProductDetailContent(
    product: Product,
    quantity: Double,
    promoQuantity: Double,
    promoEnabled: Boolean,
    promoUnlocked: Boolean,
    promoThreshold: Double,
    promoMax: Double,
    promoRewardName: String,
    detailPromotion: ProductPromotion?,
    paidQtyByProduct: Map<String, Double>,
    productNames: Map<String, String>,
    cartPromoQty: (promoId: String, rewardProductId: String) -> Double,
    onIncrementPromoReward: (promoId: String, rewardProductId: String) -> Unit,
    onDecrementPromoReward: (promoId: String, rewardProductId: String) -> Unit,
    onSetPromoRewardQty: (promoId: String, rewardProductId: String, qty: Double) -> Unit,
    onDismissPromo: (promoId: String) -> Unit,
    note: String,
    lineTotal: Double,
    currentIndex: Int,
    totalCount: Int,
    prevProduct: Product?,
    nextProduct: Product?,
    priceFmt: DecimalFormat,
    stockFmt: DecimalFormat,
    isDark: Boolean,
    lang: AppLanguage,
    onDecrement: () -> Unit,
    onIncrement: () -> Unit,
    onPresetQty: (Double) -> Unit,
    onQuantityChange: (Double) -> Unit,
    onPromoDecrement: () -> Unit,
    onPromoIncrement: () -> Unit,
    onPromoPresetQty: (Double) -> Unit,
    onPromoQuantityChange: (Double) -> Unit,
    onNoteChange: (String) -> Unit,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onAddToCart: () -> Unit,
    cart: List<CartItem>,
    cartJustSaved: Boolean,
    productImageUrl: String,
    productImages: Map<String, String>,
    focusQuantity: Boolean,
    onFocusQuantityHandled: () -> Unit,
    onCartItemClick: (String) -> Unit,
    onEditCartItem: (String) -> Unit,
    onRemoveCartItem: (String) -> Unit,
    onBackToCategory: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val cardBg = if (isDark) SherinColors.CardRowDark else Color.White
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val presets = listOf(1.0, 5.0, 10.0, 25.0, 50.0)
    val hasQty = quantity > 0.0
    val thresholdLabel = if (promoThreshold % 1.0 == 0.0) {
        promoThreshold.toInt().toString()
    } else {
        stockFmt.format(promoThreshold)
    }
    val promoMaxLabel = if (promoMax % 1.0 == 0.0) {
        promoMax.toInt().toString()
    } else {
        stockFmt.format(promoMax)
    }
    val focusManager = LocalFocusManager.current
    LaunchedEffect(product.id) {
        focusManager.clearFocus(force = true)
    }

    Column(
        modifier = modifier
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (detailPromotion != null) {
            PromoProgressCard(
                promotion = detailPromotion,
                paidQtyByProduct = paidQtyByProduct,
                productNames = productNames,
                cartPromoQty = { rewardProductId ->
                    cartPromoQty(detailPromotion.id, rewardProductId)
                },
                onIncrementReward = { rewardProductId ->
                    onIncrementPromoReward(detailPromotion.id, rewardProductId)
                },
                onDecrementReward = { rewardProductId ->
                    onDecrementPromoReward(detailPromotion.id, rewardProductId)
                },
                onRewardQtyChange = { rewardProductId, qty ->
                    onSetPromoRewardQty(detailPromotion.id, rewardProductId, qty)
                },
                showPerConditionProgress = true,
                showBonusSection = true,
                onDismiss = { onDismissPromo(detailPromotion.id) },
            )
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            VisitDetailInfoCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.Inventory2,
                iconTint = Color(0xFF22C55E),
                iconBg = if (isDark) Color(0xFF064E3B) else Color(0xFFF0FDF4),
                label = AppStrings.stock(lang),
                value = stockFmt.format(product.stockBalance),
                unit = product.unit,
                valueColor = Color(0xFF22C55E),
                cardBg = cardBg,
                borderColor = borderColor,
                labelColor = subColor,
            )
            VisitDetailInfoCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.ShoppingCart,
                iconTint = Color(0xFF3B82F6),
                iconBg = if (isDark) Color(0xFF1E3A8A) else Color(0xFFEFF6FF),
                label = AppStrings.priceLabel(lang),
                value = priceFmt.format(product.price.toLong()),
                unit = AppStrings.pricePerUnit(lang, product.unit),
                valueColor = titleColor,
                cardBg = cardBg,
                borderColor = borderColor,
                labelColor = subColor,
            )
        }

        if (promoEnabled) {
            VisitQuantityCard(
                modifier = Modifier.fillMaxWidth(),
                title = AppStrings.quantityLabel(lang),
                quantity = quantity,
                unit = product.unit,
                presets = presets,
                enabled = true,
                accent = Color(0xFF3B82F6),
                stockFmt = stockFmt,
                titleColor = titleColor,
                subColor = subColor,
                cardBg = cardBg,
                borderColor = borderColor,
                isDark = isDark,
                focusQuantity = focusQuantity,
                resetKey = product.id,
                backToCategoryLabel = AppStrings.backToCategoryList(lang),
                onBackToCategory = onBackToCategory,
                onFocusHandled = onFocusQuantityHandled,
                onDecrement = onDecrement,
                onIncrement = onIncrement,
                onPresetQty = onPresetQty,
                onQuantityChange = onQuantityChange,
            )
            VisitQuantityCard(
                modifier = Modifier.fillMaxWidth(),
                title = AppStrings.promoQuantityLabel(lang),
                quantity = promoQuantity,
                unit = product.unit,
                presets = presets.filter { it <= promoMax || promoMax <= 0 },
                enabled = promoUnlocked,
                accent = Color(0xFF8B5CF6),
                stockFmt = stockFmt,
                titleColor = titleColor,
                subColor = subColor,
                cardBg = cardBg,
                borderColor = borderColor,
                isDark = isDark,
                focusQuantity = false,
                resetKey = product.id,
                onFocusHandled = {},
                onDecrement = onPromoDecrement,
                onIncrement = onPromoIncrement,
                onPresetQty = onPromoPresetQty,
                onQuantityChange = onPromoQuantityChange,
                hint = if (!promoUnlocked) {
                    AppStrings.promoQtyLockedHint(lang, thresholdLabel)
                } else {
                    buildString {
                        if (promoRewardName.isNotBlank()) append(promoRewardName).append(" · ")
                        append(AppStrings.promoQtyMaxHint(lang, promoMaxLabel))
                    }
                },
            )
        } else {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = cardBg,
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, borderColor, RoundedCornerShape(16.dp)),
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        AppStrings.quantityLabel(lang),
                        color = subColor,
                        fontSize = 13.sp,
                    )
                    Spacer(Modifier.height(16.dp))
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Bottom,
                    ) {
                        VisitQtyButton(
                            icon = Icons.Default.Remove,
                            enabled = quantity > 0,
                            tint = if (quantity > 0) titleColor else subColor,
                            bg = if (isDark) Color(0xFF374151) else Color(0xFFF3F4F6),
                            onClick = onDecrement,
                        )
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .align(Alignment.CenterVertically),
                            contentAlignment = Alignment.Center,
                        ) {
                            key(product.id) {
                                VisitEditableQuantity(
                                    quantity = quantity,
                                    unit = product.unit,
                                    stockFmt = stockFmt,
                                    titleColor = titleColor,
                                    requestFocus = focusQuantity,
                                    onFocusHandled = onFocusQuantityHandled,
                                    onQuantityChange = onQuantityChange,
                                )
                            }
                        }
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            VisitBackToCategoryButton(
                                label = AppStrings.backToCategoryList(lang),
                                isDark = isDark,
                                onClick = onBackToCategory,
                            )
                            VisitQtyButton(
                                icon = Icons.Default.Add,
                                enabled = true,
                                tint = Color.White,
                                bg = Color(0xFF3B82F6),
                                onClick = onIncrement,
                            )
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        presets.forEach { preset ->
                            val selected = quantity == preset
                            Surface(
                                onClick = { onPresetQty(preset) },
                                shape = RoundedCornerShape(10.dp),
                                color = when {
                                    selected -> Color(0xFF3B82F6)
                                    isDark -> Color(0xFF374151)
                                    else -> Color(0xFFF3F4F6)
                                },
                                modifier = Modifier.weight(1f),
                            ) {
                                Text(
                                    preset.toInt().toString(),
                                    modifier = Modifier.padding(vertical = 10.dp),
                                    textAlign = TextAlign.Center,
                                    color = if (selected) Color.White else titleColor,
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 14.sp,
                                )
                            }
                        }
                    }
                }
            }
        }

        if (hasQty) {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = if (isDark) Color(0xFF1E3A8A).copy(0.4f) else Color(0xFFEBF3FF),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        AppStrings.total(lang),
                        color = Color(0xFF2563EB),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                    )
                    Text(
                        "${priceFmt.format(lineTotal.toLong())} ${AppStrings.sumCurrency(lang)}",
                        color = Color(0xFF2563EB),
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                    )
                }
            }
        }

        Surface(
            shape = RoundedCornerShape(14.dp),
            color = cardBg,
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, borderColor, RoundedCornerShape(14.dp)),
        ) {
            BasicTextField(
                value = note,
                onValueChange = onNoteChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                textStyle = LocalTextStyle.current.copy(
                    color = titleColor,
                    fontSize = 14.sp,
                ),
                decorationBox = { inner ->
                    if (note.isEmpty()) {
                        Text(AppStrings.commentPlaceholder(lang), color = subColor, fontSize = 14.sp)
                    }
                    inner()
                },
            )
        }

        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            VisitNavProductButton(
                label = prevProduct?.name,
                enabled = prevProduct != null,
                isDark = isDark,
                isPrev = true,
                onClick = onPrev,
                modifier = Modifier.weight(1f),
            )
            Text(
                AppStrings.productPosition(lang, currentIndex + 1, totalCount),
                color = subColor,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
            )
            VisitNavProductButton(
                label = nextProduct?.name,
                enabled = nextProduct != null,
                isDark = isDark,
                isPrev = false,
                onClick = onNext,
                modifier = Modifier.weight(1f),
            )
        }

        VisitProductImageCard(
            imageUrl = productImageUrl,
            title = "${product.code} — ${product.name}",
            cardBg = cardBg,
            borderColor = borderColor,
            lang = lang,
        )

        VisitDetailCartPreview(
            cart = cart,
            currentProductId = product.id,
            priceFmt = priceFmt,
            stockFmt = stockFmt,
            lang = lang,
            cardBg = cardBg,
            borderColor = borderColor,
            titleColor = titleColor,
            productImages = productImages,
            onItemClick = onCartItemClick,
            onEditItem = onEditCartItem,
            onRemoveItem = onRemoveCartItem,
        )

        val buttonColor = if (cartJustSaved) Color(0xFF10B981) else Color(0xFF3B82F6)
        Button(
            onClick = onAddToCart,
            enabled = hasQty,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = buttonColor,
                disabledContainerColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB),
                disabledContentColor = subColor,
            ),
        ) {
            if (cartJustSaved) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    AppStrings.addedToCart(lang),
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
            } else {
                Icon(
                    Icons.Default.ShoppingCart,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    AppStrings.addToCart(lang),
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
            }
            if (hasQty) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color.White.copy(0.2f),
                ) {
                    Text(
                        "${formatQuantityDisplay(quantity, stockFmt)} ${product.unit}",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }

        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun VisitProductImageCard(
    imageUrl: String,
    title: String,
    cardBg: Color,
    borderColor: Color,
    lang: AppLanguage,
) {
    var showFullScreen by remember { mutableStateOf(false) }

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = cardBg,
        onClick = { showFullScreen = true },
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, borderColor, RoundedCornerShape(16.dp)),
    ) {
        Box(Modifier.fillMaxWidth()) {
            if (imageUrl.isNotBlank()) {
                AsyncImage(
                    model = imageUrl,
                    contentDescription = title,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(168.dp)
                        .padding(12.dp),
                    contentScale = ContentScale.Fit,
                )
            } else {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(168.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.Inventory2,
                        contentDescription = null,
                        tint = subColor.copy(0.4f),
                        modifier = Modifier.size(52.dp),
                    )
                }
            }
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.Black.copy(alpha = 0.48f),
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(12.dp),
            ) {
                Row(
                    Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Default.Fullscreen,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(15.dp),
                    )
                    Spacer(Modifier.width(5.dp))
                    Text(
                        AppStrings.fullScreenPhoto(lang),
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }

    if (showFullScreen) {
        VisitFullScreenImageDialog(
            imageUrl = imageUrl,
            title = title,
            lang = lang,
            onDismiss = { showFullScreen = false },
        )
    }
}

@Composable
private fun VisitFullScreenImageDialog(
    imageUrl: String,
    title: String,
    lang: AppLanguage,
    onDismiss: () -> Unit,
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false,
        ),
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(Color(0xFF0B1220), Color(0xFF111827), Color(0xFF000000)),
                    ),
                ),
        ) {
            // Soft glow behind image
            Box(
                Modifier
                    .align(Alignment.Center)
                    .size(280.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF3B82F6).copy(alpha = 0.12f)),
            )

            Column(Modifier.fillMaxSize()) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(
                        onClick = onDismiss,
                        shape = CircleShape,
                        color = Color.White.copy(alpha = 0.12f),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.22f)),
                        modifier = Modifier.size(42.dp),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = AppStrings.closeFullscreen(lang),
                                tint = Color.White,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            AppStrings.fullScreenPhoto(lang),
                            color = Color.White.copy(0.7f),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            letterSpacing = 0.4.sp,
                        )
                        Text(
                            title,
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }

                Box(
                    Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Surface(
                        shape = RoundedCornerShape(22.dp),
                        color = Color.White.copy(alpha = 0.06f),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .fillMaxHeight(0.86f),
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            if (imageUrl.isNotBlank()) {
                                AsyncImage(
                                    model = imageUrl,
                                    contentDescription = title,
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(16.dp),
                                    contentScale = ContentScale.Fit,
                                )
                            } else {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        Icons.Default.Inventory2,
                                        contentDescription = null,
                                        tint = Color.White.copy(0.35f),
                                        modifier = Modifier.size(72.dp),
                                    )
                                    Spacer(Modifier.height(12.dp))
                                    Text(
                                        AppStrings.noProductImage(lang),
                                        color = Color.White.copy(0.55f),
                                        fontSize = 13.sp,
                                    )
                                }
                            }
                        }
                    }
                }

                Text(
                    AppStrings.tapToClose(lang),
                    color = Color.White.copy(0.45f),
                    fontSize = 12.sp,
                    modifier = Modifier
                        .align(Alignment.CenterHorizontally)
                        .navigationBarsPadding()
                        .padding(bottom = 18.dp)
                        .clickable(onClick = onDismiss),
                )
            }
        }
    }
}

@Composable
private fun VisitDetailCartPreview(
    cart: List<CartItem>,
    currentProductId: String,
    priceFmt: DecimalFormat,
    stockFmt: DecimalFormat,
    lang: AppLanguage,
    cardBg: Color,
    borderColor: Color,
    titleColor: Color,
    productImages: Map<String, String>,
    onItemClick: (String) -> Unit,
    onEditItem: (String) -> Unit,
    onRemoveItem: (String) -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = cardBg,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, borderColor, RoundedCornerShape(16.dp)),
    ) {
        if (cart.isEmpty()) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(72.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(AppStrings.cartEmpty(lang), color = subColor, fontSize = 12.sp)
                    }
                } else {
            Column(Modifier.padding(horizontal = 10.dp, vertical = 8.dp)) {
                Text(
                    AppStrings.cartPreviewTitle(lang, cart.size),
                    color = Color(0xFF059669),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp,
                )
                Spacer(Modifier.height(6.dp))
                cart.forEach { item ->
                    VisitDetailCartRow(
                        item = item,
                        isCurrent = item.productId == currentProductId,
                        imageUrl = productImages[item.productId].orEmpty(),
                        priceFmt = priceFmt,
                        stockFmt = stockFmt,
                        lang = lang,
                        titleColor = titleColor,
                        onClick = { onItemClick(item.productId) },
                        onEdit = { onEditItem(item.productId) },
                        onRemove = { onRemoveItem(item.productId) },
                    )
                }
            }
        }
    }
}

@Composable
private fun VisitDetailCartRow(
    item: CartItem,
    isCurrent: Boolean,
    imageUrl: String,
    priceFmt: DecimalFormat,
    stockFmt: DecimalFormat,
    lang: AppLanguage,
    titleColor: Color,
    onClick: () -> Unit,
    onEdit: () -> Unit,
    onRemove: () -> Unit,
) {
    val qtyDisplay = if (item.quantity % 1.0 == 0.0) {
        item.quantity.toInt().toString()
    } else {
        stockFmt.format(item.quantity)
    }
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (isCurrent) Color(0xFFD1FAE5) else Color(0xFFF0FDF4),
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
            .border(
                width = if (isCurrent) 1.dp else 0.dp,
                color = if (isCurrent) Color(0xFF10B981) else Color.Transparent,
                shape = RoundedCornerShape(8.dp),
            ),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(start = 6.dp, end = 2.dp, top = 4.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            VisitProductThumb(imageUrl = imageUrl, size = 34.dp)
            Spacer(Modifier.width(6.dp))
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clickable(onClick = onClick),
            ) {
                Text(
                    "${item.productCode} · ${item.productName}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = titleColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    when {
                        item.promotionId != null && (item.isFree || item.price == 0.0) ->
                            "Aksiya · bepul × $qtyDisplay"
                        item.promotionId != null ->
                            "Aksiya · ${priceFmt.format(item.price.toLong())} × $qtyDisplay"
                        else ->
                            "${priceFmt.format((item.price * item.quantity).toLong())} ${AppStrings.sumCurrency(lang)}"
                    },
                    fontSize = 10.sp,
                    color = if (item.promotionId != null) Color(0xFF7C3AED) else subColor,
                )
            }
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color(0xFF10B981),
            ) {
                Text(
                    "$qtyDisplay ${item.unit}",
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                    color = Color.White,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            IconButton(onClick = onEdit, modifier = Modifier.size(28.dp)) {
                Icon(
                    Icons.Default.Edit,
                    contentDescription = null,
                    tint = Color(0xFF3B82F6),
                    modifier = Modifier.size(15.dp),
                )
            }
            IconButton(onClick = onRemove, modifier = Modifier.size(28.dp)) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = null,
                    tint = Color(0xFFEF4444),
                    modifier = Modifier.size(15.dp),
                )
            }
        }
    }
}

@Composable
private fun VisitProductThumb(
    imageUrl: String,
    size: androidx.compose.ui.unit.Dp,
) {
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = Color(0xFFF3F4F6),
        modifier = Modifier.size(size),
    ) {
        if (imageUrl.isNotBlank()) {
            AsyncImage(
                model = imageUrl,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        } else {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    Icons.Default.Inventory2,
                    contentDescription = null,
                    tint = subColor.copy(0.45f),
                    modifier = Modifier.size(size * 0.5f),
                )
            }
        }
    }
}

@Composable
private fun VisitDetailInfoCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: Color,
    iconBg: Color,
    label: String,
    value: String,
    unit: String,
    valueColor: Color,
    cardBg: Color,
    borderColor: Color,
    labelColor: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = cardBg,
        modifier = modifier.border(1.dp, borderColor, RoundedCornerShape(14.dp)),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(iconBg),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, null, tint = iconTint, modifier = Modifier.size(16.dp))
                }
                Spacer(Modifier.width(6.dp))
                Text(label, color = labelColor, fontSize = 12.sp)
            }
            Spacer(Modifier.height(8.dp))
            Text(
                value,
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp,
                color = valueColor,
            )
            Text(unit, color = labelColor, fontSize = 11.sp)
        }
    }
}

@Composable
private fun VisitQuantityCard(
    modifier: Modifier = Modifier,
    title: String,
    quantity: Double,
    unit: String,
    presets: List<Double>,
    enabled: Boolean,
    accent: Color,
    stockFmt: DecimalFormat,
    titleColor: Color,
    subColor: Color,
    cardBg: Color,
    borderColor: Color,
    isDark: Boolean,
    focusQuantity: Boolean,
    resetKey: Any = Unit,
    backToCategoryLabel: String? = null,
    onBackToCategory: (() -> Unit)? = null,
    onFocusHandled: () -> Unit,
    onDecrement: () -> Unit,
    onIncrement: () -> Unit,
    onPresetQty: (Double) -> Unit,
    onQuantityChange: (Double) -> Unit,
    hint: String? = null,
) {
    val mutedTitle = if (enabled) titleColor else subColor
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (enabled) cardBg else if (isDark) Color(0xFF1F2937) else Color(0xFFF9FAFB),
        modifier = modifier.border(
            1.dp,
            if (enabled) borderColor else borderColor.copy(alpha = 0.6f),
            RoundedCornerShape(16.dp),
        ),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(title, color = subColor, fontSize = 13.sp)
            if (!hint.isNullOrBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(hint, color = subColor, fontSize = 11.sp, lineHeight = 14.sp)
            }
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Bottom,
            ) {
                VisitQtyButton(
                    icon = Icons.Default.Remove,
                    enabled = enabled && quantity > 0,
                    tint = if (enabled && quantity > 0) mutedTitle else subColor,
                    bg = if (isDark) Color(0xFF374151) else Color(0xFFF3F4F6),
                    onClick = onDecrement,
                )
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .align(Alignment.CenterVertically),
                    contentAlignment = Alignment.Center,
                ) {
                    key(resetKey) {
                        VisitEditableQuantity(
                            quantity = quantity,
                            unit = unit,
                            stockFmt = stockFmt,
                            titleColor = mutedTitle,
                            requestFocus = focusQuantity && enabled,
                            enabled = enabled,
                            onFocusHandled = onFocusHandled,
                            onQuantityChange = onQuantityChange,
                        )
                    }
                }
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (onBackToCategory != null && !backToCategoryLabel.isNullOrBlank()) {
                        VisitBackToCategoryButton(
                            label = backToCategoryLabel,
                            isDark = isDark,
                            onClick = onBackToCategory,
                        )
                    }
                    VisitQtyButton(
                        icon = Icons.Default.Add,
                        enabled = enabled,
                        tint = Color.White,
                        bg = if (enabled) accent else Color(0xFF9CA3AF),
                        onClick = onIncrement,
                    )
                }
            }
            if (presets.isNotEmpty()) {
                Spacer(Modifier.height(12.dp))
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    presets.forEach { preset ->
                        val selected = quantity == preset
                        Surface(
                            onClick = { if (enabled) onPresetQty(preset) },
                            enabled = enabled,
                            shape = RoundedCornerShape(10.dp),
                            color = when {
                                !enabled -> if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
                                selected -> accent
                                isDark -> Color(0xFF374151)
                                else -> Color(0xFFF3F4F6)
                            },
                        modifier = Modifier.weight(1f),
                        ) {
                            Text(
                                if (preset % 1.0 == 0.0) preset.toInt().toString() else stockFmt.format(preset),
                                modifier = Modifier.padding(vertical = 10.dp),
                                textAlign = TextAlign.Center,
                                color = when {
                                    !enabled -> subColor
                                    selected -> Color.White
                                    else -> titleColor
                                },
                                fontWeight = FontWeight.Medium,
                                fontSize = 14.sp,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun VisitEditableQuantity(
    quantity: Double,
    unit: String,
    stockFmt: DecimalFormat,
    titleColor: Color,
    requestFocus: Boolean = false,
    enabled: Boolean = true,
    onFocusHandled: () -> Unit = {},
    onQuantityChange: (Double) -> Unit,
) {
    val focusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    val view = LocalView.current
    var isFocused by remember { mutableStateOf(false) }
    val commitGate = remember { java.util.concurrent.atomic.AtomicBoolean(true) }

    fun displayQty(v: Double): String = formatQuantityDisplay(v, stockFmt)

    var fieldValue by remember {
        val text = displayQty(quantity)
        mutableStateOf(TextFieldValue(text, TextRange(text.length)))
    }

    LaunchedEffect(quantity) {
        if (!isFocused) {
            val text = displayQty(quantity)
            fieldValue = TextFieldValue(text, TextRange(text.length))
        }
    }

    DisposableEffect(Unit) {
        onDispose { commitGate.set(false) }
    }

    fun showKeyboard() {
        if (!enabled) return
        view.post {
            keyboardController?.show()
            val imm = view.context.getSystemService<InputMethodManager>()
            imm?.showSoftInput(view, InputMethodManager.SHOW_IMPLICIT)
        }
    }

    fun commitQty() {
        if (!commitGate.get()) return
        val finalQty = (parseQuantityInput(fieldValue.text) ?: 0.0).coerceAtLeast(0.0)
        onQuantityChange(finalQty)
        val text = displayQty(finalQty)
        fieldValue = TextFieldValue(text, TextRange(text.length))
    }

    LaunchedEffect(requestFocus) {
        if (requestFocus && enabled) {
            onFocusHandled()
            val text = if (quantity <= 0.0) "" else displayQty(quantity)
            fieldValue = TextFieldValue(text, TextRange(text.length))
            try {
                focusRequester.requestFocus()
            } catch (_: IllegalStateException) {
            }
            showKeyboard()
        }
    }

    val textColor = titleColor

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.widthIn(min = 72.dp, max = 120.dp),
    ) {
        BasicTextField(
            value = fieldValue,
            onValueChange = { next ->
                if (!enabled) return@BasicTextField
                val sanitized = sanitizeQuantityTyping(next.text) ?: return@BasicTextField
                fieldValue = next.copy(text = sanitized)
            },
            enabled = enabled,
            singleLine = true,
            textStyle = TextStyle(
                fontSize = 36.sp,
                fontWeight = FontWeight.Bold,
                color = textColor,
                textAlign = TextAlign.Center,
            ),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Decimal,
                imeAction = ImeAction.Done,
            ),
            keyboardActions = KeyboardActions(
                onDone = {
                    commitQty()
                    focusManager.clearFocus()
                    keyboardController?.hide()
                },
            ),
            modifier = Modifier
                .widthIn(min = 56.dp, max = 110.dp)
                .defaultMinSize(minHeight = 44.dp)
                .padding(vertical = 4.dp)
                .focusRequester(focusRequester)
                .onFocusChanged { focusState ->
                    val wasFocused = isFocused
                    isFocused = focusState.isFocused
                    if (focusState.isFocused && !wasFocused) {
                        if (quantity <= 0.0 && fieldValue.text == displayQty(quantity)) {
                            fieldValue = TextFieldValue("", TextRange(0))
                        }
                        showKeyboard()
                    } else if (wasFocused && !focusState.isFocused) {
                        commitQty()
                    }
                },
            decorationBox = { inner ->
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .widthIn(min = 56.dp, max = 110.dp)
                        .defaultMinSize(minHeight = 44.dp),
                ) {
                    inner()
                }
            },
        )
        Text(unit, color = subColor, fontSize = 13.sp)
    }
}

private fun formatQuantityDisplay(quantity: Double, stockFmt: DecimalFormat): String =
    if (quantity % 1.0 == 0.0) quantity.toInt().toString() else stockFmt.format(quantity).replace(',', '.')

private fun qtyStepForProduct(unit: String): Double =
    if (unit.equals("kg", ignoreCase = true) || unit.equals("кг", ignoreCase = true)) 0.1 else 1.0

/** 1.5 va 1,5 ni qabul qiladi; yozish paytida bitta vergul/nuqta ruxsat */
private fun sanitizeQuantityTyping(raw: String): String? {
    val trimmed = raw.trim()
    if (trimmed.isEmpty()) return ""
    val normalized = trimmed.replace(',', '.')
    if (!normalized.matches(Regex("^\\d*\\.?\\d*$"))) return null
    if (normalized.count { it == '.' } > 1) return null
    return normalized
}

private fun parseQuantityInput(input: String): Double? {
    val normalized = input.trim().replace(',', '.')
    if (normalized.isEmpty() || normalized == ".") return 0.0
    return normalized.toDoubleOrNull()
}

@Composable
private fun VisitQtyButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    enabled: Boolean,
    tint: Color,
    bg: Color,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(52.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(24.dp))
    }
}

/** Mahsulotlar ro‘yxatiga (kategoriya) qaytish — + tepasida */
@Composable
private fun VisitBackToCategoryButton(
    label: String,
    isDark: Boolean,
    onClick: () -> Unit,
) {
    val accent = Color(0xFF334155)
    val bg = if (isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC)
    val border = if (isDark) Color(0xFF475569) else Color(0xFFE2E8F0)
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = bg,
        border = BorderStroke(1.dp, border),
        shadowElevation = 0.dp,
        tonalElevation = 0.dp,
        modifier = Modifier.width(52.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(22.dp)
                    .clip(CircleShape)
                    .background(
                        if (isDark) Color(0xFF334155) else Color(0xFFEEF2FF),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Default.KeyboardArrowUp,
                    contentDescription = label,
                    tint = if (isDark) Color(0xFFE2E8F0) else accent,
                    modifier = Modifier.size(16.dp),
                )
            }
            Text(
                label,
                color = if (isDark) Color(0xFFCBD5E1) else accent,
                fontSize = 9.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.2.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
            )
        }
    }
}

/** +/- orasidagi miqdor — bosilganda raqamli klaviatura */
@Composable
private fun VisitCompactEditableQty(
    quantity: Double,
    maxQuantity: Double,
    textColor: Color,
    onQuantityChange: (Double) -> Unit,
    modifier: Modifier = Modifier,
) {
    val focusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    val view = LocalView.current
    var isFocused by remember { mutableStateOf(false) }

    fun displayQty(v: Double): String =
        if (v % 1.0 == 0.0) v.toInt().toString() else String.format("%.1f", v).replace(',', '.')

    var fieldValue by remember {
        val text = displayQty(quantity)
        mutableStateOf(TextFieldValue(text, TextRange(text.length)))
    }

    LaunchedEffect(quantity) {
        if (!isFocused) {
            val text = displayQty(quantity)
            fieldValue = TextFieldValue(text, TextRange(text.length))
        }
    }

    fun showKeyboard() {
        view.post {
            keyboardController?.show()
            val imm = view.context.getSystemService<InputMethodManager>()
            imm?.showSoftInput(view, InputMethodManager.SHOW_IMPLICIT)
        }
    }

    fun commitQty() {
        val finalQty = (parseQuantityInput(fieldValue.text) ?: 0.0).coerceIn(0.0, maxQuantity)
        onQuantityChange(finalQty)
        val text = displayQty(finalQty)
        fieldValue = TextFieldValue(text, TextRange(text.length))
    }

    BasicTextField(
        value = fieldValue,
        onValueChange = { next ->
            // Faqat lokal matn — savatga Done/blur da yoziladi
            val sanitized = sanitizeQuantityTyping(next.text) ?: return@BasicTextField
            fieldValue = next.copy(text = sanitized)
        },
        singleLine = true,
        textStyle = TextStyle(
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = textColor,
            textAlign = TextAlign.Center,
        ),
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Decimal,
            imeAction = ImeAction.Done,
        ),
        keyboardActions = KeyboardActions(
            onDone = {
                commitQty()
                focusManager.clearFocus()
                keyboardController?.hide()
            },
        ),
        modifier = modifier
            .widthIn(min = 48.dp, max = 88.dp)
            .defaultMinSize(minHeight = 36.dp)
            .padding(horizontal = 4.dp, vertical = 6.dp)
            .focusRequester(focusRequester)
            .onFocusChanged { focusState ->
                val wasFocused = isFocused
                isFocused = focusState.isFocused
                if (focusState.isFocused && !wasFocused) {
                    if (quantity <= 0.0) {
                        fieldValue = TextFieldValue("", TextRange(0))
                    }
                    showKeyboard()
                } else if (wasFocused && !focusState.isFocused) {
                    commitQty()
                }
            },
        decorationBox = { inner ->
            Box(contentAlignment = Alignment.Center) { inner() }
        },
    )
}

@Composable
private fun VisitNavProductButton(
    label: String?,
    enabled: Boolean,
    isDark: Boolean,
    isPrev: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val cardBg = if (isDark) SherinColors.CardRowDark else Color.White
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    Surface(
        onClick = onClick,
        enabled = enabled,
                                shape = RoundedCornerShape(12.dp),
        color = if (enabled) cardBg else cardBg.copy(alpha = 0.5f),
        modifier = modifier.border(1.dp, borderColor, RoundedCornerShape(12.dp)),
                            ) {
                                Row(
            Modifier.padding(horizontal = 10.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            if (isPrev) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    null,
                    tint = if (enabled) subColor else subColor.copy(0.4f),
                    modifier = Modifier.size(16.dp),
                )
                if (label != null) {
                    Spacer(Modifier.width(4.dp))
                    Text(
                        label,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        fontSize = 11.sp,
                        color = if (enabled) Color(0xFF374151) else subColor,
                    )
                }
            } else {
                if (label != null) {
                    Text(
                        label,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        fontSize = 11.sp,
                        color = if (enabled) Color(0xFF374151) else subColor,
                    )
                    Spacer(Modifier.width(4.dp))
                }
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    null,
                    tint = if (enabled) subColor else subColor.copy(0.4f),
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

@Composable
private fun VisitProductsListContent(
    products: List<Product>,
    cart: List<CartItem>,
    gridMode: Boolean,
    alphabetAnchor: String?,
    priceFmt: DecimalFormat,
    stockFmt: DecimalFormat,
    cardBg: Color,
    borderColor: Color,
    titleColor: Color,
    subColor: Color,
    lang: AppLanguage,
    isDark: Boolean,
    promotionsByProductId: Map<String, ProductPromotion> = emptyMap(),
    resolveImageUrl: (String?) -> String,
    listState: LazyListState,
    onProductClick: (Product) -> Unit,
    onIncrementQty: (String) -> Unit,
    onDecrementQty: (String) -> Unit,
    onSetQty: (String, Double) -> Unit,
    onAlphabetHandled: () -> Unit,
    modifier: Modifier = Modifier,
) {
    LaunchedEffect(alphabetAnchor, products) {
        val letter = alphabetAnchor ?: return@LaunchedEffect
        val index = products.indexOfFirst {
            VisitViewModel.firstLetterKey(it.name) == letter
        }
        if (index >= 0) {
            val lazyIndex = if (gridMode) index / 2 else index
            listState.animateScrollToItem(lazyIndex.coerceAtLeast(0))
        }
        onAlphabetHandled()
    }

    LazyColumn(
        state = listState,
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (gridMode) {
            items(
                products.chunked(2),
                key = { row -> row.joinToString("-") { it.id } },
            ) { row ->
                VisitProductGridRow(
                    products = row,
                    cart = cart,
                    priceFmt = priceFmt,
                    stockFmt = stockFmt,
                    cardBg = cardBg,
                    borderColor = borderColor,
                    titleColor = titleColor,
                    subColor = subColor,
                    lang = lang,
                    isDark = isDark,
                    promotionsByProductId = promotionsByProductId,
                    resolveImageUrl = resolveImageUrl,
                    onProductClick = onProductClick,
                    onIncrementQty = onIncrementQty,
                    onDecrementQty = onDecrementQty,
                    onSetQty = onSetQty,
                )
            }
        } else {
            items(products, key = { it.id }) { product ->
                val qty = cart.find { it.productId == product.id && it.promotionId == null }?.quantity ?: 0.0
                VisitInlineOrderProductCard(
                    product = product,
                    quantity = qty,
                    priceFmt = priceFmt,
                    stockFmt = stockFmt,
                    cardBg = if (qty > 0) Color(0xFFECFDF5) else cardBg,
                    borderColor = if (qty > 0) Color(0xFF10B981).copy(0.35f) else borderColor,
                    titleColor = if (qty > 0) Color(0xFF065F46) else titleColor,
                    subColor = subColor,
                    lang = lang,
                    promotion = promotionsByProductId[product.id],
                    imageUrl = null,
                    showImage = false,
                    onOpenDetail = { onProductClick(product) },
                    onIncrement = { onIncrementQty(product.id) },
                    onDecrement = { onDecrementQty(product.id) },
                    onQuantityChange = { value -> onSetQty(product.id, value) },
                )
            }
        }
    }
}

@Composable
private fun VisitProductGridRow(
    products: List<Product>,
    cart: List<CartItem>,
    priceFmt: DecimalFormat,
    stockFmt: DecimalFormat,
    cardBg: Color,
    borderColor: Color,
    titleColor: Color,
    subColor: Color,
    lang: AppLanguage,
    isDark: Boolean,
    promotionsByProductId: Map<String, ProductPromotion>,
    resolveImageUrl: (String?) -> String,
    onProductClick: (Product) -> Unit,
    onIncrementQty: (String) -> Unit,
    onDecrementQty: (String) -> Unit,
    onSetQty: (String, Double) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        products.forEach { product ->
            val qty = cart.find { it.productId == product.id && it.promotionId == null }?.quantity ?: 0.0
            VisitInlineOrderProductCard(
                product = product,
                quantity = qty,
                priceFmt = priceFmt,
                stockFmt = stockFmt,
                cardBg = cardBg,
                borderColor = borderColor,
                titleColor = titleColor,
                subColor = subColor,
                lang = lang,
                promotion = promotionsByProductId[product.id],
                imageUrl = resolveImageUrl(product.imageUrl),
                showImage = true,
                onOpenDetail = { onProductClick(product) },
                onIncrement = { onIncrementQty(product.id) },
                onDecrement = { onDecrementQty(product.id) },
                onQuantityChange = { value -> onSetQty(product.id, value) },
                modifier = Modifier.weight(1f),
            )
        }
        if (products.size == 1) {
            Spacer(Modifier.weight(1f))
        }
    }
}

@Composable
private fun VisitInlineOrderProductCard(
    product: Product,
    quantity: Double,
    priceFmt: DecimalFormat,
    stockFmt: DecimalFormat,
    cardBg: Color,
    borderColor: Color,
    titleColor: Color,
    subColor: Color,
    lang: AppLanguage,
    promotion: ProductPromotion?,
    imageUrl: String?,
    showImage: Boolean,
    onOpenDetail: () -> Unit,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit,
    onQuantityChange: (Double) -> Unit,
    modifier: Modifier = Modifier,
) {
    val inCart = quantity > 0.0
    var showFullScreen by remember { mutableStateOf(false) }
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = if (inCart && !showImage) Color(0xFFECFDF5) else cardBg,
        modifier = modifier
            .fillMaxWidth()
            .border(
                1.dp,
                if (inCart) Color(0xFF10B981).copy(0.4f) else borderColor,
                RoundedCornerShape(14.dp),
            ),
    ) {
        Column(Modifier.padding(12.dp)) {
            if (showImage) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFFF3F4F6))
                        .clickable(onClick = { showFullScreen = true }),
                    contentAlignment = Alignment.Center,
                ) {
                    if (!imageUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = imageUrl,
                            contentDescription = product.name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize(),
                        )
                    } else {
                        Icon(
                            Icons.Default.Inventory2,
                            contentDescription = null,
                            tint = subColor,
                            modifier = Modifier.size(36.dp),
                        )
                    }
                    Surface(
                        shape = CircleShape,
                        color = Color.Black.copy(alpha = 0.42f),
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(6.dp)
                            .size(26.dp),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.Fullscreen,
                                contentDescription = AppStrings.fullScreenPhoto(lang),
                                tint = Color.White,
                                modifier = Modifier.size(14.dp),
                            )
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
            Row(
                Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onOpenDetail),
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f)) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (inCart) Color(0xFFD1FAE5) else Color(0xFFEFF6FF),
                    ) {
                        Text(
                            product.code,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            fontSize = 10.sp,
                            color = if (inCart) Color(0xFF059669) else Color(0xFF3B82F6),
                            fontWeight = FontWeight.Medium,
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        product.name,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = if (showImage) 12.sp else 13.sp,
                        color = titleColor,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "${priceFmt.format(product.price.toLong())} ${AppStrings.sumCurrency(lang)}",
                            fontSize = 12.sp,
                            color = subColor,
                        )
                        if (promotion != null) {
                            Spacer(Modifier.width(6.dp))
                            PromoBadge(promotion)
                        }
                    }
                    Text(
                        "${stockFmt.format(product.stockBalance)} ${product.unit}",
                        fontSize = 11.sp,
                        color = if (product.stockBalance > 0) Color(0xFF10B981) else Color(0xFFEF4444),
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFFF3F4F6))
                        .clickable(enabled = quantity > 0, onClick = onDecrement),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.Remove,
                        contentDescription = null,
                        tint = if (quantity > 0) Color(0xFF111827) else subColor,
                        modifier = Modifier.size(18.dp),
                    )
                }
                key(product.id) {
                    VisitCompactEditableQty(
                        quantity = quantity,
                        maxQuantity = 999_999.0,
                        textColor = if (inCart) Color(0xFF059669) else titleColor,
                        onQuantityChange = onQuantityChange,
                    )
                }
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFF3B82F6))
                        .clickable(onClick = onIncrement),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
    }

    if (showFullScreen) {
        VisitFullScreenImageDialog(
            imageUrl = imageUrl.orEmpty(),
            title = "${product.code} — ${product.name}",
            lang = lang,
            onDismiss = { showFullScreen = false },
        )
    }
}

@Composable
private fun VisitSectionHeader(
    title: String,
    countLabel: String,
    expanded: Boolean,
    bgColor: Color,
    titleColor: Color,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = bgColor,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "$title $countLabel",
                color = titleColor,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
            )
            Icon(
                Icons.Default.KeyboardArrowDown,
                contentDescription = null,
                tint = titleColor,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun VisitSelectedProductCard(
    product: Product,
    quantity: Double,
    priceFmt: DecimalFormat,
    stockFmt: DecimalFormat,
    lang: AppLanguage,
    promotion: ProductPromotion? = null,
    onClick: () -> Unit,
    onRemove: () -> Unit,
) {
    val qtyDisplay = if (quantity % 1.0 == 0.0) quantity.toInt().toString() else stockFmt.format(quantity)
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = Color(0xFFECFDF5),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, Color(0xFF10B981).copy(0.35f), RoundedCornerShape(14.dp)),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                                    Column(modifier = Modifier.weight(1f)) {
                    Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFD1FAE5)) {
                                        Text(
                            product.code,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            fontSize = 10.sp,
                            color = Color(0xFF059669),
                            fontWeight = FontWeight.Medium,
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        product.name,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        color = Color(0xFF065F46),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "${priceFmt.format(product.price.toLong())} ${AppStrings.sumCurrency(lang)}",
                                            fontSize = 12.sp,
                            color = subColor,
                        )
                        if (promotion != null) {
                            Spacer(Modifier.width(6.dp))
                            PromoBadge(promotion)
                        }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF10B981)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            qtyDisplay,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                        )
                    }
                    Spacer(Modifier.width(6.dp))
                    IconButton(onClick = onRemove, modifier = Modifier.size(32.dp)) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = null,
                            tint = Color(0xFFEF4444),
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
            }
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        stockFmt.format(product.stockBalance),
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Color(0xFF10B981),
                    )
                    Text(product.unit, fontSize = 11.sp, color = subColor)
                        }
                    }
                }
            }
        }

@Composable
private fun VisitCategoriesHeader(
    isDark: Boolean,
    activeTab: Int,
    showTabs: Boolean,
    searchQuery: String?,
    onSearchChange: (String) -> Unit,
    onBack: () -> Unit,
    onProductTabClick: () -> Unit,
    onPromoTabClick: () -> Unit,
    onCartTabClick: () -> Unit,
    recordingState: VisitRecordingUiState = VisitRecordingUiState(),
) {
    val lang = LocalAppLanguage.current
    Box(Modifier.fillMaxWidth().background(sherinHeroBrush(isDark))) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(top = 36.dp, bottom = 12.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SherinGlassIconButton(
                    onClick = onBack,
                    icon = Icons.AutoMirrored.Filled.ArrowBack,
                    size = 40.dp,
                )
                if (searchQuery != null) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = onSearchChange,
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = 10.dp),
                        placeholder = {
                            Text(AppStrings.search(lang), color = Color.White.copy(0.65f))
                        },
                        leadingIcon = {
                            Icon(Icons.Default.Search, null, tint = Color.White.copy(0.85f))
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Color.White.copy(0.16f),
                            unfocusedContainerColor = Color.White.copy(0.12f),
                            focusedBorderColor = Color.White.copy(0.35f),
                            unfocusedBorderColor = Color.White.copy(0.2f),
                            cursorColor = Color.White,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                        ),
                    )
                } else {
                    Text(
                        AppStrings.visitShort(lang),
                        modifier = Modifier.padding(start = 12.dp),
                        color = Color.White,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            RecordingStatusRow(
                state = recordingState,
                modifier = Modifier.padding(top = 8.dp),
            )
            AnimatedVisibility(
                visible = showTabs,
                enter = expandVertically(tween(220)) + fadeIn(tween(180)),
                exit = shrinkVertically(tween(220)) + fadeOut(tween(140)),
            ) {
                Column {
                    Spacer(Modifier.height(12.dp))
                    VisitTabRow(
                        activeTab = activeTab,
                        onProductTabClick = onProductTabClick,
                        onPromoTabClick = onPromoTabClick,
                        onCartTabClick = onCartTabClick,
                    )
                }
            }
        }
    }
}

@Composable
private fun VisitProductsHeader(
    categoryName: String,
    subtitle: String,
    searchQuery: String,
    showAllCategories: Boolean,
    showOutOfStock: Boolean,
    productsGridMode: Boolean,
    productSort: VisitProductSort,
    alphabetLetters: List<String>,
    alphabetAnchor: String?,
    chromeVisible: Boolean,
    isDark: Boolean,
    onBack: () -> Unit,
    onSearchChange: (String) -> Unit,
    onToggleAllCategories: () -> Unit,
    onToggleOutOfStock: () -> Unit,
    onToggleGridMode: () -> Unit,
    onSetSort: (VisitProductSort) -> Unit,
    onAlphabetJump: (String) -> Unit,
    recordingState: VisitRecordingUiState = VisitRecordingUiState(),
) {
    val lang = LocalAppLanguage.current
    Box(Modifier.fillMaxWidth().background(sherinHeroBrush(isDark))) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(top = 36.dp, bottom = 12.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SherinGlassIconButton(
                    onClick = onBack,
                    icon = Icons.AutoMirrored.Filled.ArrowBack,
                    size = 40.dp,
                )
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = onSearchChange,
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = 10.dp),
                    placeholder = {
                        Text(AppStrings.search(lang), color = Color.White.copy(0.65f))
                    },
                    leadingIcon = {
                        Icon(Icons.Default.Search, null, tint = Color.White.copy(0.85f))
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color.White.copy(0.16f),
                        unfocusedContainerColor = Color.White.copy(0.12f),
                        focusedBorderColor = Color.White.copy(0.35f),
                        unfocusedBorderColor = Color.White.copy(0.2f),
                        cursorColor = Color.White,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                    ),
                )
            }
            RecordingStatusRow(
                state = recordingState,
                modifier = Modifier.padding(top = 8.dp),
            )

            AnimatedVisibility(
                visible = chromeVisible,
                enter = expandVertically(tween(220)) + fadeIn(tween(180)),
                exit = shrinkVertically(tween(220)) + fadeOut(tween(140)),
            ) {
                Column {
                    Spacer(Modifier.height(12.dp))
                    Text(
                        categoryName.uppercase(),
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        subtitle,
                        color = Color.White.copy(0.85f),
                        fontSize = 13.sp,
                    )
                    Spacer(Modifier.height(10.dp))
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(
                            modifier = Modifier.weight(1f),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                AppStrings.allGoods(lang),
                                color = Color.White.copy(0.9f),
                                fontSize = 12.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Spacer(Modifier.width(6.dp))
                            Switch(
                                checked = showAllCategories,
                                onCheckedChange = { onToggleAllCategories() },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = Color.White,
                                    checkedTrackColor = Color(0xFF3B82F6),
                                    uncheckedThumbColor = Color.White,
                                    uncheckedTrackColor = Color.White.copy(0.3f),
                                ),
                            )
                        }
                        VisitHeaderChip(
                            selected = productsGridMode,
                            label = AppStrings.productsWithPhotos(lang),
                            icon = Icons.Default.Apps,
                            onClick = onToggleGridMode,
                        )
                        VisitHeaderChip(
                            selected = showOutOfStock,
                            label = AppStrings.showOutOfStock(lang),
                            icon = Icons.Default.Inventory2,
                            onClick = onToggleOutOfStock,
                        )
                    }

                    AnimatedVisibility(visible = showAllCategories) {
                        Column {
                            Spacer(Modifier.height(10.dp))
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                VisitHeaderChip(
                                    selected = productSort == VisitProductSort.ALPHA,
                                    label = AppStrings.sortAlpha(lang),
                                    onClick = { onSetSort(VisitProductSort.ALPHA) },
                                    modifier = Modifier.weight(1f),
                                )
                                VisitHeaderChip(
                                    selected = productSort == VisitProductSort.BEST_SELLING,
                                    label = AppStrings.sortBestSelling(lang),
                                    onClick = { onSetSort(VisitProductSort.BEST_SELLING) },
                                    modifier = Modifier.weight(1f),
                                )
                                VisitHeaderChip(
                                    selected = productSort == VisitProductSort.DEFAULT,
                                    label = AppStrings.sortDefault(lang),
                                    onClick = { onSetSort(VisitProductSort.DEFAULT) },
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (alphabetLetters.isNotEmpty()) {
                                Spacer(Modifier.height(8.dp))
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    alphabetLetters.forEach { letter ->
                                        val selected = alphabetAnchor == letter
                                        Surface(
                                            onClick = { onAlphabetJump(letter) },
                                            shape = CircleShape,
                                            color = if (selected) {
                                                Color.White
                                            } else {
                                                Color.White.copy(0.14f)
                                            },
                                        ) {
                                            Text(
                                                letter,
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                                color = if (selected) Color(0xFF4F46E5) else Color.White,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.sp,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun VisitHeaderChip(
    selected: Boolean,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector? = null,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = if (selected) Color.White else Color.White.copy(0.14f),
        modifier = modifier,
    ) {
        Row(
            Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            if (icon != null) {
                Icon(
                    icon,
                    contentDescription = label,
                    tint = if (selected) Color(0xFF4F46E5) else Color.White,
                    modifier = Modifier.size(14.dp),
                )
                Spacer(Modifier.width(4.dp))
            }
            Text(
                label,
                color = if (selected) Color(0xFF4F46E5) else Color.White,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun VisitTabRow(
    activeTab: Int,
    onProductTabClick: () -> Unit = {},
    onPromoTabClick: () -> Unit = {},
    onCartTabClick: () -> Unit = {},
) {
    val lang = LocalAppLanguage.current
    val tabs = listOf(
        AppStrings.visitTabProduct(lang),
        AppStrings.visitTabPromotion(lang),
        AppStrings.visitTabCart(lang),
    )
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        tabs.forEachIndexed { index, label ->
            Column(
                modifier = Modifier.clickable {
                    when (index) {
                        0 -> onProductTabClick()
                        1 -> onPromoTabClick()
                        2 -> onCartTabClick()
                    }
                },
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    label,
                    color = if (index == activeTab) Color.White else Color.White.copy(0.55f),
                    fontSize = 14.sp,
                    fontWeight = if (index == activeTab) FontWeight.SemiBold else FontWeight.Normal,
                )
                Spacer(Modifier.height(6.dp))
                if (index == activeTab) {
                    Box(
                        Modifier
                            .width(36.dp)
                            .height(3.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(Color.White),
                    )
                } else {
                    Spacer(Modifier.height(3.dp))
                }
            }
        }
    }
}

@Composable
private fun VisitSummaryBar(
    cartTotal: Double,
    totalFmt: DecimalFormat,
    isDark: Boolean,
    refreshState: VisitRefreshButtonState,
    onRefresh: () -> Unit,
    onCartClick: () -> Unit,
) {
    val barBg = if (isDark) SherinColors.CardDark else Color.White
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    val titleColor = if (isDark) Color.White else Color(0xFF111827)

    Surface(color = barBg, shadowElevation = 1.dp) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, borderColor)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            VisitSummaryIcon(
                icon = Icons.Default.Inventory2,
                tint = Color(0xFF22C55E),
                bg = if (isDark) Color(0xFF1F2937) else Color(0xFFF0FDF4),
            )
            Spacer(Modifier.width(8.dp))
            VisitSummaryIcon(
                icon = Icons.Default.ShoppingCart,
                tint = Color(0xFF3B82F6),
                bg = if (isDark) Color(0xFF1F2937) else Color(0xFFEFF6FF),
                onClick = onCartClick,
            )
            Text(
                totalFmt.format(cartTotal),
                modifier = Modifier.weight(1f),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                fontWeight = FontWeight.Bold,
                fontSize = 22.sp,
                color = titleColor,
            )
            VisitRefreshIconButton(
                state = refreshState,
                onClick = onRefresh,
            )
        }
    }
}

@Composable
private fun VisitRefreshIconButton(
    state: VisitRefreshButtonState,
    onClick: () -> Unit,
) {
    val tint = when (state) {
        VisitRefreshButtonState.SUCCESS -> Color(0xFF10B981)
        else -> subColor
    }
    IconButton(
        onClick = onClick,
        enabled = state != VisitRefreshButtonState.LOADING,
    ) {
        when (state) {
            VisitRefreshButtonState.LOADING -> {
                CircularProgressIndicator(
                    modifier = Modifier.size(22.dp),
                    color = SherinColors.Primary,
                    strokeWidth = 2.dp,
                )
            }
            VisitRefreshButtonState.SUCCESS -> {
                Icon(Icons.Default.Check, null, tint = tint, modifier = Modifier.size(24.dp))
            }
            VisitRefreshButtonState.IDLE -> {
                Icon(Icons.Default.Sync, null, tint = tint, modifier = Modifier.size(22.dp))
            }
        }
    }
}

@Composable
private fun VisitRefreshResultCard(
    updates: List<String>,
    title: String,
    isDark: Boolean,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = if (isDark) Color(0xFF064E3B).copy(0.4f) else Color(0xFFECFDF5),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isDark) Color(0xFF10B981).copy(0.3f) else Color(0xFF10B981).copy(0.25f),
        ),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = Color(0xFF10B981),
                    modifier = Modifier.size(20.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    title,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = if (isDark) Color.White else Color(0xFF065F46),
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = null,
                        tint = if (isDark) Color(0xFF9CA3AF) else Color(0xFF6B7280),
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            updates.forEach { line ->
                Row(
                    modifier = Modifier.padding(vertical = 3.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Text("• ", color = Color(0xFF10B981), fontSize = 13.sp)
                    Text(
                        line,
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                        color = if (isDark) Color(0xFFD1FAE5) else Color(0xFF047857),
                    )
                }
            }
        }
    }
}

@Composable
private fun VisitSummaryIcon(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    tint: Color,
    bg: Color,
    onClick: (() -> Unit)? = null,
) {
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(bg)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(20.dp))
    }
}

@Composable
private fun VisitAllGoodsToggle(
    showAllProducts: Boolean,
    isDark: Boolean,
    onToggleAll: () -> Unit,
    label: String? = null,
) {
    val lang = LocalAppLanguage.current
    val cardBg = if (isDark) SherinColors.CardRowDark else Color.White
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    val titleColor = if (isDark) Color.White else Color(0xFF111827)

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = cardBg,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp)
            .border(1.dp, borderColor, RoundedCornerShape(14.dp)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                label ?: AppStrings.allGoods(lang),
                color = titleColor,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
            )
            Switch(
                checked = showAllProducts,
                onCheckedChange = { onToggleAll() },
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = Color(0xFF3B82F6),
                ),
            )
        }
    }
}

@Composable
private fun VisitQuickCartModal(
    cart: List<CartItem>,
    productImages: Map<String, String>,
    priceFmt: DecimalFormat,
    stockFmt: DecimalFormat,
    isDark: Boolean,
    lang: AppLanguage,
    onDismiss: () -> Unit,
    onRemoveItem: (String) -> Unit,
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(
            shape = RoundedCornerShape(22.dp),
            color = if (isDark) SherinColors.CardDark else Color.White,
            tonalElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .padding(vertical = 24.dp),
        ) {
            Column(Modifier.padding(18.dp)) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text(
                            AppStrings.quickCartTitle(lang),
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = if (isDark) Color.White else Color(0xFF111827),
                        )
                        Text(
                            AppStrings.cartPreviewTitle(lang, cart.size),
                            color = subColor,
                            fontSize = 12.sp,
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = subColor)
                    }
                }
                Spacer(Modifier.height(10.dp))
                if (cart.isEmpty()) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(100.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(AppStrings.cartEmpty(lang), color = subColor)
                    }
                } else {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .heightIn(max = 360.dp)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        cart.forEach { item ->
                            val qty = if (item.quantity % 1.0 == 0.0) {
                                item.quantity.toInt().toString()
                            } else {
                                stockFmt.format(item.quantity)
                            }
                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = if (isDark) Color(0xFF1F2937) else Color(0xFFF8FAFC),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(
                                    Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Box(
                                        Modifier
                                            .size(44.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(Color(0xFFE5E7EB)),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        val img = productImages[item.productId].orEmpty()
                                        if (img.isNotBlank()) {
                                            AsyncImage(
                                                model = img,
                                                contentDescription = null,
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier.fillMaxSize(),
                                            )
                                        } else {
                                            Icon(
                                                Icons.Default.Inventory2,
                                                null,
                                                tint = subColor,
                                                modifier = Modifier.size(20.dp),
                                            )
                                        }
                                    }
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(
                                            item.productName,
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 13.sp,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis,
                                            color = if (isDark) Color.White else Color(0xFF111827),
                                        )
                                        Text(
                                            "${priceFmt.format((item.price * item.quantity).toLong())} ${AppStrings.sumCurrency(lang)}",
                                            color = subColor,
                                            fontSize = 12.sp,
                                        )
                                    }
                                    Surface(
                                        shape = RoundedCornerShape(10.dp),
                                        color = Color(0xFF10B981).copy(0.15f),
                                    ) {
                                        Text(
                                            "$qty ${item.unit}",
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                            color = Color(0xFF059669),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                        )
                                    }
                                    IconButton(onClick = { onRemoveItem(item.productId) }) {
                                        Icon(
                                            Icons.Default.Delete,
                                            contentDescription = null,
                                            tint = Color(0xFFEF4444),
                                            modifier = Modifier.size(18.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
                Spacer(Modifier.height(14.dp))
                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                ) {
                    Text(AppStrings.continueShopping(lang), fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun rememberVisitChromeVisibility(
    listState: LazyListState,
    enabled: Boolean,
): Boolean {
    var chromeVisible by remember { mutableStateOf(true) }
    var lastIndex by remember { mutableIntStateOf(0) }
    var lastOffset by remember { mutableIntStateOf(0) }

    LaunchedEffect(enabled) {
        if (!enabled) {
            chromeVisible = true
            lastIndex = 0
            lastOffset = 0
        }
    }

    LaunchedEffect(listState, enabled) {
        if (!enabled) return@LaunchedEffect
        snapshotFlow {
            listState.firstVisibleItemIndex to listState.firstVisibleItemScrollOffset
        }
            .distinctUntilChanged()
            .collect { (index, offset) ->
                val scrollingDown = when {
                    index > lastIndex -> true
                    index < lastIndex -> false
                    else -> offset > lastOffset
                }
                val delta = when {
                    index != lastIndex -> 24
                    else -> kotlin.math.abs(offset - lastOffset)
                }
                when {
                    index == 0 && offset < 24 -> chromeVisible = true
                    delta < 10 -> Unit
                    scrollingDown -> chromeVisible = false
                    else -> chromeVisible = true
                }
                lastIndex = index
                lastOffset = offset
            }
    }
    return chromeVisible
}

@Composable
private fun VisitCategoryCard(
    name: String,
    cartCount: Int,
    cardBg: Color,
    borderColor: Color,
    titleColor: Color,
    subColor: Color,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = cardBg,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, borderColor, RoundedCornerShape(14.dp)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(if (cardBg == Color.White) Color(0xFFF3F4F6) else Color(0xFF374151)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Add, null, tint = subColor, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.width(12.dp))
            Text(
                name.uppercase(),
                modifier = Modifier.weight(1f),
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                color = titleColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (cartCount > 0) {
                Surface(
                    shape = CircleShape,
                    color = Color(0xFF10B981),
                ) {
                    Text(
                        "$cartCount",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Spacer(Modifier.width(4.dp))
            }
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                null,
                tint = subColor,
                modifier = Modifier.size(22.dp),
            )
        }
    }
}

@Composable
private fun VisitSeeAllCard(
    cardBg: Color,
    borderColor: Color,
    label: String,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = cardBg,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, borderColor, RoundedCornerShape(14.dp)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                label,
                color = Color(0xFF3B82F6),
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
            )
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                null,
                tint = Color(0xFF3B82F6),
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun VisitProductCard(
    product: Product,
    priceFmt: DecimalFormat,
    stockFmt: DecimalFormat,
    cardBg: Color,
    borderColor: Color,
    titleColor: Color,
    subColor: Color,
    lang: AppLanguage,
    promotion: ProductPromotion? = null,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = cardBg,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, borderColor, RoundedCornerShape(14.dp)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.Top,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFFEFF6FF),
                ) {
                    Text(
                        product.code,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        fontSize = 10.sp,
                        color = Color(0xFF3B82F6),
                        fontWeight = FontWeight.Medium,
                    )
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    product.name,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    color = titleColor,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "${priceFmt.format(product.price.toLong())} ${AppStrings.sumCurrency(lang)}",
                        fontSize = 12.sp,
                        color = subColor,
                    )
                    if (promotion != null) {
                        Spacer(Modifier.width(6.dp))
                        PromoBadge(promotion)
                    }
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    null,
                    tint = subColor,
                    modifier = Modifier.size(20.dp),
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    stockFmt.format(product.stockBalance),
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = Color(0xFF10B981),
                )
                Text(
                    product.unit,
                    fontSize = 11.sp,
                    color = subColor,
                )
            }
        }
    }
}

private val subColor = Color(0xFF9CA3AF)

/** Mahsulot yonida kichkina aksiya badge'i.
 *  Admin tanlagan gradient rangda, kichik harflarda (masalan "10kg+1", "20%") */
@Composable
private fun PromoBadge(promotion: ProductPromotion) {
    val startColor = remember(promotion.colorStart) {
        runCatching {
            Color(android.graphics.Color.parseColor(promotion.colorStart))
        }.getOrDefault(Color(0xFF6366F1))
    }
    val endColor = remember(promotion.colorEnd) {
        runCatching {
            Color(android.graphics.Color.parseColor(promotion.colorEnd))
        }.getOrDefault(Color(0xFF9333EA))
    }
    val label = when {
        promotion.subtitle.isNotBlank() -> promotion.subtitle
        promotion.hasReward() -> {
            val list = promotion.resolvedRewards()
            val q = list.sumOf { it.quantity }
            val qLabel = if (q % 1.0 == 0.0) q.toInt().toString() else q.toString()
            val free = list.all { it.price <= 0 }
            buildString {
                append("+$qLabel")
                if (free) append(" tekin")
                if (list.size > 1) append(" · ${list.size}")
            }
        }
        promotion.discountPercent > 0 -> "-${promotion.discountPercent.toInt()}%"
        else -> promotion.title
    }
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(Brush.horizontalGradient(listOf(startColor, endColor)))
            .padding(horizontal = 6.dp, vertical = 2.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.White,
            maxLines = 1,
        )
    }
}

@Composable
private fun PromoProgressCard(
    promotion: ProductPromotion,
    paidQtyByProduct: Map<String, Double>,
    productNames: Map<String, String>,
    cartPromoQty: (rewardProductId: String) -> Double,
    onIncrementReward: (rewardProductId: String) -> Unit,
    onDecrementReward: (rewardProductId: String) -> Unit,
    onRewardQtyChange: (rewardProductId: String, qty: Double) -> Unit = { _, _ -> },
    showPerConditionProgress: Boolean = false,
    showBonusSection: Boolean = true,
    onDismiss: (() -> Unit)? = null,
) {
    val lang = LocalAppLanguage.current
    val startColor = remember(promotion.colorStart) {
        runCatching {
            Color(android.graphics.Color.parseColor(promotion.colorStart))
        }.getOrDefault(Color(0xFF6366F1))
    }
    val endColor = remember(promotion.colorEnd) {
        runCatching {
            Color(android.graphics.Color.parseColor(promotion.colorEnd))
        }.getOrDefault(Color(0xFF9333EA))
    }
    val conditions = promotion.resolvedConditions()
    val rewards = promotion.resolvedRewards()
    val overall = promotion.overallFillRatio(paidQtyByProduct)
    val overallPct = (overall * 100).toInt()
    val unlocked = promotion.isSatisfied(paidQtyByProduct)

    fun fmtQty(v: Double): String =
        if (v % 1.0 == 0.0) v.toInt().toString() else String.format("%.1f", v)

    fun resolveName(productId: String, fallback: String): String =
        fallback.ifBlank { productNames[productId].orEmpty() }.ifBlank { "…" }

    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Brush.horizontalGradient(listOf(startColor, endColor)))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                promotion.title,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                "$overallPct%",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
            )
            if (onDismiss != null) {
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.size(32.dp),
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }

        PromoProgressBar(progress = overall)

        if (showPerConditionProgress) {
            conditions.forEach { condition ->
                val have = paidQtyByProduct[condition.productId] ?: 0.0
                val need = condition.buyQuantity
                val ratio = promotion.conditionFillRatio(condition.productId, paidQtyByProduct)
                val pct = (ratio * 100).toInt()
                val name = resolveName(condition.productId, condition.productName)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            name,
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "${AppStrings.promoProgressQty(lang, fmtQty(have.coerceAtMost(need)), fmtQty(need))} · $pct%",
                            color = Color.White.copy(0.95f),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                    PromoProgressBar(progress = ratio)
                }
            }
        } else {
            conditions.forEach { condition ->
                val name = resolveName(condition.productId, condition.productName)
                val needLabel = fmtQty(condition.buyQuantity)
                Text(
                    "$name: ${AppStrings.promoConditionQty(lang, needLabel)}",
                    color = Color.White.copy(0.95f),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }

        if (showBonusSection) {
            HorizontalDivider(color = Color.White.copy(0.25f), thickness = 1.dp)

            Text(
                if (unlocked) AppStrings.promoBonusReadyHint(lang)
                else AppStrings.promoBonusLockedHint(lang),
                color = Color.White.copy(0.9f),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
            )

            rewards.forEach { reward ->
                val name = resolveName(reward.productId, reward.productName)
                val maxQ = reward.quantity
                val current = cartPromoQty(reward.productId)
                val priceLabel = if (reward.price <= 0) AppStrings.promoFree(lang)
                else reward.price.toLong().toString()
                val maxLabel = fmtQty(maxQ)

                if (unlocked) {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.White.copy(0.18f))
                            .padding(horizontal = 10.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                "${promotion.emoji} $name",
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                "max $maxLabel · $priceLabel",
                                color = Color.White.copy(0.8f),
                                fontSize = 11.sp,
                            )
                        }
                        VisitQtyButton(
                            icon = Icons.Default.Remove,
                            enabled = current > 0,
                            tint = Color.White,
                            bg = Color.White.copy(0.22f),
                            onClick = { onDecrementReward(reward.productId) },
                        )
                        VisitCompactEditableQty(
                            quantity = current,
                            maxQuantity = maxQ,
                            textColor = Color.White,
                            onQuantityChange = { qty -> onRewardQtyChange(reward.productId, qty) },
                        )
                        VisitQtyButton(
                            icon = Icons.Default.Add,
                            enabled = current < maxQ,
                            tint = Color.White,
                            bg = Color.White.copy(0.28f),
                            onClick = { onIncrementReward(reward.productId) },
                        )
                    }
                } else {
                    Text(
                        "${promotion.emoji} $name ×$maxLabel ($priceLabel)",
                        color = Color.White.copy(0.9f),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

@Composable
private fun PromoProgressBar(progress: Float) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(8.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(Color.White.copy(0.25f)),
    ) {
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(progress.coerceIn(0f, 1f))
                .clip(RoundedCornerShape(999.dp))
                .background(Color.White),
        )
    }
}

@Composable
private fun PromoRulesBanner(
    promotion: ProductPromotion,
    onDismiss: (() -> Unit)? = null,
) {
    val lang = LocalAppLanguage.current
    val startColor = remember(promotion.colorStart) {
        runCatching {
            Color(android.graphics.Color.parseColor(promotion.colorStart))
        }.getOrDefault(Color(0xFF6366F1))
    }
    val endColor = remember(promotion.colorEnd) {
        runCatching {
            Color(android.graphics.Color.parseColor(promotion.colorEnd))
        }.getOrDefault(Color(0xFF9333EA))
    }
    val conditions = promotion.resolvedConditions()
    val reward = promotion.resolvedRewards().joinToString(", ") { r ->
        val name = r.productName.ifBlank { "…" }
        val q = if (r.quantity % 1.0 == 0.0) r.quantity.toInt().toString() else r.quantity.toString()
        buildString {
            append(promotion.emoji)
            append(' ')
            append(name)
            append(" ×")
            append(q)
            if (r.price <= 0) {
                append(" (")
                append(AppStrings.promoFree(lang))
                append(")")
            }
        }
    }.ifBlank {
        buildString {
            append(promotion.emoji)
            append(' ')
            append(promotion.rewardProductName.ifBlank { "…" })
        }
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Brush.horizontalGradient(listOf(startColor, endColor)))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                promotion.title,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            conditions.forEach { c ->
                val name = c.productName.ifBlank { "…" }
                val n = if (c.buyQuantity % 1.0 == 0.0) c.buyQuantity.toInt().toString()
                else c.buyQuantity.toString()
                Text(
                    "$name: ${AppStrings.promoConditionQty(lang, n)}",
                    color = Color.White.copy(alpha = 0.9f),
                    fontSize = 11.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Text(
                reward,
                color = Color.White.copy(alpha = 0.95f),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        if (onDismiss != null) {
            IconButton(onClick = onDismiss) {
                Icon(Icons.Default.Close, contentDescription = null, tint = Color.White)
            }
        }
    }
}
