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

data class DraftOrderUi(
    val clientId: String,
    val clientCode: String,
    val clientName: String,
    val items: List<CartItem>,
    val productBrands: Map<String, String> = emptyMap(),
    val total: Double = 0.0,
)

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
    /** Edit rejimida fokuslangan klient (yoki oxirgi aktiv) */
    val clientId: String = "",
    val drafts: List<DraftOrderUi> = emptyList(),
    val expandedClients: Set<String> = emptySet(),
    val expandedItems: Set<String> = emptySet(),
    val sentOrders: List<SentOrderUi> = emptyList(),
    val expandedSentOrders: Set<String> = emptySet(),
    val isLoadingSent: Boolean = false,
    val isSubmitting: Boolean = false,
    val submitted: Boolean = false,
    val editingClientOrderId: String? = null,
    val error: String? = null,
) {
    val total: Double get() = drafts.sumOf { it.total }
    val items: List<CartItem> get() = drafts.flatMap { it.items }
    val hasDrafts: Boolean get() = drafts.isNotEmpty()
}

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
            val editingOrderId = appSettingsRepository.getEditingClientOrderId()
            _uiState.update {
                it.copy(
                    clientId = resolvedId,
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

    fun toggleClientExpanded(clientId: String) {
        _uiState.update { state ->
            val next = state.expandedClients.toMutableSet()
            if (clientId in next) next.remove(clientId) else next.add(clientId)
            state.copy(expandedClients = next)
        }
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

    fun updateQty(clientId: String, productId: String, qty: Double) {
        viewModelScope.launch {
            cartRepository.updateQty(clientId, productId, qty)
            reloadCartNow()
        }
    }

    fun removeItem(clientId: String, productId: String, promotionId: String? = null) {
        viewModelScope.launch {
            if (!promotionId.isNullOrBlank()) {
                cartRepository.removePromoReward(clientId, promotionId)
            } else {
                cartRepository.removeFromCart(clientId, productId)
            }
            reloadCartNow()
        }
    }

    fun submit(onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            val state = _uiState.value
            val editingOrderId = state.editingClientOrderId
            _uiState.update { it.copy(isSubmitting = true, error = null) }
            val result = if (!editingOrderId.isNullOrBlank()) {
                val clientId = state.clientId
                if (clientId.isBlank()) {
                    Result.failure(Exception("Klient tanlanmagan"))
                } else {
                    cartRepository.saveCartToClientOrder(editingOrderId, clientId)
                }
            } else {
                cartRepository.submitAllDrafts().map { Unit }
            }
            result.fold(
                onSuccess = {
                    if (!editingOrderId.isNullOrBlank()) {
                        appSettingsRepository.setEditingClientOrderId(null)
                    }
                    _uiState.update {
                        it.copy(
                            drafts = emptyList(),
                            isSubmitting = false,
                            submitted = true,
                            editingClientOrderId = null,
                            error = null,
                            tab = if (editingOrderId.isNullOrBlank()) OrderSummaryTab.SENT else OrderSummaryTab.CURRENT,
                            expandedClients = emptySet(),
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

    /**
     * Tahrirlashdan chiqish: o'zgarishlarni serverga saqlaydi (orqaga qaytganda ham yo'qolmasin).
     * Cart bo'sh bo'lsa — faqat edit rejimini yopadi.
     */
    fun saveEditAndExit(onDone: () -> Unit) {
        viewModelScope.launch {
            val editingId = _uiState.value.editingClientOrderId
            val clientId = _uiState.value.clientId
            if (editingId.isNullOrBlank() || clientId.isBlank()) {
                onDone()
                return@launch
            }
            _uiState.update { it.copy(isSubmitting = true, error = null) }
            val items = cartRepository.getCartForClient(clientId)
            if (items.isEmpty()) {
                appSettingsRepository.setEditingClientOrderId(null)
                _uiState.update {
                    it.copy(isSubmitting = false, editingClientOrderId = null)
                }
                onDone()
                return@launch
            }
            val result = cartRepository.saveCartToClientOrder(editingId, clientId)
            result.fold(
                onSuccess = {
                    appSettingsRepository.setEditingClientOrderId(null)
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            editingClientOrderId = null,
                            drafts = emptyList(),
                            error = null,
                        )
                    }
                    onDone()
                },
                onFailure = { e ->
                    _uiState.update {
                        it.copy(isSubmitting = false, error = ApiErrorMapper.toKey(e))
                    }
                },
            )
        }
    }

    /** Saqlamasdan tahrirdan chiqish (faqat aniq bekor qilishda) */
    fun cancelEditIfNeeded() {
        viewModelScope.launch {
            val editingId = _uiState.value.editingClientOrderId
            val clientId = _uiState.value.clientId
            if (!editingId.isNullOrBlank() && clientId.isNotBlank()) {
                appSettingsRepository.setEditingClientOrderId(null)
                cartRepository.clearClientCart(clientId)
                _uiState.update { it.copy(editingClientOrderId = null) }
                reloadCartNow()
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun reloadCart() {
        viewModelScope.launch { reloadCartNow() }
    }

    private suspend fun reloadCartNow() {
        val editingOrderId = _uiState.value.editingClientOrderId
        val focusClientId = _uiState.value.clientId
        val grouped = cartRepository.getCartGroupedByClient()

        val source = if (!editingOrderId.isNullOrBlank() && focusClientId.isNotBlank()) {
            grouped.filterKeys { it == focusClientId }
        } else {
            grouped
        }

        val finalDrafts = source.map { (cid, items) ->
            val client = clientRepository.getClient(cid)
            val brands = items.associate { item ->
                val brand = productRepository.getProduct(item.productId)?.brand
                    ?: item.category.orEmpty()
                item.productId to brand
            }
            DraftOrderUi(
                clientId = cid,
                clientCode = client?.code.orEmpty(),
                clientName = client?.name.orEmpty(),
                items = items,
                productBrands = brands,
                total = items.sumOf { it.price * it.quantity },
            )
        }

        _uiState.update { state ->
            val expanded = state.expandedClients.filter { id ->
                finalDrafts.any { it.clientId == id }
            }.toSet().let { current ->
                // Edit rejimida klient kartasi ochiq turishi kerak
                if (!editingOrderId.isNullOrBlank() && focusClientId.isNotBlank()) {
                    current + focusClientId
                } else {
                    current
                }
            }
            state.copy(
                drafts = finalDrafts,
                expandedClients = expanded,
                expandedItems = state.expandedItems.filter { productId ->
                    finalDrafts.any { draft -> draft.items.any { it.productId == productId } }
                }.toSet(),
            )
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
                clientId = clientId,
                productId = it.productId,
                productCode = it.productCode,
                productName = it.productName,
                price = it.price,
                quantity = it.quantity,
                unit = it.unit,
                category = null,
                isFree = it.isFree,
                promotionId = it.promotionId,
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
