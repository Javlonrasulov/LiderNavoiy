package uz.distributor.crm.presentation.order

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
import uz.distributor.crm.data.repository.ClientOrderRepository
import javax.inject.Inject

data class ClientOrdersUiState(
    val isLoading: Boolean = true,
    val orders: List<OrderDto> = emptyList(),
    val sendingId: String? = null,
    val error: String? = null,
    val successMessage: String? = null,
)

@HiltViewModel
class ClientOrdersViewModel @Inject constructor(
    private val repository: ClientOrderRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClientOrdersUiState())
    val uiState: StateFlow<ClientOrdersUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val orders = repository.getPendingClientOrders()
                _uiState.update {
                    it.copy(isLoading = false, orders = orders.sortedByDescending { o -> o.createdAt })
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = ApiErrorMapper.toKey(e))
                }
            }
        }
    }

    fun sendToWarehouse(orderId: String) {
        if (_uiState.value.sendingId != null) return
        viewModelScope.launch {
            _uiState.update { it.copy(sendingId = orderId, error = null, successMessage = null) }
            try {
                repository.sendToWarehouse(orderId)
                _uiState.update { state ->
                    state.copy(
                        sendingId = null,
                        orders = state.orders.filter { it.id != orderId },
                        successMessage = "sent",
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(sendingId = null, error = ApiErrorMapper.toKey(e))
                }
            }
        }
    }

    fun rejectOrder(orderId: String) {
        if (_uiState.value.sendingId != null) return
        viewModelScope.launch {
            _uiState.update { it.copy(sendingId = orderId, error = null, successMessage = null) }
            try {
                repository.rejectOrder(orderId)
                _uiState.update { state ->
                    state.copy(
                        sendingId = null,
                        orders = state.orders.filter { it.id != orderId },
                        successMessage = "rejected",
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(sendingId = null, error = ApiErrorMapper.toKey(e))
                }
            }
        }
    }

    fun clearFeedback() {
        _uiState.update { it.copy(successMessage = null, error = null) }
    }
}
