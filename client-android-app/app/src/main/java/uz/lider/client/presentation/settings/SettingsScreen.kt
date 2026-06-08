package uz.lider.client.presentation.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.localization.AppLanguage
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.clientCard
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.rememberClientPalette

@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val darkMode by viewModel.darkMode.collectAsState()
    val language by viewModel.language.collectAsState()
    val palette = rememberClientPalette()

    ClientStackScaffold(title = localized("com_settings"), onBack = onBack) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Column(Modifier.clientCard(palette).padding(16.dp)) {
                    Text(localized("com_settings"), color = palette.textMuted, fontSize = 12.sp)
                    Spacer(Modifier.size(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        ThemeOption(
                            label = localized("com_theme_dark"),
                            icon = Icons.Default.DarkMode,
                            selected = darkMode,
                            modifier = Modifier.weight(1f),
                            onClick = { viewModel.setDarkMode(true) },
                        )
                        ThemeOption(
                            label = localized("com_theme_light"),
                            icon = Icons.Default.LightMode,
                            selected = !darkMode,
                            modifier = Modifier.weight(1f),
                            onClick = { viewModel.setDarkMode(false) },
                        )
                    }
                }
            }
            item {
                Column(Modifier.clientCard(palette).padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.Language, null, tint = palette.primary, modifier = Modifier.size(18.dp))
                        Text(localized("com_language"), color = palette.textMuted, fontSize = 12.sp)
                    }
                    Spacer(Modifier.size(12.dp))
                    AppLanguage.menuOrder.forEach { lang ->
                        LanguageRow(lang = lang, selected = language == lang, onClick = { viewModel.setLanguage(lang) })
                        Spacer(Modifier.size(8.dp))
                    }
                }
            }
            item {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(palette.primary.copy(alpha = 0.1f))
                        .padding(16.dp),
                ) {
                    Text(
                        "${if (darkMode) "🌙" else "☀️"} ${if (darkMode) localized("com_theme_dark") else localized("com_theme_light")} • ${language.menuLabel}",
                        color = palette.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

@Composable
private fun ThemeOption(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val palette = rememberClientPalette()
    Column(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(if (selected) palette.primary.copy(alpha = 0.12f) else palette.surface2)
            .clickable(onClick = onClick)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(icon, null, tint = if (selected) palette.primary else palette.textMuted, modifier = Modifier.size(28.dp))
        Spacer(Modifier.size(8.dp))
        Text(label, color = if (selected) palette.primary else palette.textMuted, fontSize = 13.sp)
        if (selected) {
            Box(Modifier.size(20.dp).clip(CircleShape).background(palette.primary), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.size(12.dp))
            }
        }
    }
}

@Composable
private fun LanguageRow(lang: AppLanguage, selected: Boolean, onClick: () -> Unit) {
    val palette = rememberClientPalette()
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) palette.primary.copy(alpha = 0.12f) else palette.surface2)
            .clickable(onClick = onClick)
            .padding(12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(lang.menuLabel, color = if (selected) palette.primary else palette.text, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal)
        if (selected) {
            Box(Modifier.size(20.dp).clip(CircleShape).background(palette.primary), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.size(12.dp))
            }
        }
    }
}
