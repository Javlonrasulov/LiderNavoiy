package uz.distributor.crm.presentation.delivery

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
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
import androidx.compose.ui.platform.LocalContext
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
                    if (state.orders.isNotEmpty()) {
                        Text(
                            "${state.orders.size}",
                            color = Color(0xFF6366F1),
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            modifier = Modifier.padding(end = 4.dp),
                        )
                    }
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
                            modifier = Modifier.size(56.dp),
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
    val context = LocalContext.current
    val isOnWay = order.status == "on_way"
    val statusColor = if (isOnWay) Color(0xFFF59E0B) else Color(0xFF22C55E)
    val statusLabel = if (isOnWay) {
        AppStrings.deliveryStatusOnWay(lang)
    } else {
        AppStrings.deliveryStatusDelivered(lang)
    }

    val hasCoords = order.clientLatitude != null && order.clientLongitude != null
    val hasAddress = !order.clientAddress.isNullOrBlank()
    val canNavigate = hasCoords || hasAddress

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = cardBg),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            // Sarlavha + status
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

            // Manzil — bosilganda navigatsiya
            if (hasCoords || hasAddress) {
                Spacer(Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.Top,
                    modifier = if (canNavigate) {
                        Modifier.clickable {
                            val uri = if (hasCoords) {
                                // Koordinata bilan — aniq GPS manzil
                                Uri.parse("geo:${order.clientLatitude},${order.clientLongitude}?q=${order.clientLatitude},${order.clientLongitude}(${Uri.encode(order.clientName ?: "")})")
                            } else {
                                // Faqat matn manzil
                                Uri.parse("geo:0,0?q=${Uri.encode(order.clientAddress!!)}")
                            }
                            val intent = Intent(Intent.ACTION_VIEW, uri)
                            intent.setPackage("com.google.android.apps.maps")
                            if (intent.resolveActivity(context.packageManager) != null) {
                                context.startActivity(intent)
                            } else {
                                // Google Maps o'rnatilmagan — boshqa xarita app
                                context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                            }
                        }
                    } else Modifier,
                ) {
                    Icon(
                        Icons.Default.Place,
                        null,
                        tint = if (canNavigate) Color(0xFF6366F1) else textMuted,
                        modifier = Modifier.size(16.dp).padding(top = 2.dp),
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        order.clientAddress ?: "",
                        color = if (canNavigate) Color(0xFF6366F1) else textMuted,
                        fontSize = 13.sp,
                    )
                }
            }

            if (!order.clientPhone.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable {
                        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${order.clientPhone}"))
                        context.startActivity(intent)
                    },
                ) {
                    Icon(
                        Icons.Default.Phone,
                        null,
                        tint = Color(0xFF6366F1),
                        modifier = Modifier.size(14.dp),
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        order.clientPhone,
                        color = Color(0xFF6366F1),
                        fontSize = 13.sp,
                    )
                }
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
                order.items.take(5).forEach { item ->
                    Text(
                        "• ${item.productName} × ${formatter.format(item.quantity)} ${item.unit}",
                        color = textMuted,
                        fontSize = 12.sp,
                    )
                }
                if (order.items.size > 5) {
                    Text(
                        "+${order.items.size - 5} ${AppStrings.items(lang)}",
                        color = textMuted,
                        fontSize = 12.sp,
                    )
                }
            }

            // Navigator tugmasi
            if (canNavigate) {
                Spacer(Modifier.height(12.dp))
                Divider(color = textMuted.copy(alpha = 0.15f))
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        val uri = if (hasCoords) {
                            Uri.parse("google.navigation:q=${order.clientLatitude},${order.clientLongitude}&mode=d")
                        } else {
                            Uri.parse("google.navigation:q=${Uri.encode(order.clientAddress!!)}&mode=d")
                        }
                        val intent = Intent(Intent.ACTION_VIEW, uri)
                        intent.setPackage("com.google.android.apps.maps")
                        if (intent.resolveActivity(context.packageManager) != null) {
                            context.startActivity(intent)
                        } else {
                            // Fallback: Yandex Navigator yoki boshqa maps
                            val fallback = if (hasCoords) {
                                Uri.parse("yandexnavi://build_route_on_map?lat_to=${order.clientLatitude}&lon_to=${order.clientLongitude}")
                            } else {
                                Uri.parse("geo:0,0?q=${Uri.encode(order.clientAddress!!)}")
                            }
                            try {
                                context.startActivity(Intent(Intent.ACTION_VIEW, fallback))
                            } catch (_: Exception) {
                                // Hech qanday navigator yo'q — oddiy maps ochiladi
                                context.startActivity(
                                    Intent(
                                        Intent.ACTION_VIEW,
                                        Uri.parse("https://maps.google.com/?q=${order.clientLatitude ?: ""},${order.clientLongitude ?: ""}"),
                                    ),
                                )
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(vertical = 10.dp),
                ) {
                    Icon(
                        Icons.Default.Navigation,
                        null,
                        modifier = Modifier.size(18.dp),
                        tint = Color.White,
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        AppStrings.deliveryNavigate(lang),
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                    )
                }
            }
        }
    }
}
