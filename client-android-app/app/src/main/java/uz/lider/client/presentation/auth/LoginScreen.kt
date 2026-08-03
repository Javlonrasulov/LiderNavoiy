package uz.lider.client.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.lider.client.data.remote.ApiErrorMapper
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.glowEffect
import uz.lider.client.presentation.theme.liquidGlassThemed

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val lang = LocalAppLanguage.current
    var passwordVisible by remember { mutableStateOf(false) }
    var showLangMenu by remember { mutableStateOf(false) }

    val glassFieldColors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor = Color.White.copy(alpha = 0.12f),
        unfocusedContainerColor = Color.White.copy(alpha = 0.08f),
        focusedTextColor = LiquidTheme.text,
        unfocusedTextColor = LiquidTheme.text,
        focusedBorderColor = LiquidGlass.GlassDarkBorderStrong,
        unfocusedBorderColor = LiquidTheme.textMuted.copy(alpha = 0.3f),
        focusedLabelColor = LiquidGlass.IndigoLight,
        unfocusedLabelColor = LiquidTheme.textMuted,
        cursorColor = LiquidGlass.Cyan,
        focusedLeadingIconColor = LiquidGlass.IndigoLight,
        unfocusedLeadingIconColor = LiquidTheme.textMuted,
        focusedTrailingIconColor = LiquidGlass.IndigoLight,
        unfocusedTrailingIconColor = LiquidTheme.textMuted,
    )

    LaunchedEffect(state.isSuccess) { if (state.isSuccess) onLoginSuccess() }

    LiquidBackground(modifier = Modifier.fillMaxSize()) {

        // Language picker — top-right glass pill button
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(16.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .liquidGlassThemed(radius = LiquidGlass.RadiusChip),
                contentAlignment = Alignment.Center,
            ) {
                IconButton(onClick = { showLangMenu = true }, modifier = Modifier.size(40.dp)) {
                    Icon(
                        Icons.Default.Language,
                        contentDescription = null,
                        tint = LiquidTheme.textMuted,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
            DropdownMenu(
                expanded = showLangMenu,
                onDismissRequest = { showLangMenu = false },
            ) {
                AppLanguage.menuOrder.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option.menuLabel) },
                        onClick = {
                            viewModel.setLanguage(option)
                            showLangMenu = false
                        },
                    )
                }
            }
        }

        // imePadding: forma klaviatura ustiga ko‘tariladi; scroll — joy yetmasa
        Box(
            modifier = Modifier
                .fillMaxSize()
                .imePadding(),
        ) {
            Column(
                modifier = Modifier
                    .align(Alignment.Center)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp)
                    .padding(vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {

                // Gradient logo icon with ambient glow
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .glowEffect(color = LiquidGlass.Indigo, radius = 180f)
                        .clip(RoundedCornerShape(LiquidGlass.RadiusCard))
                        .background(LiquidGlass.GradientPrimary),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.Login,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(36.dp),
                    )
                }

                Spacer(Modifier.height(20.dp))

                Text(
                    loginTitle(lang),
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = LiquidTheme.text,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    loginSubtitle(lang),
                    fontSize = 14.sp,
                    color = LiquidTheme.textMuted,
                )

                Spacer(Modifier.height(32.dp))

                // Frosted glass card wrapping the form fields
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .liquidGlassThemed(radius = LiquidGlass.RadiusCard)
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    OutlinedTextField(
                        value = state.username,
                        onValueChange = viewModel::onUsernameChange,
                        label = { Text(loginUsername(lang)) },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(LiquidGlass.RadiusInput),
                        colors = glassFieldColors,
                    )

                    OutlinedTextField(
                        value = state.password,
                        onValueChange = viewModel::onPasswordChange,
                        label = { Text(loginPassword(lang)) },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Outlined.VisibilityOff,
                                    contentDescription = null,
                                )
                            }
                        },
                        shape = RoundedCornerShape(LiquidGlass.RadiusInput),
                        colors = glassFieldColors,
                    )
                }

                state.errorKey?.let { key ->
                    Spacer(Modifier.height(10.dp))
                    Text(
                        apiErrorMessage(lang, key),
                        color = LiquidGlass.Rose,
                        fontSize = 13.sp,
                    )
                }

                Spacer(Modifier.height(20.dp))

                // Gradient "Kirish" button
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp)
                        .clip(RoundedCornerShape(LiquidGlass.RadiusChip))
                        .background(
                            if (!state.isLoading) LiquidGlass.GradientPrimary
                            else Brush.linearGradient(
                                listOf(LiquidGlass.GlassDarkStrong, LiquidGlass.GlassDarkStrong),
                            ),
                        )
                        .clickable(enabled = !state.isLoading) { viewModel.login() },
                    contentAlignment = Alignment.Center,
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text(
                            loginButton(lang),
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

private fun loginTitle(lang: AppLanguage) = when (lang) {
    AppLanguage.RU -> "Вход"
    AppLanguage.EN -> "Sign in"
    AppLanguage.UZ_KRIL -> "Кириш"
    AppLanguage.UZ -> "Kirish"
}

private fun loginSubtitle(lang: AppLanguage) = when (lang) {
    AppLanguage.RU -> "Клиентский портал Lider"
    AppLanguage.EN -> "Lider client portal"
    AppLanguage.UZ_KRIL -> "Lider мижоз портали"
    AppLanguage.UZ -> "Lider mijoz portali"
}

private fun loginUsername(lang: AppLanguage) = when (lang) {
    AppLanguage.RU -> "Логин"
    AppLanguage.EN -> "Username"
    AppLanguage.UZ_KRIL -> "Логин"
    AppLanguage.UZ -> "Login"
}

private fun loginPassword(lang: AppLanguage) = when (lang) {
    AppLanguage.RU -> "Пароль"
    AppLanguage.EN -> "Password"
    AppLanguage.UZ_KRIL -> "Парол"
    AppLanguage.UZ -> "Parol"
}

private fun loginButton(lang: AppLanguage) = when (lang) {
    AppLanguage.RU -> "Войти"
    AppLanguage.EN -> "Sign in"
    AppLanguage.UZ_KRIL -> "Кириш"
    AppLanguage.UZ -> "Kirish"
}

private fun apiErrorMessage(lang: AppLanguage, key: String): String = when (key) {
    ApiErrorMapper.CLIENT_ONLY -> when (lang) {
        AppLanguage.RU -> "Доступ только для клиентов"
        AppLanguage.EN -> "Client accounts only"
        AppLanguage.UZ_KRIL -> "Фақат мижозлар учун"
        AppLanguage.UZ -> "Faqat mijozlar uchun"
    }
    ApiErrorMapper.INVALID_CREDENTIALS, ApiErrorMapper.UNAUTHORIZED -> when (lang) {
        AppLanguage.RU -> "Неверный логин или пароль"
        AppLanguage.EN -> "Invalid username or password"
        AppLanguage.UZ_KRIL -> "Логин ёки парол нотўғри"
        AppLanguage.UZ -> "Login yoki parol noto'g'ri"
    }
    ApiErrorMapper.CREDENTIALS_REQUIRED -> when (lang) {
        AppLanguage.RU -> "Введите логин и пароль"
        AppLanguage.EN -> "Enter username and password"
        AppLanguage.UZ_KRIL -> "Логин ва паролни киритинг"
        AppLanguage.UZ -> "Login va parolni kiriting"
    }
    ApiErrorMapper.NETWORK_ERROR -> when (lang) {
        AppLanguage.RU -> "Нет соединения с сервером"
        AppLanguage.EN -> "Cannot reach server"
        AppLanguage.UZ_KRIL -> "Серверга уланиб бўлмади"
        AppLanguage.UZ -> "Serverga ulanib bo'lmadi"
    }
    else -> when (lang) {
        AppLanguage.RU -> "Ошибка входа"
        AppLanguage.EN -> "Login failed"
        AppLanguage.UZ_KRIL -> "Киришда хато"
        AppLanguage.UZ -> "Kirishda xato"
    }
}
