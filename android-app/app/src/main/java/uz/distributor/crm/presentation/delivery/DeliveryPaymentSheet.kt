package uz.distributor.crm.presentation.delivery

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import uz.distributor.crm.data.remote.dto.PaymentTerminalDto
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import java.io.File
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.time.LocalDate
import java.time.LocalTime
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.TimeZone
import java.text.SimpleDateFormat

enum class DeliveryPayMode { DELIVER, COLLECT }

private enum class DeliverSheetStep { TYPE, TERMINAL, DETAILS }

private val PayAccent = Color(0xFF6366F1)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryPaymentSheet(
    visible: Boolean,
    mode: DeliveryPayMode,
    isDark: Boolean,
    lang: AppLanguage,
    remaining: Double,
    terminals: List<PaymentTerminalDto>,
    isSubmitting: Boolean,
    initialDueAt: String? = null,
    onDismiss: () -> Unit,
    onSubmit: (
        method: String,
        terminalId: String?,
        amount: Double?,
        dueAt: String?,
        photoUri: Uri?,
    ) -> Unit,
) {
    if (!visible) return

    val sheetBg = if (isDark) Color(0xFF111827) else Color.White
    val cardBg = if (isDark) Color(0xFF1F2937) else Color(0xFFF9FAFB)
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val subColor = Color(0xFF9CA3AF)
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    val formatter = remember { deliveryAmountFormat() }
    val context = LocalContext.current
    val initialParts = remember(visible, initialDueAt) { parseDueAtParts(initialDueAt) }

    var step by remember { mutableStateOf(DeliverSheetStep.TYPE) }
    var method by remember { mutableStateOf<String?>(null) }
    var terminalId by remember { mutableStateOf<String?>(null) }
    var amountText by remember {
        // Faqat raqamlar saqlanadi; bo‘shliq VisualTransformation orqali ko‘rsatiladi
        mutableStateOf(if (remaining > 0) remaining.toLong().coerceAtLeast(0).toString() else "")
    }
    var dueDate by remember(visible, initialDueAt) { mutableStateOf(initialParts.first) }
    var dueTime by remember(visible, initialDueAt) { mutableStateOf(initialParts.second) }
    var showCalendar by remember { mutableStateOf(false) }
    var showTimePicker by remember { mutableStateOf(false) }
    var photoUri by remember { mutableStateOf<Uri?>(null) }
    var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }
    var localError by remember { mutableStateOf<String?>(null) }
    var amountOverLimit by remember { mutableStateOf(false) }

    val galleryPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent(),
    ) { uri -> if (uri != null) photoUri = uri }

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture(),
    ) { ok -> if (ok) pendingCameraUri?.let { photoUri = it } }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            val uri = createDeliveryCameraUri(context)
            pendingCameraUri = uri
            cameraLauncher.launch(uri)
        }
    }

    fun resetAndDismiss() {
        step = DeliverSheetStep.TYPE
        method = null
        terminalId = null
        photoUri = null
        localError = null
        amountOverLimit = false
        showCalendar = false
        showTimePicker = false
        onDismiss()
    }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    if (showCalendar) {
        DeliveryDueDateCalendarDialog(
            isDark = isDark,
            lang = lang,
            selected = dueDate,
            onDismiss = { showCalendar = false },
            onSelect = {
                dueDate = it
                showCalendar = false
            },
        )
    }
    if (showTimePicker) {
        DeliveryTimePickerDialog(
            initialTime = dueTime,
            isDark = isDark,
            lang = lang,
            onDismiss = { showTimePicker = false },
            onConfirm = { h, m ->
                dueTime = "%02d:%02d".format(h, m)
                showTimePicker = false
            },
        )
    }

    ModalBottomSheet(
        onDismissRequest = ::resetAndDismiss,
        sheetState = sheetState,
        containerColor = sheetBg,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            when (step) {
                DeliverSheetStep.TYPE -> {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            if (mode == DeliveryPayMode.DELIVER) {
                                AppStrings.deliveryMarkDelivered(lang)
                            } else {
                                AppStrings.deliveryCollectPayment(lang)
                            },
                            modifier = Modifier.weight(1f),
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = titleColor,
                        )
                        IconButton(onClick = ::resetAndDismiss) {
                            Icon(Icons.Default.Close, null, tint = subColor)
                        }
                    }
                    Text(
                        "${AppStrings.deliveryRemaining(lang)}: ${formatter.format(remaining)} ${AppStrings.sumCurrency(lang)}",
                        color = subColor,
                        fontSize = 13.sp,
                    )
                    Spacer(Modifier.height(16.dp))
                    PayOption(
                        icon = Icons.Default.Payments,
                        iconBg = Color(0xFFDCFCE7),
                        iconTint = Color(0xFF16A34A),
                        title = AppStrings.paymentCash(lang),
                        subtitle = AppStrings.paymentCashDesc(lang),
                        cardBg = cardBg,
                        borderColor = borderColor,
                        titleColor = titleColor,
                        subColor = subColor,
                        onClick = {
                            method = "cash"
                            step = DeliverSheetStep.DETAILS
                        },
                    )
                    Spacer(Modifier.height(10.dp))
                    PayOption(
                        icon = Icons.Default.CreditCard,
                        iconBg = Color(0xFFDBEAFE),
                        iconTint = Color(0xFF2563EB),
                        title = AppStrings.deliveryPayTerminal(lang),
                        subtitle = AppStrings.paymentCardDesc(lang),
                        cardBg = cardBg,
                        borderColor = borderColor,
                        titleColor = titleColor,
                        subColor = subColor,
                        onClick = {
                            method = "terminal"
                            step = DeliverSheetStep.TERMINAL
                        },
                    )
                    if (mode == DeliveryPayMode.DELIVER) {
                        Spacer(Modifier.height(10.dp))
                        PayOption(
                            icon = Icons.Default.Schedule,
                            iconBg = Color(0xFFFEF3C7),
                            iconTint = Color(0xFFD97706),
                            title = AppStrings.deliveryPayLater(lang),
                            subtitle = AppStrings.deliveryPayLaterDesc(lang),
                            cardBg = cardBg,
                            borderColor = borderColor,
                            titleColor = titleColor,
                            subColor = subColor,
                            onClick = {
                                method = "deferred"
                                amountText = "0"
                                step = DeliverSheetStep.DETAILS
                            },
                        )
                    }
                }

                DeliverSheetStep.TERMINAL -> {
                    SheetNavHeader(
                        title = AppStrings.selectTerminal(lang),
                        titleColor = titleColor,
                        subColor = subColor,
                        onBack = { step = DeliverSheetStep.TYPE },
                        onClose = ::resetAndDismiss,
                    )
                    Spacer(Modifier.height(12.dp))
                    if (terminals.isEmpty()) {
                        Text(AppStrings.deliveryNoTerminals(lang), color = subColor)
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.heightIn(max = 360.dp),
                        ) {
                            items(terminals) { t ->
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .border(1.dp, borderColor, RoundedCornerShape(12.dp))
                                        .background(cardBg)
                                        .clickable {
                                            terminalId = t.id
                                            step = DeliverSheetStep.DETAILS
                                        }
                                        .padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Column(Modifier.weight(1f)) {
                                        Text(t.name, color = titleColor, fontWeight = FontWeight.SemiBold)
                                        if (!t.code.isNullOrBlank()) {
                                            Text(t.code!!, color = subColor, fontSize = 12.sp)
                                        }
                                    }
                                    Icon(
                                        Icons.AutoMirrored.Filled.KeyboardArrowRight,
                                        null,
                                        tint = subColor,
                                    )
                                }
                            }
                        }
                    }
                }

                DeliverSheetStep.DETAILS -> {
                    SheetNavHeader(
                        title = AppStrings.enterAmount(lang),
                        titleColor = titleColor,
                        subColor = subColor,
                        onBack = {
                            step = if (method == "terminal") {
                                DeliverSheetStep.TERMINAL
                            } else {
                                DeliverSheetStep.TYPE
                            }
                        },
                        onClose = ::resetAndDismiss,
                    )
                    Spacer(Modifier.height(12.dp))
                    val maxAmount = remaining.toLong().coerceAtLeast(0L)
                    val amountErrorColor = Color(0xFFDC2626)
                    OutlinedTextField(
                        value = amountText,
                        onValueChange = { raw ->
                            val digits = raw.filter { it in '0'..'9' }.take(12)
                            val parsed = digits.toLongOrNull()
                            if (parsed != null && parsed > maxAmount) {
                                amountText = maxAmount.toString()
                                amountOverLimit = true
                            } else {
                                amountText = digits
                                amountOverLimit = false
                            }
                        },
                        label = { Text(AppStrings.deliveryAmountLabel(lang)) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        visualTransformation = AmountSpaceVisualTransformation,
                        isError = amountOverLimit,
                        supportingText = if (amountOverLimit) {
                            {
                                Text(
                                    AppStrings.deliveryAmountExceeds(lang),
                                    color = amountErrorColor,
                                    fontSize = 12.sp,
                                )
                            }
                        } else null,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = if (amountOverLimit) amountErrorColor else PayAccent,
                            unfocusedBorderColor = if (amountOverLimit) amountErrorColor else borderColor,
                            errorBorderColor = amountErrorColor,
                            focusedLabelColor = if (amountOverLimit) amountErrorColor else PayAccent,
                            unfocusedLabelColor = if (amountOverLimit) amountErrorColor else subColor,
                            errorLabelColor = amountErrorColor,
                            cursorColor = if (amountOverLimit) amountErrorColor else PayAccent,
                            focusedTextColor = if (amountOverLimit) amountErrorColor else titleColor,
                            unfocusedTextColor = if (amountOverLimit) amountErrorColor else titleColor,
                            errorTextColor = amountErrorColor,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                    val entered = (parseAmountInput(amountText) ?: remaining).coerceAtMost(remaining)
                    val isFullPayment = entered >= remaining - 0.01
                    val needsDue = method == "deferred" || !isFullPayment
                    if (needsDue) {
                        Spacer(Modifier.height(10.dp))
                        Text(
                            AppStrings.deliveryDueAtLabel(lang),
                            color = titleColor,
                            fontWeight = FontWeight.Medium,
                            fontSize = 13.sp,
                        )
                        Spacer(Modifier.height(6.dp))
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            DueDateField(
                                label = formatDisplayDate(dueDate, lang),
                                modifier = Modifier.weight(1.15f),
                                isDark = isDark,
                                borderColor = borderColor,
                                titleColor = titleColor,
                                subColor = subColor,
                                onClick = { showCalendar = true },
                            )
                            DueTimeField(
                                value = dueTime,
                                onValueChange = { dueTime = sanitizeDueTimeInput(it) },
                                onOpenPicker = { showTimePicker = true },
                                hint = AppStrings.deliveryTimeLabel(lang),
                                modifier = Modifier.weight(0.85f),
                                isDark = isDark,
                                borderColor = borderColor,
                                titleColor = titleColor,
                                subColor = subColor,
                            )
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(
                        AppStrings.deliveryPhotoOptional(lang),
                        color = subColor,
                        fontSize = 12.sp,
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(onClick = { galleryPicker.launch("image/*") }) {
                            Icon(Icons.Default.Image, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(AppStrings.deliveryGallery(lang))
                        }
                        TextButton(
                            onClick = {
                                val granted = ContextCompat.checkSelfPermission(
                                    context,
                                    Manifest.permission.CAMERA,
                                ) == PackageManager.PERMISSION_GRANTED
                                if (granted) {
                                    val uri = createDeliveryCameraUri(context)
                                    pendingCameraUri = uri
                                    cameraLauncher.launch(uri)
                                } else {
                                    cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                                }
                            },
                        ) {
                            Icon(Icons.Default.PhotoCamera, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(AppStrings.deliveryCamera(lang))
                        }
                    }
                    if (photoUri != null) {
                        Text(
                            AppStrings.deliveryPhotoSelected(lang),
                            color = Color(0xFF16A34A),
                            fontSize = 12.sp,
                        )
                    }
                    localError?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(it, color = Color(0xFFEF4444), fontSize = 13.sp)
                    }
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = {
                            localError = null
                            val m = method ?: return@Button
                            val amt = parseAmountInput(amountText)?.coerceAtMost(remaining)
                            if (m != "deferred") {
                                if (amountText.isNotBlank() && amt == null) {
                                    localError = AppStrings.deliveryInvalidAmount(lang)
                                    return@Button
                                }
                                if (amt != null && amt < 0) {
                                    localError = AppStrings.deliveryInvalidAmount(lang)
                                    return@Button
                                }
                            }
                            if (m == "terminal" && terminalId.isNullOrBlank()) {
                                localError = AppStrings.deliveryNoTerminals(lang)
                                return@Button
                            }
                            val collectAmt = when {
                                m == "deferred" -> (amt ?: 0.0).coerceIn(0.0, remaining)
                                else -> (amt ?: remaining).coerceAtMost(remaining)
                            }
                            val stillDue = remaining - collectAmt
                            val dueIso = if (stillDue > 0.01 || m == "deferred") {
                                buildDueAtIso(dueDate.toString(), dueTime) ?: run {
                                    localError = AppStrings.deliveryInvalidDue(lang)
                                    return@Button
                                }
                            } else null
                            if (m == "deferred" && dueIso == null) {
                                localError = AppStrings.deliveryInvalidDue(lang)
                                return@Button
                            }
                            onSubmit(
                                m,
                                terminalId,
                                if (m == "deferred" && collectAmt <= 0) 0.0 else collectAmt,
                                dueIso,
                                photoUri,
                            )
                        },
                        enabled = !isSubmitting,
                        colors = ButtonDefaults.buttonColors(containerColor = PayAccent),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Text(
                                AppStrings.confirm(lang),
                                fontWeight = FontWeight.SemiBold,
                                color = Color.White,
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryDueAtSheet(
    visible: Boolean,
    isDark: Boolean,
    lang: AppLanguage,
    isSubmitting: Boolean,
    initialDueAt: String? = null,
    onDismiss: () -> Unit,
    onSubmit: (dueAt: String) -> Unit,
) {
    if (!visible) return
    val sheetBg = if (isDark) Color(0xFF111827) else Color.White
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val subColor = Color(0xFF9CA3AF)
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    val initialParts = remember(visible, initialDueAt) { parseDueAtParts(initialDueAt) }
    var dueDate by remember(visible, initialDueAt) { mutableStateOf(initialParts.first) }
    var dueTime by remember(visible, initialDueAt) { mutableStateOf(initialParts.second) }
    var showCalendar by remember { mutableStateOf(false) }
    var showTimePicker by remember { mutableStateOf(false) }
    var localError by remember { mutableStateOf<String?>(null) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    if (showCalendar) {
        DeliveryDueDateCalendarDialog(
            isDark = isDark,
            lang = lang,
            selected = dueDate,
            onDismiss = { showCalendar = false },
            onSelect = {
                dueDate = it
                showCalendar = false
            },
        )
    }
    if (showTimePicker) {
        DeliveryTimePickerDialog(
            initialTime = dueTime,
            isDark = isDark,
            lang = lang,
            onDismiss = { showTimePicker = false },
            onConfirm = { h, m ->
                dueTime = "%02d:%02d".format(h, m)
                showTimePicker = false
            },
        )
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = sheetBg,
    ) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
            Text(
                AppStrings.deliveryChangeDue(lang),
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = titleColor,
            )
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                DueDateField(
                    label = formatDisplayDate(dueDate, lang),
                    modifier = Modifier.weight(1.15f),
                    isDark = isDark,
                    borderColor = borderColor,
                    titleColor = titleColor,
                    subColor = subColor,
                    onClick = { showCalendar = true },
                )
                DueTimeField(
                    value = dueTime,
                    onValueChange = { dueTime = sanitizeDueTimeInput(it) },
                    onOpenPicker = { showTimePicker = true },
                    hint = AppStrings.deliveryTimeLabel(lang),
                    modifier = Modifier.weight(0.85f),
                    isDark = isDark,
                    borderColor = borderColor,
                    titleColor = titleColor,
                    subColor = subColor,
                )
            }
            localError?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = Color(0xFFEF4444), fontSize = 13.sp)
            }
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = {
                    val iso = buildDueAtIso(dueDate.toString(), dueTime)
                    if (iso == null) {
                        localError = AppStrings.deliveryInvalidDue(lang)
                        return@Button
                    }
                    onSubmit(iso)
                },
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = PayAccent),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(AppStrings.confirm(lang), color = Color.White)
            }
        }
    }
}

