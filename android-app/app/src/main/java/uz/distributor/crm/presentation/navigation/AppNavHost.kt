package uz.distributor.crm.presentation.navigation

import android.content.Context
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.imePadding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.zIndex
import androidx.compose.foundation.layout.WindowInsets
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import uz.distributor.crm.data.location.DeviceLocationProvider
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.presentation.auth.LocationRequiredScreen
import uz.distributor.crm.presentation.auth.LoginScreen
import uz.distributor.crm.presentation.auth.NotificationRequiredScreen
import uz.distributor.crm.presentation.clientdetail.ClientDetailScreen
import uz.distributor.crm.presentation.clients.AddClientScreen
import uz.distributor.crm.presentation.clients.ClientsScreen
import uz.distributor.crm.presentation.components.BottomNavBar
import uz.distributor.crm.presentation.components.NavTab
import uz.distributor.crm.presentation.components.route
import uz.distributor.crm.presentation.dashboard.DashboardScreen
import uz.distributor.crm.presentation.delivery.DeliveryDebtsScreen
import uz.distributor.crm.presentation.delivery.DeliveryOrderDetailScreen
import uz.distributor.crm.presentation.delivery.DeliveryOrdersScreen
import uz.distributor.crm.presentation.location.LocationScreen
import uz.distributor.crm.presentation.messages.ChatScreen
import uz.distributor.crm.presentation.messages.IncomingMessageBannerOverlay
import uz.distributor.crm.presentation.messages.MessagesScreen
import uz.distributor.crm.presentation.order.ClientOrdersScreen
import uz.distributor.crm.presentation.order.OrderSummaryScreen
import uz.distributor.crm.presentation.plan.PlanScreen
import uz.distributor.crm.presentation.products.ProductsScreen
import uz.distributor.crm.presentation.profile.ProfileScreen
import uz.distributor.crm.presentation.reconciliation.ReconciliationScreen
import uz.distributor.crm.presentation.visit.VisitScreen
import uz.distributor.crm.presentation.visit.VisitsListScreen
import uz.distributor.crm.util.NotificationAccess
import javax.inject.Inject

enum class SplashResult {
    MAIN,
    LOGIN,
    LOCATION,
    NOTIFICATIONS,
}

@HiltViewModel
class SplashViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val authRepository: AuthRepository,
    private val deviceLocationProvider: DeviceLocationProvider,
    private val locationTrackingController: uz.distributor.crm.service.LocationTrackingController,
) : ViewModel() {
    fun checkAuth(onResult: (SplashResult) -> Unit) {
        viewModelScope.launch {
            val loggedIn = authRepository.restoreSession()
            when {
                !loggedIn -> onResult(SplashResult.LOGIN)
                !NotificationAccess.areEnabled(context) -> onResult(SplashResult.NOTIFICATIONS)
                !deviceLocationProvider.isReadyForTracking() -> onResult(SplashResult.LOCATION)
                else -> {
                    locationTrackingController.startIfReady()
                    onResult(SplashResult.MAIN)
                }
            }
        }
    }
}

@HiltViewModel
class AppNavigationViewModel @Inject constructor(
    authRepository: AuthRepository,
) : ViewModel() {
    val sessionExpired = authRepository.sessionExpired
    val currentUser = authRepository.getUserFlow()
}

