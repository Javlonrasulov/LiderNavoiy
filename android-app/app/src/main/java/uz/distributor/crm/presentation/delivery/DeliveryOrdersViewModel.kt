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
    val isReordering: Boolean = false,
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
                val orders = sortDeliveryOrders(repository.getAssignedOrders())
                _uiState.update { it.copy(isLoading = false, orders = orders) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = ApiErrorMapper.toKey(e))
                }
            }
        }
    }

    /** Drag paytida LazyColumn indekslari bo‘yicha lokal tartib. */
    fun onWayDragMove(fromListIndex: Int, toListIndex: Int) {
        if (fromListIndex == toListIndex) return
        val current = _uiState.value.orders.toMutableList()
        if (fromListIndex !in current.indices || toListIndex !in current.indices) return
        val moving = current[fromListIndex]
        val target = current[toListIndex]
        if (moving.status != "on_way" || target.status != "on_way") return

        current.removeAt(fromListIndex)
        current.add(toListIndex, moving)

        val onWay = current.filter { it.status == "on_way" }
            .mapIndexed { i, o -> o.copy(deliverySequence = i + 1) }
        val rest = current.filter { it.status != "on_way" }
        _uiState.update { it.copy(orders = onWay + rest) }
    }

    /** Drag tugagach API ga saqlash. */
    fun persistCurrentOnWayOrder() {
        val ids = _uiState.value.orders.filter { it.status == "on_way" }.map { it.id }
        if (ids.isEmpty()) return
        persistOrder(ids)
    }

    private fun persistOrder(orderIds: List<String>) {
        viewModelScope.launch {
            _uiState.update { it.copy(isReordering = true, error = null) }
            try {
                val orders = sortDeliveryOrders(repository.reorderOnWay(orderIds))
                _uiState.update { it.copy(isReordering = false, orders = orders) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isReordering = false, error = ApiErrorMapper.toKey(e))
                }
                load()
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun sortDeliveryOrders(orders: List<OrderDto>): List<OrderDto> {
        val onWay = orders.filter { it.status == "on_way" }
            .sortedWith(
                compareBy<OrderDto> { it.deliverySequence ?: Int.MAX_VALUE }
                    .thenByDescending { it.updatedAt ?: it.createdAt },
            )
        val rest = orders.filter { it.status != "on_way" }
            .sortedByDescending { it.updatedAt ?: it.createdAt }
        return onWay + rest
    }
}
