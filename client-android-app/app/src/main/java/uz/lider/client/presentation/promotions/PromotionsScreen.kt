package uz.lider.client.presentation.promotions

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientPullToRefresh
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassThemed
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun PromotionsScreen(
    onBack: () -> Unit,
    onUseNow: () -> Unit = {},
    viewModel: PromotionsViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val promoState by viewModel.uiState.collectAsState()
    val textMuted = LiquidTheme.textMuted

    ClientStackScaffold(title = localized("promo_title"), onBack = onBack) { padding ->
        LiquidBackground(modifier = Modifier.fillMaxSize()) {
            ClientPullToRefresh(
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.padding(padding),
            ) {
                if (!promoState.loading && !promoState.canSeePromotions) {
                    Box(
                        Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            localized("promo_disabled"),
                            color = textMuted,
                            fontSize = 15.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        )
                    }
                } else {
                    val promos = promoState.promotions
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        if (promos.isEmpty() && !promoState.loading) {
                            item {
                                Box(
                                    Modifier
                                        .fillMaxWidth()
                                        .liquidGlassThemed()
                                        .padding(24.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        localized("promo_empty"),
                                        color = textMuted,
                                        fontSize = 14.sp,
                                    )
                                }
                            }
                        } else {
                            items(promos, key = { it.id }) { promo ->
                                PromoGradientCard(
                                    title = promo.title,
                                    desc = promo.subtitle.ifBlank {
                                        promo.productName?.let { name ->
                                            if (promo.discountPercent > 0) {
                                                "$name — ${promo.discountPercent.toInt()}%"
                                            } else name
                                        }.orEmpty()
                                    },
                                    discount = if (promo.discountPercent > 0) {
                                        "${uz.lider.client.localization.AppStrings.t(lang, "promo_discount_label")} ${promo.discountPercent.toInt()}%"
                                    } else "",
                                    until = formatPromoRange(promo.validFrom, promo.validTo),
                                    colorStart = parseHexColor(promo.colorStart, Color(0xFF4F46E5)),
                                    colorEnd = parseHexColor(promo.colorEnd, Color(0xFF9333EA)),
                                    onUseNow = onUseNow,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PromoGradientCard(
    title: String,
    desc: String,
    discount: String,
    until: String,
    colorStart: Color = Color(0xFF4F46E5),
    colorEnd: Color = Color(0xFF9333EA),
    onUseNow: () -> Unit = {},
) {
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(LiquidGlass.RadiusCard))
            .background(
                Brush.linearGradient(
                    listOf(colorStart, colorEnd),
                    start = Offset(0f, 0f),
                    end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
                )
            )
            .padding(20.dp),
    ) {
        Column {
            Text(title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            if (desc.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(desc, color = Color.White.copy(alpha = 0.80f), fontSize = 14.sp)
            }
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (discount.isNotBlank()) {
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(50.dp))
                            .background(Color.White.copy(alpha = 0.22f))
                            .border(1.dp, Color.White.copy(alpha = 0.4f), RoundedCornerShape(50.dp))
                            .padding(horizontal = 12.dp, vertical = 5.dp),
                    ) {
                        Text(discount, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                } else {
                    Spacer(Modifier.width(1.dp))
                }
                if (until.isNotBlank()) {
                    Text(
                        until,
                        color = Color.White.copy(alpha = 0.70f),
                        fontSize = 12.sp,
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
            Box(
                Modifier
                    .clip(RoundedCornerShape(50.dp))
                    .background(Color.White.copy(alpha = 0.18f))
                    .border(1.dp, Color.White.copy(alpha = 0.5f), RoundedCornerShape(50.dp))
                    .clickableNoRipple(onClick = onUseNow)
                    .padding(horizontal = 20.dp, vertical = 10.dp),
            ) {
                Text(
                    localized("promo_use_now"),
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

private fun formatPromoDate(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    return try {
        val instant = Instant.parse(iso)
        DateTimeFormatter.ofPattern("dd.MM.yyyy")
            .withZone(ZoneId.systemDefault())
            .format(instant)
    } catch (_: Exception) {
        iso.take(10).let { raw ->
            val parts = raw.split("-")
            if (parts.size == 3) "${parts[2]}.${parts[1]}.${parts[0]}" else raw
        }
    }
}

private fun formatPromoRange(fromIso: String?, toIso: String?): String {
    val from = formatPromoDate(fromIso)
    val to = formatPromoDate(toIso)
    return when {
        from.isNotBlank() && to.isNotBlank() -> "$from — $to"
        to.isNotBlank() -> to
        from.isNotBlank() -> from
        else -> ""
    }
}

private fun parseHexColor(hex: String, fallback: Color): Color {
    val cleaned = hex.trim().removePrefix("#")
    return try {
        when (cleaned.length) {
            6 -> Color(("FF$cleaned").toLong(16))
            8 -> Color(cleaned.toLong(16))
            else -> fallback
        }
    } catch (_: Exception) {
        fallback
    }
}

private fun Modifier.clickableNoRipple(onClick: () -> Unit) =
    then(Modifier.clickable(onClick = onClick))
