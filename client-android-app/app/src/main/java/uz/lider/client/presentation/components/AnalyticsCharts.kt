package uz.lider.client.presentation.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
enum class ChartVisualStyle(val key: String) {
    BAR("bar"),
    WAVE("wave"),
    CIRCLE("circle"),
    ;

    companion object {
        fun fromKey(key: String?) = entries.firstOrNull { it.key == key } ?: BAR
    }
}

data class ChartPoint(
    val value: Float,
    val label: String,
    val amountLabel: String,
)

@Composable
fun AnalyticsTrendChart(
    points: List<ChartPoint>,
    style: ChartVisualStyle,
    primaryColor: Color,
    secondaryColor: Color,
    modifier: Modifier = Modifier,
    heightDp: Int = 140,
    labelColor: Color = Color.Gray,
    valueColor: Color = labelColor,
    segmentColors: List<Color> = emptyList(),
    centerLabel: String = "",
) {
    if (points.isEmpty()) return
    val values = points.map { it.value }
    val labels = points.map { it.label }
    val amounts = points.map { it.amountLabel }
    val colors = segmentColors.ifEmpty {
        listOf(primaryColor, secondaryColor, primaryColor.copy(alpha = 0.7f))
    }

    when (style) {
        ChartVisualStyle.BAR -> GradientBarChart(
            values = values,
            labels = labels,
            valueLabels = amounts,
            primaryColor = primaryColor,
            secondaryColor = secondaryColor,
            heightDp = heightDp,
            labelColor = labelColor,
            valueColor = valueColor,
            modifier = modifier,
        )
        ChartVisualStyle.WAVE -> GradientWaveChart(
            values = values,
            labels = labels,
            valueLabels = amounts,
            strokeColor = primaryColor,
            fillColor = secondaryColor.copy(alpha = 0.28f),
            heightDp = heightDp,
            labelColor = labelColor,
            valueColor = valueColor,
            modifier = modifier,
        )
        ChartVisualStyle.CIRCLE -> DonutChart(
            points = points,
            segmentColors = colors,
            centerLabel = centerLabel,
            labelColor = labelColor,
            valueColor = valueColor,
            modifier = modifier,
        )
    }
}