@Composable
private fun DueDateField(
    label: String,
    modifier: Modifier = Modifier,
    isDark: Boolean,
    borderColor: Color,
    titleColor: Color,
    subColor: Color,
    onClick: () -> Unit,
) {
    Row(
        modifier
            .height(56.dp)
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, borderColor, RoundedCornerShape(12.dp))
            .background(if (isDark) Color(0xFF1F2937) else Color.White)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.CalendarMonth, null, tint = PayAccent, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(8.dp))
        Text(
            label,
            color = titleColor,
            fontWeight = FontWeight.Medium,
            fontSize = 14.sp,
            modifier = Modifier.weight(1f),
            maxLines = 1,
        )
        Icon(
            Icons.AutoMirrored.Filled.KeyboardArrowRight,
            null,
            tint = subColor,
            modifier = Modifier.size(18.dp),
        )
    }
}

@Composable
private fun DueTimeField(
    value: String,
    onValueChange: (String) -> Unit,
    onOpenPicker: () -> Unit,
    hint: String,
    modifier: Modifier = Modifier,
    isDark: Boolean,
    borderColor: Color,
    titleColor: Color,
    subColor: Color,
) {
    Row(
        modifier
            .height(56.dp)
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, borderColor, RoundedCornerShape(12.dp))
            .background(if (isDark) Color(0xFF1F2937) else Color.White)
            .padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(
            onClick = onOpenPicker,
            modifier = Modifier.size(36.dp),
        ) {
            Icon(Icons.Default.Schedule, null, tint = PayAccent, modifier = Modifier.size(20.dp))
        }
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
            textStyle = TextStyle(
                color = titleColor,
                fontWeight = FontWeight.Medium,
                fontSize = 14.sp,
            ),
            modifier = Modifier.weight(1f),
            decorationBox = { inner ->
                Box {
                    if (value.isBlank()) {
                        Text(hint, color = subColor, fontSize = 14.sp)
                    }
                    inner()
                }
            },
        )
        IconButton(
            onClick = onOpenPicker,
            modifier = Modifier.size(36.dp),
        ) {
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                null,
                tint = subColor,
                modifier = Modifier.size(18.dp),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DeliveryTimePickerDialog(
    initialTime: String,
    isDark: Boolean,
    lang: AppLanguage,
    onDismiss: () -> Unit,
    onConfirm: (hour: Int, minute: Int) -> Unit,
) {
    val parsed = normalizeDueTime(initialTime)
    val seed = parsed?.let {
        runCatching { LocalTime.parse(it) }.getOrNull()
    } ?: LocalTime.of(18, 0)
    val state = rememberTimePickerState(
        initialHour = seed.hour,
        initialMinute = seed.minute,
        is24Hour = true,
    )
    val sheetBg = if (isDark) Color(0xFF1C1C1E) else Color.White
    val textColor = if (isDark) Color.White else Color(0xFF111827)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .shadow(16.dp, RoundedCornerShape(20.dp))
                .clip(RoundedCornerShape(20.dp))
                .background(sheetBg)
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                AppStrings.deliveryTimeLabel(lang),
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                color = textColor,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(16.dp))
            TimePicker(state = state)
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                TextButton(onClick = onDismiss) {
                    Text(AppStrings.msgCancel(lang))
                }
                TextButton(
                    onClick = { onConfirm(state.hour, state.minute) },
                ) {
                    Text(AppStrings.confirm(lang), color = PayAccent, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
internal fun DeliveryDueDateCalendarDialog(
    isDark: Boolean,
    lang: AppLanguage,
    selected: LocalDate,
    onDismiss: () -> Unit,
    onSelect: (LocalDate) -> Unit,
) {
    val today = LocalDate.now()
    val initial = if (selected.isBefore(today)) today else selected
    var displayMonth by remember(initial) { mutableStateOf(YearMonth.from(initial)) }
    var tempSelected by remember(initial) { mutableStateOf(initial) }
    val sheetBg = if (isDark) Color(0xFF1C1C1E) else Color.White
    val textColor = if (isDark) Color.White else Color(0xFF111827)
    val mutedColor = if (isDark) Color(0xFF8E9BA7) else Color(0xFF6B7280)
    val currentMonth = YearMonth.from(today)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .shadow(16.dp, RoundedCornerShape(20.dp))
                .clip(RoundedCornerShape(20.dp))
                .background(sheetBg)
                .padding(16.dp),
        ) {
            Text(
                AppStrings.deliveryDueAtLabel(lang),
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                color = textColor,
            )
            Spacer(Modifier.height(14.dp))

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(
                    onClick = { displayMonth = displayMonth.minusMonths(1) },
                    enabled = displayMonth > currentMonth,
                    modifier = Modifier.size(32.dp),
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                        null,
                        tint = if (displayMonth > currentMonth) mutedColor else mutedColor.copy(alpha = 0.35f),
                    )
                }
                Text(
                    formatMonthYear(lang, displayMonth),
                    color = textColor,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                )
                IconButton(
                    onClick = { displayMonth = displayMonth.plusMonths(1) },
                    modifier = Modifier.size(32.dp),
                ) {
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = mutedColor)
                }
            }

            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth()) {
                weekdayLabels(lang).forEach { label ->
                    Text(
                        label,
                        Modifier.weight(1f),
                        textAlign = TextAlign.Center,
                        color = mutedColor,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
            Spacer(Modifier.height(4.dp))

            val cells = remember(displayMonth) { monthGrid(displayMonth) }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                cells.chunked(7).forEach { week ->
                    Row(Modifier.fillMaxWidth()) {
                        week.forEach { date ->
                            Box(
                                Modifier
                                    .weight(1f)
                                    .aspectRatio(1f),
                                contentAlignment = Alignment.Center,
                            ) {
                                if (date != null) {
                                    val isPast = date.isBefore(today)
                                    val isSelected = date == tempSelected
                                    val isToday = date == today
                                    Box(
                                        Modifier
                                            .size(36.dp)
                                            .clip(CircleShape)
                                            .background(
                                                when {
                                                    isSelected && !isPast -> PayAccent
                                                    isToday && !isPast -> PayAccent.copy(alpha = 0.12f)
                                                    else -> Color.Transparent
                                                },
                                            )
                                            .then(
                                                if (isPast) Modifier
                                                else Modifier.clickable { tempSelected = date },
                                            ),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text(
                                            date.dayOfMonth.toString(),
                                            color = when {
                                                isPast -> mutedColor.copy(alpha = 0.35f)
                                                isSelected -> Color.White
                                                else -> textColor
                                            },
                                            fontWeight = if (isSelected || isToday) FontWeight.Bold else FontWeight.Normal,
                                            fontSize = 14.sp,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(14.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f),
                ) {
                    Text(AppStrings.msgCancel(lang), color = mutedColor)
                }
                Button(
                    onClick = {
                        if (!tempSelected.isBefore(today)) onSelect(tempSelected)
                    },
                    enabled = !tempSelected.isBefore(today),
                    colors = ButtonDefaults.buttonColors(containerColor = PayAccent),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    Text(AppStrings.confirm(lang), color = Color.White, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun SheetNavHeader(
    title: String,
    titleColor: Color,
    subColor: Color,
    onBack: () -> Unit,
    onClose: () -> Unit,
) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = titleColor)
        }
        Text(
            title,
            modifier = Modifier.weight(1f),
            fontWeight = FontWeight.Bold,
            fontSize = 17.sp,
            color = titleColor,
        )
        IconButton(onClick = onClose) {
            Icon(Icons.Default.Close, null, tint = subColor)
        }
    }
}

@Composable
private fun PayOption(
    icon: ImageVector,
    iconBg: Color,
    iconTint: Color,
    title: String,
    subtitle: String,
    cardBg: Color,
    borderColor: Color,
    titleColor: Color,
    subColor: Color,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .border(1.dp, borderColor, RoundedCornerShape(14.dp))
            .background(cardBg)
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(iconBg),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = iconTint)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = titleColor, fontWeight = FontWeight.SemiBold)
            Text(subtitle, color = subColor, fontSize = 12.sp)
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = subColor)
    }
}

internal fun buildDueAtIso(date: String, time: String): String? {
    val normalizedTime = normalizeDueTime(time) ?: return null
    return try {
        val local = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).apply {
            isLenient = false
            timeZone = TimeZone.getDefault()
        }
        val parsed = local.parse("$date $normalizedTime") ?: return null
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).apply {
            timeZone = TimeZone.getDefault()
        }.format(parsed)
    } catch (_: Exception) {
        null
    }
}

/** "18:00", "12.30", "11 28", "1230" → "HH:mm" */
internal fun normalizeDueTime(raw: String): String? {
    val trimmed = raw.trim()
    if (trimmed.isEmpty()) return null

    val parts = trimmed.split(Regex("[.:\\s]+")).filter { it.isNotBlank() }
    if (parts.size == 2) {
        val h = parts[0].toIntOrNull() ?: return null
        val m = parts[1].padStart(2, '0').take(2).toIntOrNull() ?: return null
        if (h !in 0..23 || m !in 0..59) return null
        return "%02d:%02d".format(h, m)
    }

    val digits = trimmed.filter { it.isDigit() }
    return when (digits.length) {
        3 -> {
            val h = digits.substring(0, 1).toIntOrNull() ?: return null
            val m = digits.substring(1, 3).toIntOrNull() ?: return null
            if (h !in 0..23 || m !in 0..59) return null
            "%02d:%02d".format(h, m)
        }
        4 -> {
            val h = digits.substring(0, 2).toIntOrNull() ?: return null
            val m = digits.substring(2, 4).toIntOrNull() ?: return null
            if (h !in 0..23 || m !in 0..59) return null
            "%02d:%02d".format(h, m)
        }
        else -> null
    }
}

/** Yozishda: 12.30, 11 28, 18:00 — ruxsat etiladi */
internal fun sanitizeDueTimeInput(raw: String): String =
    raw.filter { it.isDigit() || it == ':' || it == '.' || it == ' ' }.take(8)

/** Mavjud dueAt ISO dan sana + vaqt (HH:mm). */
internal fun parseDueAtParts(iso: String?): Pair<LocalDate, String> {
    val fallback = LocalDate.now() to "18:00"
    if (iso.isNullOrBlank()) return fallback
    return runCatching {
        val zdt = java.time.OffsetDateTime.parse(iso).atZoneSameInstant(java.time.ZoneId.systemDefault())
        zdt.toLocalDate() to zdt.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"))
    }.recoverCatching {
        val instant = java.time.Instant.parse(iso)
        val zdt = instant.atZone(java.time.ZoneId.systemDefault())
        zdt.toLocalDate() to zdt.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"))
    }.getOrElse { fallback }
}

private fun deliveryAmountFormat(): DecimalFormat {
    val symbols = DecimalFormatSymbols(Locale.US).apply {
        groupingSeparator = ' '
        decimalSeparator = '.'
    }
    return DecimalFormat("#,###", symbols).apply {
        isGroupingUsed = true
        maximumFractionDigits = 0
        minimumFractionDigits = 0
    }
}

/** Ko‘rsatish: "123456" → "123 456". State da faqat raqamlar (kursor buzilmasin). */
private object AmountSpaceVisualTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val original = text.text.filter { it in '0'..'9' }
        if (original.isEmpty()) {
            return TransformedText(AnnotatedString(""), OffsetMapping.Identity)
        }
        val n = original.length
        val formatted = buildString(n + n / 3) {
            original.forEachIndexed { i, c ->
                if (i > 0 && (n - i) % 3 == 0) append(' ')
                append(c)
            }
        }
        val out = AnnotatedString(formatted)
        val mapping = object : OffsetMapping {
            override fun originalToTransformed(offset: Int): Int {
                val o = offset.coerceIn(0, n)
                if (o == 0) return 0
                if (o >= n) return formatted.length
                var digitsSeen = 0
                for (i in formatted.indices) {
                    if (formatted[i] != ' ') {
                        digitsSeen++
                        if (digitsSeen == o) return i + 1
                    }
                }
                return formatted.length
            }

            override fun transformedToOriginal(offset: Int): Int {
                val t = offset.coerceIn(0, formatted.length)
                return formatted.take(t).count { it != ' ' }.coerceIn(0, n)
            }
        }
        return TransformedText(out, mapping)
    }
}

