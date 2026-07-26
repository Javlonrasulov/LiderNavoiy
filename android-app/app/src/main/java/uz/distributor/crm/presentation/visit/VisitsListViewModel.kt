package uz.distributor.crm.presentation.visit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.remote.dto.VisitDto
import uz.distributor.crm.data.repository.VisitsRepository
import javax.inject.Inject

data class VisitsListUiState(
    val isLoading: Boolean = true,
    val visits: List<VisitDto> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class VisitsListViewModel @Inject constructor(
    private val repository: VisitsRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(VisitsListUiState())
    val uiState: StateFlow<VisitsListUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val visits = repository.getTodayVisits()
                _uiState.update { it.copy(isLoading = false, visits = visits) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = ApiErrorMapper.toKey(e))
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
