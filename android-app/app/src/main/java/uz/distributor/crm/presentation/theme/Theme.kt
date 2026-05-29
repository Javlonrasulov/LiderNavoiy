package uz.distributor.crm.presentation.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF6366F1),
    secondary = Color(0xFF7B5CF6),
    background = Color(0xFFF9FAFB),
    surface = Color.White,
)

@Composable
fun DistributorTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = LightColors, content = content)
}
