package uz.distributor.crm.presentation.clientdetail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.ClientRepository
import uz.distributor.crm.domain.model.Client
import javax.inject.Inject

data class ClientDetailUiState(
    val client: Client? = null,
    val isLoading: Boolean = true,
    val lastVisitAt: Long? = null,
    val lastOrderAt: Long? = null,
)

@HiltViewModel
class ClientDetailViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClientDetailUiState())
    val uiState = _uiState.asStateFlow()

    fun resolvePhotoUrl(path: String?): String =
        clientRepository.resolvePhotoUrl(path)

    fun load(clientId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val clientDeferred = async { clientRepository.getClientDetail(clientId) }
            val activityDeferred = async { clientRepository.getClientActivity(clientId) }
            val client = clientDeferred.await()
            val activity = activityDeferred.await()
            _uiState.update {
                it.copy(
                    client = client,
                    isLoading = false,
                    lastVisitAt = activity.lastVisitAt,
                    lastOrderAt = activity.lastOrderAt,
                )
            }
        }
    }
}
