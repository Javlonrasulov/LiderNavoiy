package uz.lider.client.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.ProfileRepository
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.DashboardData
import javax.inject.Inject

data class DashboardUiState(
    val loading: Boolean = true,
    val data: DashboardData? = null,
    val allOrders: List<ClientOrder> = emptyList(),
    val dateRange: DashboardDateRange = DashboardDateFilter.lastMonthRange(),
    val filtered: DashboardFiltered = DashboardFiltered(0.0, 0, emptyList(), listOf(0f, 0f)),
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            val data = profileRepository.getDashboardData()
            val allOrders = profileRepository.getAllOrders()
            val range = _uiState.value.dateRange
            val filtered = DashboardDateFilter.computeFiltered(allOrders, range)
            _uiState.update {
                it.copy(
                    loading = false,
                    data = data,
                    allOrders = allOrders,
                    dateRange = range,
                    filtered = filtered,
                )
            }
        }
    }

    fun setDateRange(startMillis: Long, endMillis: Long) {
        val start = DashboardDateFilter.fromMillis(startMillis)
        val end = DashboardDateFilter.fromMillis(endMillis)
        val range = DashboardDateRange(
            start = minOf(start, end),
            end = maxOf(start, end),
            isCustom = true,
        )
        applyRange(range)
    }

    fun resetToLastMonth() {
        applyRange(DashboardDateFilter.lastMonthRange())
    }

    private fun applyRange(range: DashboardDateRange) {
        _uiState.update { state ->
            val orders = state.allOrders
            state.copy(
                dateRange = range,
                filtered = DashboardDateFilter.computeFiltered(orders, range),
            )
        }
    }

    fun dateRangeLabel(): String = DashboardDateFilter.formatRange(_uiState.value.dateRange)
}
