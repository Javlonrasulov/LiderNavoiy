package uz.distributor.crm.presentation.delivery

import android.content.Context
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.DragHandle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage

private val Accent = Color(0xFF6366F1)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryOrdersScreen(
    onOrderClick: (String) -> Unit,
    viewModel: DeliveryOrdersViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val state by viewModel.uiState.collectAsState()
    val bg = if (isDark) Color(0xFF0E1621) else Color(0xFFF3F4F6)
    val cardBg = if (isDark) Color(0xFF17212B) else Color.White
    val textPrimary = if (isDark) Color.White else Color.Black
    val textMuted = if (isDark) Color(0xFF8E9BA7) else Color(0xFF6B7280)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        AppStrings.deliveryOrdersTitle(lang),
                        fontWeight = FontWeight.SemiBold,
                        color = textPrimary,
                    )
                },
                actions = {
                    if (state.orders.isNotEmpty()) {
                        Text(
                            "${state.orders.size}",
                            color = Accent,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            modifier = Modifier.padding(end = 4.dp),
                        )
                    }
                    IconButton(onClick = viewModel::load) {
                        Icon(Icons.Default.Refresh, contentDescription = null, tint = textPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = if (isDark) Color(0xFF17212B) else Color.White,
                ),
            )
        },
        containerColor = bg,
    ) { padding ->
        Box(
            Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.isLoading -> {
                    CircularProgressIndicator(
                        Modifier.align(Alignment.Center),
                        color = Accent,
                    )
                }
                state.orders.isEmpty() -> {
                    Column(
                        Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Icon(
                            Icons.Default.LocalShipping,
                            null,
                            tint = textMuted,
                            modifier = Modifier.size(56.dp),
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            AppStrings.noDeliveryOrders(lang),
                            color = textMuted,
                            fontSize = 15.sp,
                        )
                    }
                }
                else -> {
                    val onWayIds = state.orders.filter { it.status == "on_way" }.map { it.id }
                    LazyColumn(
                        Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(state.orders, key = { it.id }) { order ->
                            val onWayIndex = onWayIds.indexOf(order.id)
                            val stopNumber = if (onWayIndex >= 0) onWayIndex + 1 else null
                            DeliveryOrderCard(
                                order = order,
                                stopNumber = stopNumber,
                                canMoveUp = onWayIndex > 0,
                                canMoveDown = onWayIndex >= 0 && onWayIndex < onWayIds.lastIndex,
                                cardBg = cardBg,
                                textPrimary = textPrimary,
                                textMuted = textMuted,
                                lang = lang,
                                onCardClick = { onOrderClick(order.id) },
                                onMoveUp = { viewModel.moveOnWayUp(order.id) },
                                onMoveDown = { viewModel.moveOnWayDown(order.id) },
                            )
                        }
                    }
                }
            }

            state.error?.let { err ->
                Snackbar(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp),
                    action = {
                        TextButton(onClick = viewModel::clearError) {
                            Text("OK")
                        }
                    },
                ) {
                    Text(AppStrings.apiError(lang, err))
                }
            }
        }
    }
}

