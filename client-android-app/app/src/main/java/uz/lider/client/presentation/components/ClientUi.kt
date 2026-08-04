package uz.lider.client.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import uz.lider.client.domain.model.OrderStatus
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.AppStrings
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.theme.ClientColors
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LocalTextTone
import uz.lider.client.presentation.theme.PremiumHeaderButton
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

@Composable
fun ProductImageBox(
    imageUrl: String?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
) {
    if (!imageUrl.isNullOrBlank()) {
        val context = LocalContext.current
        val palette = rememberClientPalette()
        AsyncImage(
            model = ImageRequest.Builder(context)
                .data(imageUrl)
                .crossfade(true)
                .build(),
            contentDescription = contentDescription,
            modifier = modifier.background(palette.surface2),
            contentScale = contentScale,
        )
    } else {
        NoProductImagePlaceholder(modifier = modifier)
    }
}

@Composable
private fun NoProductImagePlaceholder(modifier: Modifier = Modifier) {
    val palette = rememberClientPalette()
    Box(
        modifier = modifier.background(palette.surface2),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            localized("no_image"),
            color = palette.textMuted,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(8.dp),
        )
    }
}

fun isDecimalUnit(unit: String): Boolean {
    val normalized = unit.trim().lowercase()
    return normalized in setOf("kg", "кг", "g", "gr", "gram", "l", "litr", "л")
}

fun formatQty(qty: Double): String =
    if (qty % 1.0 == 0.0) qty.toInt().toString() else qty.toString()

fun cartBadgeCount(items: List<uz.lider.client.domain.model.CartItem>): Int = items.size

@Immutable
data class ClientPalette(
    val text: Color,
    val textMuted: Color,
    val primary: Color,
    val secondary: Color,
    val accent: Color,
    val success: Color,
    val warning: Color,
    val danger: Color,
    val surface: Color,
    val surface2: Color,
    val card: Color,
    val border: Color,
    val navBg: Color,
    val input: Color,
)

@Composable
fun rememberClientPalette(): ClientPalette {
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val tone = LocalTextTone.current
    val text = tone.primary(isDark)
    val textMuted = tone.muted(isDark)
    return remember(isDark, tone) {
        if (isDark) {
            ClientPalette(
                text = text,
                textMuted = textMuted,
                primary = ClientColors.Primary,
                secondary = ClientColors.Secondary,
                accent = ClientColors.Accent,
                success = ClientColors.Success,
                warning = ClientColors.Warning,
                danger = ClientColors.Danger,
                surface = ClientColors.Surface,
                surface2 = ClientColors.Surface2,
                card = ClientColors.Card,
                border = ClientColors.Border,
                navBg = ClientColors.NavBg,
                input = ClientColors.Surface2,
            )
        } else {
            ClientPalette(
                text = text,
                textMuted = textMuted,
                primary = ClientColors.PrimaryLight,
                secondary = ClientColors.SecondaryLight,
                accent = ClientColors.AccentLight,
                success = ClientColors.SuccessLight,
                warning = ClientColors.WarningLight,
                danger = ClientColors.DangerLight,
                surface = ClientColors.SurfaceLight,
                surface2 = ClientColors.Surface2Light,
                card = ClientColors.SurfaceLight,
                border = ClientColors.BorderStrong,
                navBg = ClientColors.NavBgLight,
                input = ClientColors.Surface2Light,
            )
        }
    }
}

@Composable
fun localized(key: String): String = AppStrings.t(LocalAppLanguage.current, key)

fun formatMoney(value: Double): String {
    val symbols = DecimalFormatSymbols(Locale.US).apply {
        groupingSeparator = ','
        decimalSeparator = '.'
    }
    return DecimalFormat("#,##0", symbols).format(value)
}

fun formatChartAmount(
    value: Double,
    currency: String? = null,
    lang: AppLanguage = AppLanguage.DEFAULT,
): String {
    val cur = currency ?: AppStrings.t(lang, "com_som")
    return "${formatCompactMoney(value, lang)} $cur"
}

/**
 * Grafik / kalendar: K/M emas — «ming» / «million»
 * (masalan: 860 ming, 1.5 million).
 */
fun formatCompactMoney(value: Double, lang: AppLanguage = AppLanguage.DEFAULT): String {
    val sign = if (value < 0) "-" else ""
    val v = kotlin.math.abs(value)
    val body = when {
        v >= 1_000_000_000 -> {
            val n = v / 1_000_000_000.0
            val num = if (n >= 10 || n == n.toLong().toDouble()) {
                String.format(Locale.US, "%.0f", n)
            } else {
                String.format(Locale.US, "%.1f", n).trimEnd('0').trimEnd('.')
            }
            "$num ${AppStrings.t(lang, "com_billion")}"
        }
        v >= 1_000_000 -> {
            val n = v / 1_000_000.0
            val num = if (n >= 10 || n == n.toLong().toDouble()) {
                String.format(Locale.US, "%.0f", n)
            } else {
                String.format(Locale.US, "%.1f", n).trimEnd('0').trimEnd('.')
            }
            "$num ${AppStrings.t(lang, "com_million")}"
        }
        v >= 1_000 -> {
            val n = v / 1_000.0
            val num = if (n == n.toLong().toDouble()) {
                String.format(Locale.US, "%.0f", n)
            } else {
                String.format(Locale.US, "%.1f", n).trimEnd('0').trimEnd('.')
            }
            "$num ${AppStrings.t(lang, "com_thousand")}"
        }
        else -> formatMoney(v)
    }
    return sign + body
}

fun formatOrderId(id: String): String =
    "#${id.replace("-", "").take(8).uppercase()}"

fun orderDisplayLabel(lang: AppLanguage, id: String): String =
    "${AppStrings.t(lang, "dash_order")} ${formatOrderId(id)}"

fun orderStatusKey(status: String): String = when (OrderStatus.fromKey(status)) {
    OrderStatus.PENDING -> "ord_status_received"
    OrderStatus.CONFIRMED -> "ord_status_warehouse"
    OrderStatus.PACKING -> "ord_status_packing"
    OrderStatus.ON_WAY -> "ord_status_onway"
    OrderStatus.DELIVERED -> "ord_status_delivered"
    OrderStatus.CANCELLED -> "ord_status_cancelled"
}

fun orderStatusLabel(lang: AppLanguage, status: String): String =
    AppStrings.t(lang, orderStatusKey(status))

fun orderStatusColor(status: String, palette: ClientPalette): Color = when (OrderStatus.fromKey(status)) {
    OrderStatus.PENDING -> palette.primary
    OrderStatus.CONFIRMED -> palette.secondary
    OrderStatus.PACKING -> palette.warning
    OrderStatus.ON_WAY -> palette.secondary
    OrderStatus.DELIVERED -> palette.success
    OrderStatus.CANCELLED -> palette.danger
}

@Composable
fun ClientBackButton(onBack: () -> Unit, modifier: Modifier = Modifier) {
    PremiumHeaderButton(
        icon = Icons.AutoMirrored.Filled.ArrowBack,
        onClick = onBack,
        modifier = modifier,
        tint = LiquidGlass.Indigo,
        contentDescription = localized("com_back"),
        size = 36.dp,
        iconSize = 18.dp,
    )
}

fun Modifier.clientCard(palette: ClientPalette): Modifier = this
    .clip(RoundedCornerShape(16.dp))
    .background(palette.card)
    .border(1.dp, palette.border, RoundedCornerShape(16.dp))

@Composable
fun Modifier.clientPageBackground(): Modifier =
    background(MaterialTheme.colorScheme.background)
