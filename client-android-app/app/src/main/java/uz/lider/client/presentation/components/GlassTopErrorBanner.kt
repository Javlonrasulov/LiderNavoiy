package uz.lider.client.presentation.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme

/**
 * Desktop AdminLogin / glass error banner uslubi:
 * tepadan slide-in, rose glass fon, ikonka + matn, yopish tugmasi.
 */
@Composable
fun GlassTopErrorBanner(
    message: String?,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    autoDismissMs: Long = 4500L,
) {
    val visible = !message.isNullOrBlank()

    LaunchedEffect(message) {
        if (message.isNullOrBlank()) return@LaunchedEffect
        delay(autoDismissMs)
        onDismiss()
    }

    AnimatedVisibility(
        visible = visible,
        enter = slideInVertically { -it } + fadeIn(),
        exit = slideOutVertically { -it } + fadeOut(),
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        val shape = RoundedCornerShape(18.dp)
        val isDark = LiquidTheme.isDark
        val fill = if (isDark) LiquidGlass.Rose.copy(alpha = 0.14f) else Color(0xFFFFF1F2)
        val stroke = if (isDark) LiquidGlass.Rose.copy(alpha = 0.35f) else Color(0xFFFECACA)
        val textColor = if (isDark) Color(0xFFFDA4AF) else Color(0xFFE11D48)

        Row(
            Modifier
                .fillMaxWidth()
                .shadow(
                    elevation = 14.dp,
                    shape = shape,
                    ambientColor = LiquidGlass.Rose.copy(alpha = 0.18f),
                    spotColor = LiquidGlass.Rose.copy(alpha = 0.22f),
                )
                .clip(shape)
                .background(fill)
                .border(1.dp, stroke, shape)
                .clickable(onClick = onDismiss)
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            androidx.compose.foundation.layout.            Box(
                Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(LiquidGlass.Rose.copy(alpha = 0.16f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Default.ErrorOutline,
                    contentDescription = null,
                    tint = textColor,
                    modifier = Modifier.size(18.dp),
                )
            }
            Spacer(Modifier.width(12.dp))
            Text(
                message.orEmpty(),
                color = textColor,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                lineHeight = 18.sp,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(8.dp))
            Icon(
                Icons.Default.Close,
                contentDescription = null,
                tint = textColor.copy(alpha = 0.70f),
                modifier = Modifier
                    .size(18.dp)
                    .clickable(onClick = onDismiss),
            )
        }
    }
}
