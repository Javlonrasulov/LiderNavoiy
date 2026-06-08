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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientBackButton
import uz.lider.client.presentation.components.ProductImageBox
import uz.lider.client.presentation.components.clientCard
import uz.lider.client.presentation.components.formatQty
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.rememberClientPalette

@Composable
fun ProductDetailScreen(
    productId: String,
    onBack: () -> Unit,
    onOpenCart: () -> Unit,
    viewModel: ProductDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val lang = LocalAppLanguage.current
    val palette = rememberClientPalette()

    LaunchedEffect(productId) { viewModel.load(productId) }

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ClientBackButton(onBack = onBack)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(
                    Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(palette.primary.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Share, null, tint = palette.primary)
                }
                Box(
                    Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(palette.primary.copy(alpha = 0.12f))
                        .clickable { viewModel.toggleLike() },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        if (state.liked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        null,
                        tint = if (state.liked) palette.accent else palette.primary,
                    )
                }
            }
        }

        if (state.loading || state.product == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = palette.primary)
            }
        } else {
            val product = state.product!!
            val image = viewModel.resolveImage(product.imageUrl).takeIf { it.isNotBlank() }
            val reviews = remember(lang) { mockReviews(lang) }
            val inCart = viewModel.isInCart()

            LazyColumn(contentPadding = PaddingValues(bottom = 100.dp)) {
                item {
                    Box(
                        Modifier
                            .padding(horizontal = 16.dp)
                            .fillMaxWidth()
                            .height(220.dp)
                            .clip(RoundedCornerShape(24.dp))
                            .background(palette.surface2),
                    ) {
                        ProductImageBox(
                            imageUrl = image,
                            contentDescription = product.name,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop,
                        )
                        Text(
                            "${localized("pd_stock")}: ${product.stockBalance.toInt()}",
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(12.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(palette.success.copy(alpha = 0.3f))
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                            color = palette.success,
                            fontSize = 12.sp,
                        )
                    }
                }
                item {
                    Column(Modifier.padding(16.dp)) {
                        Text("SKU: ${product.code} • ${product.category.orEmpty()}", color = palette.textMuted, fontSize = 12.sp)
                        Text(product.name, color = palette.text, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            repeat(5) { Icon(Icons.Default.Star, null, tint = palette.warning, modifier = Modifier.size(14.dp)) }
                            Text(" 4.5", color = palette.warning, fontSize = 14.sp)
                        }
                        Text(
                            "${formatMoney(product.price)} ${localized("com_som")}",
                            color = palette.primary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 26.sp,
                        )
                    }
                }
                item {
                    Row(
                        Modifier
                            .padding(horizontal = 16.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(palette.surface2)
                            .padding(4.dp),
                    ) {
                        listOf("info" to localized("pd_info"), "reviews" to localized("pd_reviews")).forEach { (key, label) ->
                            Box(
                                Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (state.tab == key) palette.primary else Color.Transparent)
                                    .clickable { viewModel.setTab(key) }
                                    .padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(label, color = if (state.tab == key) Color.White else palette.textMuted, fontSize = 14.sp)
                            }
                        }
                    }
                }
                if (state.tab == "info") {
                    item {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Column(Modifier.clientCard(palette).padding(16.dp)) {
                                Text(localized("pd_desc"), color = palette.textMuted, fontSize = 12.sp)
                                Text(product.name, color = palette.text, fontSize = 14.sp)
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                InfoTile(localized("pd_brand"), product.brand.orEmpty(), Modifier.weight(1f))
                                InfoTile(localized("pd_category"), product.category.orEmpty(), Modifier.weight(1f))
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                InfoTile(localized("pd_stock"), "${product.stockBalance.toInt()} ${product.unit}", Modifier.weight(1f))
                                InfoTile(localized("pd_rating"), "4.5/5", Modifier.weight(1f))
                            }
                        }
                    }
                } else {
                    items(reviews) { review ->
                        Column(
                            Modifier
                                .padding(horizontal = 16.dp, vertical = 4.dp)
                                .clientCard(palette)
                                .padding(14.dp),
                        ) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(review.user, color = palette.text, fontWeight = FontWeight.SemiBold)
                                repeat(review.rating) { Icon(Icons.Default.Star, null, tint = palette.warning, modifier = Modifier.size(11.dp)) }
                            }
                            Text(review.comment, color = palette.textMuted, fontSize = 14.sp)
                            Text(review.date, color = palette.textMuted, fontSize = 11.sp)
                        }
                    }
                }
            }

            Row(
                Modifier
                    .fillMaxWidth()
                    .background(palette.navBg)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(
                    Modifier
                        .clip(RoundedCornerShape(14.dp))
                        .background(palette.surface2)
                        .padding(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Default.Remove, null, tint = palette.text, modifier = Modifier.clickable { viewModel.decQty() }.padding(8.dp))
                    Text(formatQty(state.qty), color = palette.text, modifier = Modifier.padding(horizontal = 12.dp))
                    Icon(Icons.Default.Add, null, tint = palette.text, modifier = Modifier.clickable { viewModel.incQty() }.padding(8.dp))
                }
                Box(
                    Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .background(palette.primary)
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
                    )
                }
            }
        }
    }
}

@Composable
private fun InfoTile(label: String, value: String, modifier: Modifier = Modifier) {
    val palette = rememberClientPalette()
    Column(modifier.clientCard(palette).padding(12.dp)) {
        Text(label, color = palette.textMuted, fontSize = 11.sp)
        Text(value, color = palette.text, fontSize = 13.sp)
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
