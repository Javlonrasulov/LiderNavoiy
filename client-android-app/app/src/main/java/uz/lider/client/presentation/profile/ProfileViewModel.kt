package uz.lider.client.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.AuthRepository
import uz.lider.client.data.repository.ProfileRepository
import uz.lider.client.domain.model.ClientProfile
import javax.inject.Inject

data class BranchInfo(val name: String, val address: String, val phone: String)

data class ProfileUiState(
    val loading: Boolean = true,
    val profile: ClientProfile? = null,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            val profile = profileRepository.getProfile()
            _uiState.update { it.copy(loading = false, profile = profile) }
        }
    }

    suspend fun logout() = authRepository.logout()
}
