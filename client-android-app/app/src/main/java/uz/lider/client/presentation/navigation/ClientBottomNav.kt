package uz.lider.client.presentation.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.theme.ClientColors

val ClientBottomNavHeight = 80.dp

enum class ClientTab(val route: String) {
    DASHBOARD("dashboard"),
    CATALOG("catalog"),
    ORDERS("orders"),
    ANALYTICS("analytics"),
    PROFILE("profile"),
}

private val tabRoutes = ClientTab.entries.map { it.route }.toSet()

private val stackOnlyRoutes = setOf(
    ClientRoutes.CART,
    ClientRoutes.DEBT,
    ClientRoutes.PROMOTIONS,
    ClientRoutes.NOTIFICATIONS,
    ClientRoutes.CHAT,
    ClientRoutes.SETTINGS,
)

fun showsClientBottomNav(route: String?): Boolean {
    if (route == null) return false
    if (route in tabRoutes) return true
    if (route in stackOnlyRoutes) return false
    if (route.startsWith("productDetail/") || route.startsWith("orderTracking/")) return false
    return false
}

fun clientBottomNavSelectedTab(route: String?): ClientTab? = when {
    route == null -> null
    route.startsWith(ClientRoutes.DASHBOARD) -> ClientTab.DASHBOARD
    route.startsWith(ClientRoutes.CATALOG) -> ClientTab.CATALOG
    route.startsWith(ClientRoutes.ORDERS) -> ClientTab.ORDERS
    route.startsWith(ClientRoutes.ANALYTICS) -> ClientTab.ANALYTICS
    route.startsWith(ClientRoutes.PROFILE) -> ClientTab.PROFILE
    else -> null
}

fun NavHostController.navigateClientTab(tab: ClientTab) {
    navigate(tab.route) {
        popUpTo(ClientTab.DASHBOARD.route) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

@Composable
fun ClientBottomNav(
    selected: ClientTab,
    cartCount: Int,
    onTabSelected: (ClientTab) -> Unit,
    isDark: Boolean,
    modifier: Modifier = Modifier,
) {
    val lang = LocalAppLanguage.current
    val navBg = if (isDark) ClientColors.NavBg else ClientColors.NavBgLight
    val borderColor = if (isDark) ClientColors.Border else ClientColors.BorderStrong
    val muted = if (isDark) ClientColors.TextMuted else ClientColors.TextMutedLight
    val primary = if (isDark) ClientColors.Primary else ClientColors.PrimaryLight
    val accent = if (isDark) ClientColors.Accent else ClientColors.AccentLight

    val tabs = listOf(
        TabItem(ClientTab.DASHBOARD, Icons.Default.Dashboard, tabLabel(lang, ClientTab.DASHBOARD)),
        TabItem(ClientTab.CATALOG, Icons.Default.Inventory2, tabLabel(lang, ClientTab.CATALOG), showBadge = cartCount > 0, badgeCount = cartCount),
        TabItem(ClientTab.ORDERS, Icons.Default.ShoppingBag, tabLabel(lang, ClientTab.ORDERS)),
        TabItem(ClientTab.ANALYTICS, Icons.Default.BarChart, tabLabel(lang, ClientTab.ANALYTICS)),
        TabItem(ClientTab.PROFILE, Icons.Default.Person, tabLabel(lang, ClientTab.PROFILE)),
    )

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(ClientBottomNavHeight)
            .background(navBg)
            .padding(horizontal = 8.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceAround,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        tabs.forEach { tab ->
            val isActive = selected == tab.tab
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .clickable { onTabSelected(tab.tab) }
                    .background(if (isActive) primary.copy(alpha = 0.12f) else Color.Transparent)
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Box {
                    Icon(
                        imageVector = tab.icon,
                        contentDescription = tab.label,
                        tint = if (isActive) primary else muted,
                        modifier = Modifier.size(22.dp),
                    )
                    if (tab.showBadge) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .offset(x = 6.dp, y = (-4).dp)
                                .size(14.dp)
                                .clip(CircleShape)
                                .background(accent),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = tab.badgeCount.coerceAtMost(99).toString(),
                                color = Color.White,
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
                Text(
                    text = tab.label,
                    fontSize = 10.sp,
                    color = if (isActive) primary else muted,
                    fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal,
                )
                if (isActive) {
                    Box(
                        modifier = Modifier
                            .size(width = 16.dp, height = 2.dp)
                            .clip(RoundedCornerShape(1.dp))
                            .background(primary),
                    )
                }
            }
        }
    }
}

private data class TabItem(
    val tab: ClientTab,
    val icon: ImageVector,
    val label: String,
    val showBadge: Boolean = false,
    val badgeCount: Int = 0,
)

private fun tabLabel(lang: AppLanguage, tab: ClientTab): String = when (tab) {
    ClientTab.DASHBOARD -> when (lang) {
        AppLanguage.RU -> "Главная"
        AppLanguage.EN -> "Home"
        AppLanguage.UZ_KRIL -> "Асосий"
        AppLanguage.UZ -> "Asosiy"
    }
    ClientTab.CATALOG -> when (lang) {
        AppLanguage.RU -> "Каталог"
        AppLanguage.EN -> "Catalog"
        AppLanguage.UZ_KRIL -> "Каталог"
        AppLanguage.UZ -> "Katalog"
    }
    ClientTab.ORDERS -> when (lang) {
        AppLanguage.RU -> "Заказы"
        AppLanguage.EN -> "Orders"
        AppLanguage.UZ_KRIL -> "Буюртмалар"
        AppLanguage.UZ -> "Buyurtmalar"
    }
    ClientTab.ANALYTICS -> when (lang) {
        AppLanguage.RU -> "Аналитика"
        AppLanguage.EN -> "Analytics"
        AppLanguage.UZ_KRIL -> "Таҳлил"
        AppLanguage.UZ -> "Tahlil"
    }
    ClientTab.PROFILE -> when (lang) {
        AppLanguage.RU -> "Профиль"
        AppLanguage.EN -> "Profile"
        AppLanguage.UZ_KRIL -> "Профил"
        AppLanguage.UZ -> "Profil"
    }
}

object ClientRoutes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val DASHBOARD = "dashboard"
    const val CATALOG = "catalog"
    const val ORDERS = "orders"
    const val ANALYTICS = "analytics"
    const val PROFILE = "profile"
    const val CART = "cart"
    const val PRODUCT_DETAIL = "productDetail/{productId}"
    const val ORDER_TRACKING = "orderTracking/{orderId}"
    const val DEBT = "debt"
    const val PROMOTIONS = "promotions"
    const val NOTIFICATIONS = "notifications"
    const val CHAT = "chat"
    const val SETTINGS = "settings"

    fun productDetail(productId: String) = "productDetail/$productId"
    fun orderTracking(orderId: String) = "orderTracking/$orderId"
}
