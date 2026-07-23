package uz.lider.client.presentation.navigation

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassNav

val ClientBottomNavHeight = 104.dp

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
    ClientRoutes.SETTINGS,
)

fun showsClientBottomNav(route: String?): Boolean {
    if (route == null) return false
    if (route in tabRoutes) return true
    if (route in stackOnlyRoutes) return false
    if (
        route.startsWith("productDetail/") ||
        route.startsWith("orderTracking/") ||
        route.startsWith("chat/")
    ) {
        return false
    }
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
    if (currentBackStackEntry?.destination?.route == tab.route) return

    // Quick actions push tab screens on top of dashboard — pop back instead of stacking again.
    if (popBackStack(tab.route, inclusive = false)) {
        return
    }

    navigate(tab.route) {
        popUpTo(graph.id) {
            saveState = true
        }
        launchSingleTop = true
        restoreState = true
    }
}

fun NavHostController.navigateClientRoute(route: String) {
    val tab = when (route) {
        ClientRoutes.DASHBOARD -> ClientTab.DASHBOARD
        ClientRoutes.CATALOG -> ClientTab.CATALOG
        ClientRoutes.ORDERS -> ClientTab.ORDERS
        ClientRoutes.ANALYTICS -> ClientTab.ANALYTICS
        ClientRoutes.PROFILE -> ClientTab.PROFILE
        else -> null
    }
    if (tab != null) {
        navigateClientTab(tab)
    } else {
        navigate(route)
    }
}

// Per-tab accent colors for glow
private val tabAccents = mapOf(
    ClientTab.DASHBOARD to LiquidGlass.Indigo,
    ClientTab.CATALOG   to LiquidGlass.Cyan,
    ClientTab.ORDERS    to LiquidGlass.Violet,
    ClientTab.ANALYTICS to LiquidGlass.Amber,
    ClientTab.PROFILE   to LiquidGlass.Pink,
)

@Composable
fun ClientBottomNav(
    selected: ClientTab,
    cartCount: Int,
    onTabSelected: (ClientTab) -> Unit,
    isDark: Boolean,
    modifier: Modifier = Modifier,
) {
    val lang = LocalAppLanguage.current

    val tabs = listOf(
        TabItem(ClientTab.DASHBOARD, Icons.Default.Dashboard, tabLabel(lang, ClientTab.DASHBOARD)),
        TabItem(
            ClientTab.CATALOG,
            Icons.Default.Inventory2,
            tabLabel(lang, ClientTab.CATALOG),
            showBadge = cartCount > 0,
            badgeCount = cartCount,
        ),
        TabItem(ClientTab.ORDERS, Icons.Default.ShoppingBag, tabLabel(lang, ClientTab.ORDERS)),
        TabItem(ClientTab.ANALYTICS, Icons.Default.BarChart, tabLabel(lang, ClientTab.ANALYTICS)),
        TabItem(ClientTab.PROFILE, Icons.Default.Person, tabLabel(lang, ClientTab.PROFILE)),
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(72.dp)
                .liquidGlassNav(radius = LiquidGlass.RadiusNav)
                .padding(horizontal = 2.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            tabs.forEach { tab ->
                val isActive = selected == tab.tab
                val accent = tabAccents[tab.tab] ?: LiquidGlass.Indigo
                NavTabItem(
                    tab = tab,
                    isActive = isActive,
                    accent = accent,
                    onClick = { onTabSelected(tab.tab) },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun NavTabItem(
    tab: TabItem,
    isActive: Boolean,
    accent: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val textMuted = LiquidTheme.textMuted

    val iconScale by animateFloatAsState(
        targetValue = if (isActive) 1.06f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium,
        ),
        label = "iconScale",
    )

    val iconTint by animateColorAsState(
        targetValue = if (isActive) Color.White else textMuted,
        animationSpec = tween(durationMillis = 220, easing = FastOutSlowInEasing),
        label = "iconTint",
    )

    val labelAlpha by animateFloatAsState(
        targetValue = if (isActive) 1f else 0.55f,
        animationSpec = tween(durationMillis = 200),
        label = "labelAlpha",
    )

    val glowAlpha by animateFloatAsState(
        targetValue = if (isActive) 1f else 0f,
        animationSpec = tween(durationMillis = 300, easing = FastOutSlowInEasing),
        label = "glowAlpha",
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = modifier
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { onClick() }
            .padding(horizontal = 1.dp),
    ) {
        // Fixed icon slot so the active circle never overlaps the label
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size(34.dp),
        ) {
            if (glowAlpha > 0f) {
                Box(
                    modifier = Modifier
                        .size(34.dp)
                        .blur(10.dp)
                        .background(
                            Brush.radialGradient(
                                listOf(
                                    accent.copy(alpha = 0.45f * glowAlpha),
                                    Color.Transparent,
                                ),
                            ),
                            CircleShape,
                        ),
                )
            }
            Box(
                modifier = Modifier
                    .size(30.dp)
                    .then(
                        if (isActive) {
                            Modifier
                                .clip(CircleShape)
                                .background(
                                    Brush.linearGradient(
                                        listOf(accent, accent.copy(alpha = 0.75f)),
                                    ),
                                )
                        } else {
                            Modifier
                        },
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = tab.icon,
                    contentDescription = tab.label,
                    tint = iconTint,
                    modifier = Modifier
                        .size(18.dp)
                        .scale(iconScale),
                )
            }
            if (tab.showBadge) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 2.dp, y = (-2).dp)
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(LiquidGlass.Rose),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = tab.badgeCount.coerceAtMost(99).toString(),
                        color = Color.White,
                        fontSize = 7.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }

        Spacer(Modifier.height(3.dp))

        Text(
            text = tab.label,
            fontSize = 9.sp,
            lineHeight = 11.sp,
            color = if (isActive) accent else textMuted.copy(alpha = labelAlpha),
            fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Medium,
            maxLines = 1,
            softWrap = false,
            overflow = TextOverflow.Visible,
            textAlign = TextAlign.Center,
        )
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
    const val CHAT = "chat/{userId}?name={name}&position={position}"
    const val SETTINGS = "settings"

    fun productDetail(productId: String) = "productDetail/$productId"
    fun orderTracking(orderId: String) = "orderTracking/$orderId"
    fun chat(userId: String, name: String = "", position: String = "") =
        "chat/$userId?name=${android.net.Uri.encode(name)}&position=${android.net.Uri.encode(position)}"
}
