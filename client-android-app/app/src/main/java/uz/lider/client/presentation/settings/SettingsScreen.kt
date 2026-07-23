package uz.lider.client.presentation.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.NightlightRound
import androidx.compose.material.icons.filled.SettingsBrightness
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.data.repository.ThemeMode
import uz.lider.client.localization.AppLanguage
import uz.lider.client.presentation.components.ClientPullToRefresh
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassThemed
import kotlinx.coroutines.delay

@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val themeMode by viewModel.themeMode.collectAsState()
    val language  by viewModel.language.collectAsState()
    val text      = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted

    ClientStackScaffold(title = localized("com_settings"), onBack = onBack) { padding ->
        LiquidBackground(modifier = Modifier.fillMaxSize()) {
            ClientPullToRefresh(
                onRefresh = { delay(350) },
                modifier = Modifier.padding(padding),
            ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {

                // ── Theme section ───────────────────────────────────────────
                item {
                    Column {
                        SectionHeader(localized("com_settings"))
                        Spacer(Modifier.height(10.dp))
                        // 3 rows (full-width each)
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            GlassThemeRow(
                                label = localized("com_theme_dark"),
                                subtitle = themeModeSubtitle(ThemeMode.DARK, language),
                                icon = Icons.Default.NightlightRound,
                                selected = themeMode == ThemeMode.DARK,
                                accentGradient = Brush.linearGradient(
                                    listOf(LiquidGlass.Indigo, LiquidGlass.Violet),
                                ),
                                onClick = { viewModel.setThemeMode(ThemeMode.DARK) },
                            )
                            GlassThemeRow(
                                label = localized("com_theme_light"),
                                subtitle = themeModeSubtitle(ThemeMode.LIGHT, language),
                                icon = Icons.Default.WbSunny,
                                selected = themeMode == ThemeMode.LIGHT,
                                accentGradient = Brush.linearGradient(
                                    listOf(LiquidGlass.Amber, LiquidGlass.Cyan),
                                ),
                                onClick = { viewModel.setThemeMode(ThemeMode.LIGHT) },
                            )
                            GlassThemeRow(
                                label = localized("com_theme_system"),
                                subtitle = themeModeSubtitle(ThemeMode.SYSTEM, language),
                                icon = Icons.Default.SettingsBrightness,
                                selected = themeMode == ThemeMode.SYSTEM,
                                accentGradient = Brush.linearGradient(
                                    listOf(LiquidGlass.Emerald, LiquidGlass.Cyan),
                                ),
                                onClick = { viewModel.setThemeMode(ThemeMode.SYSTEM) },
                            )
                        }
                    }
                }

                // ── Language section ────────────────────────────────────────
                item {
                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Box(
                                Modifier
                                    .size(22.dp)
                                    .clip(CircleShape)
                                    .background(
                                        Brush.linearGradient(
                                            listOf(LiquidGlass.Cyan, LiquidGlass.Emerald),
                                        )
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    Icons.Default.Language,
                                    null,
                                    tint = Color.White,
                                    modifier = Modifier.size(13.dp),
                                )
                            }
                            Text(
                                localized("com_language").uppercase(),
                                color = textMuted,
                                fontSize = 11.sp,
                                letterSpacing = 1.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                        Spacer(Modifier.height(10.dp))
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .liquidGlassThemed()
                                .padding(vertical = 6.dp),
                        ) {
                            AppLanguage.menuOrder.forEachIndexed { i, lang ->
                                if (i > 0) {
                                    Box(
                                        Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp)
                                            .height(1.dp)
                                            .background(Color.White.copy(alpha = 0.07f)),
                                    )
                                }
                                GlassLanguageRow(
                                    lang = lang,
                                    selected = language == lang,
                                    onClick = { viewModel.setLanguage(lang) },
                                )
                            }
                        }
                    }
                }

                // ── Active summary pill ─────────────────────────────────────
                item {
                    val themeEmoji = when (themeMode) {
                        ThemeMode.DARK   -> "🌙"
                        ThemeMode.LIGHT  -> "☀️"
                        ThemeMode.SYSTEM -> "📱"
                    }
                    val themeLabel = when (themeMode) {
                        ThemeMode.DARK   -> localized("com_theme_dark")
                        ThemeMode.LIGHT  -> localized("com_theme_light")
                        ThemeMode.SYSTEM -> localized("com_theme_system")
                    }
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(50.dp))
                            .background(
                                Brush.linearGradient(
                                    listOf(
                                        LiquidGlass.Indigo.copy(alpha = 0.35f),
                                        LiquidGlass.Violet.copy(alpha = 0.25f),
                                    )
                                )
                            )
                            .border(
                                1.dp,
                                Brush.linearGradient(
                                    listOf(
                                        LiquidGlass.Indigo.copy(alpha = 0.7f),
                                        LiquidGlass.Violet.copy(alpha = 0.3f),
                                    )
                                ),
                                RoundedCornerShape(50.dp),
                            )
                            .padding(horizontal = 20.dp, vertical = 12.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "$themeEmoji $themeLabel • ${language.menuLabel}",
                            color = text,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                        )
                    }
                }
            }
            }
        }
    }
}

