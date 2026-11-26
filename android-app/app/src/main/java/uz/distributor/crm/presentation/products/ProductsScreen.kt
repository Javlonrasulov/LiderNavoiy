package uz.distributor.crm.presentation.products

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.flow.distinctUntilChanged
import uz.distributor.crm.domain.model.Product
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.navigation.BottomNavChrome
import uz.distributor.crm.presentation.navigation.bottomNavHeight
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.sherinHeroBrush
import uz.distributor.crm.presentation.theme.sherinPageBackground
import java.text.DecimalFormat

@Composable
fun ProductsScreen(
    onBack: () -> Unit,
    viewModel: ProductsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val pageBg = sherinPageBackground(isDark)
    val cardBg = if (isDark) SherinColors.CardDark else Color.White
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val subColor = Color(0xFF9CA3AF)
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    val filterBg = if (isDark) SherinColors.CardDark else Color.White
    val stockFmt = remember { DecimalFormat("#,##0.000") }
    val navBottom = bottomNavHeight()
    val systemNav = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    val listState = rememberLazyListState()
    val chromeVisible = rememberProductsChromeVisibility(listState)

    DisposableEffect(Unit) {
        onDispose { BottomNavChrome.reset() }
    }

    LaunchedEffect(chromeVisible) {
        BottomNavChrome.setVisible(chromeVisible)
    }

    val listBottomPad = if (chromeVisible) navBottom + 8.dp else systemNav + 8.dp

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(pageBg),
    ) {
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
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            AppStrings.products(lang),
                            color = Color.White,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            AppStrings.productsTotalCount(lang, state.totalCount),
                            color = Color.White.copy(0.8f),
                            fontSize = 12.sp,
                        )
                    }
                    SherinGlassIconButton(
                        onClick = viewModel::refresh,
                        icon = Icons.Filled.Refresh,
                        size = 40.dp,
                    )
                    Spacer(Modifier.width(8.dp))
                    SherinGlassIconButton(
                        onClick = viewModel::toggleViewMode,
                        icon = Icons.AutoMirrored.Filled.ViewList,
                        size = 40.dp,
                    )
                }
            }
        }

        AnimatedVisibility(
            visible = chromeVisible,
            enter = expandVertically(tween(220)) + fadeIn(tween(180)),
            exit = shrinkVertically(tween(220)) + fadeOut(tween(140)),
        ) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .background(filterBg)
                    .padding(horizontal = 14.dp, vertical = 8.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (isDark) Color(0xFF1F2937) else Color(0xFFF3F4F6),
                    modifier = Modifier.fillMaxWidth().height(36.dp),
                ) {
                    Row(
                        Modifier
                            .fillMaxSize()
                            .padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Default.Search, null, tint = subColor, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Box(Modifier.weight(1f)) {
                            if (state.searchQuery.isEmpty()) {
                                Text(AppStrings.search(lang), color = subColor, fontSize = 14.sp)
                            }
                            BasicTextField(
                                value = state.searchQuery,
                                onValueChange = viewModel::onSearchChange,
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                textStyle = LocalTextStyle.current.copy(
                                    color = titleColor,
                                    fontSize = 14.sp,
                                ),
                                cursorBrush = SolidColor(SherinColors.Primary),
                            )
                        }
                    }
                }

                Spacer(Modifier.height(4.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Switch(
                        checked = state.stockOnly,
                        onCheckedChange = viewModel::setStockOnly,
                        modifier = Modifier.scale(0.78f),
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = SherinColors.Primary,
                            uncheckedThumbColor = Color.White,
                            uncheckedTrackColor = if (isDark) Color(0xFF4B5563) else Color(0xFFD1D5DB),
                        ),
                    )
                    Spacer(Modifier.width(2.dp))
                    Text(
                        AppStrings.productAvailable(lang),
                        color = titleColor,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }

                Spacer(Modifier.height(4.dp))

                Row(
                    Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    ProductCategoryChip(
                        label = AppStrings.allProducts(lang),
                        selected = state.selectedCategory == null,
                        onClick = { viewModel.selectCategory(null) },
                    )
                    state.categories.forEach { category ->
                        ProductCategoryChip(
                            label = category,
                            selected = state.selectedCategory == category,
                            onClick = { viewModel.selectCategory(category) },
                        )
                    }
                }
            }
        }

        when {
            state.isLoading -> {
                Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SherinColors.Primary)
                }
            }
            state.error != null -> {
                Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text(AppStrings.apiError(lang, state.error!!), color = subColor)
                }
            }
            state.filteredProducts.isEmpty() -> {
                Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text(AppStrings.errorProductsNotFound(lang), color = subColor)
                }
            }
            else -> {
                when (state.viewMode) {
                    ProductsViewMode.CARD -> {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.weight(1f).fillMaxWidth(),
                            contentPadding = PaddingValues(
                                start = 16.dp,
                                end = 16.dp,
                                top = 10.dp,
                                bottom = listBottomPad,
                            ),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            items(state.filteredProducts, key = { it.id }) { product ->
                                ProductCard(
                                    product = product,
                                    lang = lang,
                                    isDark = isDark,
                                    cardBg = cardBg,
                                    borderColor = borderColor,
                                    titleColor = titleColor,
                                    subColor = subColor,
                                    stockFmt = stockFmt,
                                )
                            }
                        }
                    }
                    ProductsViewMode.TABLE -> {
                        ProductsTableView(
                            products = state.filteredProducts,
                            lang = lang,
                            isDark = isDark,
                            cardBg = cardBg,
                            borderColor = borderColor,
                            titleColor = titleColor,
                            subColor = subColor,
                            stockFmt = stockFmt,
                            bottomPadding = listBottomPad,
                            listState = listState,
                            modifier = Modifier.weight(1f).fillMaxWidth(),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun rememberProductsChromeVisibility(listState: LazyListState): Boolean {
    var chromeVisible by remember { mutableStateOf(true) }
    var lastIndex by remember { mutableIntStateOf(0) }
    var lastOffset by remember { mutableIntStateOf(0) }

    LaunchedEffect(listState) {
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
private fun ProductCategoryChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = if (selected) SherinColors.Primary else Color(0xFFF3F4F6),
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
            color = if (selected) Color.White else Color(0xFF4B5563),
            fontSize = 12.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun ProductCard(
    product: Product,
    lang: AppLanguage,
    isDark: Boolean,
    cardBg: Color,
    borderColor: Color,
    titleColor: Color,
    subColor: Color,
    stockFmt: DecimalFormat,
) {
    val brandLabel = product.categoryFilterKey()
    val brandAbbr = brandLabel.take(3).uppercase()

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = cardBg,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, borderColor, RoundedCornerShape(16.dp)),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(SherinColors.Primary),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        brandAbbr,
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Spacer(Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        product.name,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = titleColor,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        lineHeight = 18.sp,
                    )
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(product.code, fontSize = 12.sp, color = subColor)
                        Spacer(Modifier.width(8.dp))
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = SherinColors.Primary.copy(0.12f),
                        ) {
                            Text(
                                product.unit,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                fontSize = 10.sp,
                                color = SherinColors.Primary,
                                fontWeight = FontWeight.Medium,
                            )
                        }
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        formatPriceShort(product.price),
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = titleColor,
                    )
                    Text(
                        AppStrings.productSomShort(lang),
                        fontSize = 11.sp,
                        color = subColor,
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            Row(Modifier.fillMaxWidth()) {
                ProductSpecCell(
                    label = AppStrings.productUnitsPerPack(lang),
                    value = "—",
                    modifier = Modifier.weight(1f),
                    subColor = subColor,
                    valueColor = titleColor,
                )
                ProductSpecCell(
                    label = AppStrings.productNetto(lang),
                    value = "—",
                    modifier = Modifier.weight(1f),
                    subColor = subColor,
                    valueColor = titleColor,
                )
                ProductSpecCell(
                    label = AppStrings.productBrutto(lang),
                    value = "—",
                    modifier = Modifier.weight(1f),
                    subColor = subColor,
                    valueColor = titleColor,
                )
                ProductSpecCell(
                    label = AppStrings.productStockBalance(lang),
                    value = stockFmt.format(product.stockBalance),
                    modifier = Modifier.weight(1f),
                    subColor = subColor,
                    valueColor = Color(0xFF10B981),
                    valueBold = true,
                )
            }

            Spacer(Modifier.height(10.dp))
            HorizontalDivider(color = borderColor)
            Spacer(Modifier.height(8.dp))

            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.BarChart,
                    contentDescription = null,
                    tint = subColor,
                    modifier = Modifier.size(14.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    brandLabel.uppercase(),
                    modifier = Modifier.weight(1f),
                    fontSize = 11.sp,
                    color = subColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    product.code,
                    fontSize = 11.sp,
                    color = subColor,
                )
            }
        }
    }
}

