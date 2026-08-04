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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.presentation.components.ClientPullToRefresh
import uz.lider.client.presentation.components.FullScreenImageViewer
import uz.lider.client.presentation.components.ProductImageBox
import uz.lider.client.presentation.components.formatQty
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.shareText
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.PremiumHeaderButton
import uz.lider.client.presentation.theme.liquidGlassThemed

@Composable
fun ProductDetailScreen(
    productId: String,
    onBack: () -> Unit,
    onOpenCart: () -> Unit,
    viewModel: ProductDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
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
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            )
        } else {
            val product = state.product!!
            val image = viewModel.resolveImage(product.imageUrl).takeIf { it.isNotBlank() }
            val inCart = viewModel.isInCart()
            val shareTitle = localized("pd_share")
            val codeLabel = localized("pd_code")
            val somLabel = localized("com_som")

            val navBottomPad = WindowInsets.navigationBars
                .asPaddingValues()
                .calculateBottomPadding()
                .coerceAtLeast(48.dp)
            ClientPullToRefresh(onRefresh = { viewModel.refresh(productId) }) {
            LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 120.dp + navBottomPad),
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
                            modifier = Modifier
                                .fillMaxSize()
                                .then(
                                    if (image != null) {
                                        Modifier.clickable { viewModel.openFullImage() }
                                    } else {
                                        Modifier
                                    },
                                ),
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
                            "${product.code} • ${product.category.orEmpty()}",
                            color = textMuted,
                            fontSize = 12.sp,
                        )
                        Text(
                            product.name,
                            color = text,
                            fontWeight = FontWeight.Bold,
                            fontSize = 22.sp,
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            localized("pd_your_rating"),
                            color = textMuted,
                            fontSize = 12.sp,
                        )
                        Spacer(Modifier.height(4.dp))
                        StarRatingInput(
                            rating = state.userRating,
                            onRate = viewModel::setRating,
                        )
                        if (state.userRating == null) {
                            Text(
                                localized("pd_rate_hint"),
                                color = textMuted,
                                fontSize = 11.sp,
                            )
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
                    Column(
                        Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            localized("pd_info"),
                            color = text,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                        )
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
                            InfoTile(
                                localized("pd_rating"),
                                state.userRating?.let { "$it/5" } ?: "—",
                                Modifier.weight(1f),
                            )
                        }
                    }
                }
            }
            }

            GlassHeaderRow(
                onBack = onBack,
                liked = state.liked,
                onToggleLike = { viewModel.toggleLike() },
                onShare = {
                    val shareBody = buildString {
                        appendLine(product.name)
                        appendLine("$codeLabel: ${product.code}")
                        append("${formatMoney(product.price)} $somLabel")
                    }
                    shareText(
                        context = context,
                        subject = product.name,
                        text = shareBody,
                        chooserTitle = shareTitle,
                    )
                },
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            )

            if (state.showFullImage && image != null) {
                FullScreenImageViewer(
                    imageUrl = image,
                    contentDescription = product.name,
                    onDismiss = viewModel::closeFullImage,
                )
            }

            Box(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, LiquidGlass.BgDark.copy(alpha = 0.97f)),
                        ),
                    )
                    .padding(top = 16.dp, start = 16.dp, end = 16.dp, bottom = 16.dp + navBottomPad),
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
    onShare: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PremiumHeaderButton(
            icon = Icons.AutoMirrored.Filled.ArrowBack,
            onClick = onBack,
            tint = LiquidGlass.Indigo,
            contentDescription = localized("com_back"),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PremiumHeaderButton(
                icon = Icons.Default.Share,
                onClick = onShare,
                contentDescription = localized("pd_share"),
            )
            PremiumHeaderButton(
                icon = if (liked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                onClick = onToggleLike,
                tint = if (liked) LiquidGlass.Rose else LiquidGlass.TextDark,
                contentDescription = null,
            )
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

@Composable
private fun StarRatingInput(
    rating: Int?,
    onRate: (Int) -> Unit,
) {
    val muted = LiquidTheme.textMuted
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        (1..5).forEach { star ->
            val filled = rating != null && star <= rating
            Icon(
                Icons.Default.Star,
                contentDescription = null,
                tint = if (filled) LiquidGlass.Amber else muted.copy(alpha = 0.35f),
                modifier = Modifier
                    .size(28.dp)
                    .clickable { onRate(star) },
            )
        }
        if (rating != null) {
            Text(
                "$rating/5",
                color = LiquidGlass.Amber,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                modifier = Modifier.padding(start = 4.dp, top = 6.dp),
            )
        }
    }
}
