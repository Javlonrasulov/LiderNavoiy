package uz.distributor.crm.presentation.order

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinSubpageHeader
import uz.distributor.crm.presentation.theme.sherinPageBackground
import java.text.DecimalFormat

@Composable
fun OrderSummaryScreen(
    clientId: String,
    onBack: () -> Unit,
    onDone: () -> Unit,
    viewModel: OrderViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val fmt = remember { DecimalFormat("#,###") }
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f

    val pageBg = sherinPageBackground(isDark)
    val cardBg = if (isDark) SherinColors.CardRowDark else Color.White
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val subColor = Color(0xFF9CA3AF)
    val cartBarBg = if (isDark) SherinColors.CardDark else Color.White

    if (state.submitted) {
        Box(
            Modifier.fillMaxSize().background(pageBg),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(64.dp))
                Spacer(Modifier.height(16.dp))
                Text(
                    AppStrings.orderSent(lang),
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    color = titleColor,
                )
                Spacer(Modifier.height(24.dp))
                Button(
                    onClick = onDone,
                    colors = ButtonDefaults.buttonColors(containerColor = SherinColors.Primary),
                ) {
                    Text(AppStrings.backToHome(lang))
                }
            }
        }
        return
    }

    Column(modifier = Modifier.fillMaxSize().background(pageBg)) {
        SherinSubpageHeader(
            title = AppStrings.order(lang),
            isDark = isDark,
            onBack = onBack,
            trailing = { Spacer(Modifier.width(40.dp)) },
        )

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(state.items) { item ->
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = cardBg),
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                item.productName,
                                fontWeight = FontWeight.Medium,
                                fontSize = 14.sp,
                                color = titleColor,
                            )
                            Text(
                                "${item.quantity} ${item.unit} × ${fmt.format(item.price.toLong())}",
                                fontSize = 12.sp,
                                color = subColor,
                            )
                        }
                        Text(
                            "${fmt.format((item.price * item.quantity).toLong())}",
                            fontWeight = FontWeight.Bold,
                            color = titleColor,
                        )
                    }
                }
            }
        }

        Surface(shadowElevation = 8.dp, color = cartBarBg) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${AppStrings.total(lang)}:", fontSize = 16.sp, color = titleColor)
                    Text(
                        "${fmt.format(state.total.toLong())} ${AppStrings.sumCurrency(lang)}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp,
                        color = titleColor,
                    )
                }
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = { viewModel.submit(clientId, onDone) },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    enabled = !state.isSubmitting,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SherinColors.Primary),
                ) {
                    if (state.isSubmitting) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    } else {
                        Text(AppStrings.confirm(lang), fontSize = 16.sp)
                    }
                }
            }
        }
    }
}
