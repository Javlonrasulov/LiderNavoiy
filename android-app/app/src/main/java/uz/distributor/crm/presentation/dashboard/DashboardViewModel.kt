package uz.distributor.crm.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.AppSettingsRepository
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.CartRepository
import uz.distributor.crm.data.repository.DashboardRepository
import uz.distributor.crm.domain.model.AuthUser
import uz.distributor.crm.domain.model.DashboardStats
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class DashboardUiState(
    val isLoading: Boolean = true,
    val user: AuthUser? = null,
    val stats: DashboardStats = DashboardStats(),
    val showBalance: Boolean = false,
    val showAll: Boolean = false,
    val formattedDate: String = "",
    val cartTotal: Double = 0.0,
    val cartItemsCount: Int = 0,
    val error: String? = null,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val dashboardRepository: DashboardRepository,
    private val appSettingsRepository: AppSettingsRepository,
    private val cartRepository: CartRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    val darkMode: StateFlow<Boolean> = appSettingsRepository.darkMode.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = false,
    )

    init {
        loadDashboard()
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
        viewModelScope.launch { appSettingsRepository.setLanguage(language) }
    }

    fun toggleBalance() {
        _uiState.update { it.copy(showBalance = !it.showBalance) }
    }

    fun toggleShowAll() {
        _uiState.update { it.copy(showAll = !it.showAll) }
    }

    fun refresh() {
        loadDashboard()
    }

    private fun loadDashboard() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val user = authRepository.getUserFlow().first()
            val lang = appSettingsRepository.language.first()
            val today = formatToday(lang)
            val cart = cartRepository.getCart()
            val cartTotal = cart.sumOf { it.price * it.quantity }
            val cartItemsCount = cart.size

            try {
                val stats = dashboardRepository.getStats()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        user = user,
                        formattedDate = today,
                        stats = stats,
                        cartTotal = cartTotal,
                        cartItemsCount = cartItemsCount,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        user = user,
                        formattedDate = today,
                        stats = DashboardStats(
                            totalClients = 89,
                            visitedClients = 1,
                            pendingClients = 88,
                            visitCount = 1,
                            clientProgressPercent = 1.1f,
                        ),
                        cartTotal = cartTotal,
                        cartItemsCount = cartItemsCount,
                        error = e.message,
                    )
                }
            }
        }
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
