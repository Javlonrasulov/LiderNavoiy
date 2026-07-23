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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Percent
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientPullToRefresh
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassThemed
import kotlinx.coroutines.delay

@Composable
fun PromotionsScreen(onBack: () -> Unit) {
    val lang = LocalAppLanguage.current
    var tab by remember { mutableIntStateOf(0) }
    val tabs = listOf(
        localized("promo_discounts"),
        localized("promo_bonus"),
        localized("promo_cashback"),
    )
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted

    ClientStackScaffold(title = localized("promo_title"), onBack = onBack) { padding ->
        LiquidBackground(modifier = Modifier.fillMaxSize()) {
            ClientPullToRefresh(
                onRefresh = { delay(450) },
                modifier = Modifier.padding(padding),
            ) {
            Column(Modifier.fillMaxSize()) {
                // ── Glass pill tab bar ────────────────────────────────────────
                Box(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .clip(RoundedCornerShape(50.dp))
                        .background(Color.White.copy(alpha = 0.10f))
                        .border(
                            1.dp,
                            Brush.linearGradient(
                                listOf(
                                    Color.White.copy(alpha = 0.30f),
                                    Color.White.copy(alpha = 0.08f),
                                )
                            ),
                            RoundedCornerShape(50.dp),
                        )
                        .padding(4.dp),
                ) {
                    Row(Modifier.fillMaxWidth()) {
                        tabs.forEachIndexed { index, label ->
                            Box(
                                Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(50.dp))
                                    .background(
                                        if (tab == index)
                                            Brush.linearGradient(
                                                listOf(
                                                    LiquidGlass.Indigo,
                                                    LiquidGlass.Violet,
                                                    LiquidGlass.Cyan,
                                                ),
                                                start = Offset(0f, 0f),
                                                end = Offset(Float.POSITIVE_INFINITY, 0f),
                                            )
                                        else
                                            Brush.linearGradient(
                                                listOf(Color.Transparent, Color.Transparent),
                                            )
                                    )
                                    .clickableNoRipple { tab = index }
                                    .padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    label,
                                    color = if (tab == index) Color.White else textMuted,
                                    fontSize = 12.sp,
                                    fontWeight = if (tab == index) FontWeight.SemiBold else FontWeight.Normal,
                                )
                            }
                        }
                    }
                }

                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    when (tab) {
                        0 -> items(discountPromos(lang)) { promo ->
                            PromoGradientCard(promo.title, promo.desc, promo.discount, promo.until)
                        }
                        1 -> {
                            item { BonusPointsCard("4,850") }
                            items(bonusPrograms(lang)) { program ->
                                GlassProgramCard(program.title, program.desc, program.active)
                            }
                        }
                        else -> {
                            item { CashbackHeroCard("125,000") }
                            item { CashbackRulesCard() }
                            item {
                                Column(
                                    Modifier
                                        .fillMaxWidth()
                                        .liquidGlassThemed()
                                        .padding(vertical = 4.dp),
                                ) {
                                    cashbackHistory().forEachIndexed { i, (date, amount) ->
                                        if (i > 0) {
                                            Box(
                                                Modifier
                                                    .fillMaxWidth()
                                                    .padding(horizontal = 16.dp)
                                                    .height(1.dp)
                                                    .background(Color.White.copy(alpha = 0.08f)),
                                            )
                                        }
                                        Row(
                                            Modifier
                                                .fillMaxWidth()
                                                .padding(horizontal = 16.dp, vertical = 14.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Text(date, color = textMuted)
                                            Text(
                                                amount,
                                                color = LiquidGlass.Emerald,
                                                fontWeight = FontWeight.Bold,
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
}

@Composable
private fun PromoGradientCard(title: String, desc: String, discount: String, until: String) {
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(LiquidGlass.RadiusCard))
            .background(
                Brush.linearGradient(
                    listOf(Color(0xFF4F46E5), LiquidGlass.Violet, Color(0xFF9333EA)),
                    start = Offset(0f, 0f),
                    end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
                )
            )
            .padding(20.dp),
    ) {
        Column {
            Text(title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Spacer(Modifier.height(4.dp))
            Text(desc, color = Color.White.copy(alpha = 0.80f), fontSize = 14.sp)
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .clip(RoundedCornerShape(50.dp))
                        .background(Color.White.copy(alpha = 0.22f))
                        .border(1.dp, Color.White.copy(alpha = 0.4f), RoundedCornerShape(50.dp))
                        .padding(horizontal = 12.dp, vertical = 5.dp),
                ) {
                    Text(discount, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                Text(
                    "${localized("promo_until")} $until",
                    color = Color.White.copy(alpha = 0.70f),
                    fontSize = 12.sp,
                )
            }
            Spacer(Modifier.height(12.dp))
            Box(
                Modifier
                    .clip(RoundedCornerShape(50.dp))
                    .background(Color.White.copy(alpha = 0.18f))
                    .border(1.dp, Color.White.copy(alpha = 0.5f), RoundedCornerShape(50.dp))
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

@Composable
private fun BonusPointsCard(points: String) {
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(LiquidGlass.RadiusCard))
            .background(
                Brush.linearGradient(
                    listOf(LiquidGlass.Indigo, LiquidGlass.Violet, LiquidGlass.Cyan),
                    start = Offset(0f, 0f),
                    end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
                )
            )
            .padding(24.dp),
    ) {
        Column {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.22f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.Star,
                        null,
                        tint = Color.White,
                        modifier = Modifier.size(15.dp),
                    )
                }
                Text(
                    localized("promo_your_points"),
                    color = Color.White.copy(alpha = 0.80f),
                    fontSize = 13.sp,
                )
            }
            Spacer(Modifier.height(8.dp))
            Text(
                points,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 44.sp,
                letterSpacing = (-1).sp,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                localized("promo_spend"),
                color = Color.White.copy(alpha = 0.75f),
                fontSize = 13.sp,
            )
        }
    }
}

@Composable
private fun GlassProgramCard(title: String, desc: String, active: Boolean) {
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    Row(
        Modifier
            .fillMaxWidth()
            .liquidGlassThemed()
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(
                    if (active)
                        Brush.linearGradient(listOf(LiquidGlass.Amber, LiquidGlass.Rose))
                    else
                        Brush.linearGradient(
                            listOf(
                                Color.White.copy(alpha = 0.15f),
                                Color.White.copy(alpha = 0.08f),
                            )
                        )
                ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Default.CardGiftcard,
                null,
                tint = if (active) Color.White else textMuted,
                modifier = Modifier.size(20.dp),
            )
        }
        Column(Modifier.weight(1f)) {
            Text(title, color = text, fontWeight = FontWeight.SemiBold)
            Text(desc, color = textMuted, fontSize = 13.sp)
        }
        Box(
            Modifier
                .clip(RoundedCornerShape(50.dp))
                .background(
                    if (active)
                        Brush.linearGradient(listOf(LiquidGlass.Emerald, LiquidGlass.Cyan))
                    else
                        Brush.linearGradient(
                            listOf(
                                Color.White.copy(alpha = 0.12f),
                                Color.White.copy(alpha = 0.06f),
                            )
                        )
                )
                .padding(horizontal = 10.dp, vertical = 5.dp),
        ) {
            Text(
                if (active) localized("promo_active") else localized("promo_inactive"),
                color = if (active) Color.White else textMuted,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun CashbackHeroCard(amount: String) {
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(LiquidGlass.RadiusCard))
            .background(
                Brush.linearGradient(
                    listOf(LiquidGlass.Emerald, LiquidGlass.Cyan, LiquidGlass.Indigo),
                    start = Offset(0f, 0f),
                    end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
                )
            )
            .padding(20.dp),
    ) {
        Column {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.22f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.Wallet,
                        null,
                        tint = Color.White,
                        modifier = Modifier.size(15.dp),
                    )
                }
                Text(
                    localized("promo_this_month"),
                    color = Color.White.copy(alpha = 0.80f),
                    fontSize = 13.sp,
                )
            }
            Spacer(Modifier.height(8.dp))
            Text(
                "$amount ${localized("com_som")}",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 32.sp,
            )
            Text(
                localized("promo_returned"),
                color = Color.White.copy(alpha = 0.75f),
                fontSize = 13.sp,
            )
        }
    }
}

@Composable
private fun CashbackRulesCard() {
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    Row(
        Modifier
            .fillMaxWidth()
            .liquidGlassThemed()
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(
                    Brush.linearGradient(listOf(LiquidGlass.Emerald, LiquidGlass.Cyan)),
                ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Default.Percent,
                null,
                tint = Color.White,
                modifier = Modifier.size(20.dp),
            )
        }
        Column {
            Text(
                localized("promo_rules"),
                color = text,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                "• 5% ${localized("promo_cashback")}",
                color = textMuted,
                fontSize = 13.sp,
            )
        }
    }
}

private data class PromoItem(val title: String, val desc: String, val discount: String, val until: String)
private data class ProgramItem(val title: String, val desc: String, val active: Boolean)

private fun discountPromos(lang: AppLanguage) = listOf(
    PromoItem(
        if (lang == AppLanguage.RU) "Летняя скидка" else if (lang == AppLanguage.EN) "Summer Sale" else "Yozgi chegirma",
        if (lang == AppLanguage.RU) "20% на Coca Cola" else "20% Coca Cola",
        uz.lider.client.localization.AppStrings.t(lang, "promo_discount_label") + " 20%",
        "30.06.2026",
    ),
    PromoItem("VIP Gold", if (lang == AppLanguage.RU) "12% на все" else "12% all", "12%", "31.12.2026"),
)

private fun bonusPrograms(lang: AppLanguage) = listOf(
    ProgramItem("Gold", if (lang == AppLanguage.RU) "Накопление баллов" else "Points program", true),
    ProgramItem("Silver", if (lang == AppLanguage.RU) "Базовая программа" else "Basic program", false),
)

private fun cashbackHistory() = listOf("05.06.2026" to "+12,500", "28.05.2026" to "+8,200")

private fun Modifier.clickableNoRipple(onClick: () -> Unit) =
    then(Modifier.clickable(onClick = onClick))
