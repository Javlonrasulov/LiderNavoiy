package uz.lider.client.presentation.tracking

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable

private const val BADGE_COLOR = 0xFFEF4444.toInt()

/** Map pin status — matches web StoreMarkerStatus. */
enum class StoreMarkerStatus {
    ACTIVE,
    APPROACHING,
    CLOSED,
    SELECTED,
}

fun StoreMarkerStatus.pinColor(): Int = when (this) {
    StoreMarkerStatus.ACTIVE -> 0xFF22C55E.toInt()
    StoreMarkerStatus.APPROACHING -> 0xFFEAB308.toInt()
    StoreMarkerStatus.CLOSED -> 0xFFEF4444.toInt()
    StoreMarkerStatus.SELECTED -> 0xFF3B82F6.toInt()
}

private fun Bitmap.asMarkerDrawable(context: Context): Drawable =
    BitmapDrawable(context.resources, this).apply {
        setBounds(0, 0, width, height)
    }

/**
 * Admin «Xodimlar joylashuvi» dostavkachi markeriga mos:
 * yashil doira + 🚚 + online badge.
 * Ixtiyoriy `orgLabel` — doira **ustida** org shortName.
 */
data class TruckMarkerIcon(
    val drawable: Drawable,
    /** Geo-nuqta bog‘lanadigan doira markazi (0..1). */
    val discAnchorY: Float,
)

fun createTruckMarkerDrawable(
    context: Context,
    orderCount: Int,
    sizeDp: Int = 36,
    online: Boolean = true,
    orgLabel: String? = null,
): TruckMarkerIcon {
    val d = context.resources.displayMetrics.density
    val disc = (sizeDp * d).toInt().coerceIn(36, 96)
    val badgeExtra = if (orderCount > 1) (12 * d).toInt() else 0
    val pad = (4 * d).toInt()
    val label = orgLabel?.trim()?.takeIf { it.isNotEmpty() }
    val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF111827.toInt()
        textAlign = Paint.Align.CENTER
        textSize = 10f * d
        typeface = Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD)
        isFakeBoldText = true
    }
    val labelGap = 2f * d
    val labelBlockH = if (label != null) {
        val textH = labelPaint.descent() - labelPaint.ascent()
        textH + 4f * d + labelGap
    } else {
        0f
    }
    val outW = maxOf(
        disc + pad * 2 + badgeExtra,
        if (label != null) (labelPaint.measureText(label) + 10f * d).toInt() else 0,
    )
    val outH = (labelBlockH + disc + pad * 2).toInt()
    val bmp = Bitmap.createBitmap(outW, outH, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)

    val cx = outW / 2f
    val discTop = pad + labelBlockH
    val cy = discTop + disc / 2f
    val r = disc / 2f
    val discAnchorY = cy / outH

    // Label — mashina ustida
    if (label != null) {
        val pillPadX = 5f * d
        val pillPadY = 2f * d
        val tw = labelPaint.measureText(label)
        val textH = labelPaint.descent() - labelPaint.ascent()
        val pillW = tw + pillPadX * 2
        val pillH = textH + pillPadY * 2
        val pillLeft = cx - pillW / 2f
        val pillTop = pad.toFloat()
        val pillRect = RectF(pillLeft, pillTop, pillLeft + pillW, pillTop + pillH)
        canvas.drawRoundRect(
            pillRect,
            pillH / 2f,
            pillH / 2f,
            Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xF0FFFFFF.toInt() },
        )
        canvas.drawRoundRect(
            pillRect,
            pillH / 2f,
            pillH / 2f,
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = 1f * d
                color = 0x33000000
            },
        )
        canvas.drawText(
            label,
            cx,
            pillTop + pillPadY - labelPaint.ascent(),
            labelPaint,
        )
    }

    // Admin: delivery online = #10b981, border #6ee7b7
    val fill = if (online) 0xFF10B981.toInt() else 0xFF6B7280.toInt()
    val ring = if (online) 0xFF6EE7B7.toInt() else 0xFF9CA3AF.toInt()

    canvas.drawCircle(
        cx, cy + 1.5f * d,
        r,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = RadialGradient(
                cx, cy + 1.5f * d, r * 1.05f,
                intArrayOf(0x66000000, 0x00000000),
                floatArrayOf(0.55f, 1f),
                Shader.TileMode.CLAMP,
            )
        },
    )

    canvas.drawCircle(cx, cy, r, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = fill })
    canvas.drawCircle(
        cx, cy, r - 1.2f * d,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 2.5f * d
            color = ring
        },
    )

    val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER
        textSize = disc * 0.48f
    }
    val emojiY = cy - (emojiPaint.descent() + emojiPaint.ascent()) / 2f
    canvas.drawText("🚚", cx, emojiY, emojiPaint)

    if (online) {
        val br = 5f * d
        val bx = cx + r * 0.55f
        val by = cy + r * 0.55f
        canvas.drawCircle(bx, by, br + 1.5f * d, Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.WHITE
        })
        canvas.drawCircle(bx, by, br, Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF22C55E.toInt()
        })
    }

    if (orderCount > 1) {
        val countR = 9f * d
        val bx = outW - countR - 1f * d
        val by = discTop + countR + 1f * d
        canvas.drawCircle(bx, by, countR, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = BADGE_COLOR })
        canvas.drawCircle(
            bx, by, countR,
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = android.graphics.Color.WHITE
                style = Paint.Style.STROKE
                strokeWidth = 2f * d
            },
        )
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.WHITE
            textAlign = Paint.Align.CENTER
            textSize = 10.5f * d
            typeface = Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD)
        }
        val countLabel = if (orderCount > 9) "9+" else orderCount.toString()
        canvas.drawText(countLabel, bx, by - (textPaint.descent() + textPaint.ascent()) / 2f, textPaint)
    }

    return TruckMarkerIcon(
        drawable = bmp.asMarkerDrawable(context),
        discAnchorY = discAnchorY,
    )
}

