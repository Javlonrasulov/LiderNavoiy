package uz.lider.client.data.local

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import uz.lider.client.domain.model.ClientOrganization
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SelectedOrgHolder @Inject constructor() {
    private val selectedId = MutableStateFlow<String?>(null)
    private val orgsFlow = MutableStateFlow<List<ClientOrganization>>(emptyList())

    val selectedCompanyId: StateFlow<String?> = selectedId.asStateFlow()
    val organizations: StateFlow<List<ClientOrganization>> = orgsFlow.asStateFlow()

    fun setOrganizations(orgs: List<ClientOrganization>) {
        orgsFlow.value = orgs
        val current = selectedId.value
        if (current == null || orgs.none { it.companyId == current }) {
            selectedId.value = orgs.firstOrNull()?.companyId
        }
    }

    fun select(companyId: String?) {
        selectedId.value = companyId
    }

    suspend fun getSelectedCompanyId(): String? {
        return selectedId.value ?: orgsFlow.value.firstOrNull()?.companyId
    }

    fun clear() {
        selectedId.value = null
        orgsFlow.value = emptyList()
    }
}
