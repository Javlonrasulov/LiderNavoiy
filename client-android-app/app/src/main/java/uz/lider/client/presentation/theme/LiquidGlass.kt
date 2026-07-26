package uz.lider.client.presentation.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.Image
import android.os.Build
import uz.lider.client.R

// ─── Liquid Glass Color Tokens ───────────────────────────────────────────────

object LiquidGlass {

    // Dark backgrounds (fintech deep black)
    val BgDark      = Color(0xFF05070F)
    val BgMidDark   = Color(0xFF0B1220)

    // Light backgrounds
    val BgLight     = Color(0xFFF5F7FC)
    val BgMidLight  = Color(0xFFEEF2FA)

    // Dark glass layers
    val GlassDark            = Color(0x22FFFFFF)
    val GlassDarkStrong      = Color(0x33FFFFFF)
    val GlassDarkBorder      = Color(0x44FFFFFF)
    val GlassDarkBorderStrong= Color(0x77FFFFFF)

    // Light glass layers
    val GlassLight           = Color(0xB8FFFFFF)
    val GlassLightStrong     = Color(0xDDFFFFFF)
    val GlassLightBorder     = Color(0x88FFFFFF)

    // Accent palette — Primary Blue + Accent Cyan (premium fintech)
    val Indigo   = Color(0xFF2563EB)
    val IndigoLight = Color(0xFF3B82F6)
    val Cyan     = Color(0xFF22D3EE)
    val Violet   = Color(0xFF7C3AED)
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

    // Corner radii (Premium UI spec)
    val RadiusCard  = 24.dp
    val RadiusButton = 20.dp
    val RadiusNav   = 28.dp
    val RadiusSearch = 20.dp
    val RadiusDialog = 24.dp
    val RadiusWidget = 22.dp
    val RadiusChip  = 50.dp
    val RadiusInput = 20.dp
    val RadiusSheet = 28.dp

    // Soft premium shadows (never harsh black)
    val ShadowAmbient = Color(0x332563EB)
    val ShadowSpot = Color(0x287C3AED)

    // Static gradients
    val GradientPrimary = Brush.linearGradient(
        listOf(Indigo, Violet, Cyan),
        start = Offset(0f, 0f), end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY)
    )
    val GradientHeroDark = Brush.verticalGradient(
        listOf(
            Color(0x9905070F),
            Color(0xCC05070F),
            Color(0xFF05070F),
        ),
    )
    val GradientHeroLight = Brush.verticalGradient(
        listOf(
            Color(0x6605070F),
            Color(0xAA0B1220),
            Color(0xFFF5F7FC),
        ),
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
            LocalTextTone.current.primary(LocalClientDark.current)

    val textMuted: Color
        @Composable @ReadOnlyComposable get() =
            LocalTextTone.current.muted(LocalClientDark.current)

    val glassAlpha: Float
        @Composable @ReadOnlyComposable get() =
            if (LocalClientDark.current) 0.16f else 0.55f

    val glassBorderAlpha: Float
        @Composable @ReadOnlyComposable get() =
            if (LocalClientDark.current) 0.28f else 0.55f
}

// ─── Modifier extensions ─────────────────────────────────────────────────────

