package uz.lider.client.presentation.cart

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.CartRepository
import uz.lider.client.data.repository.OrderRepository
import uz.lider.client.domain.model.CartItem
import javax.inject.Inject

enum class PaymentType { CASH, CARD, TRANSFER, CREDIT }

data class CartUiState(
    val address: String = "Toshkent, Yunusobod, Amir Temur 108",
    val note: String = "",
    val paymentType: PaymentType = PaymentType.CASH,
    val checkingOut: Boolean = false,
    val checkoutSuccess: Boolean = false,
)

@HiltViewModel
class CartViewModel @Inject constructor(
    private val cartRepository: CartRepository,
    private val orderRepository: OrderRepository,
) : ViewModel() {

    val items: StateFlow<List<CartItem>> = cartRepository.items
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _uiState = MutableStateFlow(CartUiState())
    val uiState: StateFlow<CartUiState> = _uiState.asStateFlow()

    fun updateQty(productId: String, qty: Double) = cartRepository.updateQty(productId, qty)
    fun removeItem(productId: String) = cartRepository.removeItem(productId)
    fun onAddressChange(value: String) = _uiState.update { it.copy(address = value) }
    fun onNoteChange(value: String) = _uiState.update { it.copy(note = value) }
    fun onPaymentTypeChange(type: PaymentType) = _uiState.update { it.copy(paymentType = type) }

    fun total(): Double = cartRepository.totalAmount()

    fun checkout(onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(checkingOut = true) }
            val result = orderRepository.createOrder(cartRepository.items.value)
            _uiState.update { it.copy(checkingOut = false, checkoutSuccess = result.isSuccess) }
            if (result.isSuccess) {
                cartRepository.clear()
                onSuccess()
            }
        }
    }
}