@Composable
private fun ProductSpecCell(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    subColor: Color,
    valueColor: Color,
    valueBold: Boolean = false,
) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 10.sp, color = subColor, textAlign = TextAlign.Center)
        Spacer(Modifier.height(2.dp))
        Text(
            value,
            fontSize = 13.sp,
            color = valueColor,
            fontWeight = if (valueBold) FontWeight.Bold else FontWeight.Normal,
            textAlign = TextAlign.Center,
        )
    }
}

private fun formatPriceShort(price: Double): String {
    val n = price.toLong()
    return when {
        n >= 1_000_000 -> "%.1f mln".format(n / 1_000_000.0)
        n >= 1_000 -> "%.0f ming".format(n / 1_000.0)
        else -> n.toString()
    }
}

@Composable
private fun ProductsTableView(
    products: List<Product>,
    lang: AppLanguage,
    isDark: Boolean,
    cardBg: Color,
    borderColor: Color,
    titleColor: Color,
    subColor: Color,
    stockFmt: DecimalFormat,
    bottomPadding: androidx.compose.ui.unit.Dp,
    listState: LazyListState,
    modifier: Modifier = Modifier,
) {
    val headerBg = if (isDark) Color(0xFF1F2937) else Color(0xFFF9FAFB)
    val rowAltBg = if (isDark) Color(0xFF111827) else Color(0xFFFAFAFA)

    Surface(
        modifier = modifier
            .padding(horizontal = 12.dp, vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        color = cardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, borderColor),
    ) {
        Column {
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(headerBg)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    AppStrings.productColCode(lang),
                    modifier = Modifier.width(52.dp),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = subColor,
                )
                Text(
                    AppStrings.productColName(lang),
                    modifier = Modifier.weight(1f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = subColor,
                )
                Text(
                    AppStrings.productColPrice(lang),
                    modifier = Modifier.width(64.dp),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = subColor,
                    textAlign = TextAlign.End,
                )
                Text(
                    AppStrings.productStockBalance(lang),
                    modifier = Modifier.width(56.dp),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = subColor,
                    textAlign = TextAlign.End,
                )
            }
            HorizontalDivider(color = borderColor)
            LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = bottomPadding),
            ) {
                items(products.size) { index ->
                    val product = products[index]
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .background(if (index % 2 == 1) rowAltBg else cardBg)
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            product.code,
                            modifier = Modifier.width(52.dp),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = SherinColors.Primary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                            Text(
                                product.name,
                                fontSize = 12.sp,
                                color = titleColor,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                lineHeight = 16.sp,
                            )
                            Text(
                                product.categoryFilterKey(),
                                fontSize = 10.sp,
                                color = subColor,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        Text(
                            formatPriceShort(product.price),
                            modifier = Modifier.width(64.dp),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = titleColor,
                            textAlign = TextAlign.End,
                        )
                        Text(
                            stockFmt.format(product.stockBalance),
                            modifier = Modifier.width(56.dp),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (product.stockBalance > 0) Color(0xFF10B981) else Color(0xFFEF4444),
                            textAlign = TextAlign.End,
                        )
                    }
                    if (index < products.lastIndex) {
                        HorizontalDivider(color = borderColor.copy(0.6f))
                    }
                }
            }
        }
    }
}
