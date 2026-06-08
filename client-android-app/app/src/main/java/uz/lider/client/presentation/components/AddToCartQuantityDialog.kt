package uz.lider.client.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.lider.client.domain.model.Product

@Composable
fun AddToCartQuantityDialog(
    product: Product,
    onDismiss: () -> Unit,
    onConfirm: (Double) -> Unit,
) {
    val palette = rememberClientPalette()
    val decimal = isDecimalUnit(product.unit)
    var qtyText by remember(product.id) { mutableStateOf("1") }
    var error by remember(product.id) { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(product.name, color = palette.text, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, maxLines = 2)
        },
        text = {
            Column {
                Text(localized("cat_qty_label"), color = palette.textMuted, fontSize = 13.sp)
                Spacer(Modifier.height(8.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(palette.input)
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    BasicTextField(
                        value = qtyText,
                        onValueChange = { value ->
                            val filtered = if (decimal) {
                                value.filterIndexed { index, char ->
                                    char.isDigit() || (char == '.' && !value.take(index).contains('.'))
                                }
                            } else {
                                value.filter { it.isDigit() }
                            }
                            qtyText = filtered
                            error = false
                        },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        textStyle = TextStyle(color = palette.text, fontSize = 18.sp, fontWeight = FontWeight.SemiBold),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = if (decimal) KeyboardType.Decimal else KeyboardType.Number,
                        ),
                    )
                    Text(product.unit, color = palette.primary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
                if (error) {
                    Spacer(Modifier.height(6.dp))
                    Text(localized("cat_qty_invalid"), color = palette.danger, fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val qty = qtyText.toDoubleOrNull()
                    if (qty == null || qty <= 0 || qty > product.stockBalance) {
                        error = true
                        return@TextButton
                    }
                    if (!decimal && qty % 1.0 != 0.0) {
                        error = true
                        return@TextButton
                    }
                    onConfirm(qty)
                },
            ) {
                Text(localized("cat_add_cart"), color = palette.primary, fontWeight = FontWeight.SemiBold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(localized("com_cancel"), color = palette.textMuted)
            }
        },
        containerColor = palette.card,
        titleContentColor = palette.text,
        textContentColor = palette.text,
    )
}