/**
 * Premium glass disc marker (Uber / Apple Maps) — NOT a Google pin.
 * Layer 1: round glass · Layer 2: 2px stroke store · Layer 3: soft 10dp droplet.
 */
fun createDeliveryPinDrawable(
    context: Context,
    sizeDp: Int = 48,
    status: StoreMarkerStatus = StoreMarkerStatus.APPROACHING,
    primaryColor: Int = 0xFF3B82F6.toInt(),
    dark: Boolean = false,
): Drawable {
    val d = context.resources.displayMetrics.density
    val selected = status == StoreMarkerStatus.SELECTED
    val scale = if (selected) 1.08f else 1f
    val disc = (sizeDp * d * scale).toInt().coerceIn(44, 120)
    val pointer = (10f * d * scale).toInt().coerceAtLeast(8)
    val pad = (6f * d).toInt()
    val outW = disc + pad * 2
    val outH = disc + pointer + pad
    val bmp = Bitmap.createBitmap(outW, outH, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)

    val cx = outW / 2f
    val cy = pad + disc / 2f
    val r = disc / 2f

    // Soft ground / selected glow
    if (selected) {
        canvas.drawCircle(
            cx, cy,
            r * 0.92f,
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                shader = RadialGradient(
                    cx, cy, r * 1.15f,
                    intArrayOf(
                        (primaryColor and 0x00FFFFFF) or 0x59000000,
                        0x00000000,
                    ),
                    floatArrayOf(0.35f, 1f),
                    Shader.TileMode.CLAMP,
                )
            },
        )
    }
    canvas.drawOval(
        RectF(cx - r * 0.55f, outH - pad * 0.35f - 4f * d, cx + r * 0.55f, outH.toFloat()),
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = RadialGradient(
                cx, outH - pad * 0.2f, r * 0.55f,
                intArrayOf(0x2E000000, 0x00000000),
                floatArrayOf(0.2f, 1f),
                Shader.TileMode.CLAMP,
            )
        },
    )

    // Disc soft shadow (no BlurMaskFilter — hardware canvas safe)
    canvas.drawCircle(
        cx, cy + 3f * d,
        r * 0.92f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = RadialGradient(
                cx, cy + 3f * d, r,
                intArrayOf(0x33000000, 0x00000000),
                floatArrayOf(0.55f, 1f),
                Shader.TileMode.CLAMP,
            )
        },
    )

    // Layer 1 — glass / solid disc
    val discPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        when {
            selected -> shader = LinearGradient(
                cx - r, cy - r, cx + r, cy + r,
                primaryColor,
                0xFF6366F1.toInt(),
                Shader.TileMode.CLAMP,
            )
            dark -> color = 0xFF1E293B.toInt()
            else -> color = 0xEFFFFFFF.toInt()
        }
    }
    canvas.drawCircle(cx, cy, r, discPaint)
    canvas.drawCircle(
        cx, cy, r,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 1.2f * d
            color = 0x66FFFFFF
        },
    )

    // Layer 2 — stroke store (55% of disc)
    val iconColor = if (selected || dark) 0xFFFFFFFF.toInt() else primaryColor
    val iconSize = disc * 0.55f
    drawStrokeStoreIcon(
        canvas = canvas,
        cx = cx,
        cy = cy,
        size = iconSize,
        dens = d,
        color = iconColor,
    )

    // Online status badge (top-right 8dp)
    val badgeR = 4f * d
    val online = when (status) {
        StoreMarkerStatus.ACTIVE -> 0xFF22C55E.toInt()
        StoreMarkerStatus.APPROACHING -> 0xFFEAB308.toInt()
        StoreMarkerStatus.CLOSED -> 0xFFEF4444.toInt()
        StoreMarkerStatus.SELECTED -> 0xFF22C55E.toInt()
    }
    val bx = cx + r * 0.62f
    val by = cy - r * 0.62f
    canvas.drawCircle(bx, by, badgeR + 1.6f * d, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.WHITE
    })
    canvas.drawCircle(bx, by, badgeR, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = online })

    // Layer 3 — soft 10dp droplet (not Google pin)
    val dropTop = cy + r - 1.5f * d
    val dropBottom = dropTop + pointer
    val drop = Path().apply {
        moveTo(cx - 6f * d, dropTop)
        lineTo(cx + 6f * d, dropTop)
        quadTo(cx + 2.2f * d, dropTop + pointer * 0.55f, cx, dropBottom)
        quadTo(cx - 2.2f * d, dropTop + pointer * 0.55f, cx - 6f * d, dropTop)
        close()
    }
    canvas.drawPath(
        drop,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = when {
                selected -> primaryColor
                dark -> 0xFF1E293B.toInt()
                else -> 0xFFFFFFFF.toInt()
            }
            alpha = if (selected) 242 else 235
        },
    )

    return bmp.asMarkerDrawable(context)
}

