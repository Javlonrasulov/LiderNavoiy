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
import javax.inject.Inject

data class AnalyticsUiState(
    val loading: Boolean = true,
    val period: String = "month",
    val chartStyle: ChartVisualStyle = ChartVisualStyle.BAR,
    val data: ClientAnalytics? = null,
    val loadFailed: Boolean = false,
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
    }

    fun setPeriod(period: String) {
        if (_uiState.value.period == period) return
        _uiState.update { it.copy(period = period) }
        load(period)
    }

    fun setChartStyle(style: ChartVisualStyle) {
        if (_uiState.value.chartStyle == style) return
        _uiState.update { it.copy(chartStyle = style) }
        viewModelScope.launch { appSettingsRepository.setChartStyle(style) }
    }

    private fun load(period: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, loadFailed = false) }
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
