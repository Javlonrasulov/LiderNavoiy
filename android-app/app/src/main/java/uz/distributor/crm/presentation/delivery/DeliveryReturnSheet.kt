package uz.distributor.crm.presentation.delivery

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.distributor.crm.data.remote.dto.OrderItemDto
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryReturnSheet(
    visible: Boolean,
    isDark: Boolean,
    lang: AppLanguage,
    items: List<OrderItemDto>,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (List<OrderItemDto>, String?) -> Unit,
) {
    if (!visible) return

    val sheetBg = if (isDark) Color(0xFF111827) else Color.White
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val subColor = Color(0xFF9CA3AF)
    val accent = Color(0xFF6366F1)
    val selected = remember { mutableStateMapOf<String, Boolean>() }
    val qtyMap = remember { mutableStateMapOf<String, String>() }
    var note by remember { mutableStateOf("") }
    var localError by remember { mutableStateOf<String?>(null) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = sheetBg,
    ) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    AppStrings.deliveryReturnTitle(lang),
                    modifier = Modifier.weight(1f),
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = titleColor,
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, null, tint = subColor)
                }
            }
            Text(AppStrings.deliveryReturnHint(lang), color = subColor, fontSize = 12.sp)
            Spacer(Modifier.height(12.dp))
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.heightIn(max = 320.dp),
            ) {
                items(items, key = { it.productId }) { item ->
                    val key = item.productId
                    val checked = selected[key] == true
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .background(
                                if (isDark) Color(0xFF1F2937) else Color(0xFFF9FAFB),
                                RoundedCornerShape(12.dp),
                            )
                            .padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(
                            checked = checked,
                            onCheckedChange = {
                                selected[key] = it
                                if (it && qtyMap[key].isNullOrBlank()) {
                                    qtyMap[key] = item.quantity.toString()
                                }
                            },
                        )
                        Column(Modifier.weight(1f)) {
                            Text(item.productName, color = titleColor, fontSize = 14.sp)
                            Text(
                                "max ${item.quantity} ${item.unit}",
                                color = subColor,
                                fontSize = 11.sp,
                            )
                        }
                        if (checked) {
                            OutlinedTextField(
                                value = qtyMap[key] ?: "",
                                onValueChange = { qtyMap[key] = it.filter { ch -> ch.isDigit() || ch == '.' } },
                                modifier = Modifier.fillMaxWidth(0.35f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                label = { Text("qty") },
                            )
                        }
                    }
                }
            }
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                label = { Text(AppStrings.deliveryReturnNote(lang)) },
                modifier = Modifier.fillMaxWidth(),
            )
            localError?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = Color(0xFFEF4444), fontSize = 13.sp)
            }
            Spacer(Modifier.height(14.dp))
            Button(
                onClick = {
                    localError = null
                    val picked = items.mapNotNull { item ->
                        if (selected[item.productId] != true) return@mapNotNull null
                        val q = qtyMap[item.productId]?.toDoubleOrNull() ?: 0.0
                        if (q <= 0 || q > item.quantity + 0.001) return@mapNotNull null
                        item.copy(quantity = q)
                    }
                    if (picked.isEmpty()) {
                        localError = AppStrings.deliveryReturnPickItems(lang)
                        return@Button
                    }
                    onSubmit(picked, note.ifBlank { null })
                },
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = accent),
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text(AppStrings.confirm(lang), color = Color.White)
                }
            }
        }
    }
}
