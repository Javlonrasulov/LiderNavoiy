package uz.distributor.crm.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import uz.distributor.crm.localization.AppLanguage

@Composable
fun AppLanguageDropdownMenu(
    expanded: Boolean,
    onDismissRequest: () -> Unit,
    current: AppLanguage,
    isDark: Boolean,
    onSelect: (AppLanguage) -> Unit,
) {
    DropdownMenu(expanded = expanded, onDismissRequest = onDismissRequest) {
        AppLanguage.menuOrder.forEach { lang ->
            val selected = lang == current
            DropdownMenuItem(
                text = {
                    Text(
                        lang.menuLabel,
                        color = if (selected) Color.White else if (isDark) Color.White else Color(0xFF111827),
                    )
                },
                onClick = {
                    onDismissRequest()
                    onSelect(lang)
                },
                modifier = if (selected) {
                    Modifier
                        .fillMaxWidth()
                        .background(if (isDark) Color(0xFF2563EB) else Color(0xFF3B82F6))
                        .padding(horizontal = 4.dp)
                } else {
                    Modifier.fillMaxWidth()
                },
            )
        }
    }
}
