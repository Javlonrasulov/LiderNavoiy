package uz.distributor.crm.presentation.delivery

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Refresh
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
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.navigation.bottomNavHeight
import java.text.DecimalFormat

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryOrdersScreen(
    viewModel: DeliveryOrdersViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val state by viewModel.uiState.collectAsState()
    val formatter = remember { DecimalFormat("#,###") }
    val bg = if (isDark) Color(0xFF0E1621) else Color(0xFFF3F4F6)
    val cardBg = if (isDark) Color(0xFF17212B) else Color.White
    val textPrimary = if (isDark) Color.White else Color.Black
    val textMuted = if (isDark) Color(0xFF8E9BA7) else Color(0xFF6B7280)
    val bottomPad = bottomNavHeight()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        AppStrings.deliveryOrdersTitle(lang),
                        fontWeight = FontWeight.SemiBold,
                        color = textPrimary,
                    )
                },
                actions = {
                    IconButton(onClick = viewModel::load) {
                        Icon(Icons.Default.Refresh, contentDescription = null, tint = textPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = if (isDark) Color(0xFF17212B) else Color.White,
                ),
            )
        },
        containerColor = bg,
    ) { padding ->
        Box(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(bottom = bottomPad),
        ) {
            when {
                state.isLoading -> {
                    CircularProgressIndicator(
                        Modifier.align(Alignment.Center),
                        color = Color(0xFF6366F1),
                    )
                }
                state.orders.isEmpty() -> {
                    Column(
                        Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Icon(
                            Icons.Default.LocalShipping,
                            null,
                            tint = textMuted,
                            modifier = Modifier.size(48.dp),
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            AppStrings.noDeliveryOrders(lang),
                            color = textMuted,
                            fontSize = 15.sp,
                        )
                    }
                }
                else -> {
                    LazyColumn(
                        Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(state.orders, key = { it.id }) { order ->
                            DeliveryOrderCard(
                                order = order,
                                formatter = formatter,
                                cardBg = cardBg,
                                textPrimary = textPrimary,
                                textMuted = textMuted,
                                lang = lang,
                            )
                        }
                    }
                }
            }

            state.error?.let { err ->
                Snackbar(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp),
                    action = {
                        TextButton(onClick = viewModel::clearError) {
                            Text("OK")
                        }
                    },
                ) {
                    Text(AppStrings.apiError(lang, err))
                }
            }
        }
    }
}

@Composable
private fun DeliveryOrderCard(
    order: OrderDto,
    formatter: DecimalFormat,
    cardBg: Color,
    textPrimary: Color,
    textMuted: Color,
    lang: AppLanguage,
) {
    val isOnWay = order.status == "on_way"
    val statusColor = if (isOnWay) Color(0xFFF59E0B) else Color(0xFF22C55E)
    val statusLabel = if (isOnWay) {
        AppStrings.deliveryStatusOnWay(lang)
    } else {
        AppStrings.deliveryStatusDelivered(lang)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = cardBg),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    order.clientName ?: AppStrings.clientFallback(lang),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    color = textPrimary,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    statusLabel,
                    color = statusColor,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            if (!order.clientCode.isNullOrBlank()) {
                Spacer(Modifier.height(2.dp))
                Text(order.clientCode, color = textMuted, fontSize = 12.sp)
            }
            if (!order.clientAddress.isNullOrBlank()) {
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.Top) {
                    Icon(
                        Icons.Default.Place,
                        null,
                        tint = textMuted,
                        modifier = Modifier.size(16.dp).padding(top = 1.dp),
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(order.clientAddress, color = textMuted, fontSize = 13.sp)
                }
            }
            if (!order.clientPhone.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(order.clientPhone, color = textMuted, fontSize = 13.sp)
            }
            Spacer(Modifier.height(10.dp))
            Text(
                "${formatter.format(order.totalAmount)} ${AppStrings.sumCurrency(lang)}",
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                color = textPrimary,
            )
            if (order.items.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                order.items.take(4).forEach { item ->
                    Text(
                        "• ${item.productName} × ${formatter.format(item.quantity)} ${item.unit}",
                        color = textMuted,
                        fontSize = 12.sp,
                    )
                }
                if (order.items.size > 4) {
                    Text(
                        "+${order.items.size - 4} ${AppStrings.items(lang)}",
                        color = textMuted,
                        fontSize = 12.sp,
                    )
                }
            }
        }
    }
}
