package uz.distributor.crm.presentation.order

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.remote.dto.OrderDto
import uz.distributor.crm.data.repository.AppSettingsRepository
import uz.distributor.crm.data.repository.CartRepository
import uz.distributor.crm.data.repository.ClientRepository
import uz.distributor.crm.data.repository.ProductRepository
import uz.distributor.crm.domain.model.CartItem
import javax.inject.Inject

enum class OrderSummaryTab { CURRENT, SENT }

data class SentOrderUi(
    val id: String,
    val clientId: String,
    val clientCode: String,
    val clientName: String,
    val total: Double,
    val createdAt: String,
    val timeLabel: String,
    val items: List<CartItem>,
    val productBrands: Map<String, String> = emptyMap(),
)

data class OrderUiState(
    val tab: OrderSummaryTab = OrderSummaryTab.CURRENT,
    val clientId: String = "",
    val clientCode: String = "",
    val clientName: String = "",
    val items: List<CartItem> = emptyList(),
    val productBrands: Map<String, String> = emptyMap(),
    val total: Double = 0.0,
    val clientExpanded: Boolean = true,
    val expandedItems: Set<String> = emptySet(),
    val sentOrders: List<SentOrderUi> = emptyList(),
    val expandedSentOrders: Set<String> = emptySet(),
    val isLoadingSent: Boolean = false,
    val isSubmitting: Boolean = false,
    val submitted: Boolean = false,
    val editingClientOrderId: String? = null,
    val error: String? = null,
)

