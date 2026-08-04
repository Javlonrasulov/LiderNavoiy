package uz.lider.client.presentation.components

import android.Manifest
import android.content.Context
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import coil.request.ImageRequest
import uz.lider.client.presentation.theme.LiquidGlass
import java.io.File

/**
 * Asosiy ekranda xarita ostida — pul olgan insonni rasmga olish bo‘limi.
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
        // Ba'zi qurilmalarda kamera bo‘sh/qora fayl qaytaradi
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

    val shape = RoundedCornerShape(LiquidGlass.RadiusCard)
    val saved = !previewUrl.isNullOrBlank() && !uploading

    Column(
        modifier = modifier
            .fillMaxWidth()
            .shadow(12.dp, shape, ambientColor = Color(0x44F59E0B), spotColor = Color(0x33EF4444))
            .clip(shape)
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFFFFF7ED), Color(0xFFFFF1F2)),
                ),
            )
            .border(1.dp, Color(0xFFFDBA74).copy(alpha = 0.55f), shape)
            .padding(16.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top,
        ) {
            Box(
                Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            listOf(Color(0xFFF59E0B), Color(0xFFEF4444)),
                        ),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    if (saved) Icons.Default.CheckCircle else Icons.Default.Warning,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(22.dp),
                )
            }
            Column(
                Modifier
                    .weight(1f)
                    .padding(start = 12.dp, end = if (onDismiss != null) 0.dp else 12.dp),
            ) {
                Text(
                    if (saved) savedLabel else title,
                    color = Color(0xFF9A3412),
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                )
                if (!saved) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        body,
                        color = Color(0xFF7C2D12).copy(alpha = 0.9f),
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                    )
                }
                if (!error.isNullOrBlank() && !saved) {
                    Spacer(Modifier.height(6.dp))
                    Text(error, color = Color(0xFFBE123C), fontSize = 12.sp)
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
                        tint = Color(0xFF9A3412).copy(alpha = 0.7f),
                        modifier = Modifier.size(20.dp),
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
                    .clip(RoundedCornerShape(14.dp)),
            )
        } else {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(LiquidGlass.GradientPrimary)
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
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                        )
                    }
                }
            }
        }
    }
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
