package uz.distributor.crm.presentation.visit

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.KeyboardArrowDown
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.graphics.Brush
import uz.distributor.crm.domain.model.CartItem
import uz.distributor.crm.domain.model.Product
import uz.distributor.crm.domain.model.ProductPromotion
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.sherinHeroBrush
import uz.distributor.crm.presentation.theme.sherinPageBackground
import java.text.DecimalFormat

@Composable
fun VisitScreen(
    clientId: String,
    onBack: () -> Unit,
    onOrderSummary: (String) -> Unit,
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
            VisitViewLevel.CATEGORIES -> onBack()
        }
    }

    // Pastki menyu AppNavHost Column ichida joy ajratadi — bu yerda qo'shimcha padding kerak emas.
    Box(modifier = Modifier.fillMaxSize()) {
    Column(modifier = Modifier.fillMaxSize().background(pageBg)) {
        when (state.viewLevel) {
            VisitViewLevel.CATEGORIES -> VisitCategoriesHeader(
                isDark = isDark,
                onBack = handleBack,
                onCartTabClick = viewModel::openCartSheet,
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
                        onBack = handleBack,
                    )
                }
            }
            VisitViewLevel.PRODUCTS -> VisitProductsHeader(
                categoryName = when (state.selectedCategory) {
                    VisitViewModel.ALL_CATEGORY -> AppStrings.allGoods(lang)
                    else -> state.selectedCategory.orEmpty()
                },
                subtitle = AppStrings.productsCount(
                    lang,
                    state.filteredProducts.size,
                    state.totalProductCount,
                ),
                searchQuery = state.searchQuery,
                showAllProducts = state.showAllProducts,
                cartTotal = state.cartTotal,
                isDark = isDark,
                onBack = handleBack,
                onSearchChange = viewModel::setSearchQuery,
                onToggleAll = viewModel::toggleShowAllProducts,
            )
        }

        if (state.viewLevel == VisitViewLevel.CATEGORIES) {
            VisitSummaryBar(
                cartTotal = state.cartTotal,
                totalFmt = totalFmt,
                isDark = isDark,
                refreshState = state.refreshButtonState,
                onRefresh = viewModel::refresh,
                onCartClick = viewModel::openCartSheet,
            )
        }

        if (state.visiblePromoBanners.isNotEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                state.visiblePromoBanners.take(3).forEach { promo ->
                    PromoRulesBanner(
                        promotion = promo,
                        onDismiss = { viewModel.dismissPromoBanner(promo.id) },
                    )
                }
            }
        }

        state.pendingPromoOffer?.let { offer ->
            val rewards = offer.resolvedRewards()
            val rewardLabel = rewards.joinToString(", ") { r ->
                val name = r.productName.ifBlank { "…" }
                val q = if (r.quantity % 1.0 == 0.0) r.quantity.toInt().toString() else r.quantity.toString()
                val pricePart = if (r.price <= 0) AppStrings.promoFree(lang)
                else "${priceFmt.format(r.price.toLong())} ${AppStrings.sumCurrency(lang)}"
                "$name × $q ($pricePart)"
            }.ifBlank { "…" }
            AlertDialog(
                onDismissRequest = viewModel::declinePromoOffer,
                title = { Text(AppStrings.promoOfferTitle(lang)) },
                text = {
                    Text(AppStrings.promoOfferBodyMulti(lang, rewardLabel))
                },
                confirmButton = {
                    TextButton(onClick = viewModel::acceptPromoOffer) {
                        Text(AppStrings.yes(lang))
                    }
                },
                dismissButton = {
                    TextButton(onClick = viewModel::declinePromoOffer) {
                        Text(AppStrings.no(lang))
                    }
                },
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
            VisitSearchSection(
                searchQuery = state.searchQuery,
                showAllProducts = state.showAllProducts,
                isDark = isDark,
                onSearchChange = viewModel::setSearchQuery,
                onToggleAll = viewModel::toggleShowAllProducts,
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
                    val matchesStock = state.showAllProducts || hasStock
                    val q = state.searchQuery.trim().lowercase()
                    val matchesQuery = q.isEmpty() || category.name.lowercase().contains(q)
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
            state.viewLevel == VisitViewLevel.PRODUCT_DETAIL -> {
                val product = state.selectedProduct
                if (product != null) {
                    VisitProductDetailContent(
                        product = product,
                        quantity = state.detailQuantity,
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
                        onPresetQty = viewModel::setDetailQuantity,
                        onQuantityChange = viewModel::setDetailQuantity,
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
                    selectedProducts = state.selectedInList,
                    allProducts = state.unselectedInList,
                    cart = state.cart,
                    selectedExpanded = state.selectedSectionExpanded,
                    allExpanded = state.allSectionExpanded,
                    priceFmt = priceFmt,
                    stockFmt = stockFmt,
                    cardBg = cardBg,
                    borderColor = borderColor,
                    titleColor = titleColor,
                    subColor = subColor,
                    lang = lang,
                    promotionsByProductId = state.promotionsByProductId,
                    onToggleSelected = viewModel::toggleSelectedSection,
                    onToggleAll = viewModel::toggleAllSection,
                    onProductClick = viewModel::openProduct,
                    onRemoveFromCart = viewModel::removeFromCart,
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
            onDismiss = viewModel::closeCartSheet,
            onItemClick = viewModel::openProductById,
            onEditItem = viewModel::editCartItem,
            onRemoveItem = viewModel::removeFromCart,
        )
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
    onBack: () -> Unit,
) {
    Box(Modifier.fillMaxWidth().background(sherinHeroBrush(isDark))) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(top = 36.dp, bottom = 20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                SherinGlassIconButton(
                    onClick = onBack,
                    icon = Icons.AutoMirrored.Filled.ArrowBack,
                    size = 40.dp,
                )
                Column(modifier = Modifier.padding(start = 12.dp)) {
                    Text(
                        categoryLabel.uppercase(),
                        color = Color.White.copy(0.75f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 1.sp,
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
            }
        }
    }
}

@Composable
private fun VisitProductDetailContent(
    product: Product,
    quantity: Double,
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
    modifier: Modifier = Modifier,
) {
    val cardBg = if (isDark) SherinColors.CardRowDark else Color.White
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val presets = listOf(1.0, 5.0, 10.0, 25.0, 50.0)
    val hasQty = quantity > 0.0

    Column(
        modifier = modifier
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
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
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    VisitQtyButton(
                        icon = Icons.Default.Remove,
                        enabled = quantity > qtyStepForProduct(product.unit),
                        tint = if (quantity > qtyStepForProduct(product.unit)) titleColor else subColor,
                        bg = if (isDark) Color(0xFF374151) else Color(0xFFF3F4F6),
                        onClick = onDecrement,
                    )
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
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
                    VisitQtyButton(
                        icon = Icons.Default.Add,
                        enabled = true,
                        tint = Color.White,
                        bg = Color(0xFF3B82F6),
                        onClick = onIncrement,
                    )
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
            cardBg = cardBg,
            borderColor = borderColor,
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
    cardBg: Color,
    borderColor: Color,
) {
    var showFullScreen by remember { mutableStateOf(false) }

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = cardBg,
        onClick = {
            if (imageUrl.isNotBlank()) showFullScreen = true
        },
        enabled = imageUrl.isNotBlank(),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, borderColor, RoundedCornerShape(16.dp)),
    ) {
        Box(Modifier.fillMaxWidth()) {
            if (imageUrl.isNotBlank()) {
                AsyncImage(
                    model = imageUrl,
                    contentDescription = null,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                        .padding(12.dp),
                    contentScale = ContentScale.Fit,
                )
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color.Black.copy(alpha = 0.45f),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(10.dp),
                ) {
                    Row(
                        Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Default.Fullscreen,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(14.dp),
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            AppStrings.fullScreenMap(LocalAppLanguage.current),
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            } else {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(150.dp),
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
        }
    }

    if (showFullScreen && imageUrl.isNotBlank()) {
        VisitFullScreenImageDialog(
            imageUrl = imageUrl,
            onDismiss = { showFullScreen = false },
        )
    }
}

@Composable
private fun VisitFullScreenImageDialog(
    imageUrl: String,
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
                .background(Color.Black)
                .clickable(onClick = onDismiss),
            contentAlignment = Alignment.Center,
        ) {
            AsyncImage(
                model = imageUrl,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(8.dp),
                contentScale = ContentScale.Fit,
            )
            IconButton(
                onClick = onDismiss,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .statusBarsPadding()
                    .padding(12.dp)
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.18f)),
            ) {
                Icon(Icons.Default.Close, contentDescription = null, tint = Color.White)
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
private fun VisitEditableQuantity(
    quantity: Double,
    unit: String,
    stockFmt: DecimalFormat,
    titleColor: Color,
    requestFocus: Boolean = false,
    onFocusHandled: () -> Unit = {},
    onQuantityChange: (Double) -> Unit,
) {
    val focusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current
    var isEditing by remember { mutableStateOf(false) }
    var inputText by remember { mutableStateOf("") }

    LaunchedEffect(quantity) {
        val parsed = parseQuantityInput(inputText)
        // Tugmalar orqali o'zgarganda matn ham yangilansin (isEditing bo'lsa ham)
        if (parsed == null || kotlin.math.abs(parsed - quantity) > 0.0001) {
            inputText = formatQuantityInput(quantity, stockFmt)
        }
    }

    LaunchedEffect(requestFocus) {
        if (requestFocus) {
            isEditing = true
            inputText = if (quantity > 0.0) formatQuantityInput(quantity, stockFmt) else ""
            onFocusHandled()
        }
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clickable {
                if (!isEditing) {
                    isEditing = true
                    inputText = if (quantity > 0.0) formatQuantityInput(quantity, stockFmt) else ""
                }
            },
    ) {
        if (isEditing) {
            LaunchedEffect(isEditing) {
                kotlinx.coroutines.delay(50)
                try {
                    focusRequester.requestFocus()
                } catch (_: IllegalStateException) {
                    // TextField hali layoutga ulanmagan — keyingi urinish
                }
            }
            BasicTextField(
                value = inputText,
                onValueChange = { raw ->
                    val normalized = raw.replace(',', '.')
                    if (normalized.isEmpty() || normalized.matches(Regex("^\\d*\\.?\\d*$"))) {
                        inputText = normalized
                        val parsed = parseQuantityInput(normalized)
                        if (parsed != null) {
                            onQuantityChange(parsed)
                        }
                    }
                },
                singleLine = true,
                textStyle = TextStyle(
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold,
                    color = titleColor,
                    textAlign = TextAlign.Center,
                ),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Decimal,
                    imeAction = ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(
                    onDone = { focusManager.clearFocus() },
                ),
                modifier = Modifier
                    .widthIn(min = 72.dp)
                    .focusRequester(focusRequester)
                    .onFocusChanged { focusState ->
                        if (focusState.isFocused) {
                            isEditing = true
                        } else {
                            isEditing = false
                            val finalQty = parseQuantityInput(inputText) ?: 0.0
                            onQuantityChange(finalQty)
                            inputText = formatQuantityInput(finalQty, stockFmt)
                        }
                    },
            )
        } else {
            Text(
                formatQuantityDisplay(quantity, stockFmt),
                fontSize = 36.sp,
                fontWeight = FontWeight.Bold,
                color = if (quantity > 0.0) titleColor else subColor,
                textAlign = TextAlign.Center,
            )
        }
        Text(unit, color = subColor, fontSize = 13.sp)
    }
}

private fun formatQuantityDisplay(quantity: Double, stockFmt: DecimalFormat): String =
    if (quantity % 1.0 == 0.0) quantity.toInt().toString() else stockFmt.format(quantity)

private fun formatQuantityInput(quantity: Double, stockFmt: DecimalFormat): String =
    if (quantity <= 0.0) "" else formatQuantityDisplay(quantity, stockFmt)

private fun qtyStepForProduct(unit: String): Double =
    if (unit.equals("kg", ignoreCase = true) || unit.equals("кг", ignoreCase = true)) 0.1 else 1.0

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
    selectedProducts: List<Product>,
    allProducts: List<Product>,
    cart: List<CartItem>,
    selectedExpanded: Boolean,
    allExpanded: Boolean,
    priceFmt: DecimalFormat,
    stockFmt: DecimalFormat,
    cardBg: Color,
    borderColor: Color,
    titleColor: Color,
    subColor: Color,
    lang: AppLanguage,
    promotionsByProductId: Map<String, ProductPromotion> = emptyMap(),
    onToggleSelected: () -> Unit,
    onToggleAll: () -> Unit,
    onProductClick: (Product) -> Unit,
    onRemoveFromCart: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (selectedProducts.isNotEmpty()) {
            item {
                VisitSectionHeader(
                    title = AppStrings.selectedProducts(lang),
                    countLabel = AppStrings.selectedCount(lang, selectedProducts.size),
                    expanded = selectedExpanded,
                    bgColor = Color(0xFFECFDF5),
                    titleColor = Color(0xFF059669),
                    onClick = onToggleSelected,
                )
            }
            if (selectedExpanded) {
                items(selectedProducts, key = { "sel-${it.id}" }) { product ->
                    val qty = cart.find { it.productId == product.id }?.quantity ?: 0.0
                    VisitSelectedProductCard(
                        product = product,
                        quantity = qty,
                        priceFmt = priceFmt,
                        stockFmt = stockFmt,
                        lang = lang,
                        promotion = promotionsByProductId[product.id],
                        onClick = { onProductClick(product) },
                        onRemove = { onRemoveFromCart(product.id) },
                    )
                }
            }
        }

        if (allProducts.isNotEmpty()) {
            item {
                VisitSectionHeader(
                    title = AppStrings.allGoods(lang),
                    countLabel = AppStrings.allGoodsCount(lang, allProducts.size),
                    expanded = allExpanded,
                    bgColor = Color(0xFFF3F4F6),
                    titleColor = Color(0xFF374151),
                    onClick = onToggleAll,
                )
            }
            if (allExpanded) {
                items(allProducts, key = { "all-${it.id}" }) { product ->
                    VisitProductCard(
                        product = product,
                        priceFmt = priceFmt,
                        stockFmt = stockFmt,
                        cardBg = cardBg,
                        borderColor = borderColor,
                        titleColor = titleColor,
                        subColor = subColor,
                        lang = lang,
                        promotion = promotionsByProductId[product.id],
                        onClick = { onProductClick(product) },
                    )
                }
            }
        }
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
    onBack: () -> Unit,
    onCartTabClick: () -> Unit,
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
                Text(
                    AppStrings.visitShort(lang),
                    modifier = Modifier.padding(start = 12.dp),
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.height(16.dp))
            VisitTabRow(activeTab = 0, onCartTabClick = onCartTabClick)
        }
    }
}

@Composable
private fun VisitProductsHeader(
    categoryName: String,
    subtitle: String,
    searchQuery: String,
    showAllProducts: Boolean,
    cartTotal: Double,
    isDark: Boolean,
    onBack: () -> Unit,
    onSearchChange: (String) -> Unit,
    onToggleAll: () -> Unit,
) {
    val lang = LocalAppLanguage.current
    val priceFmt = remember { DecimalFormat("#,###") }
    Box(Modifier.fillMaxWidth().background(sherinHeroBrush(isDark))) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(top = 36.dp, bottom = 16.dp),
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
                        .padding(horizontal = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        categoryName.uppercase(),
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        subtitle,
                        color = Color.White.copy(0.85f),
                        fontSize = 13.sp,
                    )
                }
                Spacer(Modifier.width(40.dp))
            }
            Spacer(Modifier.height(14.dp))
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = {
                    Text(AppStrings.search(lang), color = Color.White.copy(0.6f))
                },
                leadingIcon = {
                    Icon(Icons.Default.Search, null, tint = Color.White.copy(0.8f))
                },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White.copy(0.15f),
                    unfocusedContainerColor = Color.White.copy(0.12f),
                    focusedBorderColor = Color.White.copy(0.3f),
                    unfocusedBorderColor = Color.White.copy(0.2f),
                    cursorColor = Color.White,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                ),
            )
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        AppStrings.allGoods(lang),
                        color = Color.White.copy(0.9f),
                        fontSize = 13.sp,
                    )
                    Spacer(Modifier.width(8.dp))
                    Switch(
                        checked = showAllProducts,
                        onCheckedChange = { onToggleAll() },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = Color(0xFF3B82F6),
                            uncheckedThumbColor = Color.White,
                            uncheckedTrackColor = Color.White.copy(0.3f),
                        ),
                    )
                }
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color.White.copy(0.15f),
                ) {
                    Text(
                        "${priceFmt.format(cartTotal.toLong())} ${AppStrings.sumCurrency(lang)}",
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                    )
                }
            }
        }
    }
}