/** Dark-mode liquid glass card */
fun Modifier.liquidGlassDark(
    radius: Dp = LiquidGlass.RadiusCard,
    alpha: Float = 0.16f,
    borderAlpha: Float = 0.28f,
): Modifier {
    val shape = RoundedCornerShape(radius)
    return this
        .shadow(
            elevation = 12.dp,
            shape = shape,
            ambientColor = LiquidGlass.ShadowAmbient,
            spotColor = LiquidGlass.ShadowSpot,
        )
        .clip(shape)
        .background(Color.White.copy(alpha = alpha))
        .border(
            width = 1.dp,
            brush = Brush.linearGradient(
                listOf(
                    Color.White.copy(alpha = borderAlpha * 2f),
                    LiquidGlass.Indigo.copy(alpha = 0.22f),
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
        .shadow(
            elevation = 10.dp,
            shape = shape,
            ambientColor = LiquidGlass.ShadowAmbient,
            spotColor = LiquidGlass.ShadowSpot,
        )
        .clip(shape)
        .background(Color.White.copy(alpha = 0.62f))
        .border(
            width = 1.dp,
            brush = Brush.linearGradient(
                listOf(
                    Color.White.copy(alpha = 0.95f),
                    LiquidGlass.Cyan.copy(alpha = 0.25f),
                    Color.White.copy(alpha = 0.55f),
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

/** Floating bottom nav glass — no clip so tab badges are not cut off. */
@Composable
fun Modifier.liquidGlassNav(
    radius: Dp = LiquidGlass.RadiusNav,
): Modifier {
    val isDark = LocalClientDark.current
    val shape = RoundedCornerShape(radius)
    return this
        .shadow(
            elevation = 18.dp,
            shape = shape,
            clip = false,
            ambientColor = LiquidGlass.ShadowAmbient,
            spotColor = LiquidGlass.ShadowSpot,
        )
        .background(
            if (isDark) Color.White.copy(alpha = 0.18f)
            else Color.White.copy(alpha = 0.92f),
            shape,
        )
        .border(
            width = 1.dp,
            brush = Brush.linearGradient(
                listOf(
                    Color.White.copy(alpha = if (isDark) 0.45f else 0.85f),
                    LiquidGlass.Indigo.copy(alpha = 0.18f),
                    Color.White.copy(alpha = if (isDark) 0.12f else 0.35f),
                ),
            ),
            shape = shape,
        )
}

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
fun GlassFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(LiquidGlass.RadiusChip)
    val interactionSource = remember { MutableInteractionSource() }
    Box(
        modifier = modifier
            .then(
                if (selected) {
                    Modifier
                        .clip(shape)
                        .background(LiquidGlass.GradientPrimary)
                } else {
                    Modifier.liquidGlassThemed(radius = LiquidGlass.RadiusChip)
                },
            )
            .clickable(
                indication = null,
                interactionSource = interactionSource,
                onClick = onClick,
            )
            .padding(horizontal = 14.dp, vertical = 8.dp),
    ) {
        Text(
            label,
            color = if (selected) Color.White else LiquidTheme.textMuted,
            fontSize = 13.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}

@Composable
fun GlassIconButton(
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tint: Color = LiquidTheme.text,
    contentDescription: String? = null,
    size: Dp = 42.dp,
) {
    Box(
        modifier = modifier
            .size(size)
            .liquidGlassThemed(radius = LiquidGlass.RadiusChip)
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = tint,
            modifier = Modifier.size(20.dp),
        )
    }
}

@Composable
fun PremiumPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val shape = RoundedCornerShape(LiquidGlass.RadiusButton)
    Box(
        modifier = modifier
            .clip(shape)
            .background(
                if (enabled) LiquidGlass.GradientPrimary
                else Brush.linearGradient(listOf(Color.Gray, Color.Gray)),
            )
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
    }
}

@Composable
fun GlassSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    leadingIcon: ImageVector? = null,
    trailing: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .liquidGlassThemed(radius = LiquidGlass.RadiusSearch)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leadingIcon != null) {
            Icon(leadingIcon, null, tint = LiquidTheme.textMuted, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
        }
        androidx.compose.foundation.text.BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            textStyle = androidx.compose.ui.text.TextStyle(
                color = LiquidTheme.text,
                fontSize = 15.sp,
                lineHeight = 22.sp,
            ),
            modifier = Modifier.weight(1f),
            decorationBox = { inner ->
                if (value.isEmpty()) {
                    Text(placeholder, color = LiquidTheme.textMuted, fontSize = 15.sp)
                }
                inner()
            },
        )
        if (trailing != null) {
            Spacer(Modifier.width(8.dp))
            trailing()
        }
    }
}

@Composable
fun HeroHeaderBackground(
    modifier: Modifier = Modifier,
    height: Dp = 280.dp,
    clipBottom: Boolean = true,
    content: @Composable BoxScope.() -> Unit = {},
) {
    val isDark = LiquidTheme.isDark
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .then(
                if (clipBottom) Modifier.clip(RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp))
                else Modifier,
            ),
    ) {
        Image(
            painter = painterResource(R.drawable.bg_home_hero),
            contentDescription = null,
            // FillWidth + TopCenter — same as Asosiy; avoids cropping the side pillar into view
            contentScale = ContentScale.FillWidth,
            alignment = Alignment.TopCenter,
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight(align = Alignment.Top)
                .align(Alignment.TopCenter),
        )
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colorStops = arrayOf(
                            0.0f to Color.Black.copy(alpha = if (isDark) 0.28f else 0.14f),
                            0.45f to Color.Black.copy(alpha = if (isDark) 0.12f else 0.05f),
                            1.0f to Color.Transparent,
                        ),
                    ),
                ),
        )
        content()
    }
}

