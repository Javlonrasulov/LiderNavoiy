package uz.lider.client.presentation.cart

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.domain.model.CartItem
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.ProductImageBox
import uz.lider.client.presentation.components.clientCard
import uz.lider.client.presentation.components.cartBadgeCount
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.formatQty
import uz.lider.client.presentation.components.isDecimalUnit
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.rememberClientPalette

@Composable
fun CartScreen(
    onBack: () -> Unit,
    onCheckoutSuccess: () -> Unit,
    viewModel: CartViewModel = hiltViewModel(),
) {
    val items by viewModel.items.collectAsState()
    val state by viewModel.uiState.collectAsState()
    val palette = rememberClientPalette()
    val total = viewModel.total()
    val itemCount = cartBadgeCount(items)

    ClientStackScaffold(title = "${localized("cart_title")} ($itemCount)", onBack = onBack) { padding ->
        if (items.isEmpty()) {
            Column(
                Modifier.fillMaxSize().padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Box(
                    Modifier
                        .size(80.dp)
                        .clip(RoundedCornerShape(24.dp))
                        .background(palette.primary.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.ShoppingCart, null, tint = palette.primary, modifier = Modifier.size(36.dp))
                }
                Spacer(Modifier.height(16.dp))
                Text(localized("cart_empty"), color = palette.text, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(16.dp))
                Box(
                    Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(Brush.linearGradient(listOf(palette.primary, palette.accent)))
                        .clickable(onClick = onBack)
                        .padding(horizontal = 24.dp, vertical = 12.dp),
                ) {
                    Text(localized("cart_go_catalog"), color = Color.White)
                }
            }
        } else {
            Column(Modifier.fillMaxSize().padding(padding)) {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(items, key = { it.id }) { item ->
                        CartItemRow(
                            item,
                            onInc = {
                                val step = if (isDecimalUnit(item.unit)) 0.5 else 1.0
                                viewModel.updateQty(item.id, item.qty + step)
                            },
                            onDec = {
                                val step = if (isDecimalUnit(item.unit)) 0.5 else 1.0
                                viewModel.updateQty(item.id, (item.qty - step).coerceAtLeast(step))
                            },
                            onRemove = { viewModel.removeItem(item.id) },
                        )
                    }
                    item { AddressCard(state.address, viewModel::onAddressChange) }
                    item { NoteCard(state.note, viewModel::onNoteChange) }
                    item { PaymentCard(state.paymentType, viewModel::onPaymentTypeChange) }
                    item {
                        Column(Modifier.clientCard(palette).padding(16.dp)) {
                            SummaryRow(localized("cart_products"), "${formatMoney(total)} ${localized("com_som")}")
                            SummaryRow(localized("cart_delivery"), localized("cart_free"))
                            Spacer(Modifier.height(8.dp))
                            SummaryRow(localized("cart_total"), "${formatMoney(total)} ${localized("com_som")}", bold = true)
                        }
                    }
                }
                Box(
                    Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Brush.linearGradient(listOf(palette.primary, palette.accent)))
                        .clickable(enabled = !state.checkingOut) { viewModel.checkout(onCheckoutSuccess) }
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    if (state.checkingOut) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    } else {
                        Text(localized("cart_submit"), color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun CartItemRow(item: CartItem, onInc: () -> Unit, onDec: () -> Unit, onRemove: () -> Unit) {
    val palette = rememberClientPalette()
    Row(
        Modifier.clientCard(palette).padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ProductImageBox(
            imageUrl = item.image.takeIf { it.isNotBlank() },
            contentDescription = item.name,
            modifier = Modifier.size(64.dp).clip(RoundedCornerShape(12.dp)),
            contentScale = ContentScale.Crop,
        )
        Column(Modifier.weight(1f)) {
            Text(item.name, color = palette.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text(item.brand, color = palette.textMuted, fontSize = 12.sp)
            Text("${formatMoney(item.price * item.qty)} ${localized("com_som")}", color = palette.primary, fontWeight = FontWeight.Bold)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Delete, null, tint = palette.danger, modifier = Modifier.size(18.dp).clickable(onClick = onRemove))
                Row(Modifier.clip(RoundedCornerShape(8.dp)).background(palette.primary.copy(alpha = 0.15f))) {
                    Icon(Icons.Default.Remove, null, modifier = Modifier.clickable(onClick = onDec).padding(6.dp), tint = palette.text)
                    Text(
                        "${formatQty(item.qty)} ${item.unit}",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        color = palette.text,
                        fontSize = 12.sp,
                    )
                    Icon(Icons.Default.Add, null, modifier = Modifier.clickable(onClick = onInc).padding(6.dp), tint = palette.text)
                }
            }
        }
    }
}

@Composable
private fun AddressCard(address: String, onChange: (String) -> Unit) {
    val palette = rememberClientPalette()
    Column(Modifier.clientCard(palette).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.LocationOn, null, tint = palette.accent, modifier = Modifier.size(16.dp))
            Text(localized("cart_delivery_addr"), color = palette.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
        }
        BasicTextField(value = address, onValueChange = onChange, modifier = Modifier.fillMaxWidth().padding(top = 8.dp), textStyle = androidx.compose.ui.text.TextStyle(color = palette.textMuted, fontSize = 14.sp))
    }
}

@Composable
private fun NoteCard(note: String, onChange: (String) -> Unit) {
    val palette = rememberClientPalette()
    Column(Modifier.clientCard(palette).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Message, null, tint = palette.secondary, modifier = Modifier.size(16.dp))
            Text(localized("cart_note"), color = palette.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
        }
        BasicTextField(
            value = note,
            onValueChange = onChange,
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            textStyle = androidx.compose.ui.text.TextStyle(color = palette.text, fontSize = 14.sp),
            decorationBox = { inner ->
                if (note.isEmpty()) Text(localized("cart_note_placeholder"), color = palette.textMuted, fontSize = 14.sp)
                inner()
            },
        )
    }
}

@Composable
private fun PaymentCard(selected: PaymentType, onSelect: (PaymentType) -> Unit) {
    val palette = rememberClientPalette()
    val options = listOf(
        PaymentType.CASH to localized("cart_cash"),
        PaymentType.CARD to localized("cart_card"),
        PaymentType.TRANSFER to localized("cart_transfer"),
        PaymentType.CREDIT to localized("cart_credit"),
    )
    Column(Modifier.clientCard(palette).padding(16.dp)) {
        Text(localized("cart_payment_type"), color = palette.text, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))
        options.chunked(2).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { (type, label) ->
                    Box(
                        Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (selected == type) Brush.linearGradient(listOf(palette.primary, palette.accent)) else Brush.linearGradient(listOf(palette.surface2, palette.surface2)))
                            .clickable { onSelect(type) }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(label, color = if (selected == type) Color.White else palette.textMuted, fontSize = 13.sp)
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String, bold: Boolean = false) {
    val palette = rememberClientPalette()
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = palette.textMuted)
        Text(value, color = palette.text, fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal)
    }
}
