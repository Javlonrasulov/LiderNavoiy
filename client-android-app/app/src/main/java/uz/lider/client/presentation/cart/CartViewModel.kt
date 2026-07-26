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
import uz.lider.client.data.remote.ApiErrorMapper
import uz.lider.client.data.repository.CartRepository
import uz.lider.client.data.repository.OrderRepository
import uz.lider.client.data.repository.ProfileRepository
import uz.lider.client.domain.model.CartItem
import javax.inject.Inject

enum class PaymentType { CASH, CARD, TRANSFER, CREDIT }

data class CartUiState(
    val address: String = "",
    val note: String = "",
    val paymentType: PaymentType = PaymentType.CASH,
    val checkingOut: Boolean = false,
    val checkoutSuccess: Boolean = false,
    val errorKey: String? = null,
)

@HiltViewModel
class CartViewModel @Inject constructor(
    private val cartRepository: CartRepository,
    private val orderRepository: OrderRepository,
    private val profileRepository: ProfileRepository,
) : ViewModel() {

    val items: StateFlow<List<CartItem>> = cartRepository.items
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _uiState = MutableStateFlow(CartUiState())
    val uiState: StateFlow<CartUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val profile = profileRepository.getProfile()
            // Faqat klient qo'shilganda saqlangan manzil — joriy telefon GPS ishlatilmaydi.
            val registered = profile?.registeredDeliveryAddress().orEmpty()
            _uiState.update { it.copy(address = registered) }
        }
    }

    fun updateQty(productId: String, qty: Double) = cartRepository.updateQty(productId, qty)
    fun removeItem(productId: String) = cartRepository.removeItem(productId)
    fun onNoteChange(value: String) = _uiState.update { it.copy(note = value, errorKey = null) }
    fun onPaymentTypeChange(type: PaymentType) = _uiState.update { it.copy(paymentType = type, errorKey = null) }
    fun clearError() = _uiState.update { it.copy(errorKey = null) }

    fun total(): Double = cartRepository.totalAmount()

    fun checkout(onSuccess: () -> Unit) {
        if (_uiState.value.checkingOut) return
        val cartItems = cartRepository.items.value
        if (cartItems.isEmpty()) {
            _uiState.update { it.copy(errorKey = "cart_empty") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(checkingOut = true, errorKey = null, checkoutSuccess = false) }
            // Agent biriktirilmagan klient — server ham rad etadi; aniq xabar beramiz.
            val profile = profileRepository.getProfile()
            if (profile?.hasAssignedAgent == false) {
                _uiState.update {
                    it.copy(checkingOut = false, errorKey = ApiErrorMapper.NO_AGENT)
                }
                return@launch
            }
            val result = orderRepository.createOrder(cartItems)
            if (result.isSuccess) {
                cartRepository.clear()
                _uiState.update { it.copy(checkingOut = false, checkoutSuccess = true) }
                onSuccess()
            } else {
                val key = result.exceptionOrNull()?.message ?: ApiErrorMapper.SAVE_FAILED
                _uiState.update { it.copy(checkingOut = false, checkoutSuccess = false, errorKey = key) }
            }
        }
    }
}
