package uz.lider.client.presentation.profile

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
import uz.lider.client.data.repository.AuthRepository
import uz.lider.client.data.repository.ProfileRepository
import uz.lider.client.domain.model.ClientOrganization
import uz.lider.client.domain.model.ClientProfile
import javax.inject.Inject

data class ProfileUiState(
    val loading: Boolean = true,
    val profile: ClientProfile? = null,
    val organizations: List<ClientOrganization> = emptyList(),
    val selectedCompanyId: String? = null,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val authRepository: AuthRepository,
    private val selectedOrgHolder: SelectedOrgHolder,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

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

    fun selectOrganization(companyId: String) {
        if (companyId == selectedOrgHolder.selectedCompanyId.value) return
        selectedOrgHolder.select(companyId)
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            reloadQuiet()
            _uiState.update { it.copy(loading = false) }
        }
    }

    private suspend fun reloadQuiet() {
        val profile = profileRepository.getProfile()
        _uiState.update {
            it.copy(
                profile = profile,
                organizations = selectedOrgHolder.organizations.value
                    .ifEmpty { profile?.organizations.orEmpty() },
                selectedCompanyId = selectedOrgHolder.selectedCompanyId.value,
            )
        }
    }

    suspend fun logout() = authRepository.logout()
}
