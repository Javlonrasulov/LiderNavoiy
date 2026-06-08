package uz.lider.client.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.ProfileRepository
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.DashboardData
import javax.inject.Inject

data class DashboardUiState(
    val loading: Boolean = true,
    val data: DashboardData? = null,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            val data = profileRepository.getDashboardData()
            _uiState.update { it.copy(loading = false, data = data) }
        }
    }

    fun recentOrders(): List<ClientOrder> = _uiState.value.data?.recentOrders.orEmpty()
}
