package uz.distributor.crm.presentation.reconciliation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.remote.dto.ClientReconciliationDto
import uz.distributor.crm.data.repository.ClientRepository
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

enum class RefreshUiState { IDLE, LOADING, SUCCESS }

data class ReconciliationUiState(
    val clientId: String = "",
    val clientName: String = "",
    val fromMillis: Long = defaultFromMillis(),
    val toMillis: Long = System.currentTimeMillis(),
    val data: ClientReconciliationDto? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
    val refreshState: RefreshUiState = RefreshUiState.IDLE,
)

private fun defaultFromMillis(): Long {
    val cal = Calendar.getInstance()
    cal.set(Calendar.MONTH, Calendar.JANUARY)
    cal.set(Calendar.DAY_OF_MONTH, 1)
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.timeInMillis
}

@HiltViewModel
class ReconciliationViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
) : ViewModel() {

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    private val _uiState = MutableStateFlow(ReconciliationUiState())
    val uiState = _uiState.asStateFlow()

    fun init(clientId: String, clientName: String = "") {
        _uiState.update { it.copy(clientId = clientId, clientName = clientName) }
        if (clientName.isBlank()) {
            viewModelScope.launch {
                clientRepository.getClientDetail(clientId)?.let { client ->
                    _uiState.update { it.copy(clientName = client.name) }
                }
            }
        }
        load(refreshState = RefreshUiState.IDLE)
    }

    fun setDateRange(fromMillis: Long, toMillis: Long) {
        _uiState.update { it.copy(fromMillis = fromMillis, toMillis = toMillis) }
        load(refreshState = RefreshUiState.LOADING)
    }

    fun refresh() {
        load(refreshState = RefreshUiState.LOADING)
    }

    private fun load(refreshState: RefreshUiState) {
        viewModelScope.launch {
            val state = _uiState.value
            if (state.clientId.isBlank()) return@launch
            _uiState.update {
                it.copy(
                    isLoading = refreshState != RefreshUiState.IDLE,
                    refreshState = if (refreshState == RefreshUiState.IDLE) RefreshUiState.IDLE else RefreshUiState.LOADING,
                    error = null,
                )
            }
            try {
                val from = isoFormat.format(Date(state.fromMillis))
                val to = isoFormat.format(Date(state.toMillis))
                val data = clientRepository.getReconciliation(state.clientId, from, to)
                _uiState.update {
                    it.copy(
                        data = data,
                        isLoading = false,
                        refreshState = if (refreshState == RefreshUiState.LOADING) RefreshUiState.SUCCESS else RefreshUiState.IDLE,
                    )
                }
                if (refreshState == RefreshUiState.LOADING) {
                    delay(2000)
                    _uiState.update { current ->
                        if (current.refreshState == RefreshUiState.SUCCESS) {
                            current.copy(refreshState = RefreshUiState.IDLE)
                        } else current
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        refreshState = RefreshUiState.IDLE,
                        error = ApiErrorMapper.toKey(e),
                    )
                }
            }
        }
    }
}
