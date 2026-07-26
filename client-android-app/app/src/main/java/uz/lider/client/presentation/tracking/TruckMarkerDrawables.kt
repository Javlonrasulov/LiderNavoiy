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
 * Admin xarita uslubi: yon ko‘rinishdagi sariq/to‘q sariq yuk mashinasi (🚚).
 */
fun createTruckMarkerDrawable(context: Context, orderCount: Int, sizeDp: Int = 36): Drawable {
    val d = context.resources.displayMetrics.density
    val w = (sizeDp * d).toInt().coerceIn(40, 96)
    val h = (w * 0.72f).toInt()
    val badgeExtra = if (orderCount > 1) (12 * d).toInt() else 0
    val outW = w + badgeExtra
    val outH = h + (5 * d).toInt()
    val bmp = Bitmap.createBitmap(outW, outH, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)

    canvas.drawOval(
        RectF(outW * 0.16f, outH * 0.82f, outW * 0.84f, outH * 0.98f),
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = RadialGradient(
                outW * 0.5f, outH * 0.92f, outW * 0.34f,
                intArrayOf(0x38000000, 0x00000000),
                floatArrayOf(0.2f, 1f),
                Shader.TileMode.CLAMP,
            )
        },
    )

    val ox = ((outW - w) / 2f).coerceAtLeast(0f)
    val oy = (outH - h - 3 * d).coerceAtLeast(0f)
    canvas.save()
    canvas.translate(ox, oy)
    drawAdminTruck(canvas, w.toFloat(), h.toFloat(), d)
    canvas.restore()

    if (orderCount > 1) {
        val badgeR = 9f * d
        val bx = outW - badgeR * 1.05f
        val by = badgeR * 1.0f
        canvas.drawCircle(bx, by, badgeR, Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = BADGE_COLOR
            style = Paint.Style.FILL
        })
        canvas.drawCircle(bx, by, badgeR, Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.WHITE
            style = Paint.Style.STROKE
            strokeWidth = 2f * d
        })
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.WHITE
            textAlign = Paint.Align.CENTER
            textSize = 10.5f * d
            typeface = Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD)
        }
        val label = if (orderCount > 9) "9+" else orderCount.toString()
        canvas.drawText(label, bx, by - (textPaint.descent() + textPaint.ascent()) / 2f, textPaint)
    }

    return bmp.asMarkerDrawable(context)
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

/** Flat side-profile truck — orange cab + yellow cargo (admin 🚚). */
private fun drawAdminTruck(canvas: Canvas, w: Float, h: Float, dens: Float) {
    val cargo = 0xFFFACC15.toInt()
    val cargoDark = 0xFFEAB308.toInt()
    val cab = 0xFFF97316.toInt()
    val cabDark = 0xFFEA580C.toInt()
    val glass = 0xFFBFDBFE.toInt()
    val tire = 0xFF1E293B.toInt()
    val rim = 0xFFE2E8F0.toInt()
    val bumper = 0xFF64748B.toInt()

    canvas.drawRoundRect(
        RectF(w * 0.06f, h * 0.18f, w * 0.58f, h * 0.68f),
        3f * dens, 3f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = cargo },
    )
    canvas.drawRect(
        w * 0.10f, h * 0.28f, w * 0.54f, h * 0.38f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = cargoDark },
    )
    canvas.drawRoundRect(
        RectF(w * 0.54f, h * 0.30f, w * 0.92f, h * 0.68f),
        4f * dens, 4f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = cab },
    )
    canvas.drawRoundRect(
        RectF(w * 0.58f, h * 0.18f, w * 0.88f, h * 0.36f),
        3.5f * dens, 3.5f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = cabDark },
    )
    canvas.drawRoundRect(
        RectF(w * 0.62f, h * 0.24f, w * 0.84f, h * 0.42f),
        2.5f * dens, 2.5f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = glass },
    )
    canvas.drawRoundRect(
        RectF(w * 0.88f, h * 0.48f, w * 0.96f, h * 0.62f),
        1.5f * dens, 1.5f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = bumper },
    )
    canvas.drawCircle(
        w * 0.90f, h * 0.52f, 2.2f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFEF08A.toInt() },
    )

    fun wheel(cx: Float, cy: Float, r: Float) {
        canvas.drawCircle(cx, cy, r, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = tire })
        canvas.drawCircle(cx, cy, r * 0.42f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = rim })
    }
    wheel(w * 0.24f, h * 0.72f, h * 0.14f)
    wheel(w * 0.46f, h * 0.72f, h * 0.14f)
    wheel(w * 0.74f, h * 0.72f, h * 0.14f)
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
