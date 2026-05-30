package uz.distributor.crm.presentation.plan

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun SherinRadialProgress(
    value: Int,
    color: Color,
    size: androidx.compose.ui.unit.Dp,
    textColor: Color,
    modifier: Modifier = Modifier,
) {
    Box(modifier.then(Modifier.size(size)), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val stroke = 10.dp.toPx()
            val radius = minOf(this.size.width, this.size.height) / 2f - stroke / 2
            val center = Offset(this.size.width / 2, this.size.height / 2)
            drawCircle(
                color = Color.Gray.copy(alpha = 0.15f),
                radius = radius,
                center = center,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
            val sweep = 360f * (value / 100f)
            drawArc(
                color = color,
                startAngle = -90f,
                sweepAngle = sweep,
                useCenter = false,
                topLeft = Offset(center.x - radius, center.y - radius),
                size = androidx.compose.ui.geometry.Size(radius * 2, radius * 2),
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
        }
        Text("$value%", color = textColor, fontSize = if (size < 80.dp) 13.sp else 18.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun SherinCatBars(sherin: Int, tim: Int, sir: Int, isDark: Boolean) {
    val items = listOf(
        Triple("Sherin", Color(0xFF818CF8), sherin),
        Triple("Tim", Color(0xFF34D399), tim),
        Triple("Sir", Color(0xFFFBBF24), sir),
    )
    val track = if (isDark) Color.White.copy(0.06f) else Color.Black.copy(0.06f)
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.Bottom,
    ) {
        items.forEach { (label, color, pct) ->
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(38.dp)) {
                Text("$pct%", fontSize = 11.sp, color = color)
                Spacer(Modifier.height(4.dp))
                Box(Modifier.width(38.dp).height(120.dp)) {
                    Canvas(Modifier.fillMaxSize()) {
                        drawRoundRect(track, cornerRadius = CornerRadius(12f, 12f))
                        val h = size.height * (pct / 100f)
                        drawRoundRect(
                            color.copy(alpha = 0.88f),
                            topLeft = Offset(0f, size.height - h),
                            size = Size(size.width, h),
                            cornerRadius = CornerRadius(12f, 12f),
                        )
                    }
                }
                Text(label, fontSize = 11.sp, color = color)
            }
        }
    }
}

enum class StatsPeriod { DAY, WEEK, MONTH }

@Composable
fun SherinSalesChart(
    period: StatsPeriod,
    isDark: Boolean,
    modifier: Modifier = Modifier,
) {
    val data = when (period) {
        StatsPeriod.DAY -> dailyChartData
        StatsPeriod.WEEK -> weeklyChartData
        StatsPeriod.MONTH -> monthlyChartData
    }
    val lineColor = when (period) {
        StatsPeriod.DAY -> Color(0xFF3B82F6)
        StatsPeriod.WEEK -> Color(0xFF10B981)
        StatsPeriod.MONTH -> Color(0xFFF59E0B)
    }
    val axis = if (isDark) Color(0xFF9CA3AF) else Color(0xFF6B7280)
    val max = data.maxOf { it.sales }.toFloat().coerceAtLeast(1f)

    Canvas(modifier.height(220.dp).fillMaxWidth()) {
        val barW = size.width / (data.size * 2f)
        val bottom = size.height - 24f
        data.forEachIndexed { i, point ->
            val x = barW + i * barW * 2
            if (period == StatsPeriod.WEEK) {
                val h = (point.sales / max) * (bottom - 16f)
                drawRoundRect(
                    lineColor,
                    topLeft = Offset(x, bottom - h),
                    size = Size(barW * 0.8f, h),
                    cornerRadius = CornerRadius(8f, 8f),
                )
            } else {
                val next = data.getOrNull(i + 1)
                val y1 = bottom - (point.sales / max) * (bottom - 16f)
                if (next != null) {
                    val y2 = bottom - (next.sales / max) * (bottom - 16f)
                    drawLine(lineColor, Offset(x, y1), Offset(x + barW * 2, y2), strokeWidth = 3f)
                }
                drawCircle(lineColor, 4f, Offset(x, y1))
            }
        }
    }
    Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        data.take(7).forEach { p ->
            Text(p.label, fontSize = 10.sp, color = axis)
        }
    }
}
