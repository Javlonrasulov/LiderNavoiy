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
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import uz.distributor.crm.data.remote.dto.PaymentTerminalDto
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import java.io.File
import java.text.DecimalFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

enum class DeliveryPayMode { DELIVER, COLLECT }

private enum class DeliverSheetStep { TYPE, TERMINAL, DETAILS }

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
    val accent = Color(0xFF6366F1)
    val formatter = remember { DecimalFormat("#,###") }
    val context = LocalContext.current

    var step by remember { mutableStateOf(DeliverSheetStep.TYPE) }
    var method by remember { mutableStateOf<String?>(null) }
    var terminalId by remember { mutableStateOf<String?>(null) }
    var amountText by remember {
        mutableStateOf(if (remaining > 0) formatter.format(remaining).replace(",", "") else "")
    }
    var dueDate by remember {
        mutableStateOf(
            SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time),
        )
    }
    var dueTime by remember { mutableStateOf("18:00") }
    var photoUri by remember { mutableStateOf<Uri?>(null) }
    var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }
    var localError by remember { mutableStateOf<String?>(null) }

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
        onDismiss()
    }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

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
                    OutlinedTextField(
                        value = amountText,
                        onValueChange = { amountText = it.filter { ch -> ch.isDigit() || ch == '.' } },
                        label = { Text(AppStrings.deliveryAmountLabel(lang)) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                    val needsDue = method == "deferred" ||
                        ((amountText.toDoubleOrNull() ?: remaining) < remaining - 0.01)
                    if (needsDue || mode == DeliveryPayMode.COLLECT) {
                        Spacer(Modifier.height(10.dp))
                        Text(
                            AppStrings.deliveryDueAtLabel(lang),
                            color = titleColor,
                            fontWeight = FontWeight.Medium,
                            fontSize = 13.sp,
                        )
                        Spacer(Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = dueDate,
                                onValueChange = { dueDate = it },
                                label = { Text("YYYY-MM-DD") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                            )
                            OutlinedTextField(
                                value = dueTime,
                                onValueChange = { dueTime = it },
                                label = { Text("HH:mm") },
                                modifier = Modifier.weight(0.7f),
                                singleLine = true,
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
                            val amt = amountText.replace(",", "").toDoubleOrNull()
                            if (m != "deferred" && (amt == null || amt < 0)) {
                                localError = AppStrings.deliveryInvalidAmount(lang)
                                return@Button
                            }
                            if (m == "terminal" && terminalId.isNullOrBlank()) {
                                localError = AppStrings.deliveryNoTerminals(lang)
                                return@Button
                            }
                            val collectAmt = when {
                                m == "deferred" -> amt ?: 0.0
                                else -> amt ?: remaining
                            }
                            val stillDue = remaining - collectAmt
                            val dueIso = if (stillDue > 0.01 || m == "deferred" ||
                                (mode == DeliveryPayMode.COLLECT && stillDue > 0.01)
                            ) {
                                buildDueAtIso(dueDate, dueTime) ?: run {
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
                        colors = ButtonDefaults.buttonColors(containerColor = accent),
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
    onDismiss: () -> Unit,
    onSubmit: (dueAt: String) -> Unit,
) {
    if (!visible) return
    val sheetBg = if (isDark) Color(0xFF111827) else Color.White
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val subColor = Color(0xFF9CA3AF)
    val accent = Color(0xFF6366F1)
    var dueDate by remember {
        mutableStateOf(
            SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time),
        )
    }
    var dueTime by remember { mutableStateOf("18:00") }
    var localError by remember { mutableStateOf<String?>(null) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

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
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = dueDate,
                    onValueChange = { dueDate = it },
                    label = { Text("YYYY-MM-DD") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = dueTime,
                    onValueChange = { dueTime = it },
                    label = { Text("HH:mm") },
                    modifier = Modifier.weight(0.7f),
                    singleLine = true,
                )
            }
            localError?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = Color(0xFFEF4444), fontSize = 13.sp)
            }
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = {
                    val iso = buildDueAtIso(dueDate, dueTime)
                    if (iso == null) {
                        localError = AppStrings.deliveryInvalidDue(lang)
                        return@Button
                    }
                    onSubmit(iso)
                },
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = accent),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(AppStrings.confirm(lang), color = Color.White)
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
    return try {
        val local = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).apply {
            isLenient = false
            timeZone = TimeZone.getDefault()
        }
        val parsed = local.parse("$date $time") ?: return null
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).apply {
            timeZone = TimeZone.getDefault()
        }.format(parsed)
    } catch (_: Exception) {
        null
    }
}

private fun createDeliveryCameraUri(context: android.content.Context): Uri {
    val file = File(context.cacheDir, "payment_${System.currentTimeMillis()}.jpg")
    return FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )
}
