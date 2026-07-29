package uz.distributor.crm.presentation.delivery

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import android.net.Uri
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.data.remote.dto.OrderItemDto
import uz.distributor.crm.data.remote.dto.PaymentTerminalDto
import uz.distributor.crm.data.repository.DeliveryRepository
import javax.inject.Inject

data class DeliveryOrderDetailUiState(
    val isLoading: Boolean = true,
    val order: OrderDto? = null,
    val terminals: List<PaymentTerminalDto> = emptyList(),
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val doneAndLeave: Boolean = false,
)

@HiltViewModel
class DeliveryOrderDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: DeliveryRepository,
) : ViewModel() {

    private val orderId: String = savedStateHandle["orderId"] ?: ""

    private val _uiState = MutableStateFlow(DeliveryOrderDetailUiState())
    val uiState: StateFlow<DeliveryOrderDetailUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val order = repository.getOrder(orderId)
                val terminals = runCatching { repository.getMyTerminals() }.getOrDefault(emptyList())
                _uiState.update {
                    it.copy(isLoading = false, order = order, terminals = terminals)
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Error")
                }
            }
        }
    }

    fun clearMessages() {
        _uiState.update { it.copy(error = null, successMessage = null) }
    }

    fun deliver(
        paymentMethod: String,
        terminalId: String?,
        amount: Double?,
        dueAt: String?,
        photoUri: Uri?,
        onSuccessLeave: Boolean = true,
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }
            try {
                val order = repository.deliver(
                    orderId = orderId,
                    paymentMethod = paymentMethod,
                    terminalId = terminalId,
                    amount = amount,
                    dueAt = dueAt,
                    photoUri = photoUri,
                )
                val leave = onSuccessLeave && !order.needsPaymentFollowUp
                _uiState.update {
                    it.copy(
                        isSubmitting = false,
                        order = order,
                        successMessage = "ok",
                        doneAndLeave = leave,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSubmitting = false, error = e.message ?: "Error")
                }
            }
        }
    }

    fun collectPayment(
        paymentMethod: String,
        terminalId: String?,
        amount: Double,
        dueAt: String?,
        photoUri: Uri?,
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }
            try {
                val order = repository.collectPayment(
                    orderId = orderId,
                    paymentMethod = paymentMethod,
                    terminalId = terminalId,
                    amount = amount,
                    dueAt = dueAt,
                    photoUri = photoUri,
                )
                _uiState.update {
                    it.copy(
                        isSubmitting = false,
                        order = order,
                        successMessage = "ok",
                        doneAndLeave = !order.needsPaymentFollowUp,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSubmitting = false, error = e.message ?: "Error")
                }
            }
        }
    }

    fun updateDueAt(dueAt: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }
            try {
                val order = repository.updateDueAt(orderId, dueAt)
                _uiState.update {
                    it.copy(isSubmitting = false, order = order, successMessage = "due")
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSubmitting = false, error = e.message ?: "Error")
                }
            }
        }
    }

    fun createReturn(items: List<OrderItemDto>, note: String?) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }
            try {
                repository.createReturn(orderId, items, note)
                _uiState.update {
                    it.copy(isSubmitting = false, successMessage = "return")
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSubmitting = false, error = e.message ?: "Error")
                }
            }
        }
    }
}
