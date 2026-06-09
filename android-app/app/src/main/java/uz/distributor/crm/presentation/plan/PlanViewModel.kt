package uz.distributor.crm.presentation.plan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.dto.SalesPeriodStatsDto
import uz.distributor.crm.data.repository.PlanRepository
import java.time.format.DateTimeFormatter
import javax.inject.Inject

data class PlanUiState(
    val isLoading: Boolean = true,
    val myDistributorId: String? = null,
    val categories: List<PlanCategory> = emptyList(),
    val totalPlan: Long = 0,
    val totalDone: Long = 0,
    val totalPct: Int = 0,
    val agents: List<PlanAgent> = emptyList(),
    val hasPlan: Boolean = false,
    val dayStats: SalesPeriodChart = SalesPeriodChart(),
    val weekStats: SalesPeriodChart = SalesPeriodChart(),
    val monthStats: SalesPeriodChart = SalesPeriodChart(),
    val customStats: SalesPeriodChart = SalesPeriodChart(),
    val statsPeriod: StatsPeriod = StatsPeriod.MONTH,
    val dateRange: PlanDateRange? = null,
    val error: String? = null,
)

@HiltViewModel
class PlanViewModel @Inject constructor(
    private val planRepository: PlanRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PlanUiState())
    val uiState: StateFlow<PlanUiState> = _uiState.asStateFlow()

    private val apiDateFmt = DateTimeFormatter.ISO_LOCAL_DATE

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val myPlan = runCatching { planRepository.getMyPlan() }.getOrNull()
                val team = runCatching { planRepository.getTeamPlans() }.getOrDefault(emptyList())
                val salesStats = runCatching { planRepository.getSalesStats() }.getOrNull()

                val categories = myPlan?.categories.orEmpty().map { c ->
                    PlanCategory(
                        id = c.key,
                        labelLatin = c.name,
                        labelCyrillic = c.name,
                        labelRussian = c.name,
                        color = parseHexColor(c.color),
                        plan = c.plan.toLong(),
                        done = c.done.toLong(),
                    )
                }

                val agents = team.map { p ->
                    PlanAgent(
                        distributorId = p.distributorId,
                        name = p.agentName,
                        plan = p.totalPlan.toLong(),
                        done = p.totalDone.toLong(),
                        categoryPcts = p.categories.map { it.name to it.pct },
                    )
                }

                val totalPlan = myPlan?.totalPlan?.toLong() ?: 0L
                val totalDone = myPlan?.totalDone?.toLong() ?: 0L

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        myDistributorId = myPlan?.distributorId,
                        categories = categories,
                        totalPlan = totalPlan,
                        totalDone = totalDone,
                        totalPct = myPlan?.donePct ?: planPct(totalDone, totalPlan),
                        agents = agents.sortedByDescending { a -> planPct(a.done, a.plan) },
                        hasPlan = myPlan != null,
                        dayStats = mapPeriod(salesStats?.day),
                        weekStats = mapPeriod(salesStats?.week),
                        monthStats = mapPeriod(salesStats?.month),
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message)
                }
            }
        }
    }

    fun setStatsPeriod(period: StatsPeriod) {
        _uiState.update {
            it.copy(statsPeriod = period, dateRange = null, customStats = SalesPeriodChart())
        }
    }

    fun onCalendarPreset(preset: PlanDatePreset) {
        if (preset == PlanDatePreset.ALL) {
            clearDateRange()
            return
        }
        if (preset == PlanDatePreset.CUSTOM) return

        val period = when (preset) {
            PlanDatePreset.TODAY -> StatsPeriod.DAY
            PlanDatePreset.WEEK -> StatsPeriod.WEEK
            PlanDatePreset.MONTH -> StatsPeriod.MONTH
            else -> StatsPeriod.MONTH
        }
        val range = when (preset) {
            PlanDatePreset.TODAY -> PlanDateFilter.todayRange()
            PlanDatePreset.WEEK -> PlanDateFilter.thisWeekRange()
            PlanDatePreset.MONTH -> PlanDateFilter.thisMonthRange()
            else -> null
        }
        _uiState.update {
            it.copy(
                statsPeriod = period,
                dateRange = range,
                customStats = SalesPeriodChart(),
            )
        }
    }

    fun applyDateRange(startMillis: Long, endMillis: Long) {
        val start = PlanDateFilter.fromMillis(startMillis)
        val end = PlanDateFilter.fromMillis(endMillis)
        val range = PlanDateFilter.normalizeRange(start, end)
        _uiState.update {
            it.copy(
                statsPeriod = StatsPeriod.CUSTOM,
                dateRange = range,
            )
        }
        loadCustomStats(range)
    }

    fun clearDateRange() {
        _uiState.update {
            it.copy(
                statsPeriod = StatsPeriod.MONTH,
                dateRange = null,
                customStats = SalesPeriodChart(),
            )
        }
        load()
    }

    private fun loadCustomStats(range: PlanDateRange) {
        viewModelScope.launch {
            val from = range.start.format(apiDateFmt)
            val to = range.end.format(apiDateFmt)
            val stats = runCatching { planRepository.getSalesStats(from, to) }.getOrNull()
            _uiState.update {
                it.copy(customStats = mapPeriod(stats?.custom))
            }
        }
    }

    private fun mapPeriod(dto: SalesPeriodStatsDto?) = SalesPeriodChart(
        points = dto?.points.orEmpty().map { ChartPoint(it.label, it.sales.toLong()) },
        total = dto?.total?.toLong() ?: 0L,
    )

    private fun parseHexColor(hex: String): Long {
        val h = hex.removePrefix("#")
        return when (h.length) {
            6 -> 0xFF000000L or h.toLong(16)
            8 -> h.toLong(16)
            else -> 0xFF6366F1
        }
    }
}
