package uz.distributor.crm.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.AuthRepository
import javax.inject.Inject

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
    private val authRepository: AuthRepository,
) : ViewModel() {

    val user = authRepository.getUserFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val password = authRepository.getPasswordFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    private val _showChangePassword = MutableStateFlow(false)
    val showChangePassword: StateFlow<Boolean> = _showChangePassword.asStateFlow()

    private val _changePasswordState = MutableStateFlow(ChangePasswordUiState())
    val changePasswordState: StateFlow<ChangePasswordUiState> = _changePasswordState.asStateFlow()

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
                _changePasswordState.update { it.copy(errorKey = "current_password_required") }
            }
            state.newPassword.length < 6 -> {
                _changePasswordState.update { it.copy(errorKey = "password_too_short") }
            }
            state.newPassword != state.confirmPassword -> {
                _changePasswordState.update { it.copy(errorKey = "password_mismatch") }
            }
            else -> viewModelScope.launch {
                _changePasswordState.update { it.copy(isLoading = true, errorKey = null) }
                val result = authRepository.changePassword(state.currentPassword, state.newPassword)
                result.fold(
                    onSuccess = {
                        _changePasswordState.update {
                            ChangePasswordUiState(success = true)
                        }
                    },
                    onFailure = { e ->
                        _changePasswordState.update {
                            it.copy(
                                isLoading = false,
                                errorKey = e.message ?: "save_failed",
                            )
                        }
                    },
                )
            }
        }
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            onDone()
        }
    }
}
