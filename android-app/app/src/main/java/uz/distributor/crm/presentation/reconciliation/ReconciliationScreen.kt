package uz.distributor.crm.presentation.reconciliation

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.data.remote.dto.ReconciliationLineDto
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.sherinPageBackground
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReconciliationScreen(
    clientId: String,
    clientName: String,
    onBack: () -> Unit,
    viewModel: ReconciliationViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val fmt = remember { reconciliationAmountFormat() }
    val displayDateFmt = remember { SimpleDateFormat("dd.MM.yyyy", Locale.getDefault()) }

    var showDatePicker by remember { mutableStateOf(false) }
    var expandedLines by remember { mutableStateOf(setOf<Int>()) }

    LaunchedEffect(clientId) { viewModel.init(clientId, clientName) }

    val pageBg = sherinPageBackground(isDark)
    val cardBg = if (isDark) SherinColors.CardRowDark else Color.White
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val subColor = Color(0xFF9CA3AF)
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    val teal = Color(0xFF14B8A6)

    val dateRangeText = "${displayDateFmt.format(Date(state.fromMillis))}  ${displayDateFmt.format(Date(state.toMillis))}"

    if (showDatePicker) {
        val pickerState = rememberDateRangePickerState(
            initialSelectedStartDateMillis = state.fromMillis,
            initialSelectedEndDateMillis = state.toMillis,
        )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        val start = pickerState.selectedStartDateMillis
                        val end = pickerState.selectedEndDateMillis
                        if (start != null && end != null) {
                            viewModel.setDateRange(start, end)
                        }
                        showDatePicker = false
                    },
                ) {
                    Text(AppStrings.applyDateRange(lang))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) {
                    Text(AppStrings.msgCancel(lang))
                }
            },
        ) {
            DateRangePicker(
                state = pickerState,
                title = {
                    Text(
                        AppStrings.selectDateRange(lang),
                        modifier = Modifier.padding(start = 24.dp, top = 16.dp),
                    )
                },
            )
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(pageBg),
    ) {
        Surface(color = if (isDark) SherinColors.CardDark else Color.White, shadowElevation = 1.dp) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 12.dp)
                    .padding(top = 28.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = titleColor)
                }
                Text(
                    state.clientName.ifBlank { clientName }.uppercase(),
                    modifier = Modifier.weight(1f),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = titleColor,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.width(48.dp))
            }
        }

        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                dateRangeText,
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { showDatePicker = true }
                    .padding(vertical = 4.dp),
                color = teal,
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
            )
            RefreshStatusIcon(
                state = state.refreshState,
                tint = teal,
                onClick = { viewModel.refresh() },
            )
        }

        Box(Modifier.weight(1f).fillMaxWidth()) {
        when {
            state.isLoading && state.data == null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SherinColors.Primary)
                }
            }
            state.error != null && state.data == null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(AppStrings.apiError(lang, state.error!!), color = subColor)
                }
            }
            state.data != null -> {
                val data = state.data!!
                Column(
                    Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp),
                ) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = cardBg,
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, borderColor, RoundedCornerShape(12.dp)),
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Text(
                                AppStrings.reconciliationDocTitle(lang),
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = titleColor,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth(),
                            )
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "${AppStrings.periodLabel(lang)} : ${data.from}  ${data.to}",
                                fontSize = 13.sp,
                                color = subColor,
                                modifier = Modifier.fillMaxWidth(),
                                textAlign = TextAlign.Center,
                            )
                            Spacer(Modifier.height(12.dp))
                            Row(Modifier.fillMaxWidth()) {
                                Text(
                                    "${data.clientCode} — ${data.clientName}",
                                    modifier = Modifier.weight(1f),
                                    fontSize = 12.sp,
                                    color = titleColor,
                                    fontWeight = FontWeight.Medium,
                                )
                                data.companyName?.let {
                                    Text(it, fontSize = 11.sp, color = subColor, textAlign = TextAlign.End)
                                }
                            }
                            Spacer(Modifier.height(12.dp))
                            HorizontalDivider(color = borderColor)
                            Spacer(Modifier.height(8.dp))

                            TableHeader(lang, subColor)
                            HorizontalDivider(color = borderColor, modifier = Modifier.padding(vertical = 4.dp))

                            data.lines.forEachIndexed { index, line ->
                                ReconciliationTableRow(
                                    line = line,
                                    fmt = fmt,
                                    titleColor = titleColor,
                                    subColor = subColor,
                                    expanded = expandedLines.contains(index),
                                    onToggleExpand = {
                                        expandedLines = if (expandedLines.contains(index)) {
                                            expandedLines - index
                                        } else {
                                            expandedLines + index
                                        }
                                    },
                                )
                                if (line.expandable && expandedLines.contains(index)) {
                                    line.items?.forEach { item ->
                                        Text(
                                            "  • ${item.productName} — ${item.quantity} × ${fmt.format(item.price)}",
                                            fontSize = 11.sp,
                                            color = subColor,
                                            modifier = Modifier.padding(start = 28.dp, bottom = 4.dp),
                                        )
                                    }
                                }
                                if (!line.isSummary && !line.isClosing) {
                                    HorizontalDivider(color = borderColor.copy(alpha = 0.5f))
                                }
                            }

                            Spacer(Modifier.height(12.dp))
                            val debt = data.closingBalance.coerceAtLeast(0.0)
                            if (debt > 0) {
                                Text(
                                    AppStrings.debtAmount(lang, fmt.format(debt)),
                                    color = Color(0xFFEF4444),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    modifier = Modifier.fillMaxWidth(),
                                    textAlign = TextAlign.End,
                                )
                            }
                        }
                    }
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
        }
    }
}

