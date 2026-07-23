package uz.lider.client.presentation.profile

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Help
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.launch
import uz.lider.client.domain.model.ContactPerson
import uz.lider.client.presentation.components.ClientPullToRefresh
import uz.lider.client.presentation.components.ClientTabScaffold
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.navigation.ClientRoutes
import uz.lider.client.presentation.theme.HeroHeaderBackground
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassThemed

private const val HELP_TELEGRAM_URL = "https://t.me/javlon_abdurasulov_dev"

@Composable
fun ProfileScreen(
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val profile = state.profile
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    var showHelpDialog by remember { mutableStateOf(false) }

    if (showHelpDialog) {
        AlertDialog(
            onDismissRequest = { showHelpDialog = false },
            title = {
                Text(
                    localized("prof_help"),
                    color = text,
                    fontWeight = FontWeight.SemiBold,
                )
            },
            text = {
                Text(
                    localized("prof_help_modal_msg"),
                    color = textMuted,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showHelpDialog = false
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse(HELP_TELEGRAM_URL)),
                        )
                    },
                ) {
                    Text(
                        localized("prof_help_modal_contact"),
                        color = LiquidGlass.Indigo,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showHelpDialog = false }) {
                    Text(localized("com_cancel"), color = textMuted)
                }
            },
        )
    }

    LiquidBackground(modifier = Modifier.fillMaxSize()) {
        ClientTabScaffold(title = localized("prof_title")) { padding ->
            if (state.loading) {
                Box(
                    Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = LiquidGlass.Indigo)
                }
            } else {
                ClientPullToRefresh(
                    onRefresh = { viewModel.refresh() },
                    modifier = Modifier.padding(padding),
                ) {
                LazyColumn(
                    contentPadding = PaddingValues(bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(0.dp),
                ) {
                    // ── Hero banner ───────────────────────────────────────────
                    item {
                        HeroHeaderBackground(height = 220.dp) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .align(Alignment.Center)
                                    .padding(horizontal = 24.dp, vertical = 20.dp),
                            ) {
                                Box(
                                    Modifier
                                        .size(72.dp)
                                        .clip(CircleShape)
                                        .background(Color.White.copy(alpha = 0.18f))
                                        .border(2.dp, Color.White.copy(alpha = 0.55f), CircleShape),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        profileInitials(profile?.fullName ?: profile?.name),
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 22.sp,
                                    )
                                }
                                Spacer(Modifier.height(12.dp))
                                Text(
                                    profile?.fullName ?: profile?.name ?: "—",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 20.sp,
                                )
                                Text(
                                    profile?.name ?: "",
                                    color = Color.White.copy(alpha = 0.75f),
                                    fontSize = 14.sp,
                                )
                                profileCategoryStyle(profile?.category)?.let { categoryStyle ->
                                    Spacer(Modifier.height(12.dp))
                                    Box(
                                        Modifier
                                            .clip(RoundedCornerShape(50.dp))
                                            .background(categoryStyle.gradient)
                                            .padding(horizontal = 16.dp, vertical = 6.dp),
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(5.dp),
                                        ) {
                                            Icon(
                                                Icons.Default.Star,
                                                null,
                                                tint = Color.White,
                                                modifier = Modifier.size(13.dp),
                                            )
                                            Text(
                                                categoryStyle.label,
                                                color = Color.White,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.SemiBold,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ── Stats row ─────────────────────────────────────────────
                    item {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .padding(top = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            GlassStatCard(
                                "${profile?.orderCount ?: 0}",
                                localized("nav_orders"),
                                Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Violet)),
                                Modifier.weight(1f),
                            )
                            GlassStatCard(
                                "4,850",
                                "Bonus",
                                Brush.linearGradient(listOf(LiquidGlass.Violet, LiquidGlass.Pink)),
                                Modifier.weight(1f),
                            )
                            GlassStatCard(
                                "12%",
                                localized("promo_discount_label"),
                                Brush.linearGradient(listOf(LiquidGlass.Cyan, LiquidGlass.Emerald)),
                                Modifier.weight(1f),
                            )
                        }
                    }

                    // ── Company info ──────────────────────────────────────────
                    item {
                        Column(
                            Modifier
                                .padding(horizontal = 16.dp)
                                .padding(top = 16.dp)
                                .fillMaxWidth()
                                .liquidGlassThemed()
                                .padding(16.dp),
                        ) {
                            Text(
                                localized("prof_company").uppercase(),
                                color = textMuted,
                                fontSize = 11.sp,
                                letterSpacing = 1.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(10.dp))
                            GlassInfoRow(
                                Icons.Default.Business,
                                localized("prof_company"),
                                profile?.name ?: "—",
                                Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Violet)),
                            )
                            GlassInfoRow(
                                Icons.Default.Shield,
                                localized("prof_tin"),
                                profile?.code ?: "—",
                                Brush.linearGradient(listOf(LiquidGlass.Violet, LiquidGlass.Cyan)),
                            )
                            GlassInfoRow(
                                Icons.Default.Phone,
                                localized("prof_phone"),
                                profile?.phone?.takeIf { it.isNotBlank() } ?: "—",
                                Brush.linearGradient(listOf(LiquidGlass.Cyan, LiquidGlass.Emerald)),
                            )
                            GlassInfoRow(
                                Icons.Default.LocationOn,
                                localized("prof_address"),
                                profile?.address?.takeIf { it.isNotBlank() } ?: "—",
                                Brush.linearGradient(listOf(LiquidGlass.Emerald, LiquidGlass.Amber)),
                            )
                        }
                    }

                    // ── Manager card ──────────────────────────────────────────
                    if (!profile?.agentName.isNullOrBlank()) {
                        item {
                            ContactInfoCard(
                                title = localized("prof_manager"),
                                person = ContactPerson(
                                    userId = profile?.agentUserId,
                                    name = profile?.agentName.orEmpty(),
                                    position = profile?.agentPosition,
                                    phone = profile?.agentPhone,
                                ),
                                onCall = { phone ->
                                    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                                },
                                onChat = profile?.agentUserId?.let { userId ->
                                    {
                                        onNavigate(
                                            ClientRoutes.chat(
                                                userId = userId,
                                                name = profile?.agentName.orEmpty(),
                                                position = profile?.agentPosition.orEmpty(),
                                            ),
                                        )
                                    }
                                },
                            )
                        }
                    }

                    // ── Delivery card (only when order is loaded) ─────────────
                    profile?.deliveryPerson?.let { delivery ->
                        item {
                            ContactInfoCard(
                                title = localized("prof_delivery"),
                                person = delivery,
                                onCall = { phone ->
                                    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                                },
                                onChat = delivery.userId?.let { userId ->
                                    {
                                        onNavigate(
                                            ClientRoutes.chat(
                                                userId = userId,
                                                name = delivery.name,
                                                position = delivery.position.orEmpty(),
                                            ),
                                        )
                                    }
                                },
                            )
                        }
                    }

                    // ── Menu links ────────────────────────────────────────────
                    item {
                        Column(
                            Modifier
                                .padding(horizontal = 16.dp)
                                .padding(top = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            GlassMenuLink(
                                Icons.Default.Notifications,
                                localized("prof_notif_settings"),
                                Brush.linearGradient(listOf(LiquidGlass.Amber, LiquidGlass.Rose)),
                            ) { onNavigate(ClientRoutes.NOTIFICATIONS) }
                            GlassMenuLink(
                                Icons.Default.Settings,
                                localized("prof_app_settings"),
                                LiquidGlass.GradientPrimary,
                            ) { onNavigate(ClientRoutes.SETTINGS) }
                            GlassMenuLink(
                                Icons.Default.Help,
                                localized("prof_help"),
                                Brush.linearGradient(listOf(LiquidGlass.Cyan, LiquidGlass.Emerald)),
                            ) { showHelpDialog = true }
                        }
                    }

                    // ── Logout ────────────────────────────────────────────────
                    item {
                        Box(
                            Modifier
                                .padding(horizontal = 16.dp)
                                .padding(top = 12.dp, bottom = 8.dp)
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(LiquidGlass.RadiusCard))
                                .background(
                                    Brush.linearGradient(
                                        listOf(
                                            LiquidGlass.Rose.copy(alpha = 0.28f),
                                            Color(0xFFFB2D48).copy(alpha = 0.18f),
                                        )
                                    )
                                )
                                .border(
                                    1.dp,
                                    Brush.linearGradient(
                                        listOf(
                                            LiquidGlass.Rose.copy(alpha = 0.65f),
                                            LiquidGlass.Rose.copy(alpha = 0.20f),
                                        )
                                    ),
                                    RoundedCornerShape(LiquidGlass.RadiusCard),
                                )
                                .clickable {
                                    scope.launch {
                                        viewModel.logout()
                                        onLogout()
                                    }
                                }
                                .padding(16.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Icon(Icons.Default.Logout, null, tint = LiquidGlass.Rose)
                                Text(
                                    localized("prof_logout"),
                                    color = LiquidGlass.Rose,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }
                }
                }
            }
        }
    }
}

private data class ProfileCategoryStyle(
    val label: String,
    val gradient: Brush,
)

private fun profileCategoryStyle(category: String?): ProfileCategoryStyle? {
    val raw = category?.trim().orEmpty()
    if (raw.isEmpty()) return null
    return when (raw.lowercase()) {
        "standard" -> ProfileCategoryStyle(
            "Standard",
            Brush.linearGradient(listOf(Color(0xFF6366F1), Color(0xFF4F46E5))),
        )
        "vip" -> ProfileCategoryStyle(
            "VIP",
            Brush.linearGradient(listOf(Color(0xFF8B5CF6), Color(0xFF7C3AED))),
        )
        "premium" -> ProfileCategoryStyle(
            "Premium",
            Brush.linearGradient(listOf(Color(0xFFA78BFA), Color(0xFF8B5CF6))),
        )
        else -> ProfileCategoryStyle(
            raw,
            Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Violet)),
        )
    }
}

