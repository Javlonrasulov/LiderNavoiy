package uz.distributor.crm.presentation.plan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.PlanRepository
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
    val error: String? = null,
)

@HiltViewModel
class PlanViewModel @Inject constructor(
    private val planRepository: PlanRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PlanUiState())
    val uiState: StateFlow<PlanUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val myPlan = planRepository.getMyPlan()
                val team = planRepository.getTeamPlans()

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
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message)
                }
            }
        }
    }

    private fun parseHexColor(hex: String): Long {
        val h = hex.removePrefix("#")
        return when (h.length) {
            6 -> 0xFF000000L or h.toLong(16)
            8 -> h.toLong(16)
            else -> 0xFF6366F1
        }
    }
}
