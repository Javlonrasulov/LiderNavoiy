package uz.distributor.crm.presentation.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.navigation.bottomNavHeight
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.sherinHeroBrush
import uz.distributor.crm.presentation.theme.sherinPageBackground

@Composable
fun ProfileScreen(
    onBack: () -> Unit,
    onLogout: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val user by viewModel.user.collectAsState(initial = null)
    val storedPassword by viewModel.password.collectAsState(initial = null)
    val showChangePassword by viewModel.showChangePassword.collectAsState()
    val changePasswordState by viewModel.changePasswordState.collectAsState()
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val pageBg = sherinPageBackground(isDark)
    val cardBg = if (isDark) SherinColors.CardDark else Color.White
    val labelColor = if (isDark) Color(0xFF9CA3AF) else Color(0xFF6B7280)
    val textColor = if (isDark) Color.White else Color.Black
    var passwordVisible by remember { mutableStateOf(false) }

    val (firstName, lastName) = remember(user?.fullName) {
        splitFullName(user?.fullName ?: "")
    }
    val position = AppStrings.salesAgentPosition(lang)
    val displayPassword = storedPassword ?: "•••••••••"

    Box(Modifier.fillMaxSize().background(pageBg)) {
        Column(Modifier.fillMaxSize()) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .background(sherinHeroBrush(isDark)),
            ) {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .padding(top = 40.dp, bottom = 28.dp),
                ) {
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        SherinGlassIconButton(
                            onClick = onBack,
                            icon = Icons.AutoMirrored.Filled.ArrowBack,
                            size = 40.dp,
                        )
                        Text(
                            AppStrings.profileTitle(lang),
                            modifier = Modifier.weight(1f),
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        )
                        Spacer(Modifier.width(40.dp))
                    }

                    Spacer(Modifier.height(24.dp))

                    Column(
                        Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(
                            Modifier
                                .size(96.dp)
                                .clip(CircleShape)
                                .border(3.dp, Color.White.copy(alpha = 0.35f), CircleShape)
                                .background(Color.White.copy(alpha = 0.12f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Default.Person, null, tint = Color.White, modifier = Modifier.size(48.dp))
                        }
                        Spacer(Modifier.height(16.dp))
                        Text(
                            user?.fullName ?: "Agent",
                            fontWeight = FontWeight.Bold,
                            fontSize = 22.sp,
                            color = Color.White,
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(position, fontSize = 14.sp, color = Color.White.copy(alpha = 0.85f))
                        user?.companyName?.takeIf { it.isNotBlank() }?.let { company ->
                            Spacer(Modifier.height(12.dp))
                            Row(
                                Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(Color.White.copy(alpha = 0.15f))
                                    .padding(horizontal = 14.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(Icons.Default.Business, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(company, fontSize = 13.sp, color = Color.White)
                            }
                        }
                    }
                }
            }

            Column(
                Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp, vertical = 20.dp)
                    .padding(bottom = bottomNavHeight()),
            ) {
                Text(
                    AppStrings.profileInfoSection(lang),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = labelColor,
                    letterSpacing = 1.sp,
                )
                Spacer(Modifier.height(12.dp))

                ProfileInfoCard(AppStrings.firstName(lang), firstName, cardBg, labelColor, textColor)
                Spacer(Modifier.height(10.dp))
                ProfileInfoCard(AppStrings.lastName(lang), lastName, cardBg, labelColor, textColor)
                Spacer(Modifier.height(10.dp))
                ProfileInfoCard(AppStrings.loginField(lang), user?.username ?: "—", cardBg, labelColor, textColor)
                Spacer(Modifier.height(10.dp))
                ProfilePasswordCard(
                    label = AppStrings.password(lang),
                    value = if (passwordVisible) displayPassword else "•".repeat(displayPassword.length.coerceAtLeast(9)),
                    cardBg = cardBg,
                    labelColor = labelColor,
                    textColor = textColor,
                    visible = passwordVisible,
                    onToggleVisibility = { passwordVisible = !passwordVisible },
                    lang = lang,
                )
                Spacer(Modifier.height(10.dp))
                ProfileInfoCard(AppStrings.position(lang), position, cardBg, labelColor, textColor)
                Spacer(Modifier.height(10.dp))
                ProfileInfoCard(AppStrings.company(lang), user?.companyName ?: "—", cardBg, labelColor, textColor)

                Spacer(Modifier.height(24.dp))

                Button(
                    onClick = viewModel::openChangePassword,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                ) {
                    Icon(Icons.Default.Key, null, tint = Color.White)
                    Spacer(Modifier.width(8.dp))
                    Text(AppStrings.changePassword(lang), fontWeight = FontWeight.SemiBold)
                }

                Spacer(Modifier.height(12.dp))

                OutlinedButton(
                    onClick = { viewModel.logout(onLogout) },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = androidx.compose.ui.graphics.SolidColor(
                            if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB),
                        ),
                    ),
                ) {
                    Icon(Icons.AutoMirrored.Filled.Logout, null)
                    Spacer(Modifier.width(8.dp))
                    Text(AppStrings.logout(lang))
                }

                Spacer(Modifier.height(24.dp))
            }
        }

        ProfileChangePasswordSheet(
            visible = showChangePassword,
            isDark = isDark,
            lang = lang,
            state = changePasswordState,
            onDismiss = viewModel::closeChangePassword,
            onCurrentPasswordChange = viewModel::onCurrentPasswordChange,
            onNewPasswordChange = viewModel::onNewPasswordChange,
            onConfirmPasswordChange = viewModel::onConfirmPasswordChange,
            onSubmit = viewModel::submitChangePassword,
        )
    }
}

@Composable
private fun ProfileInfoCard(
    label: String,
    value: String,
    cardBg: Color,
    labelColor: Color,
    textColor: Color,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = cardBg),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
            Text(label, fontSize = 12.sp, color = labelColor)
            Spacer(Modifier.height(4.dp))
            Text(value.ifBlank { "—" }, fontSize = 16.sp, fontWeight = FontWeight.Medium, color = textColor)
        }
    }
}

@Composable
private fun ProfilePasswordCard(
    label: String,
    value: String,
    cardBg: Color,
    labelColor: Color,
    textColor: Color,
    visible: Boolean,
    onToggleVisibility: () -> Unit,
    lang: AppLanguage,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = cardBg),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(label, fontSize = 12.sp, color = labelColor)
                Spacer(Modifier.height(4.dp))
                Text(value, fontSize = 16.sp, fontWeight = FontWeight.Medium, color = textColor)
            }
            IconButton(onClick = onToggleVisibility) {
                Icon(
                    imageVector = if (visible) Icons.Default.Visibility else Icons.Outlined.VisibilityOff,
                    contentDescription = if (visible) AppStrings.hide(lang) else AppStrings.showPassword(lang),
                    tint = labelColor,
                )
            }
        }
    }
}

private fun splitFullName(fullName: String): Pair<String, String> {
    val parts = fullName.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    return when {
        parts.size >= 2 -> parts.last() to parts.dropLast(1).joinToString(" ")
        parts.size == 1 -> parts[0] to ""
        else -> "" to ""
    }
}
