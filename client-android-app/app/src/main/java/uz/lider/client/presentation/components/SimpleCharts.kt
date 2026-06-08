package uz.lider.client.presentation.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun SimpleBarChart(
    values: List<Float>,
    labels: List<String>,
    barColor: Color,
    modifier: Modifier = Modifier,
    heightDp: Int = 120,
    labelColor: Color = Color.Gray,
) {
    if (values.isEmpty()) return
    val max = values.maxOrNull()?.coerceAtLeast(1f) ?: 1f
    Column(modifier = modifier.fillMaxWidth()) {
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(heightDp.dp),
        ) {
            val barWidth = size.width / (values.size * 1.6f)
            val gap = barWidth * 0.6f
            val chartHeight = size.height
            values.forEachIndexed { index, value ->
                val barHeight = (value / max) * (chartHeight - 8f)
                val left = index * (barWidth + gap) + gap
                drawRoundRect(
                    color = barColor.copy(alpha = 0.85f),
                    topLeft = Offset(left, chartHeight - barHeight),
                    size = Size(barWidth, barHeight),
                    cornerRadius = CornerRadius(8f, 8f),
                )
            }
        }
        if (labels.isNotEmpty()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                labels.forEach { label ->
                    Text(
                        text = label,
                        color = labelColor,
                        fontSize = 10.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
fun SimpleAreaChart(
    values: List<Float>,
    strokeColor: Color,
    fillColor: Color,
    modifier: Modifier = Modifier,
    heightDp: Int = 64,
) {
    if (values.size < 2) return
    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(heightDp.dp),
    ) {
        val max = values.maxOrNull()?.coerceAtLeast(1f) ?: 1f
        val stepX = size.width / (values.size - 1)
        val points = values.mapIndexed { index, value ->
            Offset(
                x = index * stepX,
                y = size.height - (value / max) * size.height,
            )
        }
        val path = buildSmoothPath(points)
        val fillPath = Path().apply {
            addPath(path)
            lineTo(size.width, size.height)
            lineTo(0f, size.height)
            close()
        }
        drawPath(fillPath, Brush.verticalGradient(listOf(fillColor, Color.Transparent)))
        drawPath(path, strokeColor, style = Stroke(width = 3f))
    }
}

private fun buildSmoothPath(points: List<Offset>): Path {
    val path = Path()
    if (points.isEmpty()) return path
    if (points.size == 1) {
        path.moveTo(points[0].x, points[0].y)
        return path
    }
    path.moveTo(points[0].x, points[0].y)
    for (i in 0 until points.size - 1) {
        val p0 = points[i]
        val p1 = points[i + 1]
        val cp1x = p0.x + (p1.x - p0.x) / 3f
        val cp1y = p0.y
        val cp2x = p0.x + 2f * (p1.x - p0.x) / 3f
        val cp2y = p1.y
        path.cubicTo(cp1x, cp1y, cp2x, cp2y, p1.x, p1.y)
    }
    return path
}

@Composable
fun HorizontalProgressBar(
    progress: Float,
    color: Color,
    trackColor: Color,
    modifier: Modifier = Modifier,
) {
    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(8.dp),
    ) {
        drawRoundRect(
            color = trackColor,
            size = size,
            cornerRadius = CornerRadius(4f, 4f),
        )
        drawRoundRect(
            color = color,
            size = Size(size.width * progress.coerceIn(0f, 1f), size.height),
            cornerRadius = CornerRadius(4f, 4f),
        )
    }
}
