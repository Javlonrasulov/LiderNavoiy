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
import androidx.core.graphics.drawable.toDrawable

private const val BADGE_COLOR = 0xFFEF4444.toInt()

/**
 * Standalone modern “3D” truck (no circle / pin bubble).
 * Optional count badge when one vehicle carries several orders.
 */
fun createTruckMarkerDrawable(context: Context, orderCount: Int, sizeDp: Int = 52): Drawable {
    val d = context.resources.displayMetrics.density
    val w = (sizeDp * d).toInt().coerceAtLeast(64)
    val h = (w * 0.78f).toInt()
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)

    // Soft ground shadow under wheels
    val shadow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        shader = RadialGradient(
            w * 0.50f, h * 0.92f, w * 0.42f,
            intArrayOf(0x66000000, 0x00000000),
            floatArrayOf(0.15f, 1f),
            Shader.TileMode.CLAMP,
        )
    }
    canvas.drawOval(RectF(w * 0.12f, h * 0.82f, w * 0.90f, h * 0.98f), shadow)

    drawIsoTruck(canvas, w.toFloat(), h.toFloat(), d)

    if (orderCount > 1) {
        val badgeR = 10f * d
        val bx = w - badgeR * 1.1f
        val by = badgeR * 1.05f
        val badgeShadow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0x55000000
            maskFilter = android.graphics.BlurMaskFilter(2.5f * d, android.graphics.BlurMaskFilter.Blur.NORMAL)
        }
        canvas.drawCircle(bx + d, by + d, badgeR, badgeShadow)
        val badgeFill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = BADGE_COLOR
            style = Paint.Style.FILL
        }
        val badgeStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.WHITE
            style = Paint.Style.STROKE
            strokeWidth = 2.2f * d
        }
        canvas.drawCircle(bx, by, badgeR, badgeFill)
        canvas.drawCircle(bx, by, badgeR, badgeStroke)
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.WHITE
            textAlign = Paint.Align.CENTER
            textSize = 11.5f * d
            typeface = Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD)
        }
        val label = if (orderCount > 9) "9+" else orderCount.toString()
        val textY = by - (textPaint.descent() + textPaint.ascent()) / 2f
        canvas.drawText(label, bx, textY, textPaint)
    }

    return bmp.toDrawable(context.resources)
}

/** Isometric-ish delivery van with depth faces + highlight. */
private fun drawIsoTruck(canvas: Canvas, w: Float, h: Float, d: Float) {
    val left = w * 0.08f
    val right = w * 0.92f
    val top = h * 0.10f
    val bottom = h * 0.72f
    val depth = w * 0.11f
    val cabSplit = left + (right - left) * 0.62f

    // Side (darker) — depth face of cargo
    val sidePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = 0xFF1E40AF.toInt()
    }
    val cargoSide = Path().apply {
        moveTo(cabSplit, top + h * 0.06f)
        lineTo(cabSplit + depth * 0.55f, top)
        lineTo(right + depth * 0.15f, top)
        lineTo(right, top + h * 0.06f)
        lineTo(right, bottom - h * 0.08f)
        lineTo(cabSplit, bottom - h * 0.08f)
        close()
    }
    canvas.drawPath(cargoSide, sidePaint)

    // Cargo body front face (gradient blue)
    val cargoPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        shader = LinearGradient(
            left, top,
            left, bottom,
            0xFF60A5FA.toInt(),
            0xFF2563EB.toInt(),
            Shader.TileMode.CLAMP,
        )
    }
    val cargo = RectF(left, top + h * 0.06f, cabSplit, bottom - h * 0.08f)
    canvas.drawRoundRect(cargo, 4f * d, 4f * d, cargoPaint)

    // Top highlight strip on cargo
    val gloss = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        shader = LinearGradient(
            left, top + h * 0.06f,
            left, top + h * 0.28f,
            0x66FFFFFF, 0x00FFFFFF,
            Shader.TileMode.CLAMP,
        )
    }
    canvas.drawRoundRect(
        RectF(left + 2f * d, top + h * 0.08f, cabSplit - 2f * d, top + h * 0.26f),
        3f * d, 3f * d, gloss,
    )

    // Cab side depth
    val cabSide = Path().apply {
        moveTo(cabSplit, top + h * 0.22f)
        lineTo(cabSplit + depth * 0.45f, top + h * 0.14f)
        lineTo(right + depth * 0.05f, top + h * 0.14f)
        lineTo(right - w * 0.02f, top + h * 0.22f)
        lineTo(right - w * 0.02f, bottom - h * 0.08f)
        lineTo(cabSplit, bottom - h * 0.08f)
        close()
    }
    canvas.drawPath(cabSide, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF1D4ED8.toInt()
        style = Paint.Style.FILL
    })

    // Cab front
    val cabPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        shader = LinearGradient(
            cabSplit, top + h * 0.18f,
            cabSplit, bottom,
            0xFF3B82F6.toInt(),
            0xFF1E3A8A.toInt(),
            Shader.TileMode.CLAMP,
        )
    }
    val cab = Path().apply {
        moveTo(cabSplit - 1f * d, top + h * 0.22f)
        lineTo(right - w * 0.06f, top + h * 0.22f)
        lineTo(right - w * 0.02f, top + h * 0.38f)
        lineTo(right - w * 0.02f, bottom - h * 0.08f)
        lineTo(cabSplit - 1f * d, bottom - h * 0.08f)
        close()
    }
    canvas.drawPath(cab, cabPaint)

    // Windshield (glass)
    val glass = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        shader = LinearGradient(
            cabSplit, top + h * 0.24f,
            right, top + h * 0.42f,
            0xFFDBEAFE.toInt(),
            0xFF93C5FD.toInt(),
            Shader.TileMode.CLAMP,
        )
    }
    canvas.drawRoundRect(
        RectF(
            cabSplit + 3f * d,
            top + h * 0.26f,
            right - w * 0.08f,
            top + h * 0.42f,
        ),
        2.5f * d, 2.5f * d, glass,
    )

    // Bumper
    canvas.drawRoundRect(
        RectF(cabSplit + 2f * d, bottom - h * 0.16f, right - w * 0.04f, bottom - h * 0.08f),
        2f * d, 2f * d,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFE2E8F0.toInt() },
    )

    // Door line
    canvas.drawLine(
        cabSplit + (right - cabSplit) * 0.45f,
        top + h * 0.44f,
        cabSplit + (right - cabSplit) * 0.45f,
        bottom - h * 0.16f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0x442563EB
            strokeWidth = 1.5f * d
        },
    )

    // Wheels with 3D rim
    drawWheel(canvas, left + (cabSplit - left) * 0.28f, bottom - h * 0.02f, h * 0.13f, d)
    drawWheel(canvas, left + (cabSplit - left) * 0.72f, bottom - h * 0.02f, h * 0.13f, d)
    drawWheel(canvas, cabSplit + (right - cabSplit) * 0.55f, bottom - h * 0.02f, h * 0.13f, d)

    // Thin white outline for map contrast
    val outline = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = 0xDDFFFFFF.toInt()
        strokeWidth = 1.6f * d
    }
    canvas.drawRoundRect(cargo, 4f * d, 4f * d, outline)
}

