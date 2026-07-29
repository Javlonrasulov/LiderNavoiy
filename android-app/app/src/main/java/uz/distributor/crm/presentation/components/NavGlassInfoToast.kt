package uz.distributor.crm.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Asosiy sahifadagi glass ogohlantirish — title + ixtiyoriy detail. */
@Composable
fun NavGlassInfoToast(
    title: String,
    detail: String? = null,
    isDark: Boolean,
    modifier: Modifier = Modifier,
) {
    val accent = Color(0xFF2563EB)
    val bg = if (isDark) {
        Color(0xFF1E3A8A).copy(alpha = 0.38f)
    } else {
        Color(0xFFF8FAFC).copy(alpha = 0.78f)
    }
    val border = if (isDark) {
        Color(0xFF3B82F6).copy(alpha = 0.40f)
    } else {
        Color.White.copy(alpha = 0.55f)
    }
    val titleColor = if (isDark) Color(0xFFBFDBFE) else Color(0xFF1E3A8A)
    val detailColor = if (isDark) {
        Color(0xFFE2E8F0).copy(alpha = 0.88f)
    } else {
        Color(0xFF334155).copy(alpha = 0.90f)
    }
    val iconBg = if (isDark) {
        Color(0xFF3B82F6).copy(alpha = 0.20f)
    } else {
        Color(0xFFDBEAFE).copy(alpha = 0.70f)
    }
    val iconBorder = if (isDark) {
        Color(0xFF3B82F6).copy(alpha = 0.28f)
    } else {
        Color(0xFF93C5FD).copy(alpha = 0.55f)
    }
    val iconTint = if (isDark) Color(0xFF93C5FD) else accent

    Row(
        modifier = modifier
            .fillMaxWidth()
            .shadow(
                elevation = 10.dp,
                shape = RoundedCornerShape(16.dp),
                ambientColor = Color.Black.copy(0.10f),
                spotColor = Color.Black.copy(0.14f),
            )
            .clip(RoundedCornerShape(16.dp))
            .background(bg)
            .border(1.dp, border, RoundedCornerShape(16.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(iconBg)
                .border(1.dp, iconBorder, RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Default.Info,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(20.dp),
            )
        }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                title,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                letterSpacing = 0.3.sp,
                color = titleColor,
            )
            if (!detail.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    detail,
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    color = detailColor,
                )
            }
        }
    }
}
