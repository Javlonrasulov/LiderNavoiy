package uz.distributor.crm.presentation.navigation

import androidx.compose.ui.unit.dp
import uz.distributor.crm.presentation.components.NavTab

val BottomNavHeight = 72.dp

private val bottomNavRoutes = setOf(
    "main",
    "clients",
    "location",
    "plan",
    "messages",
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
    "main" -> NavTab.HOME
    "clients", "client/{clientId}", "visit/{clientId}", "order/{clientId}", "order/cart",
    "reconciliation/{clientId}" -> NavTab.DELIVERY
    "location" -> NavTab.LOCATION
    "plan" -> NavTab.PLAN
    "messages" -> NavTab.MESSAGES
    else -> if (route?.startsWith("client/") == true ||
        route?.startsWith("visit/") == true ||
        route?.startsWith("order/") == true ||
        route?.startsWith("reconciliation/") == true
    ) {
        NavTab.DELIVERY
    } else {
        null
    }
}
