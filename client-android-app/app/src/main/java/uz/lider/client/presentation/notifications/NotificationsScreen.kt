package uz.lider.client.presentation.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.clientCard
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.rememberClientPalette

private data class NotifItem(val id: String, val title: String, val body: String, val time: String, val icon: ImageVector, val read: Boolean)

@Composable
fun NotificationsScreen(onBack: () -> Unit) {
    val lang = LocalAppLanguage.current
    val palette = rememberClientPalette()
    var items by remember { mutableStateOf(mockNotifications(lang)) }

    ClientStackScaffold(title = localized("notif_title"), onBack = onBack) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.End,
            ) {
                Row(
                    Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(palette.primary.copy(alpha = 0.12f))
                        .clickableNoRipple { items = items.map { it.copy(read = true) } }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Default.DoneAll, null, tint = palette.primary, modifier = Modifier.size(16.dp))
                    Text(" ${localized("notif_mark_all")}", color = palette.primary, fontSize = 13.sp)
                }
            }
            val unread = items.filter { !it.read }
            val read = items.filter { it.read }
            LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (unread.isNotEmpty()) {
                    item { Text(localized("notif_unread"), color = palette.textMuted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                    items(unread, key = { it.id }) { notif ->
                        NotificationRow(notif) { id ->
                            items = items.map { if (it.id == id) it.copy(read = true) else it }
                        }
                    }
                }
                if (read.isNotEmpty()) {
                    item { Text(localized("notif_read"), color = palette.textMuted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                    items(read, key = { it.id }) { notif -> NotificationRow(notif, onRead = {}) }
                }
            }
        }
    }
}

@Composable
private fun NotificationRow(notif: NotifItem, onRead: (String) -> Unit) {
    val palette = rememberClientPalette()
    Row(
        Modifier
            .clientCard(palette)
            .clickableNoRipple { onRead(notif.id) }
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(palette.primary.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(notif.icon, null, tint = palette.primary, modifier = Modifier.size(20.dp))
        }
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(notif.title, color = palette.text, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                if (!notif.read) {
                    Box(Modifier.size(8.dp).clip(CircleShape).background(palette.accent))
                }
            }
            Text(notif.body, color = palette.textMuted, fontSize = 13.sp)
            Text(notif.time, color = palette.textMuted, fontSize = 11.sp)
        }
    }
}

private fun mockNotifications(lang: AppLanguage): List<NotifItem> = listOf(
    NotifItem("1", if (lang == AppLanguage.RU) "Заказ в пути" else "Order on the way", "#ORD-2846", "10:30", Icons.Default.LocalShipping, false),
    NotifItem("2", if (lang == AppLanguage.RU) "Новая акция" else "New promo", "20% Coca Cola", "09:15", Icons.Default.Star, false),
    NotifItem("3", if (lang == AppLanguage.RU) "Платёж получен" else "Payment received", "1,500,000", "Kecha", Icons.Default.Payments, true),
)

private fun Modifier.clickableNoRipple(onClick: () -> Unit) =
    then(Modifier.clickable(onClick = onClick))
