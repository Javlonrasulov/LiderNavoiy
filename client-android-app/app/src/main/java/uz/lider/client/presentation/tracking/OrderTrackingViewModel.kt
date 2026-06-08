package uz.lider.client.presentation.tracking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.OrderRepository
import uz.lider.client.domain.model.ClientOrder
import javax.inject.Inject

data class OrderTrackingUiState(
    val loading: Boolean = true,
    val order: ClientOrder? = null,
    val activeStep: Int = 3,
    val eta: String = "14:30",
    val distance: String = "2.4 km",
)

@HiltViewModel
class OrderTrackingViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrderTrackingUiState())
    val uiState: StateFlow<OrderTrackingUiState> = _uiState.asStateFlow()

    fun load(orderId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            val order = orderRepository.getOrder(orderId)
            val step = when (order?.status?.lowercase()) {
                "delivered" -> 5
                "on_way", "onway" -> 4
                "packing" -> 3
                "confirmed", "pending", "warehouse" -> 2
                else -> 3
            }
            _uiState.update { it.copy(loading = false, order = order, activeStep = step) }
        }
    }
}
