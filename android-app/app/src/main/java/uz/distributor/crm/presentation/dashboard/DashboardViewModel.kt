package uz.distributor.crm.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.repository.AppSettingsRepository
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.CartRepository
import uz.distributor.crm.data.repository.DashboardRefreshRepository
import uz.distributor.crm.data.repository.DashboardRepository
import uz.distributor.crm.data.repository.PushRepository
import uz.distributor.crm.domain.model.AuthUser
import uz.distributor.crm.domain.model.DashboardStats
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

enum class RefreshButtonState { IDLE, LOADING, SUCCESS }

data class DashboardUiState(
    val isLoading: Boolean = true,
    val user: AuthUser? = null,
    val stats: DashboardStats = DashboardStats(),
    val showBalance: Boolean = false,
    val showAll: Boolean = false,
    val formattedDate: String = "",
    val cartTotal: Double = 0.0,
    val cartItemsCount: Int = 0,
    val productCount: Int = 0,
    val error: String? = null,
    val refreshButtonState: RefreshButtonState = RefreshButtonState.IDLE,
    val refreshUpdates: List<String> = emptyList(),
    val showRefreshResult: Boolean = false,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val dashboardRepository: DashboardRepository,
    private val dashboardRefreshRepository: DashboardRefreshRepository,
    private val appSettingsRepository: AppSettingsRepository,
    private val cartRepository: CartRepository,
    private val pushRepository: PushRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    val darkMode: StateFlow<Boolean> = appSettingsRepository.darkMode.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = false,
    )

    init {
        viewModelScope.launch {
            appSettingsRepository.language.collect { lang ->
                _uiState.update { it.copy(formattedDate = formatToday(lang)) }
            }
        }
    }

    fun toggleDarkMode() {
        viewModelScope.launch { appSettingsRepository.toggleDarkMode() }
    }

    fun setLanguage(language: AppLanguage) {
        viewModelScope.launch {
            appSettingsRepository.setLanguage(language)
            pushRepository.syncPreferredLanguage()
        }
    }

    fun toggleBalance() {
        _uiState.update { it.copy(showBalance = !it.showBalance) }
    }

    fun toggleShowAll() {
        _uiState.update { it.copy(showAll = !it.showAll) }
    }

    fun dismissRefreshResult() {
        _uiState.update { it.copy(showRefreshResult = false) }
    }

    fun refresh() {
        if (_uiState.value.refreshButtonState == RefreshButtonState.LOADING) return
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    refreshButtonState = RefreshButtonState.LOADING,
                    showRefreshResult = false,
                )
            }

            val user = authRepository.getUserFlow().first()
            val lang = appSettingsRepository.language.first()
            val today = formatToday(lang)
            // Dostavkachi agent savatchasini ko‘rmasin (qurilmadagi eski cart)
            val (cartTotal, cartItemsCount) = resolveCartTotals()

            try {
                val result = dashboardRefreshRepository.refreshAndDetectChanges(lang)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        user = user,
                        formattedDate = today,
                        stats = result.stats,
                        productCount = result.productCount,
                        cartTotal = cartTotal,
                        cartItemsCount = cartItemsCount,
                        refreshButtonState = RefreshButtonState.SUCCESS,
                        refreshUpdates = result.updates,
                        showRefreshResult = true,
                        error = null,
                    )
                }
                delay(2500)
                _uiState.update {
                    if (it.refreshButtonState == RefreshButtonState.SUCCESS) {
                        it.copy(refreshButtonState = RefreshButtonState.IDLE)
                    } else it
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        user = user,
                        formattedDate = today,
                        cartTotal = cartTotal,
                        cartItemsCount = cartItemsCount,
                        refreshButtonState = RefreshButtonState.IDLE,
                        error = ApiErrorMapper.toKey(e),
                    )
                }
            }
        }
    }

    fun reload() {
        loadDashboard()
    }

    private fun loadDashboard() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val user = authRepository.getUserFlow().first()
            val lang = appSettingsRepository.language.first()
            val today = formatToday(lang)
            val (cartTotal, cartItemsCount) = resolveCartTotals()

            try {
                withTimeout(25_000) {
                    val stats = dashboardRepository.getStats()
                    val productCount = dashboardRefreshRepository.syncSessionBaseline()
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            user = user,
                            formattedDate = today,
                            stats = stats,
                            productCount = productCount,
                            cartTotal = cartTotal,
                            cartItemsCount = cartItemsCount,
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        user = user,
                        formattedDate = today,
                        stats = DashboardStats(),
                        productCount = 0,
                        cartTotal = cartTotal,
                        cartItemsCount = cartItemsCount,
                        error = ApiErrorMapper.toKey(e),
                    )
                }
            }
        }
    }

    /** Agent va yetkazib beruvchi — bir xil savat. */
    private suspend fun resolveCartTotals(): Pair<Double, Int> {
        val cart = cartRepository.getCart()
        return cart.sumOf { it.price * it.quantity } to cart.size
    }

    private fun formatToday(lang: AppLanguage): String {
        val cal = Calendar.getInstance()
        val dayName = AppStrings.dayName(cal.get(Calendar.DAY_OF_WEEK) - 1, lang)
        val locale = when (lang) {
            AppLanguage.RUS -> Locale("ru")
            AppLanguage.UZ_CYRILLIC -> Locale.forLanguageTag("uz-Cyrl")
            AppLanguage.UZ_LATIN -> Locale("uz")
        }
        val date = SimpleDateFormat("dd.MM.yyyy", locale).format(Date())
        return "$dayName $date"
    }
}
