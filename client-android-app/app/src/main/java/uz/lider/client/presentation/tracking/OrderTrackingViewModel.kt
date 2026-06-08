package uz.lider.client.presentation.tracking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.OrderRepository
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.OrderTrackingDetails
import javax.inject.Inject

data class OrderTrackingUiState(
    val loading: Boolean = true,
    val order: ClientOrder? = null,
    val tracking: OrderTrackingDetails? = null,
    val activeStep: Int = 3,
    val distance: String = "—",
)

@HiltViewModel
class OrderTrackingViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrderTrackingUiState())
    val uiState: StateFlow<OrderTrackingUiState> = _uiState.asStateFlow()
    private var pollJob: Job? = null

    fun load(orderId: String) {
        pollJob?.cancel()
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            val order = orderRepository.getOrder(orderId)
            val tracking = orderRepository.getOrderTracking(orderId)
            applyTracking(order, tracking)
            _uiState.update { it.copy(loading = false) }
        }
        pollJob = viewModelScope.launch {
            while (isActive) {
                delay(8_000)
                val tracking = orderRepository.getOrderTracking(orderId)
                val order = _uiState.value.order ?: orderRepository.getOrder(orderId)
                applyTracking(order, tracking)
            }
        }
    }

    override fun onCleared() {
        pollJob?.cancel()
        super.onCleared()
    }

    private fun applyTracking(order: ClientOrder?, tracking: OrderTrackingDetails?) {
        val status = tracking?.status ?: order?.status
        val step = when (status?.lowercase()) {
            "delivered" -> 5
            "on_way", "onway" -> 4
            "packing" -> 3
            "confirmed", "pending", "warehouse" -> 2
            else -> 3
        }
        val distance = tracking?.distanceKm?.let { formatDistance(it) } ?: "—"
        _uiState.update {
            it.copy(
                order = order,
                tracking = tracking,
                activeStep = step,
                distance = distance,
            )
        }
    }

    private fun formatDistance(km: Double): String =
        if (km < 1.0) "${(km * 1000).toInt()} m" else "$km km"
}
