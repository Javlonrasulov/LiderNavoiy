package uz.lider.client.presentation.debt

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.ProfileRepository
import uz.lider.client.presentation.dashboard.DashboardDateFilter
import uz.lider.client.presentation.dashboard.DashboardDateRange
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

data class DebtPayment(
    val date: String,
    val amount: String,
    val typeKey: String,
    val isPayment: Boolean,
) {
    fun localDate(): LocalDate? = try {
        LocalDate.parse(date, debtDateFormatter)
    } catch (_: Exception) {
        null
    }

    companion object {
        private val debtDateFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }
}

data class DebtUiState(
    val loading: Boolean = true,
    val currentDebt: Double = 2_500_000.0,
    val creditLimit: Double = 10_000_000.0,
    val allPayments: List<DebtPayment> = defaultPayments,
    val dateRange: DashboardDateRange = DashboardDateFilter.lastMonthRange(),
    val filteredPayments: List<DebtPayment> = emptyList(),
    val totalPaid: Double = 0.0,
) {
    companion object {
        private val defaultPayments = listOf(
            DebtPayment("05.06.2026", "1,500,000", "debt_payment", true),
            DebtPayment("28.05.2026", "2,000,000", "debt_payment", true),
            DebtPayment("20.05.2026", "800,000", "debt_added", false),
            DebtPayment("15.05.2026", "3,200,000", "debt_payment", true),
        )
    }
}

@HiltViewModel
class DebtViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DebtUiState())
    val uiState: StateFlow<DebtUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            reloadQuiet()
            _uiState.update { it.copy(loading = false) }
        }
    }

    suspend fun refresh() {
        reloadQuiet()
    }

    private suspend fun reloadQuiet() {
        val profile = profileRepository.getProfile()
        val range = _uiState.value.dateRange
        _uiState.update { state ->
            val payments = state.allPayments
            state.copy(
                currentDebt = profile?.balance?.takeIf { it > 0 } ?: state.currentDebt,
                filteredPayments = filterPayments(payments, range),
                totalPaid = computeTotalPaid(payments, range),
            )
        }
    }

    fun setDateRange(startMillis: Long, endMillis: Long) {
        val start = DashboardDateFilter.fromMillis(startMillis)
        val end = DashboardDateFilter.fromMillis(endMillis)
        applyRange(
            DashboardDateRange(
                start = minOf(start, end),
                end = maxOf(start, end),
                isCustom = true,
            ),
        )
    }

    fun resetToLastMonth() {
        applyRange(DashboardDateFilter.lastMonthRange())
    }

    private fun applyRange(range: DashboardDateRange) {
        _uiState.update { state ->
            val payments = state.allPayments
            state.copy(
                dateRange = range,
                filteredPayments = filterPayments(payments, range),
                totalPaid = computeTotalPaid(payments, range),
            )
        }
    }

    private fun filterPayments(payments: List<DebtPayment>, range: DashboardDateRange): List<DebtPayment> =
        payments.filter { payment ->
            val date = payment.localDate() ?: return@filter false
            !date.isBefore(range.start) && !date.isAfter(range.end)
        }

    private fun computeTotalPaid(payments: List<DebtPayment>, range: DashboardDateRange): Double =
        filterPayments(payments, range)
            .filter { it.isPayment }
            .sumOf { payment ->
                payment.amount.replace(",", "").toDoubleOrNull() ?: 0.0
            }
}
