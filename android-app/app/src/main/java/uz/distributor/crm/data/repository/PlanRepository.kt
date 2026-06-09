package uz.distributor.crm.data.repository

import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.AgentPlanDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PlanRepository @Inject constructor(private val api: ApiService) {
    suspend fun getMyPlan(): AgentPlanDto? = api.getMyPlan()
    suspend fun getTeamPlans(): List<AgentPlanDto> = api.getTeamPlans()
}