@Composable
private fun RefreshStatusIcon(
    state: RefreshUiState,
    tint: Color,
    onClick: () -> Unit,
) {
    IconButton(onClick = onClick, enabled = state != RefreshUiState.LOADING) {
        when (state) {
            RefreshUiState.LOADING -> {
                CircularProgressIndicator(
                    modifier = Modifier.size(22.dp),
                    strokeWidth = 2.dp,
                    color = tint,
                )
            }
            RefreshUiState.SUCCESS -> {
                Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(26.dp))
            }
            RefreshUiState.IDLE -> {
                Icon(Icons.Default.Refresh, null, tint = tint, modifier = Modifier.size(26.dp))
            }
        }
    }
}

@Composable
private fun TableHeader(lang: AppLanguage, subColor: Color) {
    Row(Modifier.fillMaxWidth()) {
        Text(AppStrings.colDate(lang), Modifier.width(72.dp), fontSize = 11.sp, color = subColor, fontWeight = FontWeight.Medium)
        Text(AppStrings.colOperation(lang), Modifier.weight(1f), fontSize = 11.sp, color = subColor, fontWeight = FontWeight.Medium)
        Text(AppStrings.colDebit(lang), Modifier.width(72.dp), fontSize = 11.sp, color = subColor, fontWeight = FontWeight.Medium, textAlign = TextAlign.End)
        Text(AppStrings.colCredit(lang), Modifier.width(72.dp), fontSize = 11.sp, color = subColor, fontWeight = FontWeight.Medium, textAlign = TextAlign.End)
    }
}

@Composable
private fun ReconciliationTableRow(
    line: ReconciliationLineDto,
    fmt: DecimalFormat,
    titleColor: Color,
    subColor: Color,
    expanded: Boolean,
    onToggleExpand: () -> Unit,
) {
    val isBold = line.isSummary || line.isClosing
    val weight = if (isBold) FontWeight.Bold else FontWeight.Normal

    Row(
        Modifier
            .fillMaxWidth()
            .clickable(enabled = line.expandable, onClick = onToggleExpand)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Row(Modifier.width(72.dp), verticalAlignment = Alignment.CenterVertically) {
            if (line.expandable) {
                Box(
                    Modifier
                        .size(18.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFE5E7EB))
                        .clickable(onClick = onToggleExpand),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(if (expanded) "−" else "+", fontSize = 12.sp, color = Color(0xFF6B7280))
                }
                Spacer(Modifier.width(4.dp))
            }
            Text(line.date ?: "", fontSize = 11.sp, color = subColor, maxLines = 2)
        }
        Text(
            line.operation,
            Modifier.weight(1f).padding(horizontal = 4.dp),
            fontSize = if (isBold) 12.sp else 11.sp,
            color = titleColor,
            fontWeight = weight,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            line.debit?.let { fmt.format(it) } ?: "",
            Modifier.width(72.dp),
            fontSize = 11.sp,
            color = Color(0xFFEF4444),
            fontWeight = weight,
            textAlign = TextAlign.End,
        )
        Text(
            line.credit?.let { fmt.format(it) } ?: "",
            Modifier.width(72.dp),
            fontSize = 11.sp,
            color = Color(0xFF22C55E),
            fontWeight = weight,
            textAlign = TextAlign.End,
        )
    }
}

private fun reconciliationAmountFormat(): DecimalFormat {
    val symbols = DecimalFormatSymbols(Locale("ru", "RU")).apply {
        groupingSeparator = ' '
        decimalSeparator = ','
    }
    return DecimalFormat("#,##0.00", symbols)
}
