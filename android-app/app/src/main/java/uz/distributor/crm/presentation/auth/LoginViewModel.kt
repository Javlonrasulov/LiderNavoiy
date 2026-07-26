package uz.distributor.crm.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.location.DeviceLocationProvider
import uz.distributor.crm.data.location.LocationAccessState
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.repository.AppSettingsRepository
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.MessagesRealtimeCoordinator
import uz.distributor.crm.data.repository.PushRepository
import uz.distributor.crm.localization.AppLanguage
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
    private val authRepository: AuthRepository,
    private val pushRepository: PushRepository,
    private val appSettingsRepository: AppSettingsRepository,
    private val messagesRealtime: MessagesRealtimeCoordinator,
    private val deviceLocationProvider: DeviceLocationProvider,
) : ViewModel() {

    fun setLanguage(language: AppLanguage) {
        viewModelScope.launch { appSettingsRepository.setLanguage(language) }
    }

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState = _uiState.asStateFlow()

    fun resetForm() = _uiState.update { LoginUiState() }

    fun onUsernameChange(v: String) = _uiState.update { it.copy(username = v, errorKey = null) }
    fun onPasswordChange(v: String) = _uiState.update { it.copy(password = v, errorKey = null) }

    fun locationErrorKey(): String? = when (deviceLocationProvider.locationAccessState()) {
        LocationAccessState.PERMISSION_DENIED -> "location_permission_denied"
        LocationAccessState.GPS_DISABLED -> "gps_disabled"
        LocationAccessState.READY -> null
    }

    fun isLocationReady(): Boolean = deviceLocationProvider.isReadyForTracking()

    fun setLocationError() {
        _uiState.update {
            it.copy(
                errorKey = locationErrorKey() ?: "gps_disabled",
                isLoading = false,
                isSuccess = false,
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorKey = null) }
    }

    fun login() {
        val username = _uiState.value.username.trim()
        val password = _uiState.value.password
        if (username.isBlank() || password.isBlank()) {
            _uiState.update { it.copy(errorKey = "credentials_required") }
            return
        }

        locationErrorKey()?.let { key ->
            _uiState.update { it.copy(errorKey = key) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorKey = null) }
            try {
                authRepository.login(username, password)
                messagesRealtime.start()
                runCatching { pushRepository.registerCurrentToken() }
                _uiState.update { it.copy(isLoading = false, isSuccess = true) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, errorKey = ApiErrorMapper.toKey(e))
                }
            }
        }
    }
}