@Composable
private fun VisitTabRow(activeTab: Int, onCartTabClick: () -> Unit = {}) {
    val lang = LocalAppLanguage.current
    val tabs = listOf(
        AppStrings.visitTabProduct(lang),
        AppStrings.visitTabPromotion(lang),
        AppStrings.visitTabAddons(lang),
        AppStrings.visitTabCart(lang),
    )
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
        tabs.forEachIndexed { index, label ->
            val enabled = index == 0 || index == 3
            Column(
                modifier = Modifier.clickable(enabled = enabled) {
                    when (index) {
                        3 -> onCartTabClick()
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
private fun VisitSearchSection(
    searchQuery: String,
    showAllProducts: Boolean,
    isDark: Boolean,
    onSearchChange: (String) -> Unit,
    onToggleAll: () -> Unit,
) {
    val lang = LocalAppLanguage.current
    val cardBg = if (isDark) SherinColors.CardRowDark else Color.White
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    val titleColor = if (isDark) Color.White else Color(0xFF111827)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text(AppStrings.search(lang), color = subColor) },
            leadingIcon = { Icon(Icons.Default.Search, null, tint = subColor) },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = cardBg,
                unfocusedContainerColor = cardBg,
                focusedBorderColor = borderColor,
                unfocusedBorderColor = borderColor,
                cursorColor = SherinColors.Primary,
                focusedTextColor = titleColor,
                unfocusedTextColor = titleColor,
            ),
        )
        Surface(
            shape = RoundedCornerShape(14.dp),
            color = cardBg,
            modifier = Modifier
                .fillMaxWidth()
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
                    AppStrings.allGoods(lang),
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
private fun PromoRulesBanner(
    promotion: ProductPromotion,
    onDismiss: () -> Unit,
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
    val rules = promotion.resolvedConditions().joinToString(", ") { c ->
        val name = c.productName.ifBlank { "…" }
        val n = if (c.buyQuantity % 1.0 == 0.0) c.buyQuantity.toInt().toString()
        else c.buyQuantity.toString()
        "$name: ${AppStrings.promoConditionQty(lang, n)}"
    }
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
        Column(modifier = Modifier.weight(1f)) {
            Text(
                promotion.title,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (rules.isNotBlank()) {
                Text(
                    rules,
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
        IconButton(onClick = onDismiss) {
            Icon(Icons.Default.Close, contentDescription = null, tint = Color.White)
        }
    }
}
