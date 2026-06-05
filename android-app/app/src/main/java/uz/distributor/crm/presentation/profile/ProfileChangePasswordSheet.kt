package uz.distributor.crm.presentation.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileChangePasswordSheet(
    visible: Boolean,
    isDark: Boolean,
    lang: AppLanguage,
    state: ChangePasswordUiState,
    onDismiss: () -> Unit,
    onCurrentPasswordChange: (String) -> Unit,
    onNewPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    if (!visible) return

    val sheetBg = if (isDark) Color(0xFF111827) else Color.White
    val fieldBg = if (isDark) Color(0xFF1F2937) else Color(0xFFF3F4F6)
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val labelColor = if (isDark) Color(0xFF9CA3AF) else Color(0xFF6B7280)
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)

    var showCurrent by remember { mutableStateOf(false) }
    var showNew by remember { mutableStateOf(false) }
    var showConfirm by remember { mutableStateOf(false) }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(state.success) {
        if (state.success) onDismiss()
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = sheetBg,
        dragHandle = {
            Box(
                Modifier
                    .padding(vertical = 12.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(if (isDark) Color(0xFF4B5563) else Color(0xFFD1D5DB)),
            )
        },
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Default.Lock, null, tint = Color(0xFF3B82F6), modifier = Modifier.size(22.dp))
                Spacer(Modifier.width(10.dp))
                Text(
                    AppStrings.changePassword(lang),
                    modifier = Modifier.weight(1f),
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = titleColor,
                )
                IconButton(onClick = onDismiss) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = AppStrings.msgCancel(lang),
                        tint = labelColor,
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            PasswordField(
                value = state.currentPassword,
                onValueChange = onCurrentPasswordChange,
                label = AppStrings.currentPassword(lang),
                visible = showCurrent,
                onToggleVisibility = { showCurrent = !showCurrent },
                fieldBg = fieldBg,
                labelColor = labelColor,
                borderColor = borderColor,
                isDark = isDark,
                lang = lang,
            )
            Spacer(Modifier.height(12.dp))
            PasswordField(
                value = state.newPassword,
                onValueChange = onNewPasswordChange,
                label = AppStrings.newPassword(lang),
                visible = showNew,
                onToggleVisibility = { showNew = !showNew },
                fieldBg = fieldBg,
                labelColor = labelColor,
                borderColor = borderColor,
                isDark = isDark,
                lang = lang,
            )
            Spacer(Modifier.height(12.dp))
            PasswordField(
                value = state.confirmPassword,
                onValueChange = onConfirmPasswordChange,
                label = AppStrings.confirmPassword(lang),
                visible = showConfirm,
                onToggleVisibility = { showConfirm = !showConfirm },
                fieldBg = fieldBg,
                labelColor = labelColor,
                borderColor = borderColor,
                isDark = isDark,
                lang = lang,
            )

            state.errorKey?.let { key ->
                Spacer(Modifier.height(12.dp))
                Text(
                    AppStrings.profileError(lang, key),
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 13.sp,
                )
            }

            Spacer(Modifier.height(24.dp))

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = if (isDark) Color(0xFF9CA3AF) else Color(0xFF4B5563),
                    ),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = androidx.compose.ui.graphics.SolidColor(borderColor),
                    ),
                    enabled = !state.isLoading,
                ) {
                    Text(AppStrings.msgCancel(lang))
                }
                Button(
                    onClick = onSubmit,
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                    enabled = !state.isLoading,
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text(AppStrings.saveClient(lang))
                    }
                }
            }
        }
    }
}

@Composable
private fun PasswordField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    visible: Boolean,
    onToggleVisibility: () -> Unit,
    fieldBg: Color,
    labelColor: Color,
    borderColor: Color,
    isDark: Boolean,
    lang: AppLanguage,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(label, color = labelColor) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        shape = RoundedCornerShape(14.dp),
        visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        leadingIcon = {
            Icon(Icons.Default.Lock, null, tint = labelColor, modifier = Modifier.size(18.dp))
        },
        trailingIcon = {
            IconButton(onClick = onToggleVisibility) {
                Icon(
                    imageVector = if (visible) Icons.Default.Visibility else Icons.Outlined.VisibilityOff,
                    contentDescription = if (visible) AppStrings.hide(lang) else AppStrings.showPassword(lang),
                    tint = labelColor,
                )
            }
        },
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = fieldBg,
            unfocusedContainerColor = fieldBg,
            focusedTextColor = if (isDark) Color.White else Color.Black,
            unfocusedTextColor = if (isDark) Color.White else Color.Black,
            focusedBorderColor = Color(0xFF3B82F6),
            unfocusedBorderColor = borderColor,
            cursorColor = Color(0xFF3B82F6),
        ),
    )
}
