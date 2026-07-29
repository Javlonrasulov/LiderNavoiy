package uz.lider.client.presentation.map

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import uz.lider.client.map.MapLayerId
import uz.lider.client.map.MapTileSources
import uz.lider.client.presentation.theme.LiquidGlass

/** Agent LocationScreen MapLayerPicker — sputnik va boshqa qatlamlar. */
@Composable
fun MapLayerPicker(
    activeLayer: MapLayerId,
    onLayerChange: (MapLayerId) -> Unit,
    modifier: Modifier = Modifier,
    bottomPadding: Dp = 200.dp,
) {
    var expanded by remember { mutableStateOf(false) }
    val layers = MapTileSources.allLayers
    val ordered = remember(activeLayer) {
        listOf(activeLayer) + layers.filter { it != activeLayer }
    }
    val context = LocalContext.current

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
                                    color = if (isActive) LiquidGlass.Indigo else Color.Black.copy(0.12f),
                                    shape = RoundedCornerShape(12.dp),
                                ),
                        ) {
                            AsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data(MapTileSources.thumbUrl(layer))
                                    .crossfade(true)
                                    .build(),
                                contentDescription = layer.label,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                            )
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            layer.label,
                            fontSize = if (index == 0) 12.sp else 10.sp,
                            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                            color = if (isActive) LiquidGlass.Indigo else Color(0xFF3C4043),
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
                Box {
                    AsyncImage(
                        model = ImageRequest.Builder(context)
                            .data(MapTileSources.thumbUrl(activeLayer))
                            .crossfade(true)
                            .build(),
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(0.25f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Default.Layers,
                            contentDescription = "Xarita qatlamlari",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
            }
        }
    }
}
