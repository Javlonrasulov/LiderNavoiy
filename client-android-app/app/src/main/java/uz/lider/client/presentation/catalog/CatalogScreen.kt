package uz.lider.client.presentation.catalog

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.foundation.layout.width
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.domain.model.Product
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.AddToCartQuantityDialog
import uz.lider.client.presentation.components.ClientPullToRefresh
import uz.lider.client.presentation.components.CatalogFilterDropdown
import uz.lider.client.presentation.components.OrgSwitcherDropdown
import uz.lider.client.presentation.components.ProductImageBox
import uz.lider.client.presentation.components.PulsingCountBadge
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.navigation.clientBottomContentPadding
import uz.lider.client.presentation.navigation.ClientRoutes
import uz.lider.client.presentation.theme.GlassSearchField
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidGlassDropdownItem
import uz.lider.client.presentation.theme.LiquidGlassDropdownMenu
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.PremiumHeaderActionPill
import uz.lider.client.presentation.theme.PremiumHeaderButton
import uz.lider.client.presentation.theme.PremiumHeaderPillIcon
import uz.lider.client.presentation.theme.liquidGlassThemed

@Composable
fun CatalogScreen(
    onNavigate: (String) -> Unit,
    cartCount: Int,
    onOpenDrawer: () -> Unit = {},
    viewModel: CatalogViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    @Suppress("UNUSED_VARIABLE")
    val lang = LocalAppLanguage.current
    val products = viewModel.filteredProducts()
    val categories = listOf(localized("cat_all"), localized("cat_favorites")) + state.categories
    val lifecycleOwner = LocalLifecycleOwner.current

    LaunchedEffect(lifecycleOwner) {
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            viewModel.refresh()
        }
    }

    LiquidBackground(modifier = Modifier.fillMaxSize()) {
        if (state.loading && state.allProducts.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LiquidGlass.Indigo)
            }
        } else {
            ClientPullToRefresh(onRefresh = { viewModel.refresh() }) {
            val isList = state.viewMode == CatalogViewMode.LIST
            LazyVerticalGrid(
                columns = GridCells.Fixed(if (isList) 1 else 2),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = 16.dp,
                    end = 16.dp,
                    bottom = clientBottomContentPadding(),
                ),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item(span = { GridItemSpan(maxLineSpan) }) {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .statusBarsPadding()
                            .padding(vertical = 10.dp),
                    ) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            PremiumHeaderButton(
                                icon = Icons.Default.Menu,
                                onClick = onOpenDrawer,
                                contentDescription = "Menu",
                            )
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                PremiumHeaderActionPill {
                                    PremiumHeaderPillIcon(
                                        icon = if (isList) Icons.Default.GridView
                                        else Icons.AutoMirrored.Filled.ViewList,
                                        onClick = viewModel::toggleViewMode,
                                        contentDescription = if (isList) {
                                            localized("cat_view_grid")
                                        } else {
                                            localized("cat_view_list")
                                        },
                                    )
                                    Box {
                                        PremiumHeaderPillIcon(
                                            icon = Icons.AutoMirrored.Filled.Sort,
                                            onClick = { viewModel.toggleSortMenu() },
                                        )
                                        LiquidGlassDropdownMenu(
                                            expanded = state.sortMenuOpen,
                                            onDismissRequest = { viewModel.toggleSortMenu() },
                                        ) {
                                            sortOptions().forEach { (sort, label) ->
                                                LiquidGlassDropdownItem(
                                                    text = label,
                                                    selected = state.sort == sort,
                                                    onClick = { viewModel.onSortChange(sort) },
                                                )
                                            }
                                        }
                                    }
                                }
                                // Cart button + pulsing badge in a roomy box (never clipped).
                                Box(
                                    Modifier.size(52.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    PremiumHeaderButton(
                                        icon = Icons.Default.ShoppingCart,
                                        onClick = { onNavigate(ClientRoutes.CART) },
                                        contentDescription = localized("cat_add_cart"),
                                        tint = LiquidGlass.Indigo,
                                        size = 42.dp,
                                    )
                                    PulsingCountBadge(
                                        count = cartCount,
                                        modifier = Modifier.align(Alignment.TopEnd),
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                        Text(
                            localized("cat_title"),
                            color = LiquidTheme.text,
                            fontWeight = FontWeight.Bold,
                            fontSize = 26.sp,
                            lineHeight = 32.sp,
                        )
                        Text(
                            "${products.size} ${localized("cat_products")}",
                            color = LiquidTheme.textMuted,
                            fontSize = 14.sp,
                            lineHeight = 20.sp,
                        )
                        Spacer(Modifier.height(12.dp))
                    }
                }

                    item(span = { GridItemSpan(maxLineSpan) }) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            GlassSearchField(
                                value = state.search,
                                onValueChange = viewModel::onSearchChange,
                                placeholder = localized("cat_search"),
                                leadingIcon = Icons.Default.Search,
                                modifier = Modifier.weight(1f),
                                trailing = if (state.search.isNotEmpty()) {
                                    {
                                        Icon(
                                            Icons.Default.Close,
                                            null,
                                            tint = LiquidTheme.textMuted,
                                            modifier = Modifier
                                                .size(16.dp)
                                                .clickable { viewModel.onSearchChange("") },
                                        )
                                    }
                                } else null,
                            )
                        }
                    }

                    item(span = { GridItemSpan(maxLineSpan) }) {
                        Row(
                            Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (state.organizations.size >= 2) {
                                OrgSwitcherDropdown(
                                    organizations = state.organizations,
                                    selectedCompanyId = state.selectedCompanyId,
                                    onSelect = viewModel::selectOrganization,
                                )
                            }
                            CatalogFilterDropdown(
                                options = categories,
                                selectedIndex = state.activeCategoryIndex,
                                onSelect = viewModel::onCategorySelected,
                            )
                        }
                    }

                    when {
                        state.loading -> {
                            item(span = { GridItemSpan(maxLineSpan) }) {
                                Box(
                                    Modifier
                                        .fillMaxWidth()
                                        .height(160.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    CircularProgressIndicator(color = LiquidGlass.Indigo)
                                }
                            }
                        }
                        state.activeCategoryIndex == CatalogViewModel.INDEX_FAVORITES &&
                            products.isEmpty() -> {
                            item(span = { GridItemSpan(maxLineSpan) }) {
                                Column(
                                    Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 48.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    Icon(
                                        Icons.Default.FavoriteBorder,
                                        null,
                                        tint = LiquidTheme.textMuted,
                                        modifier = Modifier.size(48.dp),
                                    )
                                    Spacer(Modifier.height(12.dp))
                                    Text(
                                        localized("cat_favorites_empty"),
                                        color = LiquidTheme.textMuted,
                                        fontSize = 14.sp,
                                    )
                                }
                            }
                        }
                        else -> {
                            items(products, key = { it.id }) { product ->
                                val imageUrl = viewModel.resolveImage(product.imageUrl)
                                    .takeIf { it.isNotBlank() }
                                val isFavorite = state.favorites.contains(product.id)
                                if (isList) {
                                    ProductListItem(
                                        product = product,
                                        imageUrl = imageUrl,
                                        isFavorite = isFavorite,
                                        onFavorite = { viewModel.toggleFavorite(product.id) },
                                        onClick = {
                                            onNavigate(ClientRoutes.productDetail(product.id))
                                        },
                                        onAdd = { viewModel.showAddToCart(product) },
                                    )
                                } else {
                                    ProductGridItem(
                                        product = product,
                                        imageUrl = imageUrl,
                                        isFavorite = isFavorite,
                                        onFavorite = { viewModel.toggleFavorite(product.id) },
                                        onClick = {
                                            onNavigate(ClientRoutes.productDetail(product.id))
                                        },
                                        onAdd = { viewModel.showAddToCart(product) },
                                    )
                                }
                            }
                        }
                    }
            }
            }
        }
    }

    state.addToCartProduct?.let { product ->
        AddToCartQuantityDialog(
            product = product,
            onDismiss = viewModel::dismissAddToCart,
            onConfirm = viewModel::confirmAddToCart,
        )
    }
}

