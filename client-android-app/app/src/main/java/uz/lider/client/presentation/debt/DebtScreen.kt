package uz.lider.client.presentation.debt

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.SimpleAreaChart
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassThemed

private val debtChart = listOf(4.2f, 3.8f, 5.1f, 2.9f, 3.2f, 2.5f)

private val debtHeroGradient = Brush.linearGradient(
    listOf(
        Color(0xFF9F1239),
        Color(0xFFBE123C),
        Color(0xFFE11D48),
        Color(0xFFFB7185),
    )
)

@Composable
fun DebtScreen(
    onBack: () -> Unit,
    viewModel: DebtViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val usedPct = (state.currentDebt / state.creditLimit).toFloat().coerceIn(0f, 1f)
    val history = listOf(
        DebtPayment("05.06.2026", "1,500,000", localized("debt_payment"), true),
        DebtPayment("28.05.2026", "2,000,000", localized("debt_payment"), true),
        DebtPayment("20.05.2026", "800,000", localized("debt_added"), false),
        DebtPayment("15.05.2026", "3,200,000", localized("debt_payment"), true),
    )

    ClientStackScaffold(title = localized("debt_title"), onBack = onBack) { padding ->
        LiquidBackground(modifier = Modifier.fillMaxSize()) {
            if (state.loading) {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = LiquidGlass.Indigo)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    // Gradient hero debt card (red/rose)
                    item {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(LiquidGlass.RadiusCard))
                                .background(debtHeroGradient)
                                .padding(20.dp),
                        ) {
                            Column {
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Column {
                                        Text(
                                            localized("debt_current"),
                                            color = Color.White.copy(alpha = 0.75f),
                                            fontSize = 13.sp,
                                        )
                                        Text(
                                            "${formatMoney(state.currentDebt)} ${localized("com_som")}",
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 28.sp,
                                        )
                                    }
                                    Box(
                                        Modifier
                                            .size(50.dp)
                                            .clip(RoundedCornerShape(14.dp))
                                            .background(Color.White.copy(alpha = 0.2f)),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(
                                            Icons.Default.CreditCard,
                                            null,
                                            tint = Color.White,
                                            modifier = Modifier.size(26.dp),
                                        )
                                    }
                                }
                                Spacer(Modifier.height(20.dp))
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text(
                                        "${localized("debt_credit_limit")}: ${formatMoney(state.creditLimit)}",
                                        color = Color.White.copy(alpha = 0.75f),
                                        fontSize = 11.sp,
                                    )
                                    Text(
                                        "${(usedPct * 100).toInt()}% ${localized("debt_used")}",
                                        color = Color.White.copy(alpha = 0.75f),
                                        fontSize = 11.sp,
                                    )
                                }
                                Spacer(Modifier.height(8.dp))
                                // Glass progress bar with gradient fill
                                Box(
                                    Modifier
                                        .fillMaxWidth()
                                        .height(7.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(Color.White.copy(alpha = 0.25f)),
                                ) {
                                    Box(
                                        Modifier
                                            .fillMaxWidth(usedPct)
                                            .fillMaxHeight()
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(Color.White),
                                    )
                                }
                            }
                        }
                    }

                    // Info mini glass cards
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Column(
                                Modifier
                                    .weight(1f)
                                    .liquidGlassThemed()
                                    .padding(16.dp),
                            ) {
                                Box(
                                    Modifier
                                        .size(38.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(LiquidGlass.Emerald.copy(alpha = 0.22f)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        null,
                                        tint = LiquidGlass.Emerald,
                                        modifier = Modifier.size(20.dp),
                                    )
                                }
                                Spacer(Modifier.height(8.dp))
                                Text(localized("debt_total_paid"), color = LiquidTheme.textMuted, fontSize = 12.sp)
                                Text(
                                    "${(state.totalPaid / 1_000_000).toString().take(4)}M ${localized("com_som")}",
                                    color = LiquidTheme.text,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                            Column(
                                Modifier
                                    .weight(1f)
                                    .liquidGlassThemed()
                                    .padding(16.dp),
                            ) {
                                Box(
                                    Modifier
                                        .size(38.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(LiquidGlass.Amber.copy(alpha = 0.22f)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        Icons.Default.Schedule,
                                        null,
                                        tint = LiquidGlass.Amber,
                                        modifier = Modifier.size(20.dp),
                                    )
                                }
                                Spacer(Modifier.height(8.dp))
                                Text(localized("debt_due_date"), color = LiquidTheme.textMuted, fontSize = 12.sp)
                                Text(state.dueDate, color = LiquidGlass.Amber, fontWeight = FontWeight.Bold)
                                Text(
                                    "${state.daysLeft} ${localized("debt_days_left")}",
                                    color = LiquidTheme.textMuted,
                                    fontSize = 11.sp,
                                )
                            }
                        }
                    }

                    // Debt dynamics area chart — glass container
                    item {
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .liquidGlassThemed()
                                .padding(16.dp),
                        ) {
                            Text(
                                localized("debt_dynamics"),
                                color = LiquidTheme.text,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                localized("debt_last_months"),
                                color = LiquidTheme.textMuted,
                                fontSize = 12.sp,
                            )
                            Spacer(Modifier.height(8.dp))
                            SimpleAreaChart(
                                values = debtChart,
                                strokeColor = LiquidGlass.Rose,
                                fillColor = LiquidGlass.Rose.copy(alpha = 0.30f),
                                heightDp = 120,
                            )
                        }
                    }

                    // History section header
                    item {
                        Text(
                            localized("debt_history"),
                            color = LiquidTheme.text,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp,
                        )
                    }

                    // History items — glass cards
                    items(history) { payment ->
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .liquidGlassThemed()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Box(
                                    Modifier
                                        .size(42.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(
                                            if (payment.isPayment)
                                                LiquidGlass.Emerald.copy(alpha = 0.2f)
                                            else
                                                LiquidGlass.Rose.copy(alpha = 0.2f)
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        if (payment.isPayment) Icons.Default.CheckCircle else Icons.Default.CreditCard,
                                        null,
                                        tint = if (payment.isPayment) LiquidGlass.Emerald else LiquidGlass.Rose,
                                        modifier = Modifier.size(20.dp),
                                    )
                                }
                                Column {
                                    Text(payment.date, color = LiquidTheme.textMuted, fontSize = 12.sp)
                                    Text(
                                        payment.type,
                                        color = LiquidTheme.text,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                }
                            }
                            Text(
                                "${if (payment.isPayment) "-" else "+"}${payment.amount} ${localized("com_som")}",
                                color = if (payment.isPayment) LiquidGlass.Emerald else LiquidGlass.Rose,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }

                    // Pay button — gradient pill
                    item {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(LiquidGlass.RadiusChip))
                                .background(LiquidGlass.GradientPrimary)
                                .padding(vertical = 16.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                localized("debt_pay_btn"),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                            )
                        }
                    }
                }
            }
        }
    }
}
