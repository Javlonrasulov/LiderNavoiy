package uz.lider.client.presentation.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// ─── Liquid Glass Color Tokens ───────────────────────────────────────────────

object LiquidGlass {

    // Dark backgrounds
    val BgDark      = Color(0xFF060B18)
    val BgMidDark   = Color(0xFF0D1428)

    // Light backgrounds
    val BgLight     = Color(0xFFF0F4FF)
    val BgMidLight  = Color(0xFFE8EEFF)

    // Dark glass layers
    val GlassDark            = Color(0x22FFFFFF)
    val GlassDarkStrong      = Color(0x33FFFFFF)
    val GlassDarkBorder      = Color(0x44FFFFFF)
    val GlassDarkBorderStrong= Color(0x77FFFFFF)

    // Light glass layers
    val GlassLight           = Color(0xBBFFFFFF)
    val GlassLightStrong     = Color(0xDDFFFFFF)
    val GlassLightBorder     = Color(0x88FFFFFF)

    // Accent palette (same in both modes)
    val Indigo   = Color(0xFF6366F1)
    val IndigoLight = Color(0xFF818CF8)
    val Cyan     = Color(0xFF22D3EE)
    val Violet   = Color(0xFFA78BFA)
    val Pink     = Color(0xFFF472B6)
    val Emerald  = Color(0xFF34D399)
    val Amber    = Color(0xFFFBBF24)
    val Rose     = Color(0xFFFB7185)

    // Dark text
    val TextWhite      = Color(0xFFF8FAFF)
    val TextWhiteMuted = Color(0xAAE2E8FF)

    // Light text
    val TextDark       = Color(0xFF0F172A)
    val TextDarkMuted  = Color(0xFF64748B)

    // Corner radii
    val RadiusCard  = 24.dp
    val RadiusChip  = 50.dp
    val RadiusInput = 16.dp
    val RadiusSheet = 32.dp

    // Static gradients
    val GradientPrimary = Brush.linearGradient(
        listOf(Indigo, Violet, Cyan),
        start = Offset(0f, 0f), end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY)
    )
}

// ─── Themed accessors (read LocalClientDark) ────────────────────────────────

/** Reactive color tokens — automatically switch with dark/light theme. */
object LiquidTheme {
    val isDark: Boolean
        @Composable @ReadOnlyComposable get() = LocalClientDark.current

    val bg: Color
        @Composable @ReadOnlyComposable get() =
            if (LocalClientDark.current) LiquidGlass.BgDark else LiquidGlass.BgLight

    val bgMid: Color
        @Composable @ReadOnlyComposable get() =
            if (LocalClientDark.current) LiquidGlass.BgMidDark else LiquidGlass.BgMidLight

    val text: Color
        @Composable @ReadOnlyComposable get() =
            if (LocalClientDark.current) LiquidGlass.TextWhite else LiquidGlass.TextDark

    val textMuted: Color
        @Composable @ReadOnlyComposable get() =
            if (LocalClientDark.current) LiquidGlass.TextWhiteMuted else LiquidGlass.TextDarkMuted

    val glassAlpha: Float
        @Composable @ReadOnlyComposable get() =
            if (LocalClientDark.current) 0.18f else 0.72f

    val glassBorderAlpha: Float
        @Composable @ReadOnlyComposable get() =
            if (LocalClientDark.current) 0.28f else 0.55f
}

// ─── Modifier extensions ─────────────────────────────────────────────────────

/** Dark-mode liquid glass card */
fun Modifier.liquidGlassDark(
    radius: Dp = LiquidGlass.RadiusCard,
    alpha: Float = 0.18f,
    borderAlpha: Float = 0.28f,
): Modifier {
    val shape = RoundedCornerShape(radius)
    return this
        .clip(shape)
        .background(Color.White.copy(alpha = alpha))
        .border(
            width = 1.dp,
            brush = Brush.linearGradient(
                listOf(
                    Color.White.copy(alpha = borderAlpha * 2f),
                    Color.White.copy(alpha = borderAlpha),
                    Color.White.copy(alpha = borderAlpha * 0.3f),
                )
            ),
            shape = shape,
        )
}

/** Light-mode liquid glass card */
fun Modifier.liquidGlassLight(
    radius: Dp = LiquidGlass.RadiusCard,
): Modifier {
    val shape = RoundedCornerShape(radius)
    return this
        .clip(shape)
        .background(Color.White.copy(alpha = 0.72f))
        .border(
            width = 1.dp,
            brush = Brush.linearGradient(
                listOf(
                    Color.White.copy(alpha = 0.95f),
                    Color.White.copy(alpha = 0.60f),
                )
            ),
            shape = shape,
        )
}

