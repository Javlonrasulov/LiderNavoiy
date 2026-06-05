package uz.distributor.crm.presentation.navigation

import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import uz.distributor.crm.presentation.components.NavTab
import uz.distributor.crm.presentation.components.route

val BottomNavHeight = 90.dp

private val bottomNavRoutes = setOf(
    "main",
    "clients",
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
)

private val bottomNavRoutePatterns = setOf(
    "client/{clientId}",
    "visit/{clientId}",
    "order/{clientId}",
    "order/cart",
    "reconciliation/{clientId}",
)

fun showsBottomNav(route: String?): Boolean {
    if (route == null) return false
    if (route in bottomNavRoutes || route in bottomNavRoutePatterns) return true
    return bottomNavPrefixRoutes.any { route.startsWith(it) }
}

fun bottomNavSelectedTab(route: String?): NavTab? = when (route) {
    "main", "products", "profile" -> NavTab.HOME
    "location" -> NavTab.LOCATION
    "plan" -> NavTab.PLAN
    "messages" -> NavTab.MESSAGES
    else -> null
}

fun NavHostController.navigateBottomTab(tab: NavTab) {
    if (tab == NavTab.HOME) {
        navigate(NavTab.HOME.route) {
            popUpTo(NavTab.HOME.route) { inclusive = false }
            launchSingleTop = true
            restoreState = true
        }
        return
    }
    navigate(tab.route) {
        popUpTo(NavTab.HOME.route) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}
