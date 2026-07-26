package uz.distributor.crm.presentation.order

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Schedule
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
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import java.text.DecimalFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientOrdersScreen(
    onBack: () -> Unit,
    viewModel: ClientOrdersViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val state by viewModel.uiState.collectAsState()
    val formatter = remember { DecimalFormat("#,###") }
    val bg = if (isDark) Color(0xFF0E1621) else Color(0xFFF3F4F6)
    val cardBg = if (isDark) Color(0xFF17212B) else Color.White
    val textPrimary = if (isDark) Color.White else Color.Black
    val textMuted = if (isDark) Color(0xFF8E9BA7) else Color(0xFF6B7280)

    LaunchedEffect(state.successMessage) {
        if (state.successMessage != null) {
            kotlinx.coroutines.delay(2000)
            viewModel.clearFeedback()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        AppStrings.clientOrdersTitle(lang),
                        fontWeight = FontWeight.SemiBold,
                        color = textPrimary,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = textPrimary)
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
                .padding(padding),
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
                            AppStrings.noClientOrders(lang),
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
                            ClientOrderCard(
                                order = order,
                                formatter = formatter,
                                cardBg = cardBg,
                                textPrimary = textPrimary,
                                textMuted = textMuted,
                                isDark = isDark,
                                sending = state.sendingId == order.id,
                                onSend = { urgent -> viewModel.sendToWarehouse(order.id, urgent) },
                                onReject = { viewModel.rejectOrder(order.id) },
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
                        TextButton(onClick = viewModel::clearFeedback) {
                            Text("OK")
                        }
                    },
                ) {
                    Text(AppStrings.apiError(lang, err))
                }
            }
            if (state.successMessage != null) {
                Snackbar(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp),
                ) {
                    Text(
                        if (state.successMessage == "rejected") {
                            AppStrings.orderRejected(lang)
                        } else {
                            AppStrings.orderSentToWarehouse(lang)
                        },
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ClientOrderCard(
    order: OrderDto,
    formatter: DecimalFormat,
    cardBg: Color,
    textPrimary: Color,
    textMuted: Color,
    isDark: Boolean,
    sending: Boolean,
    onSend: (isUrgent: Boolean) -> Unit,
    onReject: () -> Unit,
    lang: uz.distributor.crm.localization.AppLanguage,
) {
    var isUrgent by remember(order.id) { mutableStateOf(false) }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = cardBg,
        shadowElevation = if (isDark) 0.dp else 4.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        order.clientName ?: AppStrings.clientFallback(lang),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                        color = textPrimary,
                    )
                    if (!order.clientCode.isNullOrBlank()) {
                        Text("#${order.clientCode}", fontSize = 12.sp, color = textMuted)
                    }
                    order.clientAddress?.takeIf { it.isNotBlank() }?.let {
                        Spacer(Modifier.height(2.dp))
                        Text(it, fontSize = 12.sp, color = textMuted, maxLines = 2)
                    }
                }
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (isDark) Color(0xFF242F3D) else Color(0xFFF3F4F6),
                ) {
                    Row(
                        Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(
                            Icons.Default.Schedule,
                            contentDescription = AppStrings.orderPlacedAt(lang),
                            tint = if (isDark) Color(0xFF94A3B8) else Color(0xFF4B5563),
                            modifier = Modifier.size(13.dp),
                        )
                        Text(
                            formatOrderTime(order.createdAt, lang),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isDark) Color(0xFFE2E8F0) else Color(0xFF374151),
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))
            HorizontalDivider(color = if (isDark) Color(0xFF242F3D) else Color(0xFFF3F4F6))
            Spacer(Modifier.height(8.dp))

            order.items.forEach { item ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(vertical = 3.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        "${item.productName} × ${item.quantity.toInt()}",
                        modifier = Modifier.weight(1f),
                        fontSize = 13.sp,
                        color = textPrimary,
                        maxLines = 1,
                    )
                    Text(
                        formatter.format((item.price * item.quantity).toLong()),
                        fontSize = 13.sp,
                        color = textMuted,
                    )
                }
            }

            Spacer(Modifier.height(10.dp))
            Text(
                "${AppStrings.total(lang)}: ${formatter.format(order.totalAmount.toLong())} ${AppStrings.sumCurrency(lang)}",
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                color = textPrimary,
            )

            Spacer(Modifier.height(10.dp))
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                color = if (isUrgent) {
                    if (isDark) Color(0x33EF4444) else Color(0x14EF4444)
                } else {
                    if (isDark) Color(0xFF1E2A36) else Color(0xFFF9FAFB)
                },
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (isUrgent) Color(0x59EF4444) else {
                        if (isDark) Color(0xFF242F3D) else Color(0xFFE5E7EB)
                    },
                ),
                onClick = { if (!sending) isUrgent = !isUrgent },
            ) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Checkbox(
                        checked = isUrgent,
                        onCheckedChange = { if (!sending) isUrgent = it },
                        enabled = !sending,
                        colors = CheckboxDefaults.colors(
                            checkedColor = Color(0xFFEF4444),
                            uncheckedColor = textMuted,
                        ),
                    )
                    Text(
                        AppStrings.urgentOrder(lang),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isUrgent) Color(0xFFEF4444) else textPrimary,
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            Spacer(Modifier.height(10.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick = onReject,
                    enabled = !sending,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp),
                ) {
                    Text(AppStrings.rejectOrder(lang), fontSize = 13.sp)
                }
                Button(
                    onClick = { onSend(isUrgent) },
                    enabled = !sending,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isUrgent) Color(0xFFEF4444) else Color(0xFF6366F1),
                    ),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp),
                ) {
                    if (sending) {
                        CircularProgressIndicator(
                            Modifier.size(16.dp),
                            color = Color.White,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text(AppStrings.sendToWarehouse(lang), fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

private fun formatOrderTime(
    iso: String,
    lang: uz.distributor.crm.localization.AppLanguage,
): String {
    return try {
        val zone = ZoneId.systemDefault()
        val instant = Instant.parse(iso)
        val zoned = instant.atZone(zone)
        val time = DateTimeFormatter.ofPattern("HH:mm").format(zoned)
        val today = LocalDate.now(zone)
        val orderDate = zoned.toLocalDate()
        when {
            orderDate == today -> "${AppStrings.orderTimeToday(lang)}, $time"
            orderDate == today.minusDays(1) -> "${AppStrings.orderTimeYesterday(lang)}, $time"
            else -> DateTimeFormatter.ofPattern("dd.MM, HH:mm").format(zoned)
        }
    } catch (_: Exception) {
        iso.take(16)
    }
}
