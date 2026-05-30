package uz.distributor.crm.presentation.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = SherinColors.Primary,
    secondary = Color(0xFF7B5CF6),
    background = SherinColors.PageBgLight,
    surface = Color.White,
    onSurface = Color(0xFF111827),
    onSurfaceVariant = Color(0xFF6B7280),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF818CF8),
    secondary = Color(0xFFA78BFA),
    background = SherinColors.PageBgDark,
    surface = SherinColors.CardDark,
    onSurface = Color(0xFFF9FAFB),
    onSurfaceVariant = Color(0xFF9CA3AF),
)

@Composable
fun DistributorTheme(
    darkTheme: Boolean,
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
