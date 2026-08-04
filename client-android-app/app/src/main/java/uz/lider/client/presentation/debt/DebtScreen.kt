package uz.lider.client.presentation.debt

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import uz.lider.client.presentation.components.ClientPullToRefresh
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.FullScreenImageViewer
import uz.lider.client.presentation.components.PaymentPhotoCaptureSection
import uz.lider.client.presentation.components.SimpleAreaChart
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.dashboard.DashboardDateFilter
import uz.lider.client.presentation.dashboard.DashboardDateRangeDialog
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.PremiumHeaderButton
import uz.lider.client.presentation.theme.liquidGlassThemed
import androidx.compose.ui.platform.LocalContext

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
    val paymentPhotoSection by viewModel.paymentPhotoSection.collectAsState()
    val creditLimit = state.creditLimit
    val usedPct = if (creditLimit != null && creditLimit > 0) {
        (state.currentDebt / creditLimit).toFloat().coerceIn(0f, 1f)
    } else {
        0f
    }
    var showDatePicker by remember { mutableStateOf(false) }
    val periodLabel = DashboardDateFilter.formatRange(state.dateRange)

    DashboardDateRangeDialog(
        visible = showDatePicker,
        onDismiss = { showDatePicker = false },
        onApply = { start, end -> viewModel.setDateRange(start, end) },
        onClear = { viewModel.resetToLastMonth() },
        onSelectAll = { viewModel.selectAll() },
        initialStartMillis = DashboardDateFilter.toStartMillis(state.dateRange.start),
        initialEndMillis = DashboardDateFilter.toStartMillis(state.dateRange.end),
        dayAmounts = state.dayDebtAmounts,
        title = localized("dash_select_dates"),
        applyLabel = localized("dash_apply_dates"),
        cancelLabel = localized("com_cancel"),
    )

    ClientStackScaffold(
        title = localized("debt_title"),
        onBack = onBack,
        actions = {
            PremiumHeaderButton(
                icon = Icons.Outlined.CalendarMonth,
                onClick = { showDatePicker = true },
                contentDescription = localized("dash_select_dates"),
            )
        },
    ) { padding ->
        LiquidBackground(modifier = Modifier.fillMaxSize()) {
            if (state.loading) {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = LiquidGlass.Indigo)
                }
            } else {
                ClientPullToRefresh(
                    onRefresh = { viewModel.refresh() },
                    modifier = Modifier.padding(padding),
                ) {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    if (paymentPhotoSection.visible) {
                        item {
                            PaymentPhotoCaptureSection(
                                title = localized("pay_photo_alert_title"),
                                body = localized("pay_photo_alert_body"),
                                captureLabel = localized("pay_photo_capture"),
                                savedLabel = localized("pay_photo_saved"),
                                uploading = paymentPhotoSection.uploading,
                                error = paymentPhotoSection.error?.let { localized("pay_photo_upload_error") },
                                previewUrl = paymentPhotoSection.previewUrl,
                                onCapture = { viewModel.uploadPaymentProof(it) },
                                onDismiss = null,
                            )
                        }
                    }

                    if (state.dateRange.isCustom || state.filteredPayments.isNotEmpty()) {
                        item {
                            Box(
                                Modifier
                                    .clip(RoundedCornerShape(LiquidGlass.RadiusChip))
                                    .background(LiquidGlass.GradientPrimary)
                                    .clickable { showDatePicker = true }
                                    .padding(horizontal = 16.dp, vertical = 8.dp),
                            ) {
                                Text(
                                    periodLabel,
                                    color = LiquidGlass.TextWhite,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }

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
                                if (creditLimit != null && creditLimit > 0) {
                                    Spacer(Modifier.height(20.dp))
                                    Row(
                                        Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Text(
                                            "${localized("debt_credit_limit")}: ${formatMoney(creditLimit)}",
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
                    }

                    item {
                        Column(
                            Modifier
                                .fillMaxWidth()
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
                                "${formatMoney(state.totalPaid)} ${localized("com_som")}",
                                color = LiquidTheme.text,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }

                    if (state.chartValues.size >= 2) {
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
                                    periodLabel,
                                    color = LiquidTheme.textMuted,
                                    fontSize = 12.sp,
                                )
                                Spacer(Modifier.height(8.dp))
                                val chartStroke = if (LiquidTheme.isDark) Color(0xFFFF4D6D) else LiquidGlass.Rose
                                val chartFill = if (LiquidTheme.isDark) {
                                    Color(0xFFFF4D6D).copy(alpha = 0.35f)
                                } else {
                                    LiquidGlass.Rose.copy(alpha = 0.28f)
                                }
                                SimpleAreaChart(
                                    values = state.chartValues,
                                    strokeColor = chartStroke,
                                    fillColor = chartFill,
                                    heightDp = 130,
                                    labels = state.chartLabels,
                                    valueLabels = state.chartValueLabels.takeIf { it.isNotEmpty() },
                                    labelColor = if (LiquidTheme.isDark) {
                                        Color.White.copy(alpha = 0.65f)
                                    } else {
                                        LiquidTheme.textMuted
                                    },
                                    valueColor = chartStroke,
                                    showPoints = true,
                                )
                            }
                        }
                    }

                    item {
                        Text(
                            localized("debt_history"),
                            color = LiquidTheme.text,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp,
                        )
                    }

                    if (state.filteredPayments.isEmpty()) {
                        item {
                            Box(
                                Modifier
                                    .fillMaxWidth()
                                    .liquidGlassThemed()
                                    .padding(20.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    localized("debt_empty"),
                                    color = LiquidTheme.textMuted,
                                    fontSize = 14.sp,
                                )
                            }
                        }
                    } else {
                        items(state.filteredPayments) { payment ->
                            var previewUrl by remember(payment.id) { mutableStateOf<String?>(null) }
                            if (previewUrl != null) {
                                FullScreenImageViewer(
                                    imageUrl = previewUrl!!,
                                    contentDescription = localized("debt_payment"),
                                    onDismiss = { previewUrl = null },
                                )
                            }
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
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Box(
                                        Modifier
                                            .size(42.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(
                                                if (payment.isPayment)
                                                    LiquidGlass.Emerald.copy(alpha = 0.2f)
                                                else
                                                    LiquidGlass.Rose.copy(alpha = 0.2f),
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
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(payment.date, color = LiquidTheme.textMuted, fontSize = 12.sp)
                                        Text(
                                            localized(payment.typeKey),
                                            color = LiquidTheme.text,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                    }
                                    payment.photoUrl?.takeIf { it.isNotBlank() }?.let { url ->
                                        val ctx = LocalContext.current
                                        AsyncImage(
                                            model = ImageRequest.Builder(ctx)
                                                .data(url)
                                                .allowHardware(false)
                                                .crossfade(true)
                                                .build(),
                                            contentDescription = null,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier
                                                .size(44.dp)
                                                .clip(RoundedCornerShape(10.dp))
                                                .clickable { previewUrl = url },
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
                    }
                }
                }
            }
        }
    }
}
