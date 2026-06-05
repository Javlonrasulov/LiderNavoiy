package uz.distributor.crm.presentation.auth

import android.content.Intent
import android.view.View
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.components.AppLanguageDropdownMenu
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.sherinHeroBrush
import uz.distributor.crm.service.LocationSyncWorker
import uz.distributor.crm.service.LocationTrackingService

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val lang = LocalAppLanguage.current
    var showLangMenu by remember { mutableStateOf(false) }
    var passwordVisible by remember { mutableStateOf(false) }

    val loginFieldColors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor = Color.White,
        unfocusedContainerColor = Color.White,
        focusedTextColor = Color(0xFF111827),
        unfocusedTextColor = Color(0xFF111827),
        focusedBorderColor = SherinColors.Primary,
        unfocusedBorderColor = Color(0xFFD1D5DB),
        focusedLabelColor = SherinColors.Primary,
        unfocusedLabelColor = Color(0xFF6B7280),
        cursorColor = SherinColors.Primary,
    )

    LaunchedEffect(Unit) {
        viewModel.resetForm()
    }

    val rootView = LocalView.current
    DisposableEffect(Unit) {
        val previous = rootView.importantForAutofill
        rootView.importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
        onDispose { rootView.importantForAutofill = previous }
    }

    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) {
            LocationSyncWorker.enqueue(context)
            ContextCompat.startForegroundService(
                context,
                Intent(context, LocationTrackingService::class.java).apply {
                    action = LocationTrackingService.ACTION_START
                },
            )
            onLoginSuccess()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(sherinHeroBrush(false)),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 48.dp),
            horizontalArrangement = Arrangement.End,
        ) {
            Box {
                SherinGlassIconButton(onClick = { showLangMenu = true }, icon = Icons.Default.Language, size = 40.dp)
                AppLanguageDropdownMenu(
                    expanded = showLangMenu,
                    onDismissRequest = { showLangMenu = false },
                    current = lang,
                    isDark = false,
                    onSelect = viewModel::setLanguage,
                )
            }
        }

        Card(
            modifier = Modifier
                .align(Alignment.Center)
                .fillMaxWidth()
                .padding(24.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(16.dp),
        ) {
            Column(modifier = Modifier.padding(28.dp)) {
                Text(AppStrings.loginTitle(lang), fontSize = 26.sp, fontWeight = FontWeight.Bold, color = Color(0xFF111827))
                Text(AppStrings.loginSubtitle(lang), color = Color(0xFF6B7280), fontSize = 14.sp)
                Spacer(Modifier.height(28.dp))

                OutlinedTextField(
                    value = state.username,
                    onValueChange = viewModel::onUsernameChange,
                    label = { Text(AppStrings.loginField(lang)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    colors = loginFieldColors,
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = state.password,
                    onValueChange = viewModel::onPasswordChange,
                    label = { Text(AppStrings.password(lang)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    visualTransformation = if (passwordVisible) {
                        VisualTransformation.None
                    } else {
                        PasswordVisualTransformation()
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) {
                                    Icons.Default.Visibility
                                } else {
                                    Icons.Outlined.VisibilityOff
                                },
                                contentDescription = if (passwordVisible) {
                                    AppStrings.hide(lang)
                                } else {
                                    AppStrings.showPassword(lang)
                                },
                                tint = Color(0xFF6B7280),
                            )
                        }
                    },
                    shape = RoundedCornerShape(14.dp),
                    colors = loginFieldColors,
                )

                state.error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
                }

                Spacer(Modifier.height(24.dp))
                Button(
                    onClick = viewModel::login,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    enabled = !state.isLoading,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SherinColors.Primary),
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                    } else {
                        Text(
                            AppStrings.loginButton(lang),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White,
                        )
                    }
                }
            }
        }
    }
}