@HiltViewModel
class OrderViewModel @Inject constructor(
    private val cartRepository: CartRepository,
    private val clientRepository: ClientRepository,
    private val productRepository: ProductRepository,
    private val appSettingsRepository: AppSettingsRepository,
    private val api: uz.distributor.crm.data.remote.ApiService,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrderUiState())
    val uiState = _uiState.asStateFlow()

    fun init(clientId: String) {
        viewModelScope.launch {
            val resolvedId = clientId.ifBlank { appSettingsRepository.getActiveClientId().orEmpty() }
            val client = resolvedId.takeIf { it.isNotBlank() }?.let { clientRepository.getClient(it) }
            val editingOrderId = appSettingsRepository.getEditingClientOrderId()
            _uiState.update {
                it.copy(
                    clientId = resolvedId,
                    clientCode = client?.code.orEmpty(),
                    clientName = client?.name.orEmpty(),
                    editingClientOrderId = editingOrderId,
                )
            }
            reloadCart()
            loadSentOrders()
        }
    }

    fun selectTab(tab: OrderSummaryTab) {
        _uiState.update { it.copy(tab = tab) }
        if (tab == OrderSummaryTab.SENT) loadSentOrders()
    }

    fun toggleClientExpanded() {
        _uiState.update { it.copy(clientExpanded = !it.clientExpanded) }
    }

    fun toggleItemExpanded(productId: String) {
        _uiState.update { state ->
            val next = state.expandedItems.toMutableSet()
            if (productId in next) next.remove(productId) else next.add(productId)
            state.copy(expandedItems = next)
        }
    }

    fun toggleSentOrderExpanded(orderId: String) {
        _uiState.update { state ->
            val next = state.expandedSentOrders.toMutableSet()
            if (orderId in next) next.remove(orderId) else next.add(orderId)
            state.copy(expandedSentOrders = next)
        }
    }

    fun updateQty(productId: String, qty: Double) {
        viewModelScope.launch {
            cartRepository.updateQty(productId, qty)
            reloadCart()
        }
    }

    fun removeItem(productId: String) {
        viewModelScope.launch {
            cartRepository.removeFromCart(productId)
            reloadCart()
        }
    }

    fun submit(onSuccess: () -> Unit = {}) {
        val state = _uiState.value
        val clientId = state.clientId
        if (clientId.isBlank()) return
        val editingOrderId = state.editingClientOrderId
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }
            val result = if (!editingOrderId.isNullOrBlank()) {
                cartRepository.saveCartToClientOrder(editingOrderId)
            } else {
                cartRepository.submitOrder(clientId)
            }
            result.fold(
                onSuccess = {
                    if (!editingOrderId.isNullOrBlank()) {
                        appSettingsRepository.setEditingClientOrderId(null)
                    }
                    _uiState.update {
                        it.copy(
                            items = emptyList(),
                            productBrands = emptyMap(),
                            total = 0.0,
                            isSubmitting = false,
                            submitted = true,
                            editingClientOrderId = null,
                            tab = if (editingOrderId.isNullOrBlank()) OrderSummaryTab.SENT else OrderSummaryTab.CURRENT,
                            clientExpanded = true,
                            expandedItems = emptySet(),
                        )
                    }
                    if (editingOrderId.isNullOrBlank()) {
                        loadSentOrders()
                    }
                    onSuccess()
                },
                onFailure = { e ->
                    _uiState.update {
                        it.copy(isSubmitting = false, error = ApiErrorMapper.toKey(e))
                    }
                },
            )
        }
    }

    /** Tahrirlashdan chiqish (saqlamasdan) */
    fun cancelEditIfNeeded() {
        viewModelScope.launch {
            if (!_uiState.value.editingClientOrderId.isNullOrBlank()) {
                appSettingsRepository.setEditingClientOrderId(null)
                cartRepository.clearCart()
                _uiState.update {
                    it.copy(
                        editingClientOrderId = null,
                        items = emptyList(),
                        productBrands = emptyMap(),
                        total = 0.0,
                    )
                }
            }
        }
    }

    private fun reloadCart() {
        viewModelScope.launch {
            val items = cartRepository.getCart()
            val brands = items.associate { item ->
                val brand = productRepository.getProduct(item.productId)?.brand
                    ?: item.category.orEmpty()
                item.productId to brand
            }
            _uiState.update {
                it.copy(
                    items = items,
                    productBrands = brands,
                    total = cartRepository.getTotal(),
                    expandedItems = if (items.size == 1) setOf(items.first().productId) else it.expandedItems,
                )
            }
        }
    }

    private fun loadSentOrders() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingSent = true) }
            val orders = try {
                api.getOrders().filter { isTodayInTashkent(it.createdAt) }
            } catch (_: Exception) {
                emptyList()
            }
            val sent = orders.map { order -> order.toSentOrderUi() }
            _uiState.update {
                it.copy(
                    sentOrders = sent,
                    isLoadingSent = false,
                    expandedSentOrders = if (sent.size == 1) setOf(sent.first().id) else it.expandedSentOrders,
                )
            }
        }
    }

    private suspend fun OrderDto.toSentOrderUi(): SentOrderUi {
        val client = clientRepository.getClient(clientId)
        val cartItems = items.map {
            CartItem(
                productId = it.productId,
                productCode = it.productCode,
                productName = it.productName,
                price = it.price,
                quantity = it.quantity,
                unit = it.unit,
                category = null,
            )
        }
        val brands = cartItems.associate { item ->
            val brand = productRepository.getProduct(item.productId)?.brand
                ?: item.category.orEmpty()
            item.productId to brand
        }
        return SentOrderUi(
            id = id,
            clientId = clientId,
            clientCode = client?.code.orEmpty(),
            clientName = client?.name.orEmpty(),
            total = totalAmount,
            createdAt = createdAt,
            timeLabel = formatOrderTime(createdAt),
            items = cartItems,
            productBrands = brands,
        )
    }

    private fun formatOrderTime(isoDate: String): String {
        return try {
            val tz = java.util.TimeZone.getTimeZone("Asia/Tashkent")
            val parser = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }
            val parsed = parser.parse(isoDate.substringBefore('.')) ?: return ""
            java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault()).apply {
                timeZone = tz
            }.format(parsed)
        } catch (_: Exception) {
            ""
        }
    }

    private fun isTodayInTashkent(isoDate: String): Boolean {
        return try {
            val tz = java.util.TimeZone.getTimeZone("Asia/Tashkent")
            val parser = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }
            val parsed = parser.parse(isoDate.substringBefore('.')) ?: return false
            val orderCal = java.util.Calendar.getInstance(tz).apply { time = parsed }
            val todayCal = java.util.Calendar.getInstance(tz)
            orderCal.get(java.util.Calendar.YEAR) == todayCal.get(java.util.Calendar.YEAR) &&
                orderCal.get(java.util.Calendar.DAY_OF_YEAR) == todayCal.get(java.util.Calendar.DAY_OF_YEAR)
        } catch (_: Exception) {
            false
        }
    }
}
