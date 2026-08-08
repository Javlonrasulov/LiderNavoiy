package uz.lider.client.presentation.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.lider.client.domain.model.AuthUser
import uz.lider.client.localization.AppStrings
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme

@Composable
fun ClientDrawerContent(
    user: AuthUser?,
    canSeePromotions: Boolean = false,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    onClose: () -> Unit,
) {
    val lang = LocalAppLanguage.current
    fun t(key: String) = AppStrings.t(lang, key)
    val displayName = user?.fullName?.ifBlank { null }
        ?: user?.clientName?.ifBlank { null }
        ?: user?.username
        ?: "—"
    val subtitle = user?.clientName?.takeIf { it.isNotBlank() && it != displayName }
        ?: user?.username.orEmpty()
    val isDark = LiquidTheme.isDark
    val panel = if (isDark) Color(0xF00B1220) else Color(0xF8F7F9FC)
    val hairline = if (isDark) Color.White.copy(alpha = 0.08f) else Color(0x140F172A)

    ModalDrawerSheet(
        drawerContainerColor = Color.Transparent,
        modifier = Modifier
            .fillMaxHeight()
            .width(312.dp),
    ) {
        Column(
            Modifier
                .fillMaxHeight()
                .shadow(
                    elevation = 24.dp,
                    shape = RoundedCornerShape(topEnd = 28.dp, bottomEnd = 28.dp),
                    ambientColor = Color.Black.copy(alpha = 0.12f),
                    spotColor = Color.Black.copy(alpha = 0.18f),
                )
                .clip(RoundedCornerShape(topEnd = 28.dp, bottomEnd = 28.dp))
                .background(panel)
                .border(
                    width = 1.dp,
                    brush = Brush.verticalGradient(
                        listOf(
                            Color.White.copy(alpha = if (isDark) 0.18f else 0.70f),
                            Color.White.copy(alpha = if (isDark) 0.04f else 0.20f),
                        ),
                    ),
                    shape = RoundedCornerShape(topEnd = 28.dp, bottomEnd = 28.dp),
                )
                .statusBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 18.dp),
        ) {
            // Profile header — flat, no utility bubbles
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Box(
                    Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(LiquidGlass.GradientPrimary)
                        .border(1.5.dp, Color.White.copy(alpha = 0.35f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        initials(displayName),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                    )
                }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        displayName,
                        color = LiquidTheme.text,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 17.sp,
                        maxLines = 2,
                    )
                    if (subtitle.isNotBlank()) {
                        Text(
                            subtitle,
                            color = LiquidTheme.textMuted,
                            fontSize = 13.sp,
                            maxLines = 1,
                        )
                    }
                }
            }

            Spacer(Modifier.height(22.dp))
            HorizontalDivider(color = hairline, thickness = 1.dp)
            Spacer(Modifier.height(8.dp))

            DrawerNavRow(Icons.Default.Inventory2, t("nav_catalog")) {
                onClose(); onNavigate(ClientRoutes.CATALOG)
            }
            DrawerNavRow(Icons.Default.ShoppingBag, t("nav_orders")) {
                onClose(); onNavigate(ClientRoutes.ORDERS)
            }
            DrawerNavRow(Icons.Default.BarChart, t("nav_analytics")) {
                onClose(); onNavigate(ClientRoutes.ANALYTICS)
            }
            DrawerNavRow(Icons.Default.CreditCard, t("dash_payment")) {
                onClose(); onNavigate(ClientRoutes.DEBT)
            }
            if (canSeePromotions) {
                DrawerNavRow(Icons.Default.LocalOffer, t("dash_promotions")) {
                    onClose(); onNavigate(ClientRoutes.PROMOTIONS)
                }
            }
            DrawerNavRow(Icons.Default.Notifications, t("notif_title")) {
                onClose(); onNavigate(ClientRoutes.NOTIFICATIONS)
            }
            DrawerNavRow(Icons.Default.Person, t("nav_profile")) {
                onClose(); onNavigate(ClientRoutes.PROFILE)
            }

            Spacer(Modifier.height(10.dp))
            HorizontalDivider(color = hairline, thickness = 1.dp)
            Spacer(Modifier.height(10.dp))

            Text(
                t("com_settings").uppercase(),
                color = LiquidTheme.textMuted,
                fontSize = 11.sp,
                letterSpacing = 1.2.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(start = 12.dp, bottom = 4.dp),
            )
            DrawerNavRow(Icons.Default.Settings, t("com_settings")) {
                onClose(); onNavigate(ClientRoutes.SETTINGS)
            }

            Spacer(Modifier.height(6.dp))
            DrawerNavRow(
                icon = Icons.AutoMirrored.Filled.Logout,
                label = t("prof_logout"),
                danger = true,
            ) {
                onClose(); onLogout()
            }

            Spacer(Modifier.height(28.dp))
            Text(
                "Lider Navoiy",
                color = LiquidTheme.textMuted.copy(alpha = 0.55f),
                fontSize = 11.sp,
                letterSpacing = 0.4.sp,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            )
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun DrawerNavRow(
    icon: ImageVector,
    label: String,
    danger: Boolean = false,
    onClick: () -> Unit,
) {
    val tint = if (danger) LiquidGlass.Rose else LiquidTheme.textMuted
    val labelColor = if (danger) LiquidGlass.Rose else LiquidTheme.text
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick,
            )
            .padding(horizontal = 10.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(22.dp))
        Text(
            label,
            color = labelColor,
            fontWeight = FontWeight.Medium,
            fontSize = 15.sp,
            modifier = Modifier.weight(1f),
        )
        Icon(
            Icons.AutoMirrored.Filled.KeyboardArrowRight,
            null,
            tint = LiquidTheme.textMuted.copy(alpha = 0.45f),
            modifier = Modifier.size(18.dp),
        )
    }
}

private fun initials(name: String): String {
    val parts = name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    return when {
        parts.isEmpty() -> "?"
        parts.size == 1 -> parts[0].take(2).uppercase()
        else -> "${parts.first().first()}${parts.last().first()}".uppercase()
    }
}
