package uz.distributor.crm.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.DashboardRepository
import uz.distributor.crm.domain.model.AuthUser
import uz.distributor.crm.domain.model.DashboardStats
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
    val error: String? = null,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val dashboardRepository: DashboardRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadDashboard()
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
            val dateFormat = SimpleDateFormat("EEEE dd.MM.yyyy", Locale("uz"))
            val today = dateFormat.format(Date())

            try {
                val stats = dashboardRepository.getStats()

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        user = user,
                        formattedDate = today.replaceFirstChar { c -> c.uppercase() },
                        stats = stats,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        user = user,
                        formattedDate = today.replaceFirstChar { c -> c.uppercase() },
                        stats = DashboardStats(
                            totalClients = 89,
                            visitedClients = 1,
                            pendingClients = 88,
                            visitCount = 1,
                            clientProgressPercent = 1.1f,
                        ),
                        error = e.message,
                    )
                }
            }
        }
    }
}