@Composable
fun AppNavHost(
    navViewModel: AppNavigationViewModel = hiltViewModel(),
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val showBottomNav = showsBottomNav(currentRoute)
    val selectedTab = bottomNavSelectedTab(currentRoute)
    val imeVisible = WindowInsets.ime.getBottom(LocalDensity.current) > 0
    val currentUser by navViewModel.currentUser.collectAsState(initial = null)
    val isDeliveryPerson = currentUser?.isDeliveryPerson() == true
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner, currentRoute) {
        val observer = LifecycleEventObserver { _, event ->
            if (event != Lifecycle.Event.ON_RESUME) return@LifecycleEventObserver
            val route = currentRoute ?: return@LifecycleEventObserver
            val allowedWithoutNotifications = route in setOf(
                "splash",
                "login",
                "notification_required",
            )
            if (!allowedWithoutNotifications && !NotificationAccess.areEnabled(context)) {
                navController.navigate("notification_required") {
                    popUpTo(0) { inclusive = true }
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(Unit) {
        navViewModel.sessionExpired.collectLatest {
            navController.navigate("login") {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    LaunchedEffect(currentRoute, isDeliveryPerson) {
        if (currentRoute?.startsWith("delivery") == true && !isDeliveryPerson) {
            navController.navigate("main") {
                popUpTo("main") { inclusive = true }
                launchSingleTop = true
            }
        }
    }

    LaunchedEffect(Unit) {
        OpenChatHolder.pendingConversationId?.let { id ->
            OpenChatHolder.pendingConversationId = null
            navController.navigate("chat/$id") {
                launchSingleTop = true
            }
        }
        if (OpenChatHolder.pendingOpenPlan) {
            OpenChatHolder.pendingOpenPlan = false
            navController.navigate("plan") {
                launchSingleTop = true
            }
        }
        OpenChatHolder.deepLinks.collect { link ->
            when {
                link == "plan" -> {
                    OpenChatHolder.pendingOpenPlan = false
                    navController.navigate("plan") { launchSingleTop = true }
                }
                link.startsWith("chat:") -> {
                    val id = link.removePrefix("chat:")
                    OpenChatHolder.pendingConversationId = null
                    navController.navigate("chat/$id") { launchSingleTop = true }
                }
            }
        }
    }

    Column(Modifier.fillMaxSize().imePadding()) {
        Box(Modifier.weight(1f).fillMaxWidth()) {
            NavHost(
                navController = navController,
                startDestination = "splash",
                modifier = Modifier.fillMaxSize(),
            ) {
        composable("splash") {
            SplashRoute(
                onLoggedIn = { navController.navigate("main") { popUpTo("splash") { inclusive = true } } },
                onNotLoggedIn = { navController.navigate("login") { popUpTo("splash") { inclusive = true } } },
                onLocationRequired = {
                    navController.navigate("location_required") {
                        popUpTo("splash") { inclusive = true }
                    }
                },
                onNotificationRequired = {
                    navController.navigate("notification_required") {
                        popUpTo("splash") { inclusive = true }
                    }
                },
            )
        }
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("main") { popUpTo("login") { inclusive = true } }
                },
                onNotificationRequired = {
                    navController.navigate("notification_required") {
                        popUpTo("login") { inclusive = true }
                    }
                },
            )
        }
        composable("notification_required") {
            NotificationRequiredScreen(
                onReady = {
                    // GPS ham tekshiriladi: splash qayta emas, location_required orqali
                    navController.navigate("location_required") {
                        popUpTo("notification_required") { inclusive = true }
                    }
                },
            )
        }
        composable("location_required") {
            LocationRequiredScreen(
                onReady = {
                    if (!NotificationAccess.areEnabled(context)) {
                        navController.navigate("notification_required") {
                            popUpTo("location_required") { inclusive = true }
                        }
                    } else {
                        navController.navigate("main") {
                            popUpTo("location_required") { inclusive = true }
                        }
                    }
                },
            )
        }
        composable("main") {
            DashboardScreen(
                onNavigate = { tab -> navController.navigateBottomTab(tab) },
                onClientsClick = { navController.navigate("clients") },
                onAddClientClick = { navController.navigate("add_client") },
                onProfileClick = { navController.navigate("profile") },
                onOrderSummaryClick = { navController.navigate("order/cart") },
                onProductsClick = { navController.navigate("products") },
                onClientOrdersClick = { navController.navigate("client_orders") },
                onVisitsClick = { navController.navigate("visits") },
            )
        }
        composable("client_orders") {
            ClientOrdersScreen(
                onBack = { navController.popBackStack() },
                onEditOrder = { clientId ->
                    navController.navigate("order/$clientId")
                },
            )
        }
        composable("visits") {
            VisitsListScreen(onBack = { navController.popBackStack() })
        }
        composable("add_client") {
            AddClientScreen(
                onBack = { navController.popBackStack() },
                onSaved = {
                    navController.popBackStack()
                    navController.navigate("clients")
                },
            )
        }
        composable("products") {
            ProductsScreen(onBack = { navController.popBackStack() })
        }
        composable("clients") {
            ClientsScreen(
                onBack = { navController.popBackStack() },
                onClientClick = { id -> navController.navigate("client/$id") },
                onAddClientClick = { navController.navigate("add_client") },
            )
        }
        composable("delivery") {
            if (isDeliveryPerson) {
                DeliveryOrdersScreen(
                    onOrderClick = { id -> navController.navigate("delivery/$id") },
                    onDebtsClick = { navController.navigate("delivery/debts") },
                )
            }
        }
        composable("delivery/debts") {
            if (isDeliveryPerson) {
                DeliveryDebtsScreen(
                    onBackToDelivery = {
                        navController.navigate("delivery") {
                            popUpTo("delivery") { inclusive = true }
                            launchSingleTop = true
                        }
                    },
                    onOrderClick = { id -> navController.navigate("delivery/$id") },
                )
            }
        }
        composable(
            route = "delivery/{orderId}",
            arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
        ) {
            if (isDeliveryPerson) {
                DeliveryOrderDetailScreen(
                    onBack = { navController.popBackStack() },
                )
            }
        }
        composable(
            route = "client/{clientId}",
            arguments = listOf(navArgument("clientId") { type = NavType.StringType }),
        ) { entry ->
            ClientDetailScreen(
                clientId = entry.arguments?.getString("clientId") ?: "",
                onBack = { navController.popBackStack() },
                onStartVisit = { id -> navController.navigate("visit/$id") },
                onReconciliation = { id -> navController.navigate("reconciliation/$id") },
            )
        }
        composable(
            route = "reconciliation/{clientId}",
            arguments = listOf(navArgument("clientId") { type = NavType.StringType }),
        ) { entry ->
            ReconciliationScreen(
                clientId = entry.arguments?.getString("clientId") ?: "",
                clientName = "",
                onBack = { navController.popBackStack() },
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
        composable("order/cart") {
            OrderSummaryScreen(
                clientId = "",
                onBack = { navController.popBackStack() },
                onDone = { navController.navigate("main") { popUpTo("main") { inclusive = true } } },
                onEditClient = { id ->
                    if (id.isNotBlank()) navController.navigate("visit/$id")
                },
            )
        }
        composable(
            route = "order/{clientId}",
            arguments = listOf(navArgument("clientId") { type = NavType.StringType }),
        ) { entry ->
            val orderClientId = entry.arguments?.getString("clientId") ?: ""
            OrderSummaryScreen(
                clientId = orderClientId,
                onBack = { navController.popBackStack() },
                onDone = {
                    // Klient buyurtmasi tahriri saqlanganda — ro'yxatga qaytish
                    if (!navController.popBackStack("client_orders", inclusive = false)) {
                        navController.navigate("main") { popUpTo("main") { inclusive = true } }
                    }
                },
                onEditClient = { id ->
                    navController.navigate("visit/${id.ifBlank { orderClientId }}")
                },
            )
        }
        composable("location") {
            LocationScreen(
                onNavigate = { tab -> navController.navigateBottomTab(tab) },
                onOrderClick = { id -> navController.navigate("delivery/$id") },
                onClientClick = { id -> navController.navigate("client/$id") },
            )
        }
        composable("plan") {
            PlanScreen(onNavigate = { tab -> navController.navigateBottomTab(tab) })
        }
        composable("messages") {
            MessagesScreen(
                onNavigate = { tab -> navController.navigateBottomTab(tab) },
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
                onBack = { navController.popBackStack() },
                onLogout = { navController.navigate("login") { popUpTo(0) { inclusive = true } } },
            )
        }
            }
            IncomingMessageBannerOverlay(
                navController = navController,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .zIndex(1000f),
            )
        }
        if (showBottomNav && !imeVisible) {
            BottomNavBar(
                selected = selectedTab,
                onTabSelected = { tab ->
                    if (tab == NavTab.DELIVERY && !isDeliveryPerson) return@BottomNavBar
                    navController.navigateBottomTab(tab)
                },
                isDark = isDark,
                showDelivery = isDeliveryPerson,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun SplashRoute(
    onLoggedIn: () -> Unit,
    onNotLoggedIn: () -> Unit,
    onLocationRequired: () -> Unit,
    onNotificationRequired: () -> Unit,
) {
    val viewModel: SplashViewModel = hiltViewModel()
    LaunchedEffect(Unit) {
        viewModel.checkAuth { result ->
            when (result) {
                SplashResult.MAIN -> onLoggedIn()
                SplashResult.LOGIN -> onNotLoggedIn()
                SplashResult.LOCATION -> onLocationRequired()
                SplashResult.NOTIFICATIONS -> onNotificationRequired()
            }
        }
    }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}
