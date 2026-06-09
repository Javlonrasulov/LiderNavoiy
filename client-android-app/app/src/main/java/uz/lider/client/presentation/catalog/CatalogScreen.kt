package uz.lider.client.presentation.catalog

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Sort
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
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
import uz.lider.client.presentation.components.ProductImageBox
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.navigation.ClientRoutes
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassThemed

@Composable
fun CatalogScreen(
    onNavigate: (String) -> Unit,
    cartCount: Int,
    viewModel: CatalogViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    @Suppress("UNUSED_VARIABLE")
    val lang = LocalAppLanguage.current
    val products = viewModel.filteredProducts()
    val categories = listOf(localized("cat_all")) + state.categories
    val lifecycleOwner = LocalLifecycleOwner.current

    LaunchedEffect(lifecycleOwner) {
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            viewModel.refresh()
        }
    }

    LiquidBackground(modifier = Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        localized("cat_title"),
                        color = LiquidTheme.text,
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp,
                    )
                    Box {
                        Box(
                            Modifier
                                .size(42.dp)
                                .liquidGlassThemed(radius = LiquidGlass.RadiusChip)
                                .clickable { onNavigate(ClientRoutes.CART) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Default.ShoppingCart,
                                null,
                                tint = LiquidGlass.Indigo,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                        if (cartCount > 0) {
                            Box(
                                Modifier
                                    .align(Alignment.TopEnd)
                                    .offset(x = 4.dp, y = (-4).dp)
                                    .size(18.dp)
                                    .clip(CircleShape)
                                    .background(LiquidGlass.Rose),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "$cartCount",
                                    color = Color.White,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        Modifier
                            .weight(1f)
                            .liquidGlassThemed(radius = LiquidGlass.RadiusChip)
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Default.Search,
                            null,
                            tint = LiquidTheme.textMuted,
                            modifier = Modifier.size(18.dp),
                        )
                        BasicTextField(
                            value = state.search,
                            onValueChange = viewModel::onSearchChange,
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 8.dp),
                            textStyle = TextStyle(
                                color = LiquidTheme.text,
                                fontSize = 14.sp,
                            ),
                            decorationBox = { inner ->
                                if (state.search.isEmpty()) {
                                    Text(
                                        localized("cat_search"),
                                        color = LiquidTheme.textMuted,
                                        fontSize = 14.sp,
                                    )
                                }
                                inner()
                            },
                        )
                        if (state.search.isNotEmpty()) {
                            Icon(
                                Icons.Default.Close,
                                null,
                                tint = LiquidTheme.textMuted,
                                modifier = Modifier
                                    .size(16.dp)
                                    .clickable { viewModel.onSearchChange("") },
                            )
                        }
                    }

                    Box {
                        Box(
                            Modifier
                                .size(44.dp)
                                .liquidGlassThemed(radius = 16.dp)
                                .clickable { viewModel.toggleSortMenu() },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Default.Sort, null, tint = LiquidGlass.Indigo)
                        }
                        DropdownMenu(
                            expanded = state.sortMenuOpen,
                            onDismissRequest = { viewModel.toggleSortMenu() },
                        ) {
                            sortOptions().forEach { (sort, label) ->
                                DropdownMenuItem(
                                    text = { Text(label) },
                                    onClick = { viewModel.onSortChange(sort) },
                                )
                            }
                        }
                    }
                }
            }

            Row(
                Modifier
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                categories.forEachIndexed { index, cat ->
                    val selected = state.activeCategoryIndex == index
                    Box(
                        Modifier
                            .then(
                                if (selected)
                                    Modifier
                                        .clip(RoundedCornerShape(LiquidGlass.RadiusChip))
                                        .background(LiquidGlass.GradientPrimary)
                                else
                                    Modifier.liquidGlassThemed(radius = LiquidGlass.RadiusChip)
                            )
                            .clickable { viewModel.onCategorySelected(index) }
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                    ) {
                        Text(
                            cat,
                            color = if (selected) Color.White else LiquidTheme.textMuted,
                            fontSize = 13.sp,
                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                        )
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = LiquidGlass.Indigo)
                }
            } else {
                Column(Modifier.padding(horizontal = 16.dp)) {
                    Text(
                        "${products.size} ${localized("cat_products")}",
                        color = LiquidTheme.textMuted,
                        fontSize = 13.sp,
                    )
                    Spacer(Modifier.height(8.dp))
                }
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    items(products, key = { it.id }) { product ->
                        ProductGridItem(
                            product = product,
                            imageUrl = viewModel.resolveImage(product.imageUrl).takeIf { it.isNotBlank() },
                            isFavorite = state.favorites.contains(product.id),
                            onFavorite = { viewModel.toggleFavorite(product.id) },
                            onClick = { onNavigate(ClientRoutes.productDetail(product.id)) },
                            onAdd = { viewModel.showAddToCart(product) },
                        )
                    }
                }
            }
            Spacer(Modifier.height(80.dp))
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
                    .clip(RoundedCornerShape(12.dp))
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
private fun sortOptions(): List<Pair<CatalogSort, String>> = listOf(
    CatalogSort.DEFAULT to localized("cat_sort_default"),
    CatalogSort.PRICE_ASC to localized("cat_sort_price_asc"),
    CatalogSort.PRICE_DESC to localized("cat_sort_price_desc"),
    CatalogSort.RATING to localized("cat_sort_rating"),
)