/** SF Symbols–style stroke storefront — never filled clipart. */
private fun drawStrokeStoreIcon(
    canvas: Canvas,
    cx: Float,
    cy: Float,
    size: Float,
    dens: Float,
    color: Int,
) {
    val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        this.color = color
        style = Paint.Style.STROKE
        strokeWidth = (size * 0.085f).coerceAtLeast(1.8f * dens)
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    val left = cx - size * 0.5f
    val top = cy - size * 0.5f
    val s = size

    // Awning line + roof
    canvas.drawLine(left + s * 0.12f, top + s * 0.38f, left + s * 0.88f, top + s * 0.38f, stroke)
    val roof = Path().apply {
        moveTo(left + s * 0.16f, top + s * 0.38f)
        lineTo(left + s * 0.28f, top + s * 0.18f)
        lineTo(left + s * 0.72f, top + s * 0.18f)
        lineTo(left + s * 0.84f, top + s * 0.38f)
    }
    canvas.drawPath(roof, stroke)

    // Body
    val body = Path().apply {
        moveTo(left + s * 0.20f, top + s * 0.38f)
        lineTo(left + s * 0.20f, top + s * 0.82f)
        quadTo(left + s * 0.20f, top + s * 0.88f, left + s * 0.26f, top + s * 0.88f)
        lineTo(left + s * 0.74f, top + s * 0.88f)
        quadTo(left + s * 0.80f, top + s * 0.88f, left + s * 0.80f, top + s * 0.82f)
        lineTo(left + s * 0.80f, top + s * 0.38f)
    }
    canvas.drawPath(body, stroke)

    // Vitrine
    canvas.drawRoundRect(
        RectF(left + s * 0.28f, top + s * 0.46f, left + s * 0.48f, top + s * 0.66f),
        s * 0.04f, s * 0.04f, stroke,
    )

    // Door
    val door = Path().apply {
        moveTo(left + s * 0.56f, top + s * 0.88f)
        lineTo(left + s * 0.56f, top + s * 0.52f)
        quadTo(left + s * 0.56f, top + s * 0.48f, left + s * 0.60f, top + s * 0.48f)
        lineTo(left + s * 0.70f, top + s * 0.48f)
        quadTo(left + s * 0.74f, top + s * 0.48f, left + s * 0.74f, top + s * 0.52f)
        lineTo(left + s * 0.74f, top + s * 0.88f)
    }
    canvas.drawPath(door, stroke)

    // Handle
    canvas.drawPoint(
        left + s * 0.68f,
        top + s * 0.66f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color
            style = Paint.Style.STROKE
            strokeWidth = (size * 0.10f).coerceAtLeast(2.2f * dens)
            strokeCap = Paint.Cap.ROUND
        },
    )
}

/** Numbered route stop disc — 1…N (isYou = green). */
fun createNumberedStopDrawable(
    context: Context,
    sequence: Int,
    isYou: Boolean,
    sizeDp: Int = 36,
): Drawable {
    val dens = context.resources.displayMetrics.density
    val size = (sizeDp * dens).toInt().coerceIn(32, 72)
    val pad = (4f * dens).toInt()
    val out = size + pad * 2
    val bmp = Bitmap.createBitmap(out, out, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val cx = out / 2f
    val cy = out / 2f
    val r = size / 2f
    val fill = if (isYou) 0xFF22C55E.toInt() else 0xFF6366F1.toInt()

    canvas.drawCircle(
        cx,
        cy + 2f * dens,
        r * 0.92f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x33000000 },
    )
    canvas.drawCircle(cx, cy, r, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = fill })
    canvas.drawCircle(
        cx,
        cy,
        r,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFFFFFFFF.toInt()
            style = Paint.Style.STROKE
            strokeWidth = 2.5f * dens
        },
    )
    val label = sequence.toString()
    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFFFFF.toInt()
        textAlign = Paint.Align.CENTER
        typeface = Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD)
        textSize = when {
            label.length >= 3 -> r * 0.85f
            label.length == 2 -> r * 1.05f
            else -> r * 1.2f
        }
    }
    canvas.drawText(
        label,
        cx,
        cy - (textPaint.descent() + textPaint.ascent()) / 2f,
        textPaint,
    )
    return bmp.asMarkerDrawable(context)
}