@Composable
private fun DeliveryOrderCard(
    order: OrderDto,
    stopNumber: Int?,
    canMoveUp: Boolean,
    canMoveDown: Boolean,
    cardBg: Color,
    textPrimary: Color,
    textMuted: Color,
    lang: AppLanguage,
    onCardClick: () -> Unit,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit,
) {
    val context = LocalContext.current
    val name = order.clientName ?: AppStrings.clientFallback(lang)
    val address = order.clientAddress?.takeIf { it.isNotBlank() }
    val phone = order.clientPhone?.takeIf { it.isNotBlank() }
    val canNavigate = (order.clientLatitude != null && order.clientLongitude != null) ||
        !order.clientAddress.isNullOrBlank()

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = cardBg),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
            ) {
                if (stopNumber != null) {
                    Box(
                        Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(Accent),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "$stopNumber",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                }
                Text(
                    name,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 17.sp,
                    color = textPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier
                        .weight(1f)
                        .clickable(onClick = onCardClick),
                )
                if (stopNumber != null) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.DragHandle,
                            contentDescription = null,
                            tint = textMuted,
                            modifier = Modifier.size(18.dp),
                        )
                        IconButton(
                            onClick = onMoveUp,
                            enabled = canMoveUp,
                            modifier = Modifier.size(32.dp),
                        ) {
                            Icon(
                                Icons.Default.KeyboardArrowUp,
                                contentDescription = null,
                                tint = if (canMoveUp) Accent else textMuted.copy(alpha = 0.35f),
                            )
                        }
                        IconButton(
                            onClick = onMoveDown,
                            enabled = canMoveDown,
                            modifier = Modifier.size(32.dp),
                        ) {
                            Icon(
                                Icons.Default.KeyboardArrowDown,
                                contentDescription = null,
                                tint = if (canMoveDown) Accent else textMuted.copy(alpha = 0.35f),
                            )
                        }
                    }
                }
            }
            if (order.needsPaymentFollowUp) {
                Spacer(Modifier.height(6.dp))
                Text(
                    "${AppStrings.deliveryCollectPayment(lang)} · ${AppStrings.deliveryRemaining(lang)}",
                    color = Color(0xFFD97706),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            Column(Modifier.clickable(onClick = onCardClick)) {
                if (address != null) {
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.Top) {
                        Icon(
                            Icons.Default.Place,
                            null,
                            tint = textMuted,
                            modifier = Modifier
                                .size(16.dp)
                                .padding(top = 2.dp),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            address,
                            color = textMuted,
                            fontSize = 14.sp,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                if (phone != null) {
                    Spacer(Modifier.height(10.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            phone,
                            color = textPrimary,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.weight(1f),
                        )
                        Box(
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(Accent.copy(alpha = 0.12f))
                                .clickable {
                                    context.startActivity(
                                        Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")),
                                    )
                                },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Default.Phone,
                                contentDescription = AppStrings.deliveryCallClient(lang),
                                tint = Accent,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    }
                }
            }

            if (canNavigate) {
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = { openNavigation(context, order) },
                    colors = ButtonDefaults.buttonColors(containerColor = Accent),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(vertical = 12.dp),
                ) {
                    Icon(
                        Icons.Default.Navigation,
                        null,
                        modifier = Modifier.size(18.dp),
                        tint = Color.White,
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        AppStrings.deliveryNavigate(lang),
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                    )
                }
            }
        }
    }
}

internal fun openNavigation(context: Context, order: OrderDto) {
    val hasCoords = order.clientLatitude != null && order.clientLongitude != null
    val uri = if (hasCoords) {
        Uri.parse("google.navigation:q=${order.clientLatitude},${order.clientLongitude}&mode=d")
    } else {
        Uri.parse("google.navigation:q=${Uri.encode(order.clientAddress.orEmpty())}&mode=d")
    }
    val intent = Intent(Intent.ACTION_VIEW, uri)
    intent.setPackage("com.google.android.apps.maps")
    if (intent.resolveActivity(context.packageManager) != null) {
        context.startActivity(intent)
        return
    }
    val fallback = if (hasCoords) {
        Uri.parse(
            "yandexnavi://build_route_on_map?lat_to=${order.clientLatitude}&lon_to=${order.clientLongitude}",
        )
    } else {
        Uri.parse("geo:0,0?q=${Uri.encode(order.clientAddress.orEmpty())}")
    }
    try {
        context.startActivity(Intent(Intent.ACTION_VIEW, fallback))
    } catch (_: Exception) {
        context.startActivity(
            Intent(
                Intent.ACTION_VIEW,
                Uri.parse(
                    "https://maps.google.com/?q=${order.clientLatitude ?: ""},${order.clientLongitude ?: ""}",
                ),
            ),
        )
    }
}
