package uz.distributor.crm.presentation.delivery

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.navigation.bottomNavHeight
import java.text.DecimalFormat

private val Accent = Color(0xFF6366F1)
private val StatusOnWay = Color(0xFFF59E0B)
private val StatusDone = Color(0xFF22C55E)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryOrderDetailScreen(
    onBack: () -> Unit,
    viewModel: DeliveryOrderDetailViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val state by viewModel.uiState.collectAsState()
    val formatter = remember { DecimalFormat("#,###") }
    val bg = if (isDark) Color(0xFF0E1621) else Color(0xFFF3F4F6)
    val textPrimary = if (isDark) Color.White else Color.Black
    val textMuted = if (isDark) Color(0xFF8E9BA7) else Color(0xFF6B7280)
    val chipBg = if (isDark) Color(0xFF17212B) else Color.White
    val bottomPad = bottomNavHeight()
    val context = LocalContext.current

    var showDeliverSheet by remember { mutableStateOf(false) }
    var showCollectSheet by remember { mutableStateOf(false) }
    var showDueSheet by remember { mutableStateOf(false) }
    var showReturnSheet by remember { mutableStateOf(false) }
    var snack by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(state.doneAndLeave) {
        if (state.doneAndLeave) onBack()
    }

    LaunchedEffect(state.successMessage) {
        when (state.successMessage) {
            "ok" -> {
                snack = AppStrings.deliveryPaymentOk(lang)
                showDeliverSheet = false
                showCollectSheet = false
                viewModel.clearMessages()
            }
            "due" -> {
                snack = AppStrings.deliveryDueUpdated(lang)
                showDueSheet = false
                viewModel.clearMessages()
            }
            "return" -> {
                snack = AppStrings.deliveryReturnRequested(lang)
                showReturnSheet = false
                viewModel.clearMessages()
            }
        }
    }

    LaunchedEffect(state.error) {
        state.error?.let {
            snack = it
            viewModel.clearMessages()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        AppStrings.deliveryOrderDetailTitle(lang),
                        fontWeight = FontWeight.SemiBold,
                        color = textPrimary,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = null,
                            tint = textPrimary,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = if (isDark) Color(0xFF17212B) else Color.White,
                ),
            )
        },
        containerColor = bg,
        snackbarHost = {
            snack?.let { msg ->
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { snack = null }) {
                            Text("OK")
                        }
                    },
                ) { Text(msg) }
            }
        },
    ) { padding ->
        when {
            state.isLoading -> {
                Box(
                    Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = Accent)
                }
            }
            state.order == null -> {
                Box(
                    Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(AppStrings.noDeliveryOrders(lang), color = textMuted)
                }
            }
            else -> {
                val order = state.order!!
                val isOnWay = order.status == "on_way"
                val statusColor = if (isOnWay) StatusOnWay else StatusDone
                val statusLabel = if (isOnWay) {
                    AppStrings.deliveryStatusOnWay(lang)
                } else {
                    AppStrings.deliveryStatusDelivered(lang)
                }
                val canNavigate =
                    (order.clientLatitude != null && order.clientLongitude != null) ||
                        !order.clientAddress.isNullOrBlank()
                val name = order.clientName ?: AppStrings.clientFallback(lang)
                val remaining = order.remainingBalance

                Column(
                    Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp)
                        .padding(top = 16.dp)
                        .padding(bottom = bottomPad + 24.dp),
                ) {
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                name,
                                fontWeight = FontWeight.Bold,
                                fontSize = 22.sp,
                                color = textPrimary,
                            )
                            if (!order.clientCode.isNullOrBlank()) {
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    "${AppStrings.deliveryOrderCode(lang)}: ${order.clientCode}",
                                    color = textMuted,
                                    fontSize = 13.sp,
                                )
                            }
                        }
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(statusColor.copy(alpha = 0.15f))
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                        ) {
                            Text(
                                statusLabel,
                                color = statusColor,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }

                    Spacer(Modifier.height(18.dp))

                    if (!order.clientAddress.isNullOrBlank()) {
                        DetailRow(
                            icon = Icons.Default.Place,
                            label = AppStrings.deliveryAddressLabel(lang),
                            value = order.clientAddress!!,
                            textPrimary = textPrimary,
                            textMuted = textMuted,
                            chipBg = chipBg,
                        )
                        Spacer(Modifier.height(10.dp))
                    }

                    if (!order.clientPhone.isNullOrBlank()) {
                        DetailRow(
                            icon = Icons.Default.Phone,
                            label = AppStrings.deliveryPhoneLabel(lang),
                            value = order.clientPhone!!,
                            textPrimary = textPrimary,
                            textMuted = textMuted,
                            chipBg = chipBg,
                            onClick = {
                                context.startActivity(
                                    Intent(Intent.ACTION_DIAL, Uri.parse("tel:${order.clientPhone}")),
                                )
                            },
                        )
                        Spacer(Modifier.height(10.dp))
                    }

                    Spacer(Modifier.height(6.dp))
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(Accent.copy(alpha = 0.08f))
                            .padding(16.dp),
                    ) {
                        Column {
                            Text(
                                AppStrings.deliveryTotalLabel(lang),
                                color = textMuted,
                                fontSize = 12.sp,
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "${formatter.format(order.totalAmount)} ${AppStrings.sumCurrency(lang)}",
                                fontWeight = FontWeight.Bold,
                                fontSize = 24.sp,
                                color = textPrimary,
                            )
                            if (order.paidAmount > 0 || remaining > 0) {
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    "${AppStrings.deliveryRemaining(lang)}: ${formatter.format(remaining)} ${AppStrings.sumCurrency(lang)}",
                                    color = textMuted,
                                    fontSize = 13.sp,
                                )
                            }
                        }
                    }

                    if (order.items.isNotEmpty()) {
                        Spacer(Modifier.height(20.dp))
                        Text(
                            AppStrings.deliveryProductsLabel(lang),
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                            color = textPrimary,
                        )
                        Spacer(Modifier.height(10.dp))
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(chipBg)
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                        ) {
                            order.items.forEachIndexed { index, item ->
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.Top,
                                ) {
                                    Text(
                                        item.productName,
                                        color = textPrimary,
                                        fontSize = 14.sp,
                                        modifier = Modifier.weight(1f),
                                    )
                                    Spacer(Modifier.width(12.dp))
                                    Text(
                                        "${formatter.format(item.quantity)} ${item.unit}",
                                        color = textMuted,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                    )
                                }
                                if (index < order.items.lastIndex) {
                                    HorizontalDivider(color = textMuted.copy(alpha = 0.12f))
                                }
                            }
                        }
                    }

                    Spacer(Modifier.height(22.dp))

                    if (isOnWay) {
                        Button(
                            onClick = { showDeliverSheet = true },
                            colors = ButtonDefaults.buttonColors(containerColor = StatusDone),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(vertical = 14.dp),
                        ) {
                            Text(
                                AppStrings.deliveryMarkDelivered(lang),
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp,
                            )
                        }
                        Spacer(Modifier.height(10.dp))
                    }

                    if (order.needsPaymentFollowUp) {
                        Button(
                            onClick = { showCollectSheet = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Accent),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(vertical = 14.dp),
                        ) {
                            Text(
                                AppStrings.deliveryCollectPayment(lang),
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp,
                            )
                        }
                        Spacer(Modifier.height(10.dp))
                        OutlinedButton(
                            onClick = { showDueSheet = true },
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(vertical = 14.dp),
                        ) {
                            Text(
                                AppStrings.deliveryChangeDue(lang),
                                color = Accent,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp,
                            )
                        }
                        Spacer(Modifier.height(10.dp))
                    }

                    if (order.items.isNotEmpty()) {
                        OutlinedButton(
                            onClick = { showReturnSheet = true },
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(vertical = 14.dp),
                        ) {
                            Text(
                                AppStrings.deliveryReturnTitle(lang),
                                color = Color(0xFFEF4444),
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp,
                            )
                        }
                        Spacer(Modifier.height(10.dp))
                    }

                    if (canNavigate) {
                        Button(
                            onClick = { openNavigation(context, order) },
                            colors = ButtonDefaults.buttonColors(containerColor = Accent),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(vertical = 14.dp),
                        ) {
                            Icon(
                                Icons.Default.Navigation,
                                null,
                                modifier = Modifier.size(20.dp),
                                tint = Color.White,
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                AppStrings.deliveryNavigate(lang),
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp,
                            )
                        }
                        Spacer(Modifier.height(10.dp))
                    }

                    if (!order.clientPhone.isNullOrBlank()) {
                        OutlinedButton(
                            onClick = {
                                context.startActivity(
                                    Intent(Intent.ACTION_DIAL, Uri.parse("tel:${order.clientPhone}")),
                                )
                            },
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(vertical = 14.dp),
                        ) {
                            Icon(
                                Icons.Default.Phone,
                                null,
                                modifier = Modifier.size(18.dp),
                                tint = Accent,
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                AppStrings.deliveryCallClient(lang),
                                color = Accent,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp,
                            )
                        }
                    }
                }

                DeliveryPaymentSheet(
                    visible = showDeliverSheet,
                    mode = DeliveryPayMode.DELIVER,
                    isDark = isDark,
                    lang = lang,
                    remaining = remaining,
                    terminals = state.terminals,
                    isSubmitting = state.isSubmitting,
                    onDismiss = { showDeliverSheet = false },
                    onSubmit = { method, terminalId, amount, dueAt, photoUri ->
                        viewModel.deliver(method, terminalId, amount, dueAt, photoUri)
                    },
                )

                DeliveryPaymentSheet(
                    visible = showCollectSheet,
                    mode = DeliveryPayMode.COLLECT,
                    isDark = isDark,
                    lang = lang,
                    remaining = remaining,
                    terminals = state.terminals,
                    isSubmitting = state.isSubmitting,
                    onDismiss = { showCollectSheet = false },
                    onSubmit = { method, terminalId, amount, dueAt, photoUri ->
                        val amt = amount ?: remaining
                        viewModel.collectPayment(method, terminalId, amt, dueAt, photoUri)
                    },
                )

                DeliveryDueAtSheet(
                    visible = showDueSheet,
                    isDark = isDark,
                    lang = lang,
                    isSubmitting = state.isSubmitting,
                    onDismiss = { showDueSheet = false },
                    onSubmit = { viewModel.updateDueAt(it) },
                )

                DeliveryReturnSheet(
                    visible = showReturnSheet,
                    isDark = isDark,
                    lang = lang,
                    items = order.items,
                    isSubmitting = state.isSubmitting,
                    onDismiss = { showReturnSheet = false },
                    onSubmit = { items, note -> viewModel.createReturn(items, note) },
                )
            }
        }
    }
}

@Composable
private fun DetailRow(
    icon: ImageVector,
    label: String,
    value: String,
    textPrimary: Color,
    textMuted: Color,
    chipBg: Color,
    onClick: (() -> Unit)? = null,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(chipBg)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(Accent.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = Accent, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(label, color = textMuted, fontSize = 11.sp)
            Spacer(Modifier.height(2.dp))
            Text(value, color = textPrimary, fontSize = 14.sp, fontWeight = FontWeight.Medium)
        }
    }
}
