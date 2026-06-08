package uz.lider.client.presentation.orders

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
import uz.lider.client.domain.model.OrderStatus
import javax.inject.Inject

data class OrdersUiState(
    val loading: Boolean = true,
    val orders: List<ClientOrder> = emptyList(),
    val search: String = "",
    val statusFilter: String = "all",
)

@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrdersUiState())
    val uiState: StateFlow<OrdersUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            val orders = orderRepository.getOrders()
            _uiState.update { it.copy(loading = false, orders = orders) }
        }
    }

    fun onSearchChange(value: String) = _uiState.update { it.copy(search = value) }
    fun onStatusFilterChange(filter: String) = _uiState.update { it.copy(statusFilter = filter) }

    fun filteredOrders(): List<ClientOrder> {
        val state = _uiState.value
        val query = state.search.trim().lowercase()
        return state.orders.filter { order ->
            val statusKey = when (OrderStatus.fromKey(order.status)) {
                OrderStatus.PENDING, OrderStatus.CONFIRMED -> "received"
                OrderStatus.PACKING -> "packing"
                OrderStatus.ON_WAY -> "onway"
                OrderStatus.DELIVERED -> "delivered"
                OrderStatus.CANCELLED -> "cancelled"
                else -> "received"
            }
            val matchStatus = state.statusFilter == "all" || state.statusFilter == statusKey
            val productNames = order.items.joinToString(" ") { it.productName }.lowercase()
            val matchSearch = query.isEmpty() ||
                order.id.lowercase().contains(query) ||
                productNames.contains(query)
            matchStatus && matchSearch
        }
    }
}
