package uz.distributor.crm.presentation.vansales

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.remote.dto.VanClientDto
import uz.distributor.crm.data.remote.dto.VanLoadDto
import uz.distributor.crm.data.repository.VanSalesRepository
import javax.inject.Inject

data class VanSalesUiState(
    val isLoading: Boolean = true,
    val loads: List<VanLoadDto> = emptyList(),
    val clients: List<VanClientDto> = emptyList(),
    val pendingOffline: Int = 0,
    val error: String? = null,
    val message: String? = null,
    val isSubmittingReturn: Boolean = false,
)

@HiltViewModel
class VanSalesViewModel @Inject constructor(
    private val repository: VanSalesRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(VanSalesUiState())
    val uiState: StateFlow<VanSalesUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                repository.syncPending()
                val loads = repository.getStock()
                val clients = repository.getClients()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        loads = loads,
                        clients = clients,
                        pendingOffline = repository.pendingCount(),
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = ApiErrorMapper.toKey(e),
                        pendingOffline = repository.pendingCount(),
                    )
                }
            }
        }
    }

    fun clearMessage() {
        _uiState.update { it.copy(error = null, message = null) }
    }

    fun submitReturn(loadId: String, submittedCash: Double?) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmittingReturn = true, error = null) }
            try {
                repository.submitReturn(loadId, submittedCash)
                _uiState.update {
                    it.copy(isSubmittingReturn = false, message = "return_ok")
                }
                refresh()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSubmittingReturn = false, error = ApiErrorMapper.toKey(e))
                }
            }
        }
    }
}