private fun themeModeSubtitle(mode: ThemeMode, lang: AppLanguage): String = when (mode) {
    ThemeMode.DARK -> when (lang) {
        AppLanguage.UZ -> "Har doim tungi rejim"
        AppLanguage.UZ_KRIL -> "Ҳар доим тунги режим"
        AppLanguage.RU -> "Всегда тёмная тема"
        AppLanguage.EN -> "Always dark theme"
    }
    ThemeMode.LIGHT -> when (lang) {
        AppLanguage.UZ -> "Har doim kunduzgi rejim"
        AppLanguage.UZ_KRIL -> "Ҳар доим кундузги режим"
        AppLanguage.RU -> "Всегда светлая тема"
        AppLanguage.EN -> "Always light theme"
    }
    ThemeMode.SYSTEM -> when (lang) {
        AppLanguage.UZ -> "Telefon sozlamasiga qarab"
        AppLanguage.UZ_KRIL -> "Телефон созламасига қараб"
        AppLanguage.RU -> "Следует настройке телефона"
        AppLanguage.EN -> "Follows phone setting"
    }
}

@Composable
private fun GlassThemeRow(
    label: String,
    subtitle: String,
    icon: ImageVector,
    selected: Boolean,
    accentGradient: Brush,
    onClick: () -> Unit,
) {
    val text      = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    val isDark    = LiquidTheme.isDark
    val shape     = RoundedCornerShape(18.dp)

    val bgBrush = if (selected)
        Brush.linearGradient(listOf(LiquidGlass.Indigo.copy(alpha = 0.22f), LiquidGlass.Violet.copy(alpha = 0.14f)))
    else if (isDark)
        Brush.linearGradient(listOf(Color.White.copy(alpha = 0.10f), Color.White.copy(alpha = 0.06f)))
    else
        Brush.linearGradient(listOf(Color.Black.copy(alpha = 0.05f), Color.Black.copy(alpha = 0.02f)))

    val borderBrush = if (selected) accentGradient
    else if (isDark)
        Brush.linearGradient(listOf(Color.White.copy(0.28f), Color.White.copy(0.10f)))
    else
        Brush.linearGradient(listOf(Color.Black.copy(0.14f), Color.Black.copy(0.05f)))

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(bgBrush)
            .border(width = if (selected) 2.dp else 1.dp, brush = borderBrush, shape = shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // Icon bubble
        Box(
            Modifier
                .size(46.dp)
                .clip(CircleShape)
                .background(if (selected) accentGradient else
                    if (isDark) Brush.linearGradient(listOf(Color.White.copy(0.12f), Color.White.copy(0.07f)))
                    else Brush.linearGradient(listOf(Color.Black.copy(0.07f), Color.Black.copy(0.03f)))
                ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = if (selected) Color.White else textMuted,
                modifier = Modifier.size(22.dp),
            )
        }
        // Labels
        Column(modifier = Modifier.weight(1f)) {
            Text(
                label,
                color = if (selected) text else textMuted,
                fontSize = 15.sp,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            )
            Text(
                subtitle,
                color = textMuted.copy(alpha = 0.7f),
                fontSize = 12.sp,
            )
        }
        // Checkmark
        if (selected) {
            Box(
                Modifier
                    .size(22.dp)
                    .clip(CircleShape)
                    .background(accentGradient),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.size(12.dp))
            }
        }
    }
}

