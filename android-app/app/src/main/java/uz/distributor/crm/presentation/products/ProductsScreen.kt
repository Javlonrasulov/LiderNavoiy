package uz.distributor.crm.presentation.products

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Search
import androidx.compose.foundation.text.BasicTextField
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
import uz.distributor.crm.domain.model.Product
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.navigation.bottomNavHeight
import uz.distributor.crm.presentation.theme.SherinColors
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
    val headerBg = if (isDark) SherinColors.CardDark else Color.White
    val stockFmt = remember { DecimalFormat("#,##0.000") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(pageBg)
            .padding(bottom = bottomNavHeight()),
    ) {
        Surface(color = headerBg, shadowElevation = if (isDark) 0.dp else 1.dp) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp)
                    .padding(top = 28.dp, bottom = 6.dp),
            ) {
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier
                            .size(34.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (isDark) Color(0xFF374151) else Color(0xFFF3F4F6)),
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = null,
                            tint = titleColor,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            AppStrings.products(lang),
                            color = titleColor,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            lineHeight = 18.sp,
                        )
                        Text(
                            AppStrings.productsTotalCount(lang, state.totalCount),
                            color = subColor,
                            fontSize = 11.sp,
                            lineHeight = 13.sp,
                        )
                    }
                    IconButton(
                        onClick = viewModel::toggleViewMode,
                        modifier = Modifier
                            .size(34.dp)
                            .clip(CircleShape)
                            .background(
                                if (state.viewMode == ProductsViewMode.TABLE) SherinColors.Primary.copy(0.15f)
                                else if (isDark) Color(0xFF374151) else Color(0xFFF3F4F6),
                            )
                            .border(
                                1.dp,
                                if (state.viewMode == ProductsViewMode.TABLE) SherinColors.Primary.copy(0.4f)
                                else if (isDark) Color(0xFF4B5563) else Color(0xFFE5E7EB),
                                CircleShape,
                            ),
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.ViewList,
                            null,
                            tint = if (state.viewMode == ProductsViewMode.TABLE) SherinColors.Primary else titleColor,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }

                Spacer(Modifier.height(8.dp))

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (isDark) Color(0xFF1F2937) else Color(0xFFF3F4F6),
                    modifier = Modifier.fillMaxWidth().height(38.dp),
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

                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Switch(
                        checked = state.stockOnly,
                        onCheckedChange = viewModel::setStockOnly,
                        modifier = Modifier.scale(0.82f),
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = SherinColors.Primary,
                            uncheckedThumbColor = Color.White,
                            uncheckedTrackColor = if (isDark) Color(0xFF4B5563) else Color(0xFFD1D5DB),
                        ),
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        AppStrings.productAvailable(lang),
                        color = titleColor,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }

                Spacer(Modifier.height(6.dp))

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
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SherinColors.Primary)
                }
            }
            state.error != null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(AppStrings.apiError(lang, state.error!!), color = subColor)
                }
            }
            state.filteredProducts.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(AppStrings.errorProductsNotFound(lang), color = subColor)
                }
            }
            else -> {
                when (state.viewMode) {
                    ProductsViewMode.CARD -> {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
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
                        )
                    }
                }
            }
        }
    }
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
) {
    val headerBg = if (isDark) Color(0xFF1F2937) else Color(0xFFF9FAFB)
    val rowAltBg = if (isDark) Color(0xFF111827) else Color(0xFFFAFAFA)

    Surface(
        modifier = Modifier
            .fillMaxSize()
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
            LazyColumn(modifier = Modifier.fillMaxSize()) {
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
