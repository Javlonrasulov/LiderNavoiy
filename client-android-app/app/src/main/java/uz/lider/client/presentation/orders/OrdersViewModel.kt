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
    val visibleOrders: List<ClientOrder> = emptyList(),
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
            _uiState.update { it.copy(loading = false, orders = orders).withVisibleOrders() }
        }
    }

    fun onSearchChange(value: String) {
        _uiState.update { it.copy(search = value).withVisibleOrders() }
    }

    fun onStatusFilterChange(filter: String) {
        _uiState.update { it.copy(statusFilter = filter).withVisibleOrders() }
    }

    private fun OrdersUiState.withVisibleOrders(): OrdersUiState {
        val query = search.trim().lowercase()
        val visible = orders.filter { order ->
            val matchStatus = OrderStatus.matchesFilter(order.status, statusFilter)
            if (!matchStatus) return@filter false
            if (query.isEmpty()) return@filter true
            val productNames = order.items.joinToString(" ") { it.productName }.lowercase()
            order.id.lowercase().contains(query) || productNames.contains(query)
        }
        return copy(visibleOrders = visible)
    }
}
