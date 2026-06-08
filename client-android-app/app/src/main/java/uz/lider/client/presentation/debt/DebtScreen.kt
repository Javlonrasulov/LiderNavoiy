package uz.lider.client.presentation.debt

import androidx.compose.foundation.background
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
import uz.lider.client.presentation.components.HorizontalProgressBar
import uz.lider.client.presentation.components.SimpleAreaChart
import uz.lider.client.presentation.components.clientCard
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.rememberClientPalette

private val debtChart = listOf(4.2f, 3.8f, 5.1f, 2.9f, 3.2f, 2.5f)

@Composable
fun DebtScreen(
    onBack: () -> Unit,
    viewModel: DebtViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val palette = rememberClientPalette()
    val usedPct = (state.currentDebt / state.creditLimit).toFloat().coerceIn(0f, 1f)
    val history = listOf(
        DebtPayment("05.06.2026", "1,500,000", localized("debt_payment"), true),
        DebtPayment("28.05.2026", "2,000,000", localized("debt_payment"), true),
        DebtPayment("20.05.2026", "800,000", localized("debt_added"), false),
        DebtPayment("15.05.2026", "3,200,000", localized("debt_payment"), true),
    )

    ClientStackScaffold(title = localized("debt_title"), onBack = onBack) { padding ->
        if (state.loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = palette.primary)
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(24.dp))
                            .background(Brush.linearGradient(listOf(Color(0xFFFF4D6D), Color(0xFFFF4DFF), Color(0xFF7C4DFF))))
                            .padding(20.dp),
                    ) {
                        Column {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Column {
                                    Text(localized("debt_current"), color = Color.White.copy(alpha = 0.7f), fontSize = 13.sp)
                                    Text(
                                        "${formatMoney(state.currentDebt)} ${localized("com_som")}",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 28.sp,
                                    )
                                }
                                Icon(Icons.Default.CreditCard, null, tint = Color.White, modifier = Modifier.size(28.dp))
                            }
                            Spacer(Modifier.height(16.dp))
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("${localized("debt_credit_limit")}: ${formatMoney(state.creditLimit)}", color = Color.White.copy(alpha = 0.7f), fontSize = 11.sp)
                                Text("${(usedPct * 100).toInt()}% ${localized("debt_used")}", color = Color.White.copy(alpha = 0.7f), fontSize = 11.sp)
                            }
                            HorizontalProgressBar(usedPct, Color.White, Color.White.copy(alpha = 0.2f))
                        }
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Column(Modifier.weight(1f).clientCard(palette).padding(16.dp)) {
                            Icon(Icons.Default.CheckCircle, null, tint = palette.success)
                            Text(localized("debt_total_paid"), color = palette.textMuted, fontSize = 12.sp)
                            Text("${(state.totalPaid / 1_000_000).toString().take(4)}M ${localized("com_som")}", color = palette.text, fontWeight = FontWeight.Bold)
                        }
                        Column(Modifier.weight(1f).clientCard(palette).padding(16.dp)) {
                            Icon(Icons.Default.Schedule, null, tint = palette.warning)
                            Text(localized("debt_due_date"), color = palette.textMuted, fontSize = 12.sp)
                            Text(state.dueDate, color = palette.warning, fontWeight = FontWeight.Bold)
                            Text("${state.daysLeft} ${localized("debt_days_left")}", color = palette.textMuted, fontSize = 11.sp)
                        }
                    }
                }
                item {
                    Column(Modifier.clientCard(palette).padding(16.dp)) {
                        Text(localized("debt_dynamics"), color = palette.text, fontWeight = FontWeight.SemiBold)
                        Text(localized("debt_last_months"), color = palette.textMuted, fontSize = 12.sp)
                        SimpleAreaChart(debtChart, palette.danger, palette.danger.copy(alpha = 0.3f), heightDp = 120)
                    }
                }
                item {
                    Text(localized("debt_history"), color = palette.text, fontWeight = FontWeight.SemiBold)
                }
                items(history) { payment ->
                    Row(
                        Modifier.clientCard(palette).padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(payment.date, color = palette.textMuted, fontSize = 12.sp)
                            Text(payment.type, color = palette.text, fontWeight = FontWeight.SemiBold)
                        }
                        Text(
                            "${if (payment.isPayment) "-" else "+"}${payment.amount} ${localized("com_som")}",
                            color = if (payment.isPayment) palette.success else palette.danger,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
                item {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(palette.primary)
                            .padding(vertical = 16.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(localized("debt_pay_btn"), color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
