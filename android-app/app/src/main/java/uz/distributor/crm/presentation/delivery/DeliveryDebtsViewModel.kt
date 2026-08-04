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
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import javax.inject.Inject

data class DeliveryDebtsUiState(
    val isLoading: Boolean = true,
    val debts: List<OrderDto> = emptyList(),
    val selectedDate: LocalDate = LocalDate.now(),
    val showAllDates: Boolean = false,
    val searchQuery: String = "",
    val error: String? = null,
) {
    val countsByDate: Map<LocalDate, Int>
        get() {
            val map = mutableMapOf<LocalDate, Int>()
            for (o in debts) {
                val d = debtDate(o) ?: continue
                map[d] = (map[d] ?: 0) + 1
            }
            return map
        }

    val selectedDebts: List<OrderDto>
        get() {
            val byDate = if (showAllDates) {
                debts
            } else {
                debts.filter { debtDate(it) == selectedDate }
            }
            val q = searchQuery.trim().lowercase()
            val filtered = if (q.isEmpty()) {
                byDate
            } else {
                byDate.filter { order ->
                    listOfNotNull(
                        order.clientName,
                        order.clientPhone,
                        order.clientAddress,
                    ).any { it.lowercase().contains(q) }
                }
            }
            return filtered.sortedWith(
                compareByDescending<OrderDto> { it.deliveredAt ?: it.loadedAt ?: "" }
                    .thenByDescending { it.remainingBalance },
            )
        }
}

fun debtDate(order: OrderDto): LocalDate? {
    val raw = order.dueAt?.takeIf { it.isNotBlank() }
        ?: order.updatedAt?.takeIf { it.isNotBlank() }
        ?: order.createdAt
    return runCatching {
        Instant.parse(raw).atZone(ZoneId.systemDefault()).toLocalDate()
    }.recoverCatching {
        // "2026-07-29T18:00:00.000Z" variants / local without Z
        LocalDate.parse(raw.take(10))
    }.getOrNull()
}

@HiltViewModel
class DeliveryDebtsViewModel @Inject constructor(
    private val repository: DeliveryRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DeliveryDebtsUiState())
    val uiState: StateFlow<DeliveryDebtsUiState> = _uiState.asStateFlow()

    fun load(silent: Boolean = false) {
        viewModelScope.launch {
            if (!silent) {
                _uiState.update { it.copy(isLoading = true, error = null) }
            } else {
                _uiState.update { it.copy(error = null) }
            }
            try {
                val debts = repository.getAssignedOrders()
                    .filter { it.needsPaymentFollowUp }
                _uiState.update { it.copy(isLoading = false, debts = debts) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = ApiErrorMapper.toKey(e))
                }
            }
        }
    }

    fun selectDate(date: LocalDate) {
        _uiState.update { it.copy(selectedDate = date, showAllDates = false) }
    }

    fun showAllDates() {
        _uiState.update { it.copy(showAllDates = true) }
    }

    fun onSearchChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
