package uz.distributor.crm.presentation.delivery

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.data.repository.DeliveryRepository
import javax.inject.Inject

data class DeliveryOrdersUiState(
    val isLoading: Boolean = true,
    val orders: List<OrderDto> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class DeliveryOrdersViewModel @Inject constructor(
    private val repository: DeliveryRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DeliveryOrdersUiState())
    val uiState: StateFlow<DeliveryOrdersUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val orders = repository.getAssignedOrders()
                    .sortedByDescending { it.updatedAt ?: it.createdAt }
                _uiState.update { it.copy(isLoading = false, orders = orders) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = ApiErrorMapper.toKey(e))
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
