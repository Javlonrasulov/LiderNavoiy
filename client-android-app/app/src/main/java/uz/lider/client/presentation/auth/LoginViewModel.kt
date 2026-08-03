package uz.lider.client.presentation.auth

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import uz.lider.client.data.remote.ApiErrorMapper
import uz.lider.client.data.repository.AppSettingsRepository
import uz.lider.client.data.repository.AuthRepository
import uz.lider.client.data.repository.PushRepository
import uz.lider.client.localization.AppLanguage
import uz.lider.client.security.DeviceIntegrity
import javax.inject.Inject

data class LoginUiState(
    val username: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val errorKey: String? = null,
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val authRepository: AuthRepository,
    private val appSettingsRepository: AppSettingsRepository,
    private val pushRepository: PushRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState = _uiState.asStateFlow()

    fun onUsernameChange(value: String) =
        _uiState.update { it.copy(username = value, errorKey = null) }

    fun onPasswordChange(value: String) =
        _uiState.update { it.copy(password = value, errorKey = null) }

    fun setLanguage(language: AppLanguage) {
        viewModelScope.launch { appSettingsRepository.setLanguage(language) }
    }

    fun login() {
        val username = _uiState.value.username.trim()
        val password = _uiState.value.password
        if (username.isBlank() || password.isBlank()) {
            _uiState.update { it.copy(errorKey = ApiErrorMapper.CREDENTIALS_REQUIRED) }
            return
        }

        if (DeviceIntegrity.isCompromised(appContext)) {
            _uiState.update { it.copy(errorKey = ApiErrorMapper.DEVICE_COMPROMISED) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorKey = null) }
            try {
                withTimeout(90_000) {
                    authRepository.login(username, password)
                }
                _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                runCatching { pushRepository.registerCurrentToken() }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorKey = ApiErrorMapper.toKey(e))
                }
            }
        }
    }
}
