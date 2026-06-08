package uz.lider.client.presentation.debt

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.ProfileRepository
import javax.inject.Inject

data class DebtPayment(val date: String, val amount: String, val type: String, val isPayment: Boolean)

data class DebtUiState(
    val loading: Boolean = true,
    val currentDebt: Double = 2_500_000.0,
    val creditLimit: Double = 10_000_000.0,
    val totalPaid: Double = 46_250_000.0,
    val dueDate: String = "15.06.2026",
    val daysLeft: Int = 7,
)

@HiltViewModel
class DebtViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DebtUiState())
    val uiState: StateFlow<DebtUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            val profile = profileRepository.getProfile()
            _uiState.update { state ->
                state.copy(
                    loading = false,
                    currentDebt = profile?.balance?.takeIf { it > 0 } ?: state.currentDebt,
                )
            }
        }
    }
}
