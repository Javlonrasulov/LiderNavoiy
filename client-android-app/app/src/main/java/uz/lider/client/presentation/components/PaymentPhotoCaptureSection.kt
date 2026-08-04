package uz.lider.client.presentation.components

import android.Manifest
import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import coil.request.ImageRequest
import java.io.File
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Asosiy / to‘lovlar — pul olgan insonni rasmga olish (danger pulse).
 */
@Composable
fun PaymentPhotoCaptureSection(
    title: String,
    body: String,
    captureLabel: String,
    savedLabel: String,
    uploading: Boolean,
    error: String?,
    previewUrl: String?,
    onCapture: (Uri) -> Unit,
    onDismiss: (() -> Unit)? = null,
    amount: Double? = null,
    collectedAtMs: Long? = null,
    amountLabel: String = "",
    timeLabel: String = "",
    currencyLabel: String = "",
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture(),
    ) { ok ->
        val uri = pendingCameraUri
        pendingCameraUri = null
        if (!ok || uri == null) return@rememberLauncherForActivityResult
        val sizeOk = try {
            context.contentResolver.openInputStream(uri)?.use { input ->
                var total = 0
                val buf = ByteArray(4096)
                while (total < 513) {
                    val n = input.read(buf)
                    if (n <= 0) break
                    total += n
                }
                total > 512
            } ?: false
        } catch (_: Exception) {
            false
        }
        if (sizeOk) onCapture(uri)
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            val uri = createPaymentCameraUri(context)
            pendingCameraUri = uri
            cameraLauncher.launch(uri)
        }
    }

    fun launchCamera() {
        val granted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA,
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        if (granted) {
            val uri = createPaymentCameraUri(context)
            pendingCameraUri = uri
            cameraLauncher.launch(uri)
        } else {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    val shape = RoundedCornerShape(22.dp)
    val saved = !previewUrl.isNullOrBlank() && !uploading

    val pulse = rememberInfiniteTransition(label = "payDanger")
    val dangerT by pulse.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "dangerT",
    )
    val iconScale by pulse.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.12f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "iconScale",
    )

    val dangerRed = Color(0xFFDC2626)
    val dangerDeep = Color(0xFF7F1D1D)
    val borderColor = if (saved) {
        Color(0xFF34D399).copy(alpha = 0.55f)
    } else {
        lerp(Color(0xFFF87171), dangerRed, dangerT)
    }
    val glowAlpha = if (saved) 0.12f else 0.22f + dangerT * 0.28f
    val cardTop = if (saved) Color(0xFFECFDF5) else lerp(Color(0xFF1C1917), Color(0xFF450A0A), dangerT * 0.55f)
    val cardBottom = if (saved) Color(0xFFD1FAE5) else lerp(Color(0xFF292524), Color(0xFF7F1D1D), dangerT * 0.45f)
    val titleColor = if (saved) Color(0xFF065F46) else lerp(Color(0xFFFECACA), Color.White, dangerT * 0.35f)
    val bodyColor = if (saved) Color(0xFF047857) else Color(0xFFFEE2E2).copy(alpha = 0.92f)

    val amountText = amount?.takeIf { it > 0 }?.let { formatPayAmount(it) }
    val timeText = collectedAtMs?.takeIf { it > 0 }?.let { formatPayTime(it) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .shadow(
                elevation = if (saved) 10.dp else (14 + dangerT * 10).dp,
                shape = shape,
                ambientColor = dangerRed.copy(alpha = glowAlpha),
                spotColor = dangerRed.copy(alpha = glowAlpha + 0.15f),
            )
            .clip(shape)
            .background(Brush.verticalGradient(listOf(cardTop, cardBottom)))
            .border(
                width = if (saved) 1.dp else (1.5f + dangerT).dp,
                brush = Brush.linearGradient(
                    listOf(borderColor, dangerDeep.copy(alpha = if (saved) 0.2f else 0.85f)),
                ),
                shape = shape,
            )
            .padding(16.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top,
        ) {
            Box(
                Modifier
                    .size(48.dp)
                    .scale(if (saved) 1f else iconScale)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            if (saved) {
                                listOf(Color(0xFF34D399), Color(0xFF059669))
                            } else {
                                listOf(
                                    lerp(Color(0xFFFBBF24), dangerRed, dangerT),
                                    lerp(dangerRed, dangerDeep, dangerT),
                                )
                            },
                        ),
                    )
                    .border(2.dp, Color.White.copy(alpha = 0.35f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    if (saved) Icons.Default.CheckCircle else Icons.Default.Warning,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(24.dp),
                )
            }
            Column(
                Modifier
                    .weight(1f)
                    .padding(start = 12.dp, end = if (onDismiss != null) 0.dp else 8.dp),
            ) {
                Text(
                    if (saved) savedLabel else title,
                    color = titleColor,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    letterSpacing = 0.2.sp,
                )
                if (!saved) {
                    Spacer(Modifier.height(5.dp))
                    Text(
                        body,
                        color = bodyColor,
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                    )
                }
                if (!error.isNullOrBlank() && !saved) {
                    Spacer(Modifier.height(6.dp))
                    Text(error, color = Color(0xFFFDA4AF), fontSize = 12.sp)
                }
            }
            if (onDismiss != null) {
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.size(36.dp),
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Close",
                        tint = titleColor.copy(alpha = 0.75f),
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        }

        if (!saved && (amountText != null || timeText != null)) {
            Spacer(Modifier.height(14.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (amountText != null) {
                    MetaChip(
                        icon = Icons.Default.Payments,
                        label = amountLabel.ifBlank { "Summa" },
                        value = "$amountText ${currencyLabel.trim()}".trim(),
                        modifier = Modifier.weight(1f),
                        emphasize = true,
                        pulse = dangerT,
                    )
                }
                if (timeText != null) {
                    MetaChip(
                        icon = Icons.Default.AccessTime,
                        label = timeLabel.ifBlank { "Vaqt" },
                        value = timeText,
                        modifier = Modifier.weight(1f),
                        emphasize = false,
                        pulse = dangerT,
                    )
                }
            }
        }

        Spacer(Modifier.height(14.dp))

        if (saved) {
            AsyncImage(
                model = ImageRequest.Builder(context)
                    .data(previewUrl)
                    .allowHardware(false)
                    .crossfade(true)
                    .build(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .clip(RoundedCornerShape(16.dp)),
            )
        } else {
            val btnPulse by animateColorAsState(
                targetValue = lerp(Color(0xFFEF4444), Color(0xFFB91C1C), dangerT),
                label = "btnPulse",
            )
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        Brush.horizontalGradient(
                            listOf(btnPulse, Color(0xFF7F1D1D)),
                        ),
                    )
                    .border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(16.dp))
                    .clickable(enabled = !uploading) { launchCamera() },
                contentAlignment = Alignment.Center,
            ) {
                if (uploading) {
                    CircularProgressIndicator(
                        color = Color.White,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(22.dp),
                    )
                } else {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Default.PhotoCamera,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(20.dp),
                        )
                        Text(
                            captureLabel,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MetaChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    emphasize: Boolean,
    pulse: Float,
) {
    val bg = if (emphasize) {
        lerp(Color(0x33FECACA), Color(0x55EF4444), pulse)
    } else {
        Color.White.copy(alpha = 0.08f + pulse * 0.06f)
    }
    Column(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(bg)
            .border(1.dp, Color.White.copy(alpha = 0.14f), RoundedCornerShape(14.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = Color(0xFFFECACA), modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(6.dp))
            Text(label, color = Color(0xFFFECACA), fontSize = 11.sp, fontWeight = FontWeight.Medium)
        }
        Spacer(Modifier.height(4.dp))
        Text(
            value,
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp,
            maxLines = 1,
        )
    }
}

private fun formatPayAmount(value: Double): String {
    val symbols = DecimalFormatSymbols(Locale.US).apply {
        groupingSeparator = ' '
        decimalSeparator = '.'
    }
    return DecimalFormat("#,##0", symbols).format(value)
}

private fun formatPayTime(ms: Long): String {
    val z = Instant.ofEpochMilli(ms).atZone(ZoneId.systemDefault())
    return DateTimeFormatter.ofPattern("dd.MM.yyyy  HH:mm").format(z)
}

private fun createPaymentCameraUri(context: Context): Uri {
    val dir = File(context.cacheDir, "payment_photos").apply { mkdirs() }
    val file = File(dir, "payment_proof_${System.currentTimeMillis()}.jpg")
    if (!file.exists()) {
        file.createNewFile()
    }
    return FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )
}
