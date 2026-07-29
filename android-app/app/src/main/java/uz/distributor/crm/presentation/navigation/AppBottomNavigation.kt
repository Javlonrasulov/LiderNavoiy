package uz.distributor.crm.presentation.navigation

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import uz.distributor.crm.presentation.components.NavTab
import uz.distributor.crm.presentation.components.route

/** Pastki menyu kontenti balandligi (tizim tugmalari insetsiz). */
val BottomNavBarInnerHeight = 70.dp

/**
 * Pastki menyu + telefon navigatsiya panelining umumiy balandligi.
 * Kontent padding uchun shu qiymatdan foydalaning.
 */
@Composable
fun bottomNavHeight(): Dp {
    val systemNav = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    return BottomNavBarInnerHeight + systemNav
}

/** Eski importlar — yangi kodda [bottomNavHeight] ishlating. */
@Deprecated("Use bottomNavHeight()", ReplaceWith("bottomNavHeight()"))
val BottomNavHeight = BottomNavBarInnerHeight

private val bottomNavRoutes = setOf(
    "main",
    "clients",
    "delivery",
    "products",
    "location",
    "plan",
    "messages",
    "profile",
)

private val bottomNavPrefixRoutes = listOf(
    "client/",
    "visit/",
    "order/",
    "reconciliation/",
    "delivery/",
)

private val bottomNavRoutePatterns = setOf(
    "client/{clientId}",
    "visit/{clientId}",
    "order/{clientId}",
    "order/cart",
    "reconciliation/{clientId}",
    "delivery/{orderId}",
)

fun showsBottomNav(route: String?): Boolean {
    if (route == null) return false
    if (route in bottomNavRoutes || route in bottomNavRoutePatterns) return true
    return bottomNavPrefixRoutes.any { route.startsWith(it) }
}

fun bottomNavSelectedTab(route: String?): NavTab? = when {
    route == null -> null
    route == "main" || route == "products" || route == "profile" -> NavTab.HOME
    route == "delivery" || route.startsWith("delivery/") -> NavTab.DELIVERY
    route == "location" -> NavTab.LOCATION
    route == "plan" -> NavTab.PLAN
    route == "messages" -> NavTab.MESSAGES
    else -> null
}

fun NavHostController.navigateBottomTab(tab: NavTab) {
    if (tab == NavTab.HOME) {
        if (!popBackStack(NavTab.HOME.route, inclusive = false)) {
            navigate(NavTab.HOME.route) {
                launchSingleTop = true
            }
        }
        return
    }
    navigate(tab.route) {
        popUpTo(NavTab.HOME.route) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}