@Composable
private fun ProductGridItem(
    product: Product,
    imageUrl: String?,
    isFavorite: Boolean,
    onFavorite: () -> Unit,
    onClick: () -> Unit,
    onAdd: () -> Unit,
) {
    Column(
        Modifier
            .then(
                if (isFavorite) {
                    Modifier.border(
                        2.dp,
                        LiquidGlass.Rose.copy(alpha = 0.65f),
                        RoundedCornerShape(LiquidGlass.RadiusCard),
                    )
                } else {
                    Modifier
                },
            )
            .liquidGlassThemed()
            .clickable(onClick = onClick),
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .background(LiquidGlass.BgMidDark),
        ) {
            ProductImageBox(
                imageUrl = imageUrl,
                contentDescription = product.name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .padding(8.dp)
                    .size(32.dp)
                    .liquidGlassThemed(radius = LiquidGlass.RadiusChip)
                    .clickable(onClick = onFavorite),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                    null,
                    tint = if (isFavorite) LiquidGlass.Rose else LiquidTheme.textMuted,
                    modifier = Modifier.size(15.dp),
                )
            }
            if (!product.brand.isNullOrBlank()) {
                Text(
                    product.brand,
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(8.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.55f))
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                    color = Color.White,
                    fontSize = 10.sp,
                )
            }
        }

        Column(Modifier.padding(10.dp)) {
            Text(
                product.name,
                color = LiquidTheme.text,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                maxLines = 2,
            )
            Text(
                "${formatMoney(product.price)} ${localized("com_som")}",
                style = TextStyle(
                    brush = Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Violet)),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                ),
            )
            Text(
                "${localized("cat_stock")}: ${product.stockBalance.toInt()} ${product.unit}",
                color = LiquidTheme.textMuted,
                fontSize = 11.sp,
            )
            Spacer(Modifier.height(6.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(LiquidGlass.RadiusButton))
                    .background(LiquidGlass.GradientPrimary)
                    .clickable(onClick = onAdd)
                    .padding(vertical = 8.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    localized("cat_add_cart"),
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun ProductListItem(
    product: Product,
    imageUrl: String?,
    isFavorite: Boolean,
    onFavorite: () -> Unit,
    onClick: () -> Unit,
    onAdd: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .then(
                if (isFavorite) {
                    Modifier.border(
                        2.dp,
                        LiquidGlass.Rose.copy(alpha = 0.65f),
                        RoundedCornerShape(LiquidGlass.RadiusCard),
                    )
                } else {
                    Modifier
                },
            )
            .liquidGlassThemed()
            .clickable(onClick = onClick)
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(96.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(LiquidGlass.BgMidDark),
        ) {
            ProductImageBox(
                imageUrl = imageUrl,
                contentDescription = product.name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
            if (!product.brand.isNullOrBlank()) {
                Text(
                    product.brand,
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(6.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color.Black.copy(alpha = 0.55f))
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                    color = Color.White,
                    fontSize = 9.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }

        Spacer(Modifier.width(12.dp))

        Column(Modifier.weight(1f)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Text(
                    product.name,
                    color = LiquidTheme.text,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                    contentDescription = null,
                    tint = if (isFavorite) LiquidGlass.Rose else LiquidTheme.textMuted,
                    modifier = Modifier
                        .padding(start = 8.dp)
                        .size(22.dp)
                        .clickable(onClick = onFavorite),
                )
            }
            Spacer(Modifier.height(4.dp))
            Text(
                "${formatMoney(product.price)} ${localized("com_som")}",
                style = TextStyle(
                    brush = Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Violet)),
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                ),
            )
            Text(
                "${localized("cat_stock")}: ${product.stockBalance.toInt()} ${product.unit}",
                color = LiquidTheme.textMuted,
                fontSize = 12.sp,
            )
            Spacer(Modifier.height(8.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(LiquidGlass.RadiusButton))
                    .background(LiquidGlass.GradientPrimary)
                    .clickable(onClick = onAdd)
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    localized("cat_add_cart"),
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun sortOptions(): List<Pair<CatalogSort, String>> = listOf(
    CatalogSort.DEFAULT to localized("cat_sort_default"),
    CatalogSort.PRICE_ASC to localized("cat_sort_price_asc"),
    CatalogSort.PRICE_DESC to localized("cat_sort_price_desc"),
    CatalogSort.RATING to localized("cat_sort_rating"),
)