/** Auto-selects dark or light glass based on the current theme. Use this in all screens. */
@Composable
fun Modifier.liquidGlassThemed(
    radius: Dp = LiquidGlass.RadiusCard,
): Modifier = if (LocalClientDark.current) liquidGlassDark(radius) else liquidGlassLight(radius)

fun Modifier.glowEffect(
    color: Color = LiquidGlass.Indigo,
    radius: Float = 120f,
): Modifier = this.drawBehind {
    drawCircle(
        brush = Brush.radialGradient(
            listOf(color.copy(alpha = 0.3f), Color.Transparent),
            center = center,
            radius = radius,
        ),
        radius = radius,
    )
}

// ─── Composable glass surface ────────────────────────────────────────────────

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    radius: Dp = LiquidGlass.RadiusCard,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = modifier.liquidGlassThemed(radius),
        content = content,
    )
}

@Composable
fun liquidGlassMenuShape(radius: Dp = 18.dp) = RoundedCornerShape(radius)

@Composable
fun liquidGlassMenuColors(): Pair<Color, Brush> {
    val isDark = LiquidTheme.isDark
    val fill = if (isDark) Color.White.copy(alpha = 0.12f) else Color.White.copy(alpha = 0.90f)
    val border = Brush.linearGradient(
        colors = listOf(
            Color.White.copy(alpha = if (isDark) 0.50f else 0.95f),
            LiquidGlass.Indigo.copy(alpha = 0.22f),
            LiquidGlass.Cyan.copy(alpha = 0.12f),
            Color.White.copy(alpha = if (isDark) 0.18f else 0.45f),
        ),
    )
    return fill to border
}

@Composable
fun LiquidGlassDropdownMenu(
    expanded: Boolean,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    val shape = liquidGlassMenuShape()
    val (fill, borderBrush) = liquidGlassMenuColors()
    DropdownMenu(
        expanded = expanded,
        onDismissRequest = onDismissRequest,
        modifier = modifier
            .shadow(20.dp, shape, ambientColor = LiquidGlass.Indigo.copy(alpha = 0.25f))
            .clip(shape)
            .background(fill)
            .border(1.dp, borderBrush, shape),
        shape = shape,
        containerColor = Color.Transparent,
        tonalElevation = 0.dp,
        shadowElevation = 0.dp,
    ) {
        Column(Modifier.padding(vertical = 6.dp, horizontal = 4.dp)) {
            content()
        }
    }
}

@Composable
fun LiquidGlassDropdownItem(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val itemShape = RoundedCornerShape(12.dp)
    DropdownMenuItem(
        text = {
            Text(
                text,
                color = if (selected) LiquidGlass.Indigo else LiquidTheme.text,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                fontSize = 14.sp,
            )
        },
        onClick = onClick,
        modifier = Modifier
            .padding(horizontal = 4.dp, vertical = 1.dp)
            .clip(itemShape)
            .background(
                if (selected) {
                    LiquidGlass.Indigo.copy(alpha = if (LiquidTheme.isDark) 0.22f else 0.12f)
                } else {
                    Color.Transparent
                },
            ),
    )
}

// ─── Page Background ────────────────────────────────────────────────────────

@Composable
fun LiquidBackground(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    val isDark = LocalClientDark.current
    Box(
        modifier = modifier
            .background(if (isDark) LiquidGlass.BgDark else LiquidGlass.BgLight)
            .drawBehind {
                // Top-left glow orb
                drawCircle(
                    brush = Brush.radialGradient(
                        listOf(
                            LiquidGlass.Indigo.copy(alpha = if (isDark) 0.22f else 0.08f),
                            Color.Transparent,
                        ),
                        center = Offset(size.width * 0.2f, size.height * 0.15f),
                        radius = size.width * 0.6f,
                    ),
                    radius = size.width * 0.6f,
                    center = Offset(size.width * 0.2f, size.height * 0.15f),
                )
                // Bottom-right glow orb
                drawCircle(
                    brush = Brush.radialGradient(
                        listOf(
                            LiquidGlass.Violet.copy(alpha = if (isDark) 0.15f else 0.06f),
                            Color.Transparent,
                        ),
                        center = Offset(size.width * 0.85f, size.height * 0.7f),
                        radius = size.width * 0.5f,
                    ),
                    radius = size.width * 0.5f,
                    center = Offset(size.width * 0.85f, size.height * 0.7f),
                )
                // Bottom-center orb
                drawCircle(
                    brush = Brush.radialGradient(
                        listOf(
                            LiquidGlass.Cyan.copy(alpha = if (isDark) 0.10f else 0.04f),
                            Color.Transparent,
                        ),
                        center = Offset(size.width * 0.5f, size.height * 0.9f),
                        radius = size.width * 0.4f,
                    ),
                    radius = size.width * 0.4f,
                    center = Offset(size.width * 0.5f, size.height * 0.9f),
                )
            },
        content = content,
    )
}
