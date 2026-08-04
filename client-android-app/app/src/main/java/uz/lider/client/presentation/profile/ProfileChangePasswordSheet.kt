package uz.lider.client.presentation.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.lider.client.data.remote.ApiErrorMapper
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileChangePasswordSheet(
    visible: Boolean,
    state: ChangePasswordUiState,
    onDismiss: () -> Unit,
    onCurrentPasswordChange: (String) -> Unit,
    onNewPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    if (!visible) return

    val isDark = LiquidTheme.isDark
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    val fieldBg = if (isDark) Color(0xFF1F2937) else Color(0xFFF3F4F6)
    val borderColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    val sheetBg = if (isDark) Color(0xFF111827) else Color.White

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
                Icon(
                    Icons.Default.Lock,
                    null,
                    tint = LiquidGlass.Indigo,
                    modifier = Modifier.size(22.dp),
                )
                Spacer(Modifier.width(10.dp))
                Text(
                    localized("prof_change_password"),
                    modifier = Modifier.weight(1f),
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = text,
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = null, tint = textMuted)
                }
            }

            Spacer(Modifier.height(20.dp))

            PasswordField(
                value = state.currentPassword,
                onValueChange = onCurrentPasswordChange,
                label = localized("prof_pwd_current"),
                visible = showCurrent,
                onToggleVisibility = { showCurrent = !showCurrent },
                fieldBg = fieldBg,
                borderColor = borderColor,
                text = text,
                textMuted = textMuted,
                isDark = isDark,
            )
            Spacer(Modifier.height(12.dp))
            PasswordField(
                value = state.newPassword,
                onValueChange = onNewPasswordChange,
                label = localized("prof_pwd_new"),
                visible = showNew,
                onToggleVisibility = { showNew = !showNew },
                fieldBg = fieldBg,
                borderColor = borderColor,
                text = text,
                textMuted = textMuted,
                isDark = isDark,
            )
            Spacer(Modifier.height(12.dp))
            PasswordField(
                value = state.confirmPassword,
                onValueChange = onConfirmPasswordChange,
                label = localized("prof_pwd_confirm"),
                visible = showConfirm,
                onToggleVisibility = { showConfirm = !showConfirm },
                fieldBg = fieldBg,
                borderColor = borderColor,
                text = text,
                textMuted = textMuted,
                isDark = isDark,
            )

            state.errorKey?.let { key ->
                Spacer(Modifier.height(12.dp))
                Text(
                    passwordErrorMessage(key),
                    color = LiquidGlass.Rose,
                    fontSize = 13.sp,
                )
            }

            Spacer(Modifier.height(24.dp))

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                    enabled = !state.isLoading,
                ) {
                    Text(localized("com_cancel"))
                }
                Button(
                    onClick = onSubmit,
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = LiquidGlass.Indigo),
                    enabled = !state.isLoading,
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text(localized("prof_pwd_save"), fontWeight = FontWeight.SemiBold)
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
    borderColor: Color,
    text: Color,
    textMuted: Color,
    isDark: Boolean,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(label, color = textMuted) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        shape = RoundedCornerShape(14.dp),
        visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        leadingIcon = {
            Icon(Icons.Default.Lock, null, tint = textMuted, modifier = Modifier.size(18.dp))
        },
        trailingIcon = {
            IconButton(onClick = onToggleVisibility) {
                Icon(
                    imageVector = if (visible) Icons.Default.Visibility else Icons.Outlined.VisibilityOff,
                    contentDescription = null,
                    tint = textMuted,
                )
            }
        },
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = fieldBg,
            unfocusedContainerColor = fieldBg,
            focusedTextColor = text,
            unfocusedTextColor = text,
            focusedBorderColor = LiquidGlass.Indigo,
            unfocusedBorderColor = borderColor,
            cursorColor = LiquidGlass.Indigo,
        ),
    )
}

@Composable
private fun passwordErrorMessage(key: String): String = when (key) {
    ApiErrorMapper.CURRENT_PASSWORD_REQUIRED -> localized("prof_pwd_err_current_required")
    ApiErrorMapper.PASSWORD_TOO_SHORT -> localized("prof_pwd_err_too_short")
    ApiErrorMapper.PASSWORD_MISMATCH -> localized("prof_pwd_err_mismatch")
    ApiErrorMapper.INVALID_CURRENT_PASSWORD -> localized("prof_pwd_err_invalid_current")
    ApiErrorMapper.NETWORK_ERROR -> localized("prof_pwd_err_network")
    else -> localized("prof_pwd_err_failed")
}
