package uz.lider.client.presentation.tracking

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientPullToRefresh
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.orderDisplayLabel
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.glowEffect
import uz.lider.client.presentation.theme.liquidGlassThemed

private val stepKeys = listOf("track_step1", "track_step2", "track_step3", "track_step4", "track_step5")

@Composable
fun OrderTrackingScreen(
    orderId: String,
    onBack: () -> Unit,
    viewModel: OrderTrackingViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val lang = LocalAppLanguage.current
    val isDark = LiquidTheme.isDark
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    val tracking = state.tracking
    val deliveryPerson = tracking?.deliveryPerson
    val context = LocalContext.current

    var showFullScreenMap by remember { mutableStateOf(false) }

    LaunchedEffect(orderId) { viewModel.load(orderId) }

    if (showFullScreenMap) {
        FullScreenOrderTrackingMapDialog(
            deliveryLat = tracking?.deliveryLatitude,
            deliveryLng = tracking?.deliveryLongitude,
            courierLat = deliveryPerson?.latitude,
            courierLng = deliveryPerson?.longitude,
            routePoints = state.routePoints,
            distance = state.distance,
            isDark = isDark,
            onDismiss = { showFullScreenMap = false },
        )
    }

    ClientStackScaffold(title = localized("track_title"), onBack = onBack) { padding ->
        LiquidBackground(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = LiquidGlass.Indigo)
                }
            } else {
                ClientPullToRefresh(onRefresh = { viewModel.refresh(orderId) }) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // Map with glass overlay controls
                    item {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .height(280.dp)
                                .clip(RoundedCornerShape(LiquidGlass.RadiusCard)),
                        ) {
                            OrderTrackingMapView(
                                deliveryLat = tracking?.deliveryLatitude,
                                deliveryLng = tracking?.deliveryLongitude,
                                courierLat = deliveryPerson?.latitude,
                                courierLng = deliveryPerson?.longitude,
                                routePoints = state.routePoints,
                                isDark = false,
                                modifier = Modifier.fillMaxSize(),
                            )
                            IconButton(
                                onClick = { showFullScreenMap = true },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(8.dp)
                                    .size(40.dp)
                                    .liquidGlassThemed(radius = 12.dp),
                            ) {
                                Icon(
                                    Icons.Default.Fullscreen,
                                    contentDescription = localized("track_map_fullscreen"),
                                    tint = Color.White,
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                            TrackingMapInfoOverlay(
                                distance = state.distance,
                                modifier = Modifier.align(Alignment.BottomCenter),
                            )
                        }
                    }

                    deliveryPerson?.let { person ->
                        item {
                            val phone = person.phone?.takeIf { it.isNotBlank() }
                            Column(
                                Modifier
                                    .fillMaxWidth()
                                    .liquidGlassThemed()
                                    .padding(16.dp),
                            ) {
                                Text(
                                    localized("track_courier").uppercase(),
                                    color = textMuted,
                                    fontSize = 11.sp,
                                    letterSpacing = 1.sp,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Spacer(Modifier.height(12.dp))
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Box(
                                        Modifier
                                            .size(52.dp)
                                            .clip(CircleShape)
                                            .background(LiquidGlass.GradientPrimary),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(
                                            Icons.Default.Person,
                                            null,
                                            tint = Color.White,
                                            modifier = Modifier.size(28.dp),
                                        )
                                    }
                                    Column(Modifier.weight(1f)) {
                                        Text(person.name, color = text, fontWeight = FontWeight.SemiBold)
                                        person.position?.takeIf { it.isNotBlank() }?.let {
                                            Text(it, color = textMuted, fontSize = 12.sp)
                                        }
                                        Text(
                                            phone ?: "—",
                                            color = if (phone != null) LiquidGlass.Cyan else textMuted,
                                            fontSize = 13.sp,
                                            fontWeight = if (phone != null) FontWeight.Medium else FontWeight.Normal,
                                        )
                                        val onlineLabel = if (person.isOnline) {
                                            localized("track_online")
                                        } else {
                                            "Offline"
                                        }
                                        Text(
                                            onlineLabel,
                                            color = if (person.isOnline) LiquidGlass.Emerald else textMuted,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                    }
                                    if (phone != null) {
                                        Box(
                                            Modifier
                                                .size(42.dp)
                                                .clip(CircleShape)
                                                .background(
                                                    Brush.linearGradient(
                                                        listOf(LiquidGlass.Emerald, LiquidGlass.Cyan),
                                                    ),
                                                )
                                                .clickable {
                                                    context.startActivity(
                                                        Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")),
                                                    )
                                                },
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Icon(
                                                Icons.Default.Phone,
                                                contentDescription = phone,
                                                tint = Color.White,
                                                modifier = Modifier.size(18.dp),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Delivery address glass card
                    item {
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .liquidGlassThemed()
                                .padding(16.dp),
                        ) {
                            Text(
                                localized("track_delivery_addr"),
                                color = textMuted,
                                fontSize = 12.sp,
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                tracking?.deliveryAddress ?: "—",
                                color = text,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }

                    // Order summary label
                    item {
                        state.order?.let { order ->
                            Text(
                                "${orderDisplayLabel(lang, order.id)} • ${formatMoney(order.totalAmount)} ${localized("com_som")}",
                                color = text,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }

                    // Timeline steps — glass cards, active step = gradient glow
                    item {
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .liquidGlassThemed()
                                .padding(16.dp),
                        ) {
                            stepKeys.forEachIndexed { index, key ->
                                val stepNum = index + 1
                                val done = stepNum <= state.activeStep
                                val active = stepNum == state.activeStep

                                Row(verticalAlignment = Alignment.Top) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Box(
                                            Modifier
                                                .size(32.dp)
                                                .then(
                                                    when {
                                                        active -> Modifier
                                                            .glowEffect(LiquidGlass.Indigo, 60f)
                                                            .clip(CircleShape)
                                                            .background(LiquidGlass.GradientPrimary)
                                                        done -> Modifier
                                                            .clip(CircleShape)
                                                            .background(LiquidGlass.Indigo.copy(alpha = 0.70f))
                                                        else -> Modifier
                                                            .liquidGlassThemed(radius = 50.dp)
                                                    }
                                                ),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            if (done) {
                                                Icon(
                                                    Icons.Default.Check,
                                                    null,
                                                    tint = Color.White,
                                                    modifier = Modifier.size(15.dp),
                                                )
                                            } else {
                                                Text(
                                                    "$stepNum",
                                                    color = textMuted,
                                                    fontSize = 12.sp,
                                                )
                                            }
                                        }
                                        if (index < stepKeys.lastIndex) {
                                            Box(
                                                Modifier
                                                    .size(width = 2.dp, height = 32.dp)
                                                    .background(
                                                        if (done) LiquidGlass.Indigo.copy(alpha = 0.55f)
                                                        else Color.White.copy(alpha = 0.15f)
                                                    ),
                                            )
                                        }
                                    }
                                    Spacer(Modifier.size(14.dp))
                                    Column(Modifier.padding(bottom = 16.dp)) {
                                        Text(
                                            localized(key),
                                            color = if (active) LiquidGlass.Cyan else text,
                                            fontWeight = if (active) FontWeight.Bold else FontWeight.Normal,
                                        )
                                        if (active) {
                                            Text(
                                                localized("track_active"),
                                                color = LiquidGlass.Violet,
                                                fontSize = 11.sp,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                }
            }
        }
    }
}

@Composable
private fun TrackingMapInfoOverlay(
    distance: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .shadow(8.dp, RoundedCornerShape(16.dp))
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xF00B1220))
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            localized("track_active"),
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp,
        )
        Text(
            "${localized("track_distance")}: $distance",
            color = Color.White.copy(alpha = 0.80f),
            fontSize = 13.sp,
        )
    }
}

@Composable
private fun FullScreenOrderTrackingMapDialog(
    deliveryLat: Double?,
    deliveryLng: Double?,
    courierLat: Double?,
    courierLng: Double?,
    routePoints: List<uz.lider.client.data.repository.LatLngPoint>,
    distance: String,
    isDark: Boolean,
    onDismiss: () -> Unit,
) {
    val overlayBg = Color(0xF00B1220)
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false,
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
        ),
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Color(0xFFF5F7FC)),
        ) {
            OrderTrackingMapView(
                deliveryLat = deliveryLat,
                deliveryLng = deliveryLng,
                courierLat = courierLat,
                courierLng = courierLng,
                routePoints = routePoints,
                isDark = false,
                modifier = Modifier
                    .fillMaxSize()
                    .align(Alignment.Center),
            )
            Row(
                Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter)
                    .statusBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .size(44.dp)
                        .shadow(8.dp, CircleShape)
                        .clip(CircleShape)
                        .background(overlayBg),
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = localized("com_back"),
                        tint = Color.White,
                    )
                }
                Text(
                    localized("track_title"),
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    modifier = Modifier
                        .shadow(8.dp, RoundedCornerShape(14.dp))
                        .clip(RoundedCornerShape(14.dp))
                        .background(overlayBg)
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                )
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .size(44.dp)
                        .shadow(8.dp, CircleShape)
                        .clip(CircleShape)
                        .background(overlayBg),
                ) {
                    Icon(
                        Icons.Default.FullscreenExit,
                        contentDescription = localized("track_map_minimize"),
                        tint = Color.White,
                    )
                }
            }
            TrackingMapInfoOverlay(
                distance = distance,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding(),
            )
        }
    }
}