private fun drawWheel(canvas: Canvas, cx: Float, cy: Float, r: Float, d: Float) {
    canvas.drawCircle(cx, cy + d, r, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0x66000000
        style = Paint.Style.FILL
    })
    canvas.drawCircle(cx, cy, r, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF0F172A.toInt()
        style = Paint.Style.FILL
    })
    canvas.drawCircle(cx, cy, r * 0.55f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF64748B.toInt()
        style = Paint.Style.FILL
    })
    canvas.drawCircle(cx, cy, r * 0.22f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFE2E8F0.toInt()
        style = Paint.Style.FILL
    })
}

fun createDeliveryPinDrawable(context: Context, sizeDp: Int = 36): Drawable {
    val d = context.resources.displayMetrics.density
    val w = (sizeDp * d).toInt().coerceAtLeast(42)
    val h = (w * 1.22f).toInt()
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)

    val cx = w / 2f
    val bubbleR = w * 0.36f
    val bubbleCy = h * 0.38f

    val shadow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        shader = RadialGradient(
            cx, h * 0.92f, w * 0.26f,
            intArrayOf(0x44000000, 0x00000000),
            floatArrayOf(0f, 1f),
            Shader.TileMode.CLAMP,
        )
    }
    canvas.drawOval(
        RectF(cx - w * 0.26f, h * 0.86f, cx + w * 0.26f, h * 0.98f),
        shadow,
    )

    val pin = Path().apply {
        addCircle(cx, bubbleCy, bubbleR, Path.Direction.CW)
        moveTo(cx - bubbleR * 0.42f, bubbleCy + bubbleR * 0.55f)
        quadTo(cx, bubbleCy + bubbleR * 1.55f, cx + bubbleR * 0.42f, bubbleCy + bubbleR * 0.55f)
        close()
    }
    val pinPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        shader = LinearGradient(
            cx, bubbleCy - bubbleR,
            cx, bubbleCy + bubbleR * 1.4f,
            0xFFA78BFA.toInt(),
            0xFF6D28D9.toInt(),
            Shader.TileMode.CLAMP,
        )
    }
    canvas.drawPath(pin, pinPaint)

    val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = 0xEEFFFFFF.toInt()
        strokeWidth = 2.2f * d
    }
    canvas.drawCircle(cx, bubbleCy, bubbleR * 0.92f, ring)

    val core = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.WHITE
        style = Paint.Style.FILL
    }
    canvas.drawCircle(cx, bubbleCy, bubbleR * 0.28f, core)

    return BitmapDrawable(context.resources, bmp)
}
