package uz.lider.client.presentation.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.zIndex
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.AuthRepository
import uz.lider.client.data.repository.CartRepository
import uz.lider.client.presentation.components.cartBadgeCount
import uz.lider.client.presentation.analytics.AnalyticsScreen
import uz.lider.client.presentation.auth.LoginScreen
import uz.lider.client.presentation.cart.CartScreen
import uz.lider.client.presentation.catalog.CatalogScreen
import uz.lider.client.presentation.chat.ChatScreen
import uz.lider.client.presentation.dashboard.DashboardScreen
import uz.lider.client.presentation.debt.DebtScreen
import uz.lider.client.presentation.notifications.NotificationsScreen
import uz.lider.client.presentation.orders.OrdersScreen
import uz.lider.client.presentation.product.ProductDetailScreen
import uz.lider.client.presentation.profile.ProfileScreen
import uz.lider.client.presentation.promotions.PromotionsScreen
import uz.lider.client.presentation.settings.SettingsScreen
import uz.lider.client.presentation.theme.ClientColors
import uz.lider.client.presentation.tracking.OrderTrackingScreen
import androidx.compose.material3.MaterialTheme
import javax.inject.Inject

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {
    fun checkAuth(onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            onResult(authRepository.restoreSession())
        }
    }
}

@HiltViewModel
class ClientNavigationViewModel @Inject constructor(
    authRepository: AuthRepository,
    cartRepository: CartRepository,
) : ViewModel() {
    val sessionExpired = authRepository.sessionExpired
    val cartItems = cartRepository.items
}

@Composable
fun ClientNavHost(
    navViewModel: ClientNavigationViewModel = hiltViewModel(),
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val showBottomNav = showsClientBottomNav(currentRoute)
    val selectedTab = clientBottomNavSelectedTab(currentRoute) ?: ClientTab.DASHBOARD
    val cartItems by navViewModel.cartItems.collectAsState()

    LaunchedEffect(Unit) {
        navViewModel.sessionExpired.collectLatest {
            navController.navigate(ClientRoutes.LOGIN) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        NavHost(
            navController = navController,
            startDestination = ClientRoutes.SPLASH,
            modifier = Modifier
                .fillMaxSize()
                .then(
                    if (showBottomNav) {
                        Modifier.padding(bottom = ClientBottomNavHeight)
                    } else {
                        Modifier
                    },
                ),
        ) {
            composable(ClientRoutes.SPLASH) {
                SplashRoute(
                    onLoggedIn = {
                        navController.navigate(ClientRoutes.DASHBOARD) {
                            popUpTo(ClientRoutes.SPLASH) { inclusive = true }
                        }
                    },
                    onNotLoggedIn = {
                        navController.navigate(ClientRoutes.LOGIN) {
                            popUpTo(ClientRoutes.SPLASH) { inclusive = true }
                        }
                    },
                )
            }
            composable(ClientRoutes.LOGIN) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(ClientRoutes.DASHBOARD) {
                            popUpTo(ClientRoutes.LOGIN) { inclusive = true }
                        }
                    },
                )
            }
            composable(ClientRoutes.DASHBOARD) {
                DashboardScreen(onNavigate = navController::navigate)
            }
            composable(ClientRoutes.CATALOG) {
                CatalogScreen(
                    onNavigate = navController::navigate,
                    cartCount = cartBadgeCount(cartItems),
                )
            }
            composable(ClientRoutes.ORDERS) {
                OrdersScreen(onNavigate = navController::navigate)
            }
            composable(ClientRoutes.ANALYTICS) {
                AnalyticsScreen(onNavigate = navController::navigate)
            }
            composable(ClientRoutes.PROFILE) {
                ProfileScreen(
                    onNavigate = navController::navigate,
                    onLogout = {
                        navController.navigate(ClientRoutes.LOGIN) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                )
            }
            composable(ClientRoutes.CART) {
                CartScreen(
                    onBack = { navController.popBackStack() },
                    onCheckoutSuccess = {
                        navController.navigate(ClientRoutes.ORDERS) {
                            popUpTo(ClientRoutes.CATALOG) { inclusive = false }
                        }
                    },
                )
            }
            composable(
                route = ClientRoutes.PRODUCT_DETAIL,
                arguments = listOf(navArgument("productId") { type = NavType.StringType }),
            ) { entry ->
                ProductDetailScreen(
                    productId = entry.arguments?.getString("productId").orEmpty(),
                    onBack = { navController.popBackStack() },
                    onOpenCart = { navController.navigate(ClientRoutes.CART) },
                )
            }
            composable(
                route = ClientRoutes.ORDER_TRACKING,
                arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
            ) { entry ->
                OrderTrackingScreen(
                    orderId = entry.arguments?.getString("orderId").orEmpty(),
                    onBack = { navController.popBackStack() },
                )
            }
            composable(ClientRoutes.DEBT) {
                DebtScreen(onBack = { navController.popBackStack() })
            }
            composable(ClientRoutes.PROMOTIONS) {
                PromotionsScreen(onBack = { navController.popBackStack() })
            }
            composable(ClientRoutes.NOTIFICATIONS) {
                NotificationsScreen(onBack = { navController.popBackStack() })
            }
            composable(ClientRoutes.CHAT) {
                ChatScreen(onBack = { navController.popBackStack() })
            }
            composable(ClientRoutes.SETTINGS) {
                SettingsScreen(onBack = { navController.popBackStack() })
            }
        }

        if (showBottomNav) {
            ClientBottomNav(
                selected = selectedTab,
                cartCount = cartBadgeCount(cartItems),
                onTabSelected = { tab -> navController.navigateClientTab(tab) },
                isDark = isDark,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .zIndex(100f),
            )
        }
    }
}

@Composable
private fun SplashRoute(onLoggedIn: () -> Unit, onNotLoggedIn: () -> Unit) {
    val viewModel: SplashViewModel = hiltViewModel()
    LaunchedEffect(Unit) {
        viewModel.checkAuth { if (it) onLoggedIn() else onNotLoggedIn() }
    }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = ClientColors.Primary)
    }
}
