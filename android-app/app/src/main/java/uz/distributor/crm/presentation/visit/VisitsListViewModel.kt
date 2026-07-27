package uz.distributor.crm.presentation.visit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.remote.dto.VisitDto
import uz.distributor.crm.data.repository.VisitsRepository
import uz.distributor.crm.presentation.plan.PlanDateFilter
import uz.distributor.crm.presentation.plan.PlanDatePreset
import uz.distributor.crm.presentation.plan.PlanDateRange
import java.time.LocalDate
import javax.inject.Inject

data class VisitsListUiState(
    val isLoading: Boolean = true,
    val visits: List<VisitDto> = emptyList(),
    val error: String? = null,
    val dateRange: PlanDateRange = PlanDateFilter.todayRange(),
    val datePreset: PlanDatePreset = PlanDatePreset.TODAY,
)

@HiltViewModel
class VisitsListViewModel @Inject constructor(
    private val repository: VisitsRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(VisitsListUiState())
    val uiState: StateFlow<VisitsListUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            val range = _uiState.value.dateRange
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val visits = repository.getVisitsInRange(range.start, range.end)
                _uiState.update { it.copy(isLoading = false, visits = visits) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = ApiErrorMapper.toKey(e))
                }
            }
        }
    }

    fun onCalendarPreset(preset: PlanDatePreset) {
        if (preset == PlanDatePreset.ALL) {
            // Oxirgi 90 kun — "hammasi" uchun amaliy oralik
            val today = LocalDate.now()
            val range = PlanDateRange(start = today.minusDays(89), end = today, isCustom = false)
            _uiState.update { it.copy(dateRange = range, datePreset = preset) }
            load()
            return
        }
        val range = when (preset) {
            PlanDatePreset.TODAY -> PlanDateFilter.todayRange()
            PlanDatePreset.WEEK -> PlanDateFilter.thisWeekRange()
            PlanDatePreset.MONTH -> PlanDateFilter.thisMonthRange()
            else -> _uiState.value.dateRange
        }
        _uiState.update { it.copy(dateRange = range, datePreset = preset) }
        load()
    }

    fun applyDateRange(startMillis: Long, endMillis: Long) {
        val start = PlanDateFilter.fromMillis(startMillis)
        val end = PlanDateFilter.fromMillis(endMillis)
        val range = PlanDateFilter.normalizeRange(start, end)
        _uiState.update {
            it.copy(dateRange = range, datePreset = PlanDatePreset.CUSTOM)
        }
        load()
    }

    fun clearDateRange() {
        _uiState.update {
            it.copy(
                dateRange = PlanDateFilter.todayRange(),
                datePreset = PlanDatePreset.TODAY,
            )
        }
        load()
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
