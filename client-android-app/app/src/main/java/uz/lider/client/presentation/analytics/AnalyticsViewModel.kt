package uz.lider.client.presentation.analytics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.AnalyticsRepository
import uz.lider.client.data.repository.AppSettingsRepository
import uz.lider.client.domain.model.ClientAnalytics
import uz.lider.client.presentation.components.ChartVisualStyle
import java.time.LocalDate
import javax.inject.Inject

data class AnalyticsUiState(
    val loading: Boolean = true,
    val period: String = "month",
    val chartStyle: ChartVisualStyle = ChartVisualStyle.BAR,
    val data: ClientAnalytics? = null,
    val loadFailed: Boolean = false,
    val salesDays: Set<LocalDate> = emptySet(),
    val customStartDate: LocalDate? = null,
    val customEndDate: LocalDate? = null,
    val showCalendar: Boolean = false,
)

@HiltViewModel
class AnalyticsViewModel @Inject constructor(
    private val analyticsRepository: AnalyticsRepository,
    private val appSettingsRepository: AppSettingsRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AnalyticsUiState())
    val uiState: StateFlow<AnalyticsUiState> = _uiState.asStateFlow()

    init {
        load("month")
        viewModelScope.launch {
            appSettingsRepository.chartStyle.collect { style ->
                _uiState.update { it.copy(chartStyle = style) }
            }
        }
        viewModelScope.launch {
            val days = analyticsRepository.getSalesDays()
            _uiState.update { it.copy(salesDays = days) }
        }
    }

    fun setPeriod(period: String) {
        if (_uiState.value.period == period) return
        _uiState.update { it.copy(period = period, customStartDate = null, customEndDate = null) }
        load(period)
    }

    fun openCalendar() {
        _uiState.update { it.copy(showCalendar = true) }
    }

    fun closeCalendar() {
        _uiState.update { it.copy(showCalendar = false) }
    }

    fun applyDateRange(start: LocalDate, end: LocalDate) {
        _uiState.update {
            it.copy(
                showCalendar = false,
                customStartDate = start,
                customEndDate = end,
                loading = true,
                loadFailed = false,
            )
        }
        viewModelScope.launch {
            val data = analyticsRepository.getAnalyticsByRange(start, end)
            _uiState.update {
                it.copy(loading = false, data = data, loadFailed = data == null)
            }
        }
    }

    fun clearDateRange() {
        _uiState.update { it.copy(customStartDate = null, customEndDate = null) }
        load(_uiState.value.period)
    }

    fun setChartStyle(style: ChartVisualStyle) {
        if (_uiState.value.chartStyle == style) return
        _uiState.update { it.copy(chartStyle = style) }
        viewModelScope.launch { appSettingsRepository.setChartStyle(style) }
    }

    fun refresh() {
        val s = _uiState.value
        if (s.customStartDate != null && s.customEndDate != null) {
            applyDateRange(s.customStartDate, s.customEndDate)
        } else {
            load(s.period, showLoading = false)
        }
    }

    suspend fun refreshSuspend() {
        val s = _uiState.value
        if (s.customStartDate != null && s.customEndDate != null) {
            val data = analyticsRepository.getAnalyticsByRange(s.customStartDate, s.customEndDate)
            _uiState.update { it.copy(data = data, loadFailed = data == null) }
        } else {
            val data = analyticsRepository.getAnalytics(s.period)
            _uiState.update { it.copy(data = data, loadFailed = data == null) }
        }
    }

    private fun load(period: String, showLoading: Boolean = true) {
        viewModelScope.launch {
            if (showLoading) {
                _uiState.update { it.copy(loading = true, loadFailed = false) }
            }
            val data = analyticsRepository.getAnalytics(period)
            _uiState.update {
                it.copy(
                    loading = false,
                    data = data,
                    loadFailed = data == null,
                )
            }
        }
    }
}
