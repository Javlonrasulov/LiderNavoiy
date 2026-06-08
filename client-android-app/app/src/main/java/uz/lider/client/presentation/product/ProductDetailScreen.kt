package uz.lider.client.presentation.product

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
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
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ProductImageBox
import uz.lider.client.presentation.components.formatQty
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassThemed

@Composable
fun ProductDetailScreen(
    productId: String,
    onBack: () -> Unit,
    onOpenCart: () -> Unit,
    viewModel: ProductDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val lang = LocalAppLanguage.current
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted

    LaunchedEffect(productId) { viewModel.load(productId) }

    LiquidBackground(modifier = Modifier.fillMaxSize()) {
        if (state.loading || state.product == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LiquidGlass.Indigo)
            }
            GlassHeaderRow(
                onBack = onBack,
                liked = false,
                onToggleLike = {},
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .fillMaxWidth()
                    .padding(top = 16.dp, start = 8.dp, end = 8.dp),
            )
        } else {
            val product = state.product!!
            val image = viewModel.resolveImage(product.imageUrl).takeIf { it.isNotBlank() }
            val reviews = remember(lang) { mockReviews(lang) }
            val inCart = viewModel.isInCart()

            LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 120.dp),
            ) {
                item {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(300.dp),
                    ) {
                        ProductImageBox(
                            imageUrl = image,
                            contentDescription = product.name,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop,
                        )
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .height(140.dp)
                                .align(Alignment.BottomCenter)
                                .background(
                                    Brush.verticalGradient(
                                        listOf(Color.Transparent, LiquidGlass.BgDark),
                                    ),
                                ),
                        )
                        Box(
                            Modifier
                                .align(Alignment.BottomStart)
                                .padding(16.dp)
                                .clip(RoundedCornerShape(LiquidGlass.RadiusChip))
                                .background(LiquidGlass.Emerald.copy(alpha = 0.22f))
                                .padding(horizontal = 12.dp, vertical = 4.dp),
                        ) {
                            Text(
                                "${localized("pd_stock")}: ${product.stockBalance.toInt()} ${product.unit}",
                                color = LiquidGlass.Emerald,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }

                item {
                    Column(
                        Modifier
                            .padding(horizontal = 16.dp)
                            .liquidGlassThemed()
                            .padding(16.dp),
                    ) {
                        Text(
                            "SKU: ${product.code} • ${product.category.orEmpty()}",
                            color = textMuted,
                            fontSize = 12.sp,
                        )
                        Text(
                            product.name,
                            color = text,
                            fontWeight = FontWeight.Bold,
                            fontSize = 22.sp,
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            repeat(5) {
                                Icon(
                                    Icons.Default.Star,
                                    null,
                                    tint = LiquidGlass.Amber,
                                    modifier = Modifier.size(14.dp),
                                )
                            }
                            Text(" 4.5", color = LiquidGlass.Amber, fontSize = 14.sp)
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "${formatMoney(product.price)} ${localized("com_som")}",
                            style = TextStyle(
                                brush = LiquidGlass.GradientPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 26.sp,
                            ),
                        )
                    }
                }

                item {
                    Spacer(Modifier.height(12.dp))
                    Row(
                        Modifier
                            .padding(horizontal = 16.dp)
                            .liquidGlassThemed(radius = 16.dp)
                            .padding(4.dp),
                    ) {
                        listOf(
                            "info" to localized("pd_info"),
                            "reviews" to localized("pd_reviews"),
                        ).forEach { (key, label) ->
                            val isSelected = state.tab == key
                            Box(
                                Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .run {
                                        if (isSelected) background(LiquidGlass.GradientPrimary)
                                        else this
                                    }
                                    .clickable { viewModel.setTab(key) }
                                    .padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    label,
                                    color = if (isSelected) Color.White else textMuted,
                                    fontSize = 14.sp,
                                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                )
                            }
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                }

                if (state.tab == "info") {
                    item {
                        Column(
                            Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Column(
                                Modifier
                                    .fillMaxWidth()
                                    .liquidGlassThemed()
                                    .padding(16.dp),
                            ) {
                                Text(
                                    localized("pd_desc"),
                                    color = textMuted,
                                    fontSize = 12.sp,
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(product.name, color = text, fontSize = 14.sp)
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                InfoTile(
                                    localized("pd_brand"),
                                    product.brand.orEmpty(),
                                    Modifier.weight(1f),
                                )
                                InfoTile(
                                    localized("pd_category"),
                                    product.category.orEmpty(),
                                    Modifier.weight(1f),
                                )
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                InfoTile(
                                    localized("pd_stock"),
                                    "${product.stockBalance.toInt()} ${product.unit}",
                                    Modifier.weight(1f),
                                )
                                InfoTile(localized("pd_rating"), "4.5/5", Modifier.weight(1f))
                            }
                        }
                    }
                } else {
                    items(reviews) { review ->
                        Column(
                            Modifier
                                .padding(horizontal = 16.dp, vertical = 4.dp)
                                .liquidGlassThemed()
                                .padding(14.dp),
                        ) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    review.user,
                                    color = text,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Row {
                                    repeat(review.rating) {
                                        Icon(
                                            Icons.Default.Star,
                                            null,
                                            tint = LiquidGlass.Amber,
                                            modifier = Modifier.size(11.dp),
                                        )
                                    }
                                }
                            }
                            Spacer(Modifier.height(4.dp))
                            Text(review.comment, color = textMuted, fontSize = 14.sp)
                            Text(review.date, color = textMuted, fontSize = 11.sp)
                        }
                    }
                }
            }

            GlassHeaderRow(
                onBack = onBack,
                liked = state.liked,
                onToggleLike = { viewModel.toggleLike() },
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .fillMaxWidth()
                    .padding(top = 16.dp, start = 8.dp, end = 8.dp),
            )

            Box(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, LiquidGlass.BgDark.copy(alpha = 0.97f)),
                        ),
                    )
                    .padding(top = 16.dp, start = 16.dp, end = 16.dp, bottom = 16.dp),
            ) {
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Row(
                        Modifier
                            .liquidGlassThemed(radius = 16.dp)
                            .padding(4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Default.Remove,
                            null,
                            tint = text,
                            modifier = Modifier
                                .clickable { viewModel.decQty() }
                                .padding(8.dp),
                        )
                        Text(
                            formatQty(state.qty),
                            color = text,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 12.dp),
                        )
                        Icon(
                            Icons.Default.Add,
                            null,
                            tint = text,
                            modifier = Modifier
                                .clickable { viewModel.incQty() }
                                .padding(8.dp),
                        )
                    }

                    Box(
                        Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(LiquidGlass.RadiusCard))
                            .background(LiquidGlass.GradientPrimary)
                            .clickable {
                                viewModel.addToCart()
                                onOpenCart()
                            }
                            .padding(vertical = 14.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            if (inCart) localized("pd_in_cart") else localized("pd_add_cart"),
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun GlassHeaderRow(
    onBack: () -> Unit,
    liked: Boolean,
    onToggleLike: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val text = LiquidTheme.text
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(40.dp)
                .liquidGlassThemed(radius = LiquidGlass.RadiusCard)
                .clickable(onClick = onBack),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = text,
                modifier = Modifier.size(20.dp),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(
                Modifier
                    .size(40.dp)
                    .liquidGlassThemed(radius = LiquidGlass.RadiusCard),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Default.Share,
                    null,
                    tint = text,
                    modifier = Modifier.size(18.dp),
                )
            }
            Box(
                Modifier
                    .size(40.dp)
                    .liquidGlassThemed(radius = LiquidGlass.RadiusCard)
                    .clickable(onClick = onToggleLike),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    if (liked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                    null,
                    tint = if (liked) LiquidGlass.Rose else text,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}

@Composable
private fun InfoTile(label: String, value: String, modifier: Modifier = Modifier) {
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    Column(
        modifier
            .liquidGlassThemed()
            .padding(12.dp),
    ) {
        Text(label, color = textMuted, fontSize = 11.sp)
        Text(value, color = text, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}

private fun mockReviews(lang: AppLanguage): List<ProductReview> = listOf(
    ProductReview(
        "Bobur T.",
        5,
        when (lang) {
            AppLanguage.RU -> "Отличное качество"
            AppLanguage.EN -> "Great quality"
            else -> "Sifati ajoyib"
        },
        "05.06.2026",
    ),
    ProductReview(
        "Dilnoza K.",
        4,
        when (lang) {
            AppLanguage.RU -> "Хороший товар"
            AppLanguage.EN -> "Good product"
            else -> "Yaxshi mahsulot"
        },
        "02.06.2026",
    ),
)