@Composable
private fun SectionHeader(label: String) {
    val textMuted = LiquidTheme.textMuted
    Text(
        label.uppercase(),
        color = textMuted,
        fontSize = 11.sp,
        letterSpacing = 1.sp,
        fontWeight = FontWeight.SemiBold,
    )
}

@Composable
private fun GlassThemeCard(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    accentGradient: Brush,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val text      = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    val isDark    = LiquidTheme.isDark
    val shape     = RoundedCornerShape(20.dp)

    val unselectedBg = if (isDark)
        Brush.linearGradient(listOf(Color.White.copy(alpha = 0.12f), Color.White.copy(alpha = 0.08f)))
    else
        Brush.linearGradient(listOf(Color.Black.copy(alpha = 0.06f), Color.Black.copy(alpha = 0.03f)))

    val unselectedBorder = if (isDark)
        Brush.linearGradient(listOf(Color.White.copy(0.35f), Color.White.copy(0.12f)))
    else
        Brush.linearGradient(listOf(Color.Black.copy(0.18f), Color.Black.copy(0.06f)))

    val unselectedIconBg = if (isDark)
        Brush.linearGradient(listOf(Color.White.copy(0.10f), Color.White.copy(0.06f)))
    else
        Brush.linearGradient(listOf(Color.Black.copy(0.06f), Color.Black.copy(0.03f)))

    Box(
        modifier
            .clip(shape)
            .background(
                if (selected)
                    Brush.linearGradient(
                        listOf(
                            LiquidGlass.Indigo.copy(alpha = 0.30f),
                            LiquidGlass.Violet.copy(alpha = 0.20f),
                        )
                    )
                else
                    unselectedBg
            )
            .border(
                width = if (selected) 2.dp else 1.dp,
                brush = if (selected) accentGradient else unselectedBorder,
                shape = shape,
            )
            .clickable(onClick = onClick)
            .padding(12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(if (selected) accentGradient else unselectedIconBg),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    icon,
                    null,
                    tint = if (selected) Color.White else textMuted,
                    modifier = Modifier.size(20.dp),
                )
            }
            Text(
                label,
                color = if (selected) text else textMuted,
                fontSize = 11.sp,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            if (selected) {
                Box(
                    Modifier
                        .size(18.dp)
                        .clip(CircleShape)
                        .background(accentGradient),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.Check,
                        null,
                        tint = Color.White,
                        modifier = Modifier.size(10.dp),
                    )
                }
            } else {
                Spacer(Modifier.height(18.dp))
            }
        }
    }
}

@Composable
private fun GlassLanguageRow(lang: AppLanguage, selected: Boolean, onClick: () -> Unit) {
    val text      = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(
                if (selected)
                    Brush.linearGradient(
                        listOf(
                            LiquidGlass.Indigo.copy(alpha = 0.22f),
                            LiquidGlass.Violet.copy(alpha = 0.12f),
                        )
                    )
                else
                    Brush.linearGradient(listOf(Color.Transparent, Color.Transparent))
            )
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(
                        if (selected)
                            Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Violet))
                        else
                            Brush.linearGradient(
                                listOf(
                                    textMuted.copy(alpha = 0.4f),
                                    textMuted.copy(alpha = 0.2f),
                                )
                            )
                    ),
            )
            Text(
                lang.menuLabel,
                color = if (selected) text else textMuted,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            )
        }
        if (selected) {
            Box(
                Modifier
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Violet)),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Default.Check,
                    null,
                    tint = Color.White,
                    modifier = Modifier.size(11.dp),
                )
            }
        }
    }
}
