package uz.distributor.crm.presentation.vansales

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import uz.distributor.crm.presentation.delivery.DeliveryPayMode
import uz.distributor.crm.presentation.delivery.DeliveryPaymentSheet

private val VanAccent = Color(0xFF0EA5E9)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VanClientSaleScreen(
    onBack: () -> Unit,
    onDone: () -> Unit,
    viewModel: VanClientSaleViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val state by viewModel.uiState.collectAsState()
    val bg = if (isDark) Color(0xFF0E1621) else Color(0xFFF3F4F6)
    val cardBg = if (isDark) Color(0xFF17212B) else Color.White
    val textPrimary = if (isDark) Color.White else Color.Black
    val textMuted = if (isDark) Color(0xFF8E9BA7) else Color(0xFF6B7280)
    var showPay by remember { mutableStateOf(false) }

    LaunchedEffect(state.done) {
        if (state.done) onDone()
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        state.client?.name ?: AppStrings.vanSaleTitle(lang),
                        fontWeight = FontWeight.Bold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = bg),
            )
        },
        bottomBar = {
            val total = state.cart.sumOf { it.qty * it.price }
            Column(
                Modifier
                    .fillMaxWidth()
                    .background(if (isDark) Color(0xFF111827) else Color.White)
                    .padding(16.dp),
            ) {
                Text(
                    "${AppStrings.totalSales(lang)}: ${total.toLong()}",
                    fontWeight = FontWeight.Bold,
                    color = textPrimary,
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { showPay = true },
                    enabled = state.cart.isNotEmpty() && !state.isSubmitting,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = VanAccent),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Text(AppStrings.vanSendSale(lang))
                }
            }
        },
        containerColor = bg,
    ) { padding ->
        Box(
            Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.isLoading -> CircularProgressIndicator(
                    Modifier.align(Alignment.Center),
                    color = VanAccent,
                )
                state.stockItems.isEmpty() -> Text(
                    AppStrings.vanNoStock(lang),
                    Modifier.align(Alignment.Center),
                    color = textMuted,
                )
                else -> LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(state.stockItems, key = { it.productId }) { item ->
                        val line = state.cart.find { it.productId == item.productId }
                        val qty = line?.qty ?: 0.0
                        Card(
                            colors = CardDefaults.cardColors(containerColor = cardBg),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        item.productName ?: "—",
                                        color = textPrimary,
                                        fontWeight = FontWeight.Medium,
                                    )
                                    Text(
                                        "${AppStrings.vanRemaining(lang)}: ${item.remainingQty} ${item.unit ?: ""}",
                                        fontSize = 12.sp,
                                        color = textMuted,
                                    )
                                }
                                IconButton(
                                    onClick = {
                                        viewModel.setQty(
                                            productId = item.productId,
                                            qty = qty - 1,
                                            name = item.productName ?: "",
                                            unit = item.unit ?: "dona",
                                            price = item.price,
                                            max = item.remainingQty,
                                        )
                                    },
                                    enabled = qty > 0,
                                ) {
                                    Icon(Icons.Default.Remove, null, tint = textMuted)
                                }
                                Text(
                                    qty.toInt().toString(),
                                    fontWeight = FontWeight.Bold,
                                    color = textPrimary,
                                    modifier = Modifier.width(28.dp),
                                )
                                IconButton(
                                    onClick = {
                                        viewModel.setQty(
                                            productId = item.productId,
                                            qty = qty + 1,
                                            name = item.productName ?: "",
                                            unit = item.unit ?: "dona",
                                            price = item.price,
                                            max = item.remainingQty,
                                        )
                                    },
                                    enabled = qty < item.remainingQty,
                                ) {
                                    Icon(Icons.Default.Add, null, tint = VanAccent)
                                }
                            }
                        }
                    }
                }
            }

            if (state.error != null) {
                Snackbar(
                    Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp),
                    action = {
                        Text(
                            AppStrings.refresh(lang),
                            Modifier.padding(8.dp),
                            color = Color.White,
                        )
                    },
                ) {
                    Text(state.error ?: "")
                }
            }
        }
    }

    val total = state.cart.sumOf { it.qty * it.price }
    DeliveryPaymentSheet(
        visible = showPay,
        mode = DeliveryPayMode.DELIVER,
        isDark = isDark,
        lang = lang,
        remaining = total,
        terminals = state.terminals,
        isSubmitting = state.isSubmitting,
        submitError = state.error,
        onDismiss = {
            showPay = false
            viewModel.clearMessages()
        },
        onSubmit = { method, terminalId, amount, dueAt, photoUri ->
            viewModel.submit(method, terminalId, amount, dueAt, photoUri)
            showPay = false
        },
    )
}
