package uz.distributor.crm.presentation.order

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.repository.CartRepository
import uz.distributor.crm.domain.model.CartItem
import javax.inject.Inject

data class OrderUiState(
    val items: List<CartItem> = emptyList(),
    val total: Double = 0.0,
    val isSubmitting: Boolean = false,
    val submitted: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class OrderViewModel @Inject constructor(
    private val cartRepository: CartRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrderUiState())
    val uiState = _uiState.asStateFlow()

    init { loadCart() }

    fun loadCart() {
        viewModelScope.launch {
            val items = cartRepository.getCart()
            _uiState.update { it.copy(items = items, total = cartRepository.getTotal()) }
        }
    }

    fun submit(clientId: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            val result = cartRepository.submitOrder(clientId)
            result.fold(
                onSuccess = {
                    _uiState.update { it.copy(isSubmitting = false, submitted = true) }
                    onSuccess()
                },
                onFailure = { e ->
                    _uiState.update { it.copy(isSubmitting = false, error = ApiErrorMapper.toKey(e)) }
                },
            )
        }
    }
}
