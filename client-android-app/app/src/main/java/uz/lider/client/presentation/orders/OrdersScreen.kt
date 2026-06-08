package uz.lider.client.presentation.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.OrderStatus
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientTabScaffold
import uz.lider.client.presentation.components.clientCard
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.orderDisplayLabel
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.orderStatusColor
import uz.lider.client.presentation.components.orderStatusLabel
import uz.lider.client.presentation.components.rememberClientPalette
import uz.lider.client.presentation.navigation.ClientRoutes

@Composable
fun OrdersScreen(
    onNavigate: (String) -> Unit,
    viewModel: OrdersViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val lang = LocalAppLanguage.current
    val palette = rememberClientPalette()
    val orders = viewModel.filteredOrders()
    val filters = listOf(
        "all" to localized("ord_all"),
        "onway" to localized("ord_status_onway"),
        "delivered" to localized("ord_status_delivered"),
        "packing" to localized("ord_status_packing"),
        "warehouse" to localized("ord_status_warehouse"),
        "received" to localized("ord_status_received"),
        "cancelled" to localized("ord_status_cancelled"),
    )

    ClientTabScaffold(title = localized("ord_title"), bottomPadding = true) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(palette.input)
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Default.Search, null, tint = palette.textMuted, modifier = Modifier.size(18.dp))
                    BasicTextField(
                        value = state.search,
                        onValueChange = viewModel::onSearchChange,
                        modifier = Modifier.weight(1f).padding(horizontal = 8.dp),
                        textStyle = androidx.compose.ui.text.TextStyle(color = palette.text, fontSize = 14.sp),
                        decorationBox = { inner ->
                            if (state.search.isEmpty()) Text(localized("ord_search"), color = palette.textMuted, fontSize = 14.sp)
                            inner()
                        },
                    )
                }
                Spacer(Modifier.size(12.dp))
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    filters.forEach { (key, label) ->
                        val selected = state.statusFilter == key
                        val chipColor = if (key == "all") palette.primary else orderStatusColor(keyToStatus(key), palette)
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (selected) chipColor else palette.surface2)
                                .clickable { viewModel.onStatusFilterChange(key) }
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                        ) {
                            Text(label, color = if (selected) Color.White else palette.textMuted, fontSize = 12.sp)
                        }
                    }
                }
            }

            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = palette.primary)
                }
            } else {
                Text(
                    "${orders.size} ${localized("ord_count")}",
                    color = palette.textMuted,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(orders, key = { it.id }) { order ->
                        OrderCard(order, lang, palette, onClick = { onNavigate(ClientRoutes.orderTracking(order.id)) }, onReorder = { onNavigate(ClientRoutes.CATALOG) })
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderCard(order: ClientOrder, lang: uz.lider.client.localization.AppLanguage, palette: uz.lider.client.presentation.components.ClientPalette, onClick: () -> Unit, onReorder: () -> Unit) {
    val status = orderStatusLabel(lang, order.status)
    val color = orderStatusColor(order.status, palette)
    val product = order.items.firstOrNull()?.productName ?: order.id
    val delivered = OrderStatus.fromKey(order.status) == OrderStatus.DELIVERED

    Column(
        Modifier
            .clientCard(palette)
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(40.dp).clip(RoundedCornerShape(16.dp)).background(palette.primary.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.ShoppingBag, null, tint = palette.primary)
                }
                Column {
                    Text(orderDisplayLabel(lang, order.id), color = palette.text, fontWeight = FontWeight.SemiBold)
                    Text(order.createdAt.take(10), color = palette.textMuted, fontSize = 12.sp)
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(status, color = color, fontSize = 11.sp, modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(color.copy(alpha = 0.15f)).padding(horizontal = 8.dp, vertical = 4.dp))
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = palette.textMuted)
            }
        }
        Spacer(Modifier.size(8.dp))
        Text(product, color = palette.textMuted, fontSize = 12.sp)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("${order.items.size} ${localized("ord_items")}", color = palette.textMuted, fontSize = 12.sp)
            Text("${formatMoney(order.totalAmount)} ${localized("com_som")}", color = palette.text, fontWeight = FontWeight.Bold)
        }
        if (delivered) {
            Spacer(Modifier.size(8.dp))
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(palette.primary.copy(alpha = 0.1f))
                    .clickable(onClick = onReorder)
                    .padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Default.Refresh, null, tint = palette.primary, modifier = Modifier.size(16.dp))
                Text(" ${localized("ord_reorder")}", color = palette.primary, fontSize = 13.sp)
            }
        }
    }
}

private fun keyToStatus(key: String): String = when (key) {
    "onway" -> "on_way"
    "delivered" -> "delivered"
    "packing" -> "packing"
    "warehouse" -> "confirmed"
    "received" -> "pending"
    "cancelled" -> "cancelled"
    else -> "pending"
}
