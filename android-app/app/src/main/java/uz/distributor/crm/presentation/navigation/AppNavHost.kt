package uz.distributor.crm.presentation.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.presentation.auth.LoginScreen
import uz.distributor.crm.presentation.clientdetail.ClientDetailScreen
import uz.distributor.crm.presentation.clients.ClientsScreen
import uz.distributor.crm.presentation.components.NavTab
import uz.distributor.crm.presentation.components.route
import uz.distributor.crm.presentation.dashboard.DashboardScreen
import uz.distributor.crm.presentation.location.LocationScreen
import uz.distributor.crm.presentation.messages.ChatScreen
import uz.distributor.crm.presentation.messages.IncomingMessageBannerOverlay
import uz.distributor.crm.presentation.messages.MessagesScreen
import uz.distributor.crm.presentation.order.OrderSummaryScreen
import uz.distributor.crm.presentation.plan.PlanScreen
import uz.distributor.crm.presentation.profile.ProfileScreen
import uz.distributor.crm.presentation.visit.VisitScreen
import javax.inject.Inject

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {
    fun checkAuth(onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            val loggedIn = authRepository.restoreSession()
            onResult(loggedIn)
        }
    }
}

@Composable
fun AppNavHost() {
    val navController = rememberNavController()

    LaunchedEffect(Unit) {
        OpenChatHolder.pendingConversationId?.let { id ->
            OpenChatHolder.pendingConversationId = null
            navController.navigate("chat/$id") {
                launchSingleTop = true
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
    NavHost(navController = navController, startDestination = "splash") {
        composable("splash") {
            SplashRoute(
                onLoggedIn = { navController.navigate("main") { popUpTo("splash") { inclusive = true } } },
                onNotLoggedIn = { navController.navigate("login") { popUpTo("splash") { inclusive = true } } },
            )
        }
        composable("login") {
            LoginScreen(onLoginSuccess = {
                navController.navigate("main") { popUpTo("login") { inclusive = true } }
            })
        }
        composable("main") {
            DashboardScreen(
                onNavigate = { tab -> navController.navigate(tab.route) { launchSingleTop = true } },
                onClientsClick = { navController.navigate("clients") },
                onProfileClick = { navController.navigate("profile") },
                onOrderSummaryClick = { navController.navigate("order/cart") },
            )
        }
        composable("clients") {
            ClientsScreen(
                onBack = { navController.popBackStack() },
                onClientClick = { id -> navController.navigate("client/$id") },
                onNavigate = { tab -> navController.navigate(tab.route) { launchSingleTop = true } },
            )
        }
        composable(
            route = "client/{clientId}",
            arguments = listOf(navArgument("clientId") { type = NavType.StringType }),
        ) { entry ->
            ClientDetailScreen(
                clientId = entry.arguments?.getString("clientId") ?: "",
                onBack = { navController.popBackStack() },
                onStartVisit = { id -> navController.navigate("visit/$id") },
            )
        }
        composable(
            route = "visit/{clientId}",
            arguments = listOf(navArgument("clientId") { type = NavType.StringType }),
        ) { entry ->
            VisitScreen(
                clientId = entry.arguments?.getString("clientId") ?: "",
                onBack = { navController.popBackStack() },
                onOrderSummary = { id -> navController.navigate("order/$id") },
            )
        }
        composable(
            route = "order/{clientId}",
            arguments = listOf(navArgument("clientId") { type = NavType.StringType }),
        ) { entry ->
            OrderSummaryScreen(
                clientId = entry.arguments?.getString("clientId") ?: "",
                onBack = { navController.popBackStack() },
                onDone = { navController.navigate("main") { popUpTo("main") { inclusive = true } } },
            )
        }
        composable("location") {
            LocationScreen(onNavigate = { navController.navigate(it.route) { launchSingleTop = true } })
        }
        composable("plan") {
            PlanScreen(onNavigate = { navController.navigate(it.route) { launchSingleTop = true } })
        }
        composable("messages") {
            MessagesScreen(
                onNavigate = { navController.navigate(it.route) { launchSingleTop = true } },
                onChatClick = { id -> navController.navigate("chat/$id") },
            )
        }
        composable(
            route = "chat/{conversationId}",
            arguments = listOf(navArgument("conversationId") { type = NavType.StringType }),
        ) { entry ->
            ChatScreen(
                conversationId = entry.arguments?.getString("conversationId") ?: "",
                onBack = { navController.popBackStack() },
            )
        }
        composable("profile") {
            ProfileScreen(
                onNavigate = { navController.navigate(it.route) { launchSingleTop = true } },
                onLogout = { navController.navigate("login") { popUpTo(0) { inclusive = true } } },
            )
        }
    }
    IncomingMessageBannerOverlay(navController = navController)
    }
}

@Composable
private fun SplashRoute(onLoggedIn: () -> Unit, onNotLoggedIn: () -> Unit) {
    val viewModel: SplashViewModel = hiltViewModel()
    LaunchedEffect(Unit) {
        viewModel.checkAuth { if (it) onLoggedIn() else onNotLoggedIn() }
    }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}
