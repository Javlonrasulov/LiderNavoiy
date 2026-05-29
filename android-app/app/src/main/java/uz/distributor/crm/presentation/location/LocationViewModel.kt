package uz.distributor.crm.presentation.location

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.ClientRepository
import uz.distributor.crm.domain.model.Client
import javax.inject.Inject

data class LocationUiState(
    val clients: List<Client> = emptyList(),
    val currentLat: Double? = null,
    val currentLng: Double? = null,
)

@HiltViewModel
class LocationViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LocationUiState())
    val uiState = _uiState.asStateFlow()

    fun loadClients() {
        viewModelScope.launch {
            val clients = clientRepository.getClients(true)
            _uiState.update { it.copy(clients = clients) }
        }
    }
}
