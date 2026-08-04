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
import uz.lider.client.data.remote.ApiErrorMapper
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

data class ChangePasswordUiState(
    val currentPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val isLoading: Boolean = false,
    val errorKey: String? = null,
    val success: Boolean = false,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val authRepository: AuthRepository,
    private val selectedOrgHolder: SelectedOrgHolder,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    private val _showChangePassword = MutableStateFlow(false)
    val showChangePassword: StateFlow<Boolean> = _showChangePassword.asStateFlow()

    private val _changePasswordState = MutableStateFlow(ChangePasswordUiState())
    val changePasswordState: StateFlow<ChangePasswordUiState> = _changePasswordState.asStateFlow()

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

    fun openChangePassword() {
        _changePasswordState.value = ChangePasswordUiState()
        _showChangePassword.value = true
    }

    fun closeChangePassword() {
        _showChangePassword.value = false
        _changePasswordState.value = ChangePasswordUiState()
    }

    fun onCurrentPasswordChange(value: String) =
        _changePasswordState.update { it.copy(currentPassword = value, errorKey = null) }

    fun onNewPasswordChange(value: String) =
        _changePasswordState.update { it.copy(newPassword = value, errorKey = null) }

    fun onConfirmPasswordChange(value: String) =
        _changePasswordState.update { it.copy(confirmPassword = value, errorKey = null) }

    fun submitChangePassword() {
        val state = _changePasswordState.value
        when {
            state.currentPassword.isBlank() -> {
                _changePasswordState.update {
                    it.copy(errorKey = ApiErrorMapper.CURRENT_PASSWORD_REQUIRED)
                }
            }
            state.newPassword.length < 6 -> {
                _changePasswordState.update {
                    it.copy(errorKey = ApiErrorMapper.PASSWORD_TOO_SHORT)
                }
            }
            state.newPassword != state.confirmPassword -> {
                _changePasswordState.update {
                    it.copy(errorKey = ApiErrorMapper.PASSWORD_MISMATCH)
                }
            }
            else -> viewModelScope.launch {
                _changePasswordState.update { it.copy(isLoading = true, errorKey = null) }
                val result = authRepository.changePassword(state.currentPassword, state.newPassword)
                result.fold(
                    onSuccess = {
                        _changePasswordState.update { ChangePasswordUiState(success = true) }
                    },
                    onFailure = { e ->
                        _changePasswordState.update {
                            it.copy(
                                isLoading = false,
                                errorKey = e.message ?: ApiErrorMapper.SAVE_FAILED,
                            )
                        }
                    },
                )
            }
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
