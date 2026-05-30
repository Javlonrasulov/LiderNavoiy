package uz.distributor.crm.presentation.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.distributor.crm.localization.AppLanguage

object SherinColors {
    val Primary = Color(0xFF6366F1)
    val PageBgLight = Color(0xFFF9FAFB)
    val PageBgDark = Color(0xFF000000)
    val NavBgDark = Color(0xFF111111)
    val CardDark = Color(0xFF111827)
    val CardRowDark = Color(0xFF1F2937)
    val CardRowLight = Color(0xFFF9FAFB)
    val NavInactiveLight = Color(0xFF9CA3AF)
    val NavInactiveDark = Color(0xFF6B7280)
    val NavBorderLight = Color(0xFFE5E7EB)

    val HeroGradientLight = listOf(
        Color(0xFF3B82F6),
        Color(0xFF4F46E5),
        Color(0xFF7C3AED),
    )
    val HeroGradientDark = listOf(
        Color(0xFF581C87),
        Color(0xFF312E81),
        Color(0xFF1E3A8A),
    )
}

@Composable
fun sherinPageBackground(isDark: Boolean): Color =
    if (isDark) SherinColors.PageBgDark else SherinColors.PageBgLight

@Composable
fun sherinHeroBrush(isDark: Boolean): Brush = Brush.linearGradient(
    if (isDark) SherinColors.HeroGradientDark else SherinColors.HeroGradientLight,
)

@Composable
fun SherinGlassIconButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector,
    size: androidx.compose.ui.unit.Dp = 40.dp,
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.10f))
            .border(1.dp, Color.White.copy(alpha = 0.20f), CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(size * 0.5f))
    }
}

@Composable
fun SherinDashboardHeader(
    companyName: String,
    agentName: String,
    isDark: Boolean,
    onProfileClick: () -> Unit,
    onLanguageClick: () -> Unit,
    onThemeClick: () -> Unit,
    languageMenu: @Composable () -> Unit = {},
    content: @Composable ColumnScope.() -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(sherinHeroBrush(isDark)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(top = 48.dp, bottom = 24.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SherinGlassIconButton(
                    onClick = onProfileClick,
                    icon = Icons.Default.Person,
                    size = 48.dp,
                )
                Text(
                    companyName,
                    modifier = Modifier.weight(1f),
                    color = Color.White.copy(0.95f),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
                Box {
                    SherinGlassIconButton(onClick = onLanguageClick, icon = Icons.Default.Language)
                    languageMenu()
                }
                Spacer(Modifier.width(8.dp))
                SherinGlassIconButton(
                    onClick = onThemeClick,
                    icon = if (isDark) Icons.Default.LightMode else Icons.Default.DarkMode,
                )
            }
            Spacer(Modifier.height(24.dp))
            content()
        }
    }
}

@Composable
fun SherinSubpageHeader(
    title: String,
    isDark: Boolean,
    onBack: () -> Unit,
    trailing: @Composable RowScope.() -> Unit = {},
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(sherinHeroBrush(isDark)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 16.dp)
                .padding(top = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SherinGlassIconButton(
                onClick = onBack,
                icon = Icons.AutoMirrored.Filled.ArrowBack,
                size = 40.dp,
            )
            Text(
                title,
                modifier = Modifier.weight(1f),
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            Row(content = trailing)
        }
    }
}
