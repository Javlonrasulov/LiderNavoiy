package uz.lider.client.presentation.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Modern text-color presets applied app-wide via [LiquidTheme.text] / [LiquidTheme.textMuted].
 */
enum class TextTone(val code: String) {
    DEFAULT("default"),
    NAVY("navy"),
    TEAL("teal"),
    VIOLET("violet"),
    ROSE("rose"),
    AMBER("amber"),
    EMERALD("emerald"),
    SLATE("slate");

    /** Swatch shown in the picker (always vivid). */
    val swatch: Color
        get() = when (this) {
            DEFAULT -> Color(0xFF0F172A)
            NAVY -> Color(0xFF2563EB)
            TEAL -> Color(0xFF0D9488)
            VIOLET -> Color(0xFF7C3AED)
            ROSE -> Color(0xFFE11D48)
            AMBER -> Color(0xFFD97706)
            EMERALD -> Color(0xFF059669)
            SLATE -> Color(0xFF475569)
        }

    fun primary(isDark: Boolean): Color = when (this) {
        DEFAULT -> if (isDark) LiquidGlass.TextWhite else LiquidGlass.TextDark
        NAVY -> if (isDark) Color(0xFFBFDBFE) else Color(0xFF1E3A8A)
        TEAL -> if (isDark) Color(0xFF99F6E4) else Color(0xFF115E59)
        VIOLET -> if (isDark) Color(0xFFE9D5FF) else Color(0xFF5B21B6)
        ROSE -> if (isDark) Color(0xFFFECDD3) else Color(0xFF9F1239)
        AMBER -> if (isDark) Color(0xFFFDE68A) else Color(0xFF92400E)
        EMERALD -> if (isDark) Color(0xFFA7F3D0) else Color(0xFF065F46)
        SLATE -> if (isDark) Color(0xFFE2E8F0) else Color(0xFF1E293B)
    }

    fun muted(isDark: Boolean): Color = when (this) {
        DEFAULT -> if (isDark) LiquidGlass.TextWhiteMuted else LiquidGlass.TextDarkMuted
        NAVY -> if (isDark) Color(0x99BFDBFE) else Color(0xFF64748B)
        TEAL -> if (isDark) Color(0x9999F6E4) else Color(0xFF0F766E)
        VIOLET -> if (isDark) Color(0x99E9D5FF) else Color(0xFF7C3AED)
        ROSE -> if (isDark) Color(0x99FECDD3) else Color(0xFFBE123C)
        AMBER -> if (isDark) Color(0x99FDE68A) else Color(0xFFB45309)
        EMERALD -> if (isDark) Color(0x99A7F3D0) else Color(0xFF047857)
        SLATE -> if (isDark) Color(0x99E2E8F0) else Color(0xFF64748B)
    }

    companion object {
        fun fromCode(code: String?): TextTone =
            entries.firstOrNull { it.code == code } ?: DEFAULT
    }
}

val LocalTextTone = compositionLocalOf { TextTone.DEFAULT }

val TextTone.currentPrimary: Color
    @Composable @ReadOnlyComposable get() = primary(LocalClientDark.current)

val TextTone.currentMuted: Color
    @Composable @ReadOnlyComposable get() = muted(LocalClientDark.current)