/**
 * Fixed hero image behind the top of the dashboard (header → “Jami xaridlar”).
 * [fadeProgress] 0 = sharp photo, 1 = blurred + fully washed to page background.
 */
@Composable
fun FixedHeroBackdrop(
    fadeProgress: Float,
    modifier: Modifier = Modifier,
) {
    val isDark = LiquidTheme.isDark
    val fade = fadeProgress.coerceIn(0f, 1f)
    val wash = (fade * fade * 0.35f + fade * 0.65f).coerceIn(0f, 1f)
    val blurRadius = (fade * 22f).dp
    val pageBg = if (isDark) LiquidGlass.BgDark else LiquidGlass.BgLight
    Box(modifier = modifier.clipToBounds()) {
        Image(
            painter = painterResource(R.drawable.bg_home_hero),
            contentDescription = null,
            // Fill width so the photo isn’t over-cropped; pin to top so domes/sky stay visible.
            contentScale = ContentScale.FillWidth,
            alignment = Alignment.TopCenter,
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight(align = Alignment.Top)
                .align(Alignment.TopCenter)
                .then(
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && fade > 0.02f) {
                        Modifier.blur(radius = blurRadius)
                    } else {
                        Modifier
                    },
                ),
        )
        // Light top shade only — keep photo clear; just enough for white header text
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colorStops = arrayOf(
                            0.0f to Color.Black.copy(alpha = if (isDark) 0.22f else 0.10f),
                            0.28f to Color.Black.copy(alpha = if (isDark) 0.10f else 0.04f),
                            0.55f to Color.Transparent,
                            1.0f to Color.Transparent,
                        ),
                    ),
                ),
        )
        // Soft bottom edge → page bg (only the last strip)
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colorStops = arrayOf(
                            0.0f to Color.Transparent,
                            0.82f to Color.Transparent,
                            1.0f to pageBg,
                        ),
                    ),
                ),
        )
        // Scroll wash → blur + white/dark (only while scrolling)
        if (wash > 0f) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(pageBg.copy(alpha = wash)),
            )
        }
    }
}

/** Elevated white/glass circle — MyGov-style header control (not a frosted chip). */
@Composable
fun PremiumHeaderButton(
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tint: Color = LiquidGlass.TextDark,
    contentDescription: String? = null,
    size: Dp = 40.dp,
) {
    val isDark = LiquidTheme.isDark
    Box(
        modifier = modifier
            .size(size)
            .shadow(
                elevation = 10.dp,
                shape = CircleShape,
                clip = false,
                ambientColor = Color.Black.copy(alpha = 0.10f),
                spotColor = Color.Black.copy(alpha = 0.14f),
            )
            .clip(CircleShape)
            .background(if (isDark) Color.White.copy(alpha = 0.18f) else Color.White.copy(alpha = 0.48f))
            .border(
                1.dp,
                if (isDark) Color.White.copy(alpha = 0.28f) else Color.White.copy(alpha = 0.65f),
                CircleShape,
            )
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = if (isDark) Color.White else tint,
            modifier = Modifier.size(20.dp),
        )
    }
}

/** Grouped header actions in one elevated pill (chat/bell style from MyGov). */
@Composable
fun PremiumHeaderActionPill(
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit,
) {
    val isDark = LiquidTheme.isDark
    val shape = RoundedCornerShape(50)
    Row(
        modifier = modifier
            .shadow(
                elevation = 10.dp,
                shape = shape,
                clip = false,
                ambientColor = Color.Black.copy(alpha = 0.10f),
                spotColor = Color.Black.copy(alpha = 0.14f),
            )
            // No clip — cart badges must draw fully (shadow defaults to clip=true).
            .background(
                if (isDark) Color.White.copy(alpha = 0.16f) else Color.White.copy(alpha = 0.48f),
                shape,
            )
            .border(
                1.dp,
                if (isDark) Color.White.copy(alpha = 0.25f) else Color.White.copy(alpha = 0.65f),
                shape,
            )
            .padding(start = 8.dp, end = 10.dp, top = 8.dp, bottom = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        content = content,
    )
}

@Composable
fun PremiumHeaderPillIcon(
    icon: ImageVector,
    onClick: () -> Unit,
    tint: Color = LiquidGlass.TextDark,
    contentDescription: String? = null,
) {
    val isDark = LiquidTheme.isDark
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = when {
                tint != LiquidGlass.TextDark -> tint
                isDark -> Color.White
                else -> tint
            },
            modifier = Modifier.size(20.dp),
        )
    }
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
