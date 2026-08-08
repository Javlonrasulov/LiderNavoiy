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
import uz.lider.client.data.repository.PromotionsRepository
import uz.lider.client.domain.model.Promotion
import uz.lider.client.presentation.components.formatMoney
import javax.inject.Inject

data class PromotionsUiState(
    val bonusPointsLabel: String = "0",
    val promotions: List<Promotion> = emptyList(),
    val canSeePromotions: Boolean = false,
    val loading: Boolean = true,
)

@HiltViewModel
class PromotionsViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val promotionsRepository: PromotionsRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(PromotionsUiState())
    val uiState: StateFlow<PromotionsUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            refresh()
        }
    }

    suspend fun refresh() {
        val profile = profileRepository.getProfile()
        val canSee = profile?.canSeePromotions == true
        val points = profile?.bonusPoints
            ?: ((profile?.totalPurchases ?: 0.0) / 1000.0).toInt().coerceAtLeast(0)
        val promotions = if (canSee) {
            promotionsRepository.getPromotions()
        } else {
            emptyList()
        }
        _uiState.update {
            it.copy(
                bonusPointsLabel = formatMoney(points.toDouble()),
                promotions = promotions,
                canSeePromotions = canSee,
                loading = false,
            )
        }
    }
}
