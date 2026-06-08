package uz.lider.client.presentation.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
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
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme

private data class NotifItem(
    val id: String,
    val title: String,
    val body: String,
    val time: String,
    val icon: ImageVector,
    val read: Boolean,
    val iconGradient: Brush,
    val accentColor: Color,
)

@Composable
fun NotificationsScreen(
    onBack: () -> Unit,
    viewModel: NotificationsViewModel = hiltViewModel(),
) {
    val readIds by viewModel.readIds.collectAsState()
    val items = buildNotifications(readIds)
    val unread = items.filter { !it.read }
    val read = items.filter { it.read }
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted

    ClientStackScaffold(title = localized("notif_title"), onBack = onBack) { padding ->
        LiquidBackground(modifier = Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize().padding(padding)) {
                // ── Mark all button ───────────────────────────────────────────
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.End,
                ) {
                    Row(
                        Modifier
                            .clip(RoundedCornerShape(50.dp))
                            .background(Color.White.copy(alpha = 0.12f))
                            .border(
                                1.dp,
                                Brush.linearGradient(
                                    listOf(
                                        Color.White.copy(alpha = 0.35f),
                                        Color.White.copy(alpha = 0.10f),
                                    )
                                ),
                                RoundedCornerShape(50.dp),
                            )
                            .clickableNoRipple { viewModel.markAllRead() }
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Icon(
                            Icons.Default.DoneAll,
                            null,
                            tint = LiquidGlass.Cyan,
                            modifier = Modifier.size(16.dp),
                        )
                        Text(
                            localized("notif_mark_all"),
                            color = text,
                            fontSize = 13.sp,
                        )
                    }
                }

                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (unread.isNotEmpty()) {
                        item {
                            Text(
                                localized("notif_unread").uppercase(),
                                color = textMuted,
                                fontSize = 11.sp,
                                letterSpacing = 1.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                        items(unread, key = { it.id }) { notif ->
                            NotificationCard(notif) { id -> viewModel.markRead(id) }
                        }
                    }
                    if (read.isNotEmpty()) {
                        item {
                            Text(
                                localized("notif_read").uppercase(),
                                color = textMuted,
                                fontSize = 11.sp,
                                letterSpacing = 1.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(top = 8.dp),
                            )
                        }
                        items(read, key = { it.id }) { notif ->
                            NotificationCard(notif, onRead = {})
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationCard(notif: NotifItem, onRead: (String) -> Unit) {
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    val shape = RoundedCornerShape(LiquidGlass.RadiusCard)
    Box(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(
                if (!notif.read)
                    Brush.linearGradient(
                        listOf(
                            Color.White.copy(alpha = 0.24f),
                            Color.White.copy(alpha = 0.14f),
                        )
                    )
                else
                    Brush.linearGradient(
                        listOf(
                            Color.White.copy(alpha = 0.14f),
                            Color.White.copy(alpha = 0.08f),
                        )
                    )
            )
            .border(
                width = 1.dp,
                brush = if (!notif.read)
                    Brush.linearGradient(
                        listOf(
                            notif.accentColor.copy(alpha = 0.55f),
                            Color.White.copy(alpha = 0.15f),
                        )
                    )
                else
                    Brush.linearGradient(
                        listOf(
                            Color.White.copy(alpha = 0.25f),
                            Color.White.copy(alpha = 0.08f),
                        )
                    ),
                shape = shape,
            )
            .clickableNoRipple { onRead(notif.id) },
    ) {
        Row(Modifier.fillMaxWidth()) {
            if (!notif.read) {
                Box(
                    Modifier
                        .width(3.dp)
                        .height(80.dp)
                        .background(
                            Brush.linearGradient(
                                listOf(notif.accentColor, notif.accentColor.copy(alpha = 0.3f)),
                                start = androidx.compose.ui.geometry.Offset(0f, 0f),
                                end = androidx.compose.ui.geometry.Offset(0f, Float.POSITIVE_INFINITY),
                            )
                        ),
                )
            }
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(notif.iconGradient),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        notif.icon,
                        null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp),
                    )
                }
                Column(Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(
                            notif.title,
                            color = if (!notif.read) text else textMuted,
                            fontWeight = if (!notif.read) FontWeight.SemiBold else FontWeight.Normal,
                            fontSize = 14.sp,
                            modifier = Modifier.weight(1f),
                        )
                        if (!notif.read) {
                            Box(
                                Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(notif.accentColor),
                            )
                        }
                    }
                    Text(
                        notif.body,
                        color = textMuted,
                        fontSize = 13.sp,
                    )
                    Text(
                        notif.time,
                        color = textMuted.copy(alpha = 0.6f),
                        fontSize = 11.sp,
                    )
                }
            }
        }
    }
}

@Composable
private fun buildNotifications(readIds: Set<String>): List<NotifItem> = listOf(
    NotifItem(
        MockNotificationIds.ORDER,
        localized("notif_mock_order_title"),
        "#ORD-2846",
        "10:30",
        Icons.Default.LocalShipping,
        MockNotificationIds.ORDER in readIds,
        Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Cyan)),
        LiquidGlass.Indigo,
    ),
    NotifItem(
        MockNotificationIds.PROMO,
        localized("notif_mock_promo_title"),
        "20% Coca Cola",
        "09:15",
        Icons.Default.Star,
        MockNotificationIds.PROMO in readIds,
        Brush.linearGradient(listOf(LiquidGlass.Amber, LiquidGlass.Rose)),
        LiquidGlass.Amber,
    ),
    NotifItem(
        MockNotificationIds.PAYMENT,
        localized("notif_mock_payment_title"),
        "1,500,000",
        localized("notif_mock_yesterday"),
        Icons.Default.Payments,
        MockNotificationIds.PAYMENT in readIds,
        Brush.linearGradient(listOf(LiquidGlass.Emerald, LiquidGlass.Cyan)),
        LiquidGlass.Emerald,
    ),
)

private fun Modifier.clickableNoRipple(onClick: () -> Unit) =
    then(Modifier.clickable(onClick = onClick))
