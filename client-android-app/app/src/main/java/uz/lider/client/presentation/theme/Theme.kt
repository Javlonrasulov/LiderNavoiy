package uz.lider.client.presentation.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = ClientColors.Primary,
    secondary = ClientColors.Secondary,
    tertiary = ClientColors.Accent,
    background = ClientColors.BgDark,
    surface = ClientColors.Surface,
    onPrimary = Color.White,
    onSecondary = Color(0xFF0D1028),
    onBackground = ClientColors.Text,
    onSurface = ClientColors.Text,
    onSurfaceVariant = ClientColors.TextMuted,
    error = ClientColors.Danger,
)

private val LightColorScheme = lightColorScheme(
    primary = ClientColors.PrimaryLight,
    secondary = ClientColors.SecondaryLight,
    tertiary = ClientColors.AccentLight,
    background = ClientColors.BgLight,
    surface = ClientColors.SurfaceLight,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = ClientColors.TextLight,
    onSurface = ClientColors.TextLight,
    onSurfaceVariant = ClientColors.TextMutedLight,
    error = ClientColors.DangerLight,
)

@Composable
fun ClientTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme,
        content = content,
    )
}
