package uz.lider.client.presentation.promotions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.ProfileRepository
import uz.lider.client.presentation.components.formatMoney
import javax.inject.Inject

data class PromotionsUiState(
    val bonusPointsLabel: String = "0",
    val loading: Boolean = true,
)

@HiltViewModel
class PromotionsViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(PromotionsUiState())
    val uiState: StateFlow<PromotionsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val profile = profileRepository.getProfile()
            val points = profile?.bonusPoints
                ?: ((profile?.totalPurchases ?: 0.0) / 1000.0).toInt().coerceAtLeast(0)
            _uiState.update {
                it.copy(
                    bonusPointsLabel = formatMoney(points.toDouble()),
                    loading = false,
                )
            }
        }
    }
}
