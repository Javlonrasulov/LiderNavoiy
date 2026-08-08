package uz.distributor.crm.presentation.vansales

import android.net.Uri
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.remote.dto.PaymentTerminalDto
import uz.distributor.crm.data.remote.dto.VanClientDto
import uz.distributor.crm.data.remote.dto.VanLoadItemDto
import uz.distributor.crm.data.remote.dto.VanSellItemRequest
import uz.distributor.crm.data.repository.VanSalesRepository
import javax.inject.Inject

data class VanCartLine(
    val productId: String,
    val name: String,
    val unit: String,
    val price: Double,
    val maxQty: Double,
    val qty: Double,
)

data class VanSaleUiState(
    val isLoading: Boolean = true,
    val client: VanClientDto? = null,
    val loadId: String? = null,
    val stockItems: List<VanLoadItemDto> = emptyList(),
    val cart: List<VanCartLine> = emptyList(),
    val terminals: List<PaymentTerminalDto> = emptyList(),
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val queuedOffline: Boolean = false,
    val done: Boolean = false,
)

@HiltViewModel
class VanClientSaleViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: VanSalesRepository,
) : ViewModel() {

    private val clientId: String = savedStateHandle["clientId"] ?: ""

    private val _uiState = MutableStateFlow(VanSaleUiState())
    val uiState: StateFlow<VanSaleUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val loads = repository.getStock()
                val active = loads.firstOrNull { it.status == "loaded" }
                val clients = repository.getClients()
                val client = clients.find { it.id == clientId }
                val terminals = runCatching { repository.getMyTerminals() }.getOrDefault(emptyList())
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        client = client,
                        loadId = active?.id,
                        stockItems = active?.items?.filter { i -> i.remainingQty > 0 } ?: emptyList(),
                        terminals = terminals,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = ApiErrorMapper.toKey(e))
                }
            }
        }
    }

    fun setQty(productId: String, qty: Double, name: String, unit: String, price: Double, max: Double) {
        _uiState.update { st ->
            val next = st.cart.toMutableList()
            val idx = next.indexOfFirst { it.productId == productId }
            val clamped = qty.coerceIn(0.0, max)
            if (clamped <= 0) {
                if (idx >= 0) next.removeAt(idx)
            } else if (idx >= 0) {
                next[idx] = next[idx].copy(qty = clamped, price = price)
            } else {
                next.add(
                    VanCartLine(
                        productId = productId,
                        name = name,
                        unit = unit,
                        price = price,
                        maxQty = max,
                        qty = clamped,
                    ),
                )
            }
            st.copy(cart = next)
        }
    }

    fun clearMessages() {
        _uiState.update { it.copy(error = null) }
    }

    fun cartTotal(): Double =
        _uiState.value.cart.sumOf { it.qty * it.price }

    fun submit(
        paymentMethod: String,
        terminalId: String?,
        amount: Double?,
        dueAt: String?,
        photoUri: Uri?,
    ) {
        val st = _uiState.value
        if (st.cart.isEmpty()) return
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }
            val items = st.cart.map {
                VanSellItemRequest(productId = it.productId, quantity = it.qty, price = it.price)
            }
            val (result, offline) = repository.sellOfflineSafe(
                clientId = clientId,
                loadId = st.loadId,
                items = items,
                paymentMethod = paymentMethod,
                terminalId = terminalId,
                amount = amount,
                dueAt = dueAt,
                photoUri = photoUri,
            )
            if (result != null || offline) {
                _uiState.update {
                    it.copy(
                        isSubmitting = false,
                        done = true,
                        queuedOffline = offline,
                        cart = emptyList(),
                    )
                }
            } else {
                _uiState.update {
                    it.copy(isSubmitting = false, error = "sell_failed")
                }
            }
        }
    }
}
