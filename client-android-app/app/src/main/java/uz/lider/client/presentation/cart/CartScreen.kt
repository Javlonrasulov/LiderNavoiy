package uz.lider.client.presentation.cart

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.domain.model.CartItem
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.ProductImageBox
import uz.lider.client.presentation.components.cartBadgeCount
import uz.lider.client.presentation.components.formatMoney
import uz.lider.client.presentation.components.formatQty
import uz.lider.client.presentation.components.isDecimalUnit
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassThemed

@Composable
fun CartScreen(
    onBack: () -> Unit,
    onCheckoutSuccess: () -> Unit,
    viewModel: CartViewModel = hiltViewModel(),
) {
    val items by viewModel.items.collectAsState()
    val state by viewModel.uiState.collectAsState()
    val total = viewModel.total()
    val itemCount = cartBadgeCount(items)

    ClientStackScaffold(title = "${localized("cart_title")} ($itemCount)", onBack = onBack) { padding ->
        LiquidBackground(modifier = Modifier.fillMaxSize()) {
            if (items.isEmpty()) {
                Box(
                    Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Box(
                            Modifier
                                .size(96.dp)
                                .liquidGlassThemed(radius = LiquidGlass.RadiusCard),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Default.ShoppingCart,
                                contentDescription = null,
                                tint = LiquidGlass.Indigo,
                                modifier = Modifier.size(44.dp),
                            )
                        }
                        Text(
                            localized("cart_empty"),
                            color = LiquidTheme.text,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp,
                        )
                        Text(
                            localized("cart_go_catalog"),
                            color = LiquidTheme.textMuted,
                            fontSize = 13.sp,
                        )
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(LiquidGlass.RadiusChip))
                                .background(LiquidGlass.GradientPrimary)
                                .clickable(onClick = onBack)
                                .padding(horizontal = 32.dp, vertical = 14.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                localized("cart_go_catalog"),
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
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
                        item { SummaryCard(total) }
                    }
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                            .clip(RoundedCornerShape(LiquidGlass.RadiusChip))
                            .background(LiquidGlass.GradientPrimary)
                            .clickable(enabled = !state.checkingOut) { viewModel.checkout(onCheckoutSuccess) }
                            .padding(vertical = 16.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (state.checkingOut) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                        } else {
                            Text(
                                localized("cart_submit"),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CartItemRow(item: CartItem, onInc: () -> Unit, onDec: () -> Unit, onRemove: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .liquidGlassThemed()
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ProductImageBox(
            imageUrl = item.image.takeIf { it.isNotBlank() },
            contentDescription = item.name,
            modifier = Modifier
                .size(68.dp)
                .clip(RoundedCornerShape(14.dp)),
            contentScale = ContentScale.Crop,
        )
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(item.name, color = LiquidTheme.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text(item.brand, color = LiquidTheme.textMuted, fontSize = 12.sp)
            Text(
                "${formatMoney(item.price * item.qty)} ${localized("com_som")}",
                color = LiquidGlass.Cyan,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Box(
                    Modifier
                        .size(30.dp)
                        .liquidGlassThemed(radius = 8.dp)
                        .clickable(onClick = onRemove),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Delete, null, tint = LiquidGlass.Rose, modifier = Modifier.size(14.dp))
                }
                Row(
                    Modifier.liquidGlassThemed(radius = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier.size(32.dp).clickable(onClick = onDec),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Default.Remove, null, tint = LiquidTheme.text, modifier = Modifier.size(14.dp))
                    }
                    Text(
                        "${formatQty(item.qty)} ${item.unit}",
                        modifier = Modifier.padding(horizontal = 8.dp),
                        color = LiquidTheme.text,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Box(
                        Modifier.size(32.dp).clickable(onClick = onInc),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Default.Add, null, tint = LiquidTheme.text, modifier = Modifier.size(14.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun AddressCard(address: String, onChange: (String) -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .liquidGlassThemed()
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Icons.Default.LocationOn, null, tint = LiquidGlass.Cyan, modifier = Modifier.size(18.dp))
            Text(
                localized("cart_delivery_addr"),
                color = LiquidTheme.text,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
            )
        }
        Spacer(Modifier.height(8.dp))
        BasicTextField(
            value = address,
            onValueChange = onChange,
            modifier = Modifier.fillMaxWidth(),
            textStyle = TextStyle(color = LiquidTheme.text, fontSize = 14.sp),
            decorationBox = { inner ->
                if (address.isEmpty()) {
                    Text(localized("cart_delivery_addr"), color = LiquidTheme.textMuted, fontSize = 14.sp)
                }
                inner()
            },
        )
    }
}

@Composable
private fun NoteCard(note: String, onChange: (String) -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .liquidGlassThemed()
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Icons.Default.Message, null, tint = LiquidGlass.Violet, modifier = Modifier.size(18.dp))
            Text(
                localized("cart_note"),
                color = LiquidTheme.text,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
            )
        }
        Spacer(Modifier.height(8.dp))
        BasicTextField(
            value = note,
            onValueChange = onChange,
            modifier = Modifier.fillMaxWidth(),
            textStyle = TextStyle(color = LiquidTheme.text, fontSize = 14.sp),
            decorationBox = { inner ->
                if (note.isEmpty()) {
                    Text(localized("cart_note_placeholder"), color = LiquidTheme.textMuted, fontSize = 14.sp)
                }
                inner()
            },
        )
    }
}

@Composable
private fun PaymentCard(selected: PaymentType, onSelect: (PaymentType) -> Unit) {
    val options = listOf(
        PaymentType.CASH to localized("cart_cash"),
        PaymentType.CARD to localized("cart_card"),
        PaymentType.TRANSFER to localized("cart_transfer"),
        PaymentType.CREDIT to localized("cart_credit"),
    )
    Column(
        Modifier
            .fillMaxWidth()
            .liquidGlassThemed()
            .padding(16.dp),
    ) {
        Text(localized("cart_payment_type"), color = LiquidTheme.text, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(10.dp))
        options.chunked(2).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { (type, label) ->
                    val isSelected = selected == type
                    Box(
                        modifier = if (isSelected) {
                            Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(LiquidGlass.RadiusChip))
                                .background(LiquidGlass.GradientPrimary)
                                .clickable { onSelect(type) }
                                .padding(vertical = 11.dp)
                        } else {
                            Modifier
                                .weight(1f)
                                .liquidGlassThemed(radius = LiquidGlass.RadiusChip)
                                .clickable { onSelect(type) }
                                .padding(vertical = 11.dp)
                        },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            label,
                            color = if (isSelected) Color.White else LiquidTheme.textMuted,
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                        )
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun SummaryCard(total: Double) {
    Column(
        Modifier
            .fillMaxWidth()
            .liquidGlassThemed()
            .padding(16.dp),
    ) {
        SummaryRow(localized("cart_products"), "${formatMoney(total)} ${localized("com_som")}")
        Spacer(Modifier.height(4.dp))
        SummaryRow(localized("cart_delivery"), localized("cart_free"))
        Spacer(Modifier.height(12.dp))
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Color.White.copy(alpha = 0.15f)),
        )
        Spacer(Modifier.height(12.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(localized("cart_total"), color = LiquidTheme.text, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Text(
                "${formatMoney(total)} ${localized("com_som")}",
                style = TextStyle(
                    brush = LiquidGlass.GradientPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                ),
            )
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = LiquidTheme.textMuted, fontSize = 14.sp)
        Text(value, color = LiquidTheme.text, fontSize = 14.sp)
    }
}
