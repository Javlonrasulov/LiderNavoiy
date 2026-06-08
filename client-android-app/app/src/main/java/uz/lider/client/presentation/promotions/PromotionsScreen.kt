package uz.lider.client.presentation.promotions

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.clientCard
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.rememberClientPalette

@Composable
fun PromotionsScreen(onBack: () -> Unit) {
    val lang = LocalAppLanguage.current
    val palette = rememberClientPalette()
    var tab by remember { mutableIntStateOf(0) }
    val tabs = listOf(localized("promo_discounts"), localized("promo_bonus"), localized("promo_cashback"))

    ClientStackScaffold(title = localized("promo_title"), onBack = onBack) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(
                Modifier
                    .padding(16.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(palette.surface2)
                    .padding(4.dp),
            ) {
                tabs.forEachIndexed { index, label ->
                    Box(
                        Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (tab == index) palette.primary else Color.Transparent)
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            label,
                            color = if (tab == index) Color.White else palette.textMuted,
                            fontSize = 12.sp,
                            modifier = Modifier.clickableNoRipple { tab = index },
                        )
                    }
                }
            }
            LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                when (tab) {
                    0 -> items(discountPromos(lang)) { promo ->
                        PromoGradientCard(promo.title, promo.desc, promo.discount, promo.until)
                    }
                    1 -> {
                        item { BonusPointsCard("4,850") }
                        items(bonusPrograms(lang)) { program ->
                            ProgramCard(program.title, program.desc, program.active)
                        }
                    }
                    else -> {
                        item { CashbackSummaryCard("125,000") }
                        item { RulesCard() }
                        items(cashbackHistory()) { item ->
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .clientCard(palette)
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(item.first, color = palette.text)
                                Text(item.second, color = palette.success, fontWeight = FontWeight.Bold)
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
            .clip(RoundedCornerShape(16.dp))
            .background(Brush.linearGradient(listOf(Color(0xFF7C4DFF), Color(0xFFFF4DFF))))
            .padding(16.dp),
    ) {
        Column {
            Text(title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text(desc, color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
            Spacer(Modifier.height(8.dp))
            Text("$discount • ${localized("promo_until")} $until", color = Color.White, fontSize = 12.sp)
            Spacer(Modifier.height(8.dp))
            Box(Modifier.clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = 0.2f)).padding(horizontal = 16.dp, vertical = 8.dp)) {
                Text(localized("promo_use_now"), color = Color.White, fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun BonusPointsCard(points: String) {
    val palette = rememberClientPalette()
    Column(Modifier.clientCard(palette).padding(16.dp)) {
        Text(localized("promo_your_points"), color = palette.textMuted, fontSize = 12.sp)
        Text(points, color = palette.primary, fontWeight = FontWeight.Bold, fontSize = 32.sp)
        Text(localized("promo_spend"), color = palette.secondary, fontSize = 13.sp)
    }
}

@Composable
private fun ProgramCard(title: String, desc: String, active: Boolean) {
    val palette = rememberClientPalette()
    Column(Modifier.clientCard(palette).padding(14.dp)) {
        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Text(title, color = palette.text, fontWeight = FontWeight.SemiBold)
            Text(if (active) localized("promo_active") else localized("promo_inactive"), color = if (active) palette.success else palette.textMuted, fontSize = 12.sp)
        }
        Text(desc, color = palette.textMuted, fontSize = 13.sp)
    }
}

@Composable
private fun CashbackSummaryCard(amount: String) {
    val palette = rememberClientPalette()
    Column(Modifier.clientCard(palette).padding(16.dp)) {
        Text(localized("promo_this_month"), color = palette.textMuted, fontSize = 12.sp)
        Text("$amount ${localized("com_som")} ${localized("promo_returned")}", color = palette.text, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun RulesCard() {
    val palette = rememberClientPalette()
    Column(Modifier.clientCard(palette).padding(14.dp)) {
        Text(localized("promo_rules"), color = palette.text, fontWeight = FontWeight.SemiBold)
        Text("• 5% ${localized("promo_cashback")}", color = palette.textMuted, fontSize = 13.sp)
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
