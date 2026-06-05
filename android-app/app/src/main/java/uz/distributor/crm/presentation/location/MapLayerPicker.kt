package uz.distributor.crm.presentation.location

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.distributor.crm.map.MapLayerId
import uz.distributor.crm.map.MapTileSources

@Composable
fun MapLayerPicker(
    activeLayer: MapLayerId,
    onLayerChange: (MapLayerId) -> Unit,
    modifier: Modifier = Modifier,
    bottomPadding: androidx.compose.ui.unit.Dp = 200.dp,
) {
    var expanded by remember { mutableStateOf(false) }
    val layers = MapTileSources.allLayers
    val ordered = remember(activeLayer) {
        listOf(activeLayer) + layers.filter { it != activeLayer }
    }

    Box(modifier = modifier.padding(start = 12.dp, bottom = bottomPadding)) {
        if (expanded) {
            Row(
                modifier = Modifier
                    .horizontalScroll(rememberScrollState())
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.White.copy(alpha = 0.97f))
                    .border(1.dp, Color.Black.copy(0.08f), RoundedCornerShape(16.dp))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                ordered.forEachIndexed { index, layer ->
                    val isActive = layer == activeLayer
                    val size = if (index == 0) 72.dp else 58.dp
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .width(size)
                            .clickable {
                                onLayerChange(layer)
                                expanded = false
                            },
                    ) {
                        Box(
                            modifier = Modifier
                                .size(size)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFFE5E7EB))
                                .border(
                                    width = if (isActive) 3.dp else 2.dp,
                                    color = if (isActive) Color(0xFF4285F4) else Color.Black.copy(0.12f),
                                    shape = RoundedCornerShape(12.dp),
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                layer.label.take(2),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF6B7280),
                            )
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            layer.label,
                            fontSize = if (index == 0) 12.sp else 10.sp,
                            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                            color = if (isActive) Color(0xFF1A73E8) else Color(0xFF3C4043),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }

        if (!expanded) {
            Surface(
                onClick = { expanded = true },
                shape = RoundedCornerShape(10.dp),
                color = Color.White.copy(0.97f),
                shadowElevation = 4.dp,
                modifier = Modifier
                    .size(42.dp)
                    .border(2.dp, Color.Black.copy(0.15f), RoundedCornerShape(10.dp)),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Layers, contentDescription = "Xarita qatlamlari", tint = Color(0xFF374151))
                }
            }
        }
    }
}
