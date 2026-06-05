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

fun showsBottomNav(route: String?): Boolean {
    if (route == null) return false
    if (route in bottomNavRoutes) return true
    return bottomNavPrefixRoutes.any { route.startsWith(it) }
}

fun bottomNavSelectedTab(route: String?): NavTab? = when (route) {
    "main" -> NavTab.HOME
    "location" -> NavTab.LOCATION
    "plan" -> NavTab.PLAN
    "messages" -> NavTab.MESSAGES
    else -> null
}
