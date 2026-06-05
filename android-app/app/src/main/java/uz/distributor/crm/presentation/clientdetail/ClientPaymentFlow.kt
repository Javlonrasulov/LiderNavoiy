package uz.distributor.crm.presentation.clientdetail

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings

data class PaymentTerminal(
    val id: String,
    val name: String,
    val provider: String,
)

enum class PaymentMethod { CASH, CARD, TRANSFER }

enum class PaymentSheetStep {
    TYPE_SELECTION,
    TERMINAL_SELECTION,
    AMOUNT_ENTRY,
}

val defaultTerminals = listOf(
    PaymentTerminal("1", "Payme Terminal #1", "Payme"),
    PaymentTerminal("2", "Click Terminal #2", "Click"),
    PaymentTerminal("3", "Humo Terminal #3", "Xalq banki"),
    PaymentTerminal("4", "UzCard Terminal #4", "NBU"),
    PaymentTerminal("5", "Visa Terminal #5", "Kapitalbank"),
    PaymentTerminal("6", "Mastercard Terminal #6", "Kapitalbank"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientPaymentFlow(
    visible: Boolean,
    isDark: Boolean,
    lang: AppLanguage,
    onDismiss: () -> Unit,
    onPaymentCompleted: (Double, PaymentMethod, PaymentTerminal?) -> Unit,
) {
    if (!visible) return

    val sheetBg = if (isDark) Color(0xFF111827) else Color.White
    val cardBg = if (isDark) Color(0xFF1F2937) else Color(0xFFF9FAFB)
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val subColor = Color(0xFF9CA3AF)
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)

    var step by remember { mutableStateOf(PaymentSheetStep.TYPE_SELECTION) }
    var method by remember { mutableStateOf<PaymentMethod?>(null) }
    var terminal by remember { mutableStateOf<PaymentTerminal?>(null) }
    var amount by remember { mutableStateOf("") }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    fun resetAndDismiss() {
        step = PaymentSheetStep.TYPE_SELECTION
        method = null
        terminal = null
        amount = ""
        onDismiss()
    }

    ModalBottomSheet(
        onDismissRequest = ::resetAndDismiss,
        sheetState = sheetState,
        containerColor = sheetBg,
        dragHandle = {
            Box(
                Modifier
                    .padding(vertical = 12.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(if (isDark) Color(0xFF4B5563) else Color(0xFFD1D5DB)),
            )
        },
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            when (step) {
                PaymentSheetStep.TYPE_SELECTION -> {
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            AppStrings.selectPaymentType(lang),
                            modifier = Modifier.weight(1f),
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = titleColor,
                        )
                        IconButton(onClick = ::resetAndDismiss) {
                            Icon(Icons.Default.Close, null, tint = subColor)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    PaymentOptionRow(
                        icon = Icons.Default.Payments,
                        iconBg = Color(0xFFDCFCE7),
                        iconTint = Color(0xFF16A34A),
                        title = AppStrings.paymentCash(lang),
                        subtitle = AppStrings.paymentCashDesc(lang),
                        cardBg = cardBg,
                        borderColor = borderColor,
                        titleColor = titleColor,
                        subColor = subColor,
                        enabled = true,
                        onClick = {
                            method = PaymentMethod.CASH
                            step = PaymentSheetStep.AMOUNT_ENTRY
                        },
                    )
                    Spacer(Modifier.height(10.dp))
                    PaymentOptionRow(
                        icon = Icons.Default.CreditCard,
                        iconBg = Color(0xFFDBEAFE),
                        iconTint = Color(0xFF2563EB),
                        title = AppStrings.paymentCard(lang),
                        subtitle = AppStrings.paymentCardDesc(lang),
                        cardBg = cardBg,
                        borderColor = borderColor,
                        titleColor = titleColor,
                        subColor = subColor,
                        enabled = true,
                        onClick = {
                            method = PaymentMethod.CARD
                            step = PaymentSheetStep.TERMINAL_SELECTION
                        },
                    )
                    Spacer(Modifier.height(10.dp))
                    PaymentOptionRow(
                        icon = Icons.Default.SwapHoriz,
                        iconBg = Color(0xFFEDE9FE),
                        iconTint = Color(0xFF7C3AED),
                        title = AppStrings.paymentTransfer(lang),
                        subtitle = AppStrings.paymentTransferDesc(lang),
                        cardBg = cardBg,
                        borderColor = borderColor,
                        titleColor = titleColor,
                        subColor = subColor,
                        enabled = false,
                        onClick = {},
                    )
                }

                PaymentSheetStep.TERMINAL_SELECTION -> {
                    SheetHeader(
                        title = AppStrings.selectTerminal(lang),
                        isDark = isDark,
                        titleColor = titleColor,
                        subColor = subColor,
                        onBack = { step = PaymentSheetStep.TYPE_SELECTION },
                    )
                    Spacer(Modifier.height(12.dp))
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.heightIn(max = 420.dp),
                    ) {
                        items(defaultTerminals) { item ->
                            TerminalRow(
                                terminal = item,
                                cardBg = cardBg,
                                borderColor = borderColor,
                                titleColor = titleColor,
                                subColor = subColor,
                                onClick = {
                                    terminal = item
                                    step = PaymentSheetStep.AMOUNT_ENTRY
                                },
                            )
                        }
                    }
                }

                PaymentSheetStep.AMOUNT_ENTRY -> {
                    SheetHeader(
                        title = AppStrings.enterAmount(lang),
                        isDark = isDark,
                        titleColor = titleColor,
                        subColor = subColor,
                        onBack = {
                            amount = ""
                            step = when (method) {
                                PaymentMethod.CARD -> PaymentSheetStep.TERMINAL_SELECTION
                                else -> PaymentSheetStep.TYPE_SELECTION
                            }
                            if (method != PaymentMethod.CARD) terminal = null
                        },
                    )
                    Spacer(Modifier.height(16.dp))
                    SelectedMethodCard(
                        method = method,
                        terminal = terminal,
                        isDark = isDark,
                        lang = lang,
                        cardBg = cardBg,
                        titleColor = titleColor,
                        subColor = subColor,
                    )
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(
                        value = amount,
                        onValueChange = { v ->
                            if (v.isEmpty() || v.matches(Regex("^\\d*\\.?\\d{0,2}$"))) amount = v
                        },
                        modifier = Modifier.fillMaxWidth(),
                        textStyle = LocalTextStyle.current.copy(
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = titleColor,
                        ),
                        placeholder = {
                            Text("0", fontSize = 28.sp, color = subColor)
                        },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        shape = RoundedCornerShape(16.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF22C55E),
                            unfocusedBorderColor = borderColor,
                            focusedContainerColor = if (isDark) Color(0xFF1F2937) else Color.White,
                            unfocusedContainerColor = if (isDark) Color(0xFF1F2937) else Color.White,
                            cursorColor = Color(0xFF22C55E),
                        ),
                    )
                    Spacer(Modifier.height(20.dp))
                    Button(
                        onClick = {
                            val value = amount.toDoubleOrNull() ?: 0.0
                            if (value > 0 && method != null) {
                                onPaymentCompleted(value, method!!, terminal)
                                resetAndDismiss()
                            }
                        },
                        enabled = (amount.toDoubleOrNull() ?: 0.0) > 0,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF22C55E),
                            disabledContainerColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB),
                        ),
                    ) {
                        Text(AppStrings.confirm(lang), fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun SheetHeader(
    title: String,
    isDark: Boolean,
    titleColor: Color,
    subColor: Color,
    onBack: () -> Unit,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(if (isDark) Color(0xFF374151) else Color(0xFFF3F4F6))
                .clickable(onClick = onBack),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = subColor, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = titleColor)
    }
}

@Composable
private fun PaymentOptionRow(
    icon: ImageVector,
    iconBg: Color,
    iconTint: Color,
    title: String,
    subtitle: String,
    cardBg: Color,
    borderColor: Color,
    titleColor: Color,
    subColor: Color,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    val alpha = if (enabled) 1f else 0.45f
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(cardBg.copy(alpha = alpha))
            .border(1.dp, borderColor.copy(alpha = alpha), RoundedCornerShape(16.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(iconBg.copy(alpha = if (enabled) 1f else 0.6f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = iconTint, modifier = Modifier.size(22.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = titleColor.copy(alpha = alpha))
            Text(subtitle, fontSize = 13.sp, color = subColor.copy(alpha = alpha))
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = subColor.copy(alpha = alpha))
    }
}

@Composable
private fun TerminalRow(
    terminal: PaymentTerminal,
    cardBg: Color,
    borderColor: Color,
    titleColor: Color,
    subColor: Color,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(cardBg)
            .border(1.dp, borderColor, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFFDBEAFE).copy(alpha = 0.8f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Default.CreditCard, null, tint = Color(0xFF2563EB), modifier = Modifier.size(22.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(terminal.name, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = titleColor)
            Text(terminal.provider, fontSize = 13.sp, color = subColor)
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = subColor)
    }
}

@Composable
private fun SelectedMethodCard(
    method: PaymentMethod?,
    terminal: PaymentTerminal?,
    isDark: Boolean,
    lang: AppLanguage,
    cardBg: Color,
    titleColor: Color,
    subColor: Color,
) {
    val icon: ImageVector
    val iconBg: Color
    val iconTint: Color
    val title: String
    val subtitle: String
    when (method) {
        PaymentMethod.CASH -> {
            icon = Icons.Default.Payments
            iconBg = Color(0xFFDCFCE7)
            iconTint = Color(0xFF16A34A)
            title = AppStrings.paymentCash(lang)
            subtitle = AppStrings.paymentCashDesc(lang)
        }
        PaymentMethod.CARD -> {
            icon = Icons.Default.CreditCard
            iconBg = Color(0xFFDBEAFE)
            iconTint = Color(0xFF2563EB)
            title = AppStrings.paymentCard(lang)
            subtitle = terminal?.name ?: AppStrings.paymentCardDesc(lang)
        }
        else -> {
            icon = Icons.Default.SwapHoriz
            iconBg = Color(0xFFEDE9FE)
            iconTint = Color(0xFF7C3AED)
            title = AppStrings.paymentTransfer(lang)
            subtitle = AppStrings.paymentTransferDesc(lang)
        }
    }
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(cardBg)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(iconBg.copy(alpha = if (isDark) 0.35f else 1f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = iconTint, modifier = Modifier.size(22.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = titleColor)
            Text(subtitle, fontSize = 13.sp, color = subColor, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(22.dp))
    }
}