/** "62 500", "62500", NBSP ва ҳ.к. → 62500.0 */
private fun parseAmountInput(text: String): Double? {
    val digits = text.filter { it in '0'..'9' }
    if (digits.isEmpty()) return null
    return digits.toDoubleOrNull()
}

private fun createDeliveryCameraUri(context: android.content.Context): Uri {
    val dir = File(context.cacheDir, "payment_photos").apply { mkdirs() }
    val file = File(dir, "payment_${System.currentTimeMillis()}.jpg")
    if (!file.exists()) {
        file.createNewFile()
    }
    return FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )
}

private fun formatDisplayDate(date: LocalDate, lang: AppLanguage): String {
    val fmt = when (lang) {
        AppLanguage.RUS -> DateTimeFormatter.ofPattern("dd.MM.yyyy")
        else -> DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }
    return date.format(fmt)
}

private fun formatMonthYear(lang: AppLanguage, month: YearMonth): String {
    val months = when (lang) {
        AppLanguage.RUS -> listOf(
            "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
            "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
        )
        AppLanguage.UZ_CYRILLIC -> listOf(
            "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
            "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
        )
        AppLanguage.UZ_LATIN -> listOf(
            "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
            "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
        )
    }
    return "${months[month.monthValue - 1]} ${month.year}"
}

private fun weekdayLabels(lang: AppLanguage): List<String> = when (lang) {
    AppLanguage.RUS -> listOf("Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс")
    AppLanguage.UZ_CYRILLIC -> listOf("Ду", "Се", "Чо", "Па", "Жу", "Ша", "Як")
    AppLanguage.UZ_LATIN -> listOf("Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya")
}

private fun monthGrid(month: YearMonth): List<LocalDate?> {
    val first = month.atDay(1)
    // Monday-first (ISO)
    val lead = (first.dayOfWeek.value + 6) % 7
    val days = month.lengthOfMonth()
    val cells = MutableList<LocalDate?>(lead) { null }
    for (d in 1..days) cells.add(month.atDay(d))
    while (cells.size % 7 != 0) cells.add(null)
    return cells
}
