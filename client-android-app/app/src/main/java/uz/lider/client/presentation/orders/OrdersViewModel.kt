package uz.lider.client.presentation.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import uz.lider.client.data.local.SelectedOrgHolder
import uz.lider.client.data.repository.OrderRepository
import uz.lider.client.data.repository.ProfileRepository
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.ClientOrganization
import uz.lider.client.domain.model.OrderStatus
import uz.lider.client.presentation.dashboard.DashboardDateFilter
import uz.lider.client.presentation.dashboard.DashboardDateRange
import javax.inject.Inject

data class OrdersUiState(
    val loading: Boolean = true,
    val loadError: Boolean = false,
    val orders: List<ClientOrder> = emptyList(),
    val visibleOrders: List<ClientOrder> = emptyList(),
    val search: String = "",
    val statusFilter: String = "all",
    val dateRange: DashboardDateRange? = null,
    val showCalendar: Boolean = false,
    val organizations: List<ClientOrganization> = emptyList(),
    val selectedCompanyId: String? = null,
)

@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val selectedOrgHolder: SelectedOrgHolder,
    private val profileRepository: ProfileRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrdersUiState())
    val uiState: StateFlow<OrdersUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                selectedOrgHolder.organizations,
                selectedOrgHolder.selectedCompanyId,
            ) { orgs, selected -> orgs to selected }
                .collect { (orgs, selected) ->
                    _uiState.update {
                        it.copy(organizations = orgs, selectedCompanyId = selected)
                    }
                }
        }
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, loadError = false) }
            try {
                withTimeout(25_000) {
                    ensureOrgs()
                    reloadQuiet()
                }
            } catch (_: Exception) {
                _uiState.update { it.copy(loadError = true) }
            } finally {
                _uiState.update { it.copy(loading = false) }
            }
        }
    }

    suspend fun refresh() {
        try {
            withTimeout(45_000) {
                ensureOrgs()
                reloadQuiet()
            }
        } catch (_: Exception) {
            _uiState.update { it.copy(loadError = true) }
        }
    }

    fun selectOrganization(companyId: String) {
        if (companyId == selectedOrgHolder.selectedCompanyId.value) return
        selectedOrgHolder.select(companyId)
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, loadError = false) }
            try {
                withTimeout(25_000) { reloadQuiet() }
            } catch (_: Exception) {
                _uiState.update { it.copy(loadError = true) }
            } finally {
                _uiState.update { it.copy(loading = false) }
            }
        }
    }

    private suspend fun ensureOrgs() {
        if (selectedOrgHolder.organizations.value.isEmpty()) {
            runCatching { profileRepository.getProfileStrict() }
        }
    }

    private suspend fun reloadQuiet() {
        val orders = orderRepository.getOrdersForSelectedOrgStrict()
        _uiState.update {
            it.copy(
                orders = orders,
                loadError = false,
                organizations = selectedOrgHolder.organizations.value,
                selectedCompanyId = selectedOrgHolder.selectedCompanyId.value,
            ).withVisibleOrders()
        }
    }

    fun onSearchChange(value: String) {
        _uiState.update { it.copy(search = value).withVisibleOrders() }
    }

    fun onStatusFilterChange(filter: String) {
        _uiState.update { it.copy(statusFilter = filter).withVisibleOrders() }
    }

    fun onShowCalendar() {
        _uiState.update { it.copy(showCalendar = true) }
    }

    fun onDismissCalendar() {
        _uiState.update { it.copy(showCalendar = false) }
    }

    fun onDateRangeApply(startMillis: Long, endMillis: Long) {
        val start = DashboardDateFilter.fromMillis(startMillis)
        val end = DashboardDateFilter.fromMillis(endMillis)
        val range = DashboardDateFilter.normalizeRange(start, end)
        _uiState.update { it.copy(dateRange = range, showCalendar = false).withVisibleOrders() }
    }

    fun onDateRangeClear() {
        _uiState.update { it.copy(dateRange = null, showCalendar = false).withVisibleOrders() }
    }

    private fun OrdersUiState.withVisibleOrders(): OrdersUiState {
        val query = search.trim().lowercase()
        val rangeFiltered = if (dateRange != null) {
            DashboardDateFilter.filterOrders(orders, dateRange)
        } else {
            orders
        }
        val visible = rangeFiltered.filter { order ->
            val matchStatus = OrderStatus.matchesFilter(order.status, statusFilter)
            if (!matchStatus) return@filter false
            if (query.isEmpty()) return@filter true
            val productNames = order.items.joinToString(" ") { it.productName }.lowercase()
            order.id.lowercase().contains(query) || productNames.contains(query)
        }
        return copy(visibleOrders = visible)
    }
}
