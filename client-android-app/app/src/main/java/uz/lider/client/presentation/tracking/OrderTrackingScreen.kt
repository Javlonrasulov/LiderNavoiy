package uz.lider.client.presentation.tracking

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.clientCard
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.rememberClientPalette

private val stepKeys = listOf("track_step1", "track_step2", "track_step3", "track_step4", "track_step5")

@Composable
fun OrderTrackingScreen(
    orderId: String,
    onBack: () -> Unit,
    viewModel: OrderTrackingViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val palette = rememberClientPalette()

    LaunchedEffect(orderId) { viewModel.load(orderId) }

    ClientStackScaffold(title = localized("track_title"), onBack = onBack) { padding ->
        if (state.loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = palette.primary)
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .clip(RoundedCornerShape(20.dp))
                            .background(
                                Brush.linearGradient(listOf(palette.primary.copy(alpha = 0.3f), palette.secondary.copy(alpha = 0.2f))),
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.LocationOn, null, tint = palette.primary, modifier = Modifier.size(48.dp))
                            Text("🗺 ${localized("track_active")}", color = palette.text, fontWeight = FontWeight.Bold)
                            Text("${localized("track_eta")}: ${state.eta}", color = palette.textMuted, fontSize = 13.sp)
                            Text("${localized("track_distance")}: ${state.distance}", color = palette.textMuted, fontSize = 13.sp)
                        }
                    }
                }
                item {
                    Row(Modifier.clientCard(palette).padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        AsyncImage(
                            model = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
                            contentDescription = null,
                            modifier = Modifier.size(48.dp).clip(RoundedCornerShape(16.dp)),
                        )
                        Column(Modifier.weight(1f)) {
                            Text("Jamshid R.", color = palette.text, fontWeight = FontWeight.SemiBold)
                            Text(localized("track_courier"), color = palette.textMuted, fontSize = 12.sp)
                            Text("⭐ 4.9 • ${localized("track_online")}", color = palette.success, fontSize = 12.sp)
                        }
                        Icon(Icons.Default.Person, null, tint = palette.secondary)
                    }
                }
                item {
                    Column(Modifier.clientCard(palette).padding(16.dp)) {
                        Text(localized("track_delivery_addr"), color = palette.textMuted, fontSize = 12.sp)
                        Text("Toshkent, Yunusobod, Amir Temur 108", color = palette.text, fontWeight = FontWeight.SemiBold)
                    }
                }
                item {
                    state.order?.let { order ->
                        Text("${order.id} • ${formatMoney(order.totalAmount)} ${localized("com_som")}", color = palette.text, fontWeight = FontWeight.Bold)
                    }
                }
                item {
                    Column(Modifier.clientCard(palette).padding(16.dp)) {
                        stepKeys.forEachIndexed { index, key ->
                            val stepNum = index + 1
                            val done = stepNum <= state.activeStep
                            val active = stepNum == state.activeStep
                            Row(verticalAlignment = Alignment.Top) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Box(
                                        Modifier
                                            .size(28.dp)
                                            .clip(CircleShape)
                                            .background(if (done) palette.primary else palette.surface2),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        if (done) Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.size(14.dp))
                                        else Text("$stepNum", color = palette.textMuted, fontSize = 12.sp)
                                    }
                                    if (index < stepKeys.lastIndex) {
                                        Box(Modifier.size(width = 2.dp, height = 32.dp).background(if (done) palette.primary else palette.border))
                                    }
                                }
                                Spacer(Modifier.size(12.dp))
                                Column(Modifier.padding(bottom = 16.dp)) {
                                    Text(localized(key), color = if (active) palette.primary else palette.text, fontWeight = if (active) FontWeight.Bold else FontWeight.Normal)
                                    if (active) Text(localized("track_active"), color = palette.secondary, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
