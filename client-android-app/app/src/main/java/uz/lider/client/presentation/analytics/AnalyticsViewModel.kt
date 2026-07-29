package uz.lider.client.presentation.analytics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.lider.client.data.local.SelectedOrgHolder
import uz.lider.client.data.repository.AnalyticsRepository
import uz.lider.client.data.repository.AppSettingsRepository
import uz.lider.client.data.repository.ProfileRepository
import uz.lider.client.domain.model.ClientAnalytics
import uz.lider.client.domain.model.ClientOrganization
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
    val organizations: List<ClientOrganization> = emptyList(),
    val selectedCompanyId: String? = null,
)

@HiltViewModel
class AnalyticsViewModel @Inject constructor(
    private val analyticsRepository: AnalyticsRepository,
    private val appSettingsRepository: AppSettingsRepository,
    private val selectedOrgHolder: SelectedOrgHolder,
    private val profileRepository: ProfileRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AnalyticsUiState())
    val uiState: StateFlow<AnalyticsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                selectedOrgHolder.organizations,
                selectedOrgHolder.selectedCompanyId,
            ) { orgs, selected -> orgs to selected }
                .collect { (orgs, selected) ->
                    _uiState.update {
                        it.copy(organizations = orgs, selectedCompanyId = selected)
                    }
                }
        }
        viewModelScope.launch {
            appSettingsRepository.chartStyle.collect { style ->
                _uiState.update { it.copy(chartStyle = style) }
            }
        }
        viewModelScope.launch {
            ensureOrgs()
            load("month")
        }
    }

    fun setPeriod(period: String) {
        if (_uiState.value.period == period) return
        _uiState.update { it.copy(period = period, customStartDate = null, customEndDate = null) }
        load(period)
    }

    fun selectOrganization(companyId: String) {
        if (companyId == selectedOrgHolder.selectedCompanyId.value) return
        selectedOrgHolder.select(companyId)
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    loading = true,
                    loadFailed = false,
                    customStartDate = null,
                    customEndDate = null,
                )
            }
            reloadCurrent()
        }
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
            val days = analyticsRepository.getSalesDays()
            _uiState.update {
                it.copy(
                    loading = false,
                    data = data,
                    loadFailed = data == null,
                    salesDays = days,
                )
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
        viewModelScope.launch {
            reloadCurrent(showLoading = false)
        }
    }

    suspend fun refreshSuspend() {
        ensureOrgs()
        reloadCurrent(showLoading = false)
    }

    private fun load(period: String, showLoading: Boolean = true) {
        viewModelScope.launch {
            if (showLoading) {
                _uiState.update { it.copy(loading = true, loadFailed = false) }
            }
            val data = analyticsRepository.getAnalytics(period)
            val days = analyticsRepository.getSalesDays()
            _uiState.update {
                it.copy(
                    loading = false,
                    data = data,
                    loadFailed = data == null,
                    salesDays = days,
                    organizations = selectedOrgHolder.organizations.value,
                    selectedCompanyId = selectedOrgHolder.selectedCompanyId.value,
                )
            }
        }
    }

    private suspend fun ensureOrgs() {
        if (selectedOrgHolder.organizations.value.isEmpty()) {
            profileRepository.getProfile()
        }
    }

    private suspend fun reloadCurrent(showLoading: Boolean = true) {
        if (showLoading) {
            _uiState.update { it.copy(loading = true, loadFailed = false) }
        }
        val s = _uiState.value
        val data = if (s.customStartDate != null && s.customEndDate != null) {
            analyticsRepository.getAnalyticsByRange(s.customStartDate, s.customEndDate)
        } else {
            analyticsRepository.getAnalytics(s.period)
        }
        val days = analyticsRepository.getSalesDays()
        _uiState.update {
            it.copy(
                loading = false,
                data = data,
                loadFailed = data == null,
                salesDays = days,
                organizations = selectedOrgHolder.organizations.value,
                selectedCompanyId = selectedOrgHolder.selectedCompanyId.value,
            )
        }
    }
}