@Composable
fun GradientBarChart(
    values: List<Float>,
    labels: List<String>,
    valueLabels: List<String>,
    primaryColor: Color,
    secondaryColor: Color,
    modifier: Modifier = Modifier,
    heightDp: Int = 140,
    labelColor: Color = Color.Gray,
    valueColor: Color = labelColor,
) {
    if (values.isEmpty()) return
    val max = values.maxOrNull()?.coerceAtLeast(1f) ?: 1f
    Column(modifier = modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            valueLabels.forEach { amount ->
                Text(
                    text = amount,
                    color = valueColor,
                    fontSize = 8.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                    maxLines = 2,
                )
            }
        }
        Spacer(Modifier.height(6.dp))
        Canvas(Modifier.fillMaxWidth().height(heightDp.dp)) {
            val barWidth = size.width / (values.size * 1.5f)
            val gap = barWidth * 0.5f
            values.forEachIndexed { index, value ->
                val ratio = value / max
                val barHeight = ratio * (size.height - 12f)
                val left = index * (barWidth + gap) + gap
                val top = size.height - barHeight.coerceAtLeast(if (value > 0f) 6f else 3f)
                val brush = Brush.verticalGradient(
                    colors = listOf(primaryColor, secondaryColor),
                    startY = top,
                    endY = size.height,
                )
                drawRoundRect(
                    brush = brush,
                    topLeft = Offset(left, top),
                    size = Size(barWidth, size.height - top),
                    cornerRadius = CornerRadius(barWidth / 2f, barWidth / 2f),
                )
                if (value > 0f) {
                    drawRoundRect(
                        color = Color.White.copy(alpha = 0.18f),
                        topLeft = Offset(left + 2f, top + 2f),
                        size = Size(barWidth * 0.25f, (size.height - top) * 0.35f),
                        cornerRadius = CornerRadius(4f, 4f),
                    )
                }
            }
        }
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
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

@Composable
fun GradientWaveChart(
    values: List<Float>,
    labels: List<String>,
    valueLabels: List<String>,
    strokeColor: Color,
    fillColor: Color,
    modifier: Modifier = Modifier,
    heightDp: Int = 120,
    labelColor: Color = Color.Gray,
    valueColor: Color = labelColor,
) {
    val chartValues = if (values.size >= 2) values else listOf(0f, 0f)
    Column(modifier = modifier.fillMaxWidth()) {
        Canvas(Modifier.fillMaxWidth().height(heightDp.dp)) {
            val max = chartValues.maxOrNull()?.coerceAtLeast(1f) ?: 1f
            val stepX = size.width / (chartValues.size - 1)
            val points = chartValues.mapIndexed { index, value ->
                Offset(
                    x = index * stepX,
                    y = size.height - (value / max) * (size.height - 16f) - 8f,
                )
            }
            val path = buildSmoothPath(points)
            val fillPath = Path().apply {
                addPath(path)
                lineTo(size.width, size.height)
                lineTo(0f, size.height)
                close()
            }
            drawPath(
                fillPath,
                Brush.verticalGradient(
                    listOf(fillColor, fillColor.copy(alpha = 0.05f), Color.Transparent),
                ),
            )
            drawPath(
                path,
                brush = Brush.horizontalGradient(listOf(strokeColor, strokeColor.copy(alpha = 0.6f))),
                style = Stroke(width = 3.5f, cap = StrokeCap.Round),
            )
            points.forEach { point ->
                drawCircle(color = Color.White, radius = 5f, center = point)
                drawCircle(color = strokeColor, radius = 3f, center = point)
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            valueLabels.forEach { amount ->
                Text(
                    text = amount,
                    color = valueColor,
                    fontSize = 8.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                    maxLines = 2,
                )
            }
        }
        Spacer(Modifier.height(4.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
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

@Composable
fun DonutChart(
    points: List<ChartPoint>,
    segmentColors: List<Color>,
    centerLabel: String,
    modifier: Modifier = Modifier,
    labelColor: Color = Color.Gray,
    valueColor: Color = labelColor,
) {
    val total = points.sumOf { it.value.toDouble() }.toFloat().coerceAtLeast(1f)
    val hasData = points.any { it.value > 0f }
    Column(modifier = modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(160.dp), contentAlignment = Alignment.Center) {
            Canvas(Modifier.size(160.dp)) {
                val stroke = 22f
                val radius = (size.minDimension - stroke) / 2f
                val center = Offset(size.width / 2f, size.height / 2f)
                var startAngle = -90f
                if (!hasData) {
                    drawArc(
                        color = Color.White.copy(alpha = 0.08f),
                        startAngle = 0f,
                        sweepAngle = 360f,
                        useCenter = false,
                        topLeft = Offset(center.x - radius, center.y - radius),
                        size = Size(radius * 2, radius * 2),
                        style = Stroke(width = stroke, cap = StrokeCap.Round),
                    )
                } else {
                    points.forEachIndexed { index, point ->
                        if (point.value <= 0f) return@forEachIndexed
                        val sweep = (point.value / total) * 360f
                        val color = segmentColors[index % segmentColors.size]
                        drawArc(
                            brush = Brush.sweepGradient(
                                listOf(color, color.copy(alpha = 0.65f), color),
                                center = center,
                            ),
                            startAngle = startAngle,
                            sweepAngle = sweep.coerceAtLeast(4f),
                            useCenter = false,
                            topLeft = Offset(center.x - radius, center.y - radius),
                            size = Size(radius * 2, radius * 2),
                            style = Stroke(width = stroke, cap = StrokeCap.Round),
                        )
                        startAngle += sweep
                    }
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    formatMoney(total.toDouble()),
                    color = valueColor,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    textAlign = TextAlign.Center,
                )
                if (centerLabel.isNotBlank()) {
                    Text(centerLabel, color = labelColor, fontSize = 10.sp)
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            points.forEachIndexed { index, point ->
                val pct = if (hasData) (point.value / total * 100f) else 0f
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Box(
                            Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .then(Modifier),
                        ) {
                            Canvas(Modifier.size(8.dp)) {
                                drawCircle(segmentColors[index % segmentColors.size])
                            }
                        }
                        Spacer(Modifier.size(6.dp))
                        Text(point.label, color = labelColor, fontSize = 11.sp)
                    }
                    Text(
                        "${point.amountLabel} · ${"%.0f".format(pct)}%",
                        color = valueColor,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.End,
                    )
                }
            }
        }
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
