package uz.lider.client.presentation.tracking

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable

private const val BADGE_COLOR = 0xFFEF4444.toInt()

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
 * Admin uslubiga mos do‘kon (🏪): qizil tom, sariq vitrina.
 */
fun createDeliveryPinDrawable(context: Context, sizeDp: Int = 32): Drawable {
    val d = context.resources.displayMetrics.density
    val w = (sizeDp * d).toInt().coerceIn(36, 88)
    val h = (w * 0.92f).toInt()
    val outH = h + (5 * d).toInt()
    val bmp = Bitmap.createBitmap(w, outH, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)

    canvas.drawOval(
        RectF(w * 0.18f, outH * 0.84f, w * 0.82f, outH * 0.98f),
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = RadialGradient(
                w * 0.5f, outH * 0.93f, w * 0.30f,
                intArrayOf(0x38000000, 0x00000000),
                floatArrayOf(0.2f, 1f),
                Shader.TileMode.CLAMP,
            )
        },
    )

    canvas.save()
    canvas.translate(0f, (outH - h - 2 * d).coerceAtLeast(0f))
    drawAdminStore(canvas, w.toFloat(), h.toFloat(), d)
    canvas.restore()

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

    // Cargo box
    canvas.drawRoundRect(
        RectF(w * 0.06f, h * 0.18f, w * 0.58f, h * 0.68f),
        3f * dens, 3f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = cargo },
    )
    // Cargo side stripe / panel
    canvas.drawRect(
        w * 0.10f, h * 0.28f, w * 0.54f, h * 0.38f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = cargoDark },
    )
    // Cab
    canvas.drawRoundRect(
        RectF(w * 0.54f, h * 0.30f, w * 0.92f, h * 0.68f),
        4f * dens, 4f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = cab },
    )
    // Cab roof
    canvas.drawRoundRect(
        RectF(w * 0.58f, h * 0.18f, w * 0.88f, h * 0.36f),
        3.5f * dens, 3.5f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = cabDark },
    )
    // Windshield
    canvas.drawRoundRect(
        RectF(w * 0.62f, h * 0.24f, w * 0.84f, h * 0.42f),
        2.5f * dens, 2.5f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = glass },
    )
    // Bumper / grill
    canvas.drawRoundRect(
        RectF(w * 0.88f, h * 0.48f, w * 0.96f, h * 0.62f),
        1.5f * dens, 1.5f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = bumper },
    )
    // Headlight
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

/** Flat storefront — red awning + cream building (admin 🏪 uslubi). */
private fun drawAdminStore(canvas: Canvas, w: Float, h: Float, dens: Float) {
    val wall = 0xFFFEF3C7.toInt()
    val wallEdge = 0xFFFDE68A.toInt()
    val roof = 0xFFEF4444.toInt()
    val roofDark = 0xFFDC2626.toInt()
    val awning = 0xFFF97316.toInt()
    val awningAlt = 0xFFFEE2E2.toInt()
    val glass = 0xFF93C5FD.toInt()
    val door = 0xFF92400E.toInt()
    val sign = 0xFF1E293B.toInt()

    // Building body
    canvas.drawRoundRect(
        RectF(w * 0.14f, h * 0.34f, w * 0.86f, h * 0.86f),
        3f * dens, 3f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = wall },
    )
    canvas.drawRect(
        w * 0.14f, h * 0.34f, w * 0.20f, h * 0.86f,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = wallEdge },
    )

    // Pitched roof
    canvas.drawPath(
        Path().apply {
            moveTo(w * 0.08f, h * 0.38f)
            lineTo(w * 0.50f, h * 0.10f)
            lineTo(w * 0.92f, h * 0.38f)
            close()
        },
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = roof },
    )
    canvas.drawPath(
        Path().apply {
            moveTo(w * 0.50f, h * 0.10f)
            lineTo(w * 0.92f, h * 0.38f)
            lineTo(w * 0.86f, h * 0.38f)
            lineTo(w * 0.50f, h * 0.16f)
            close()
        },
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = roofDark },
    )

    // Awning stripes
    val aTop = h * 0.38f
    val aBot = h * 0.50f
    val stripe = w * 0.12f
    var i = 0
    var x = w * 0.14f
    while (x < w * 0.86f - 1f) {
        canvas.drawRect(
            x, aTop, (x + stripe).coerceAtMost(w * 0.86f), aBot,
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = if (i % 2 == 0) awning else awningAlt
            },
        )
        x += stripe
        i++
    }

    // Sign board
    canvas.drawRoundRect(
        RectF(w * 0.28f, h * 0.42f, w * 0.72f, h * 0.52f),
        2f * dens, 2f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = sign },
    )

    // Window + door
    canvas.drawRoundRect(
        RectF(w * 0.22f, h * 0.56f, w * 0.48f, h * 0.78f),
        2f * dens, 2f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = glass },
    )
    canvas.drawRoundRect(
        RectF(w * 0.54f, h * 0.56f, w * 0.74f, h * 0.84f),
        2f * dens, 2f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = door },
    )
    canvas.drawCircle(
        w * 0.70f, h * 0.70f, 1.4f * dens,
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFDE68A.toInt() },
    )
}
