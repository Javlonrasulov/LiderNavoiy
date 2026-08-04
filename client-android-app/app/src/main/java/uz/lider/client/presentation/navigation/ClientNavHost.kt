package uz.lider.client.presentation.navigation

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import uz.lider.client.R
import uz.lider.client.data.repository.AuthRepository
import uz.lider.client.data.repository.CartRepository
import uz.lider.client.data.repository.DebtRepository
import uz.lider.client.data.repository.PaymentPhotoAlertStore
import uz.lider.client.data.repository.RecentPaymentSignal
import uz.lider.client.presentation.analytics.AnalyticsScreen
import uz.lider.client.presentation.auth.LoginScreen
import uz.lider.client.presentation.cart.CartScreen
import uz.lider.client.presentation.catalog.CatalogScreen
import uz.lider.client.presentation.chat.ChatScreen
import uz.lider.client.presentation.components.cartBadgeCount
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
    private val authRepository: AuthRepository,
    cartRepository: CartRepository,
    private val paymentPhotoAlertStore: PaymentPhotoAlertStore,
    private val debtRepository: DebtRepository,
) : ViewModel() {
    val sessionExpired = authRepository.sessionExpired
    val cartItems = cartRepository.items
    val user = authRepository.getUserFlow()
    val paymentPhotoModalEvents = paymentPhotoAlertStore.modalEvents

    init {
        viewModelScope.launch { paymentPhotoAlertStore.clearIfExpired() }
        // Push kelmasa ham — to‘lov tarixidan asosiydagi rasm eslatmasi
        viewModelScope.launch {
            while (isActive) {
                runCatching {
                    paymentPhotoAlertStore.clearIfExpired()
                    pollRecentPayments()
                }
                delay(4_000)
            }
        }
    }

    private suspend fun pollRecentPayments() {
        // Login/splash da token yo‘q — 401 → sessionExpired → ekran qayta ochilib
        // login/parol maydonlarini tozalab yubormasligi uchun so‘rov yuborilmaydi.
        if (authRepository.peekAccessToken().isNullOrBlank()) return
        val debt = debtRepository.getDebt() ?: return
        val alert = paymentPhotoAlertStore.state.first()
        if (alert.isActive && paymentProofAlreadySaved(debt.history, alert)) {
            paymentPhotoAlertStore.clearAlert()
            return
        }
        val signals = debt.history
            .filter {
                it.isPayment &&
                    it.id.isNotBlank() &&
                    it.createdAtMs > 0L &&
                    it.photoUrl.isNullOrBlank()
            }
            .map {
                RecentPaymentSignal(
                    id = it.id,
                    orderId = it.orderId,
                    createdAtMs = it.createdAtMs,
                )
            }
        paymentPhotoAlertStore.ingestRecentPayments(signals)
    }

    /**
     * Faqat shu eslatmaga tegishli to‘lovda rasm bo‘lsa yopiladi.
     * Eski to‘lovlardagi rasm — yangi eslatmani o‘chirmasin.
     */
    private fun paymentProofAlreadySaved(
        history: List<uz.lider.client.presentation.debt.DebtPayment>,
        alert: uz.lider.client.data.repository.PaymentPhotoAlertState,
    ): Boolean {
        fun samePaymentId(rowId: String, wanted: String): Boolean {
            val a = rowId.removePrefix("pay-")
            val b = wanted.removePrefix("pay-")
            return a == b || rowId == wanted
        }

        val paymentId = alert.paymentId?.takeIf { it.isNotBlank() && !it.startsWith("ord-") }
        if (paymentId != null) {
            return history.any { row ->
                row.isPayment &&
                    samePaymentId(row.id, paymentId) &&
                    !row.photoUrl.isNullOrBlank()
            }
        }

        val orderId = alert.orderId?.takeIf { it.isNotBlank() } ?: return false
        val newestForOrder = history
            .filter { it.isPayment && it.orderId == orderId && it.createdAtMs > 0L }
            .maxByOrNull { it.createdAtMs }
            ?: return false
        // Faqat eng so‘nggi to‘lovda rasm bo‘lsa — eslatma yopiladi
        return !newestForOrder.photoUrl.isNullOrBlank()
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            onDone()
        }
    }
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
    val user by navViewModel.user.collectAsState(initial = null)
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val loggedIn = currentRoute != null &&
        currentRoute != ClientRoutes.SPLASH &&
        currentRoute != ClientRoutes.LOGIN

    LaunchedEffect(Unit) {
        navViewModel.sessionExpired.collectLatest {
            if (navController.currentDestination?.route == ClientRoutes.LOGIN) return@collectLatest
            navController.navigate(ClientRoutes.LOGIN) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    // To‘lov push / eslatma — asosiy ekranga qaytarish (bo‘lim ko‘rinsin)
    LaunchedEffect(Unit) {
        navViewModel.paymentPhotoModalEvents.collectLatest {
            val route = navController.currentDestination?.route
            if (route == null ||
                route == ClientRoutes.SPLASH ||
                route == ClientRoutes.LOGIN
            ) {
                return@collectLatest
            }
            if (route != ClientRoutes.DASHBOARD) {
                navController.navigate(ClientRoutes.DASHBOARD) {
                    launchSingleTop = true
                    restoreState = true
                }
            }
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = showBottomNav,
        drawerContent = {
            ClientDrawerContent(
                user = user,
                onNavigate = { route -> navController.navigateClientRoute(route) },
                onLogout = {
                    navViewModel.logout {
                        navController.navigate(ClientRoutes.LOGIN) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                },
                onClose = { scope.launch { drawerState.close() } },
            )
        },
    ) {
        Box(Modifier.fillMaxSize()) {
            NavHost(
                navController = navController,
                startDestination = ClientRoutes.SPLASH,
                modifier = Modifier.fillMaxSize(),
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
                    DashboardScreen(
                        onNavigate = navController::navigateClientRoute,
                        onOpenDrawer = { scope.launch { drawerState.open() } },
                    )
                }
                composable(ClientRoutes.CATALOG) {
                    CatalogScreen(
                        onNavigate = navController::navigateClientRoute,
                        cartCount = cartBadgeCount(cartItems),
                        onOpenDrawer = { scope.launch { drawerState.open() } },
                    )
                }
                composable(ClientRoutes.ORDERS) {
                    OrdersScreen(
                        onNavigate = navController::navigateClientRoute,
                        onOpenDrawer = { scope.launch { drawerState.open() } },
                    )
                }
                composable(ClientRoutes.ANALYTICS) {
                    AnalyticsScreen(
                        onNavigate = navController::navigateClientRoute,
                        onOpenDrawer = { scope.launch { drawerState.open() } },
                    )
                }
                composable(ClientRoutes.PROFILE) {
                    ProfileScreen(
                        onNavigate = navController::navigateClientRoute,
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
                composable(
                    route = ClientRoutes.CHAT,
                    arguments = listOf(
                        navArgument("userId") { type = NavType.StringType },
                        navArgument("name") {
                            type = NavType.StringType
                            defaultValue = ""
                        },
                        navArgument("position") {
                            type = NavType.StringType
                            defaultValue = ""
                        },
                    ),
                ) {
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
                    onOpenCart = { navController.navigate(ClientRoutes.CART) },
                    isDark = isDark,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .zIndex(100f),
                )
            }
        }
    }
}

@Composable
private fun SplashRoute(onLoggedIn: () -> Unit, onNotLoggedIn: () -> Unit) {
    val viewModel: SplashViewModel = hiltViewModel()
    LaunchedEffect(Unit) {
        viewModel.checkAuth { if (it) onLoggedIn() else onNotLoggedIn() }
    }
    // Agent APK uslubi: oq fon + markazda logo
    Box(
        Modifier
            .fillMaxSize()
            .background(Color.White),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Image(
                painter = painterResource(id = R.drawable.splash_logo),
                contentDescription = null,
                modifier = Modifier
                    .size(160.dp)
                    .clip(RoundedCornerShape(36.dp)),
            )
            Spacer(Modifier.height(28.dp))
            CircularProgressIndicator(
                color = ClientColors.Primary,
                strokeWidth = 3.dp,
                modifier = Modifier.size(28.dp),
            )
        }
    }
}