private fun profileInitials(name: String?): String {
    if (name.isNullOrBlank()) return "—"
    return name.split(Regex("\\s+"))
        .filter { it.isNotBlank() }
        .map { it.first().uppercaseChar() }
        .take(2)
        .joinToString("")
}

@Composable
private fun ContactInfoCard(
    title: String,
    person: ContactPerson,
    onCall: (String) -> Unit,
    onChat: (() -> Unit)? = null,
) {
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    val phone = person.phone?.takeIf { it.isNotBlank() }

    Column(
        Modifier
            .padding(horizontal = 16.dp)
            .padding(top = 12.dp)
            .fillMaxWidth()
            .liquidGlassThemed()
            .padding(16.dp),
    ) {
        Text(
            title.uppercase(),
            color = textMuted,
            fontSize = 11.sp,
            letterSpacing = 1.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(Modifier.height(12.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(Modifier.weight(1f)) {
                Text(person.name, color = text, fontWeight = FontWeight.SemiBold)
                person.position?.takeIf { it.isNotBlank() }?.let {
                    Text(it, color = textMuted, fontSize = 12.sp)
                }
                Text(
                    phone ?: "—",
                    color = if (phone != null) LiquidGlass.Cyan else textMuted,
                    fontSize = 13.sp,
                    fontWeight = if (phone != null) FontWeight.Medium else FontWeight.Normal,
                )
            }
            if (phone != null) {
                Box(
                    Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(listOf(LiquidGlass.Emerald, LiquidGlass.Cyan)),
                        )
                        .clickable { onCall(phone) },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Phone, null, tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }
            if (onChat != null) {
                Box(
                    Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Violet)),
                        )
                        .clickable(onClick = onChat),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Chat, null, tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

@Composable
private fun GlassStatCard(value: String, label: String, gradient: Brush, modifier: Modifier = Modifier) {
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    Column(
        modifier
            .liquidGlassThemed()
            .padding(vertical = 14.dp, horizontal = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            value,
            color = text,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
        )
        Spacer(Modifier.height(2.dp))
        Box(
            Modifier
                .height(2.dp)
                .width(24.dp)
                .clip(RoundedCornerShape(1.dp))
                .background(gradient),
        )
        Spacer(Modifier.height(4.dp))
        Text(label, color = textMuted, fontSize = 11.sp)
    }
}

@Composable
private fun GlassInfoRow(icon: ImageVector, label: String, value: String, gradient: Brush) {
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(34.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(gradient),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = Color.White, modifier = Modifier.size(16.dp))
        }
        Column {
            Text(label, color = textMuted, fontSize = 11.sp)
            Text(value, color = text, fontSize = 14.sp)
        }
    }
}

@Composable
private fun GlassMenuLink(icon: ImageVector, label: String, gradient: Brush, onClick: () -> Unit) {
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    Row(
        Modifier
            .fillMaxWidth()
            .liquidGlassThemed()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(gradient),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, null, tint = Color.White, modifier = Modifier.size(17.dp))
            }
            Text(label, color = text)
        }
        Icon(
            Icons.AutoMirrored.Filled.KeyboardArrowRight,
            null,
            tint = textMuted,
        )
    }
}
