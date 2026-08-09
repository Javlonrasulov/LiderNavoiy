package uz.distributor.crm.presentation.clientdetail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import uz.distributor.crm.data.location.DeviceLocationProvider
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.ClientRepository
import uz.distributor.crm.domain.model.Client
import uz.distributor.crm.map.MapDefaults
import javax.inject.Inject

data class ClientDetailUiState(
    val client: Client? = null,
    val isLoading: Boolean = true,
    val lastVisitAt: Long? = null,
    val lastOrderAt: Long? = null,
    val showLocationEditor: Boolean = false,
    val editLatitude: Double = MapDefaults.NAVOIY_LAT,
    val editLongitude: Double = MapDefaults.NAVOIY_LNG,
    val isSavingLocation: Boolean = false,
    val isLocating: Boolean = false,
    val locationSaved: Boolean = false,
    val locationPendingApproval: Boolean = false,
    val locationError: String? = null,
    /** Admin mijoz qo‘shish/tahrirlash ruxsati */
    val canEditClients: Boolean = false,
    /** Ruxsat yo‘q — asosiy sahifadagi glass toast */
    val showEditDeniedToast: Boolean = false,
)

@HiltViewModel
class ClientDetailViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
    private val deviceLocationProvider: DeviceLocationProvider,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClientDetailUiState())
    val uiState = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.getUserFlow().collect { user ->
                _uiState.update { it.copy(canEditClients = user?.canAddClients() == true) }
            }
        }
    }

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

    fun openLocationEditor() {
        if (!_uiState.value.canEditClients) {
            _uiState.update { it.copy(showEditDeniedToast = true) }
            return
        }
        val client = _uiState.value.client ?: return
        val lat = client.latitude?.takeIf { it != 0.0 } ?: MapDefaults.NAVOIY_LAT
        val lng = client.longitude?.takeIf { it != 0.0 } ?: MapDefaults.NAVOIY_LNG
        _uiState.update {
            it.copy(
                showLocationEditor = true,
                editLatitude = lat,
                editLongitude = lng,
                locationError = null,
                locationSaved = false,
            )
        }
    }

    fun consumeEditDeniedToast() {
        _uiState.update { it.copy(showEditDeniedToast = false) }
    }

    fun closeLocationEditor() {
        _uiState.update {
            it.copy(
                showLocationEditor = false,
                isSavingLocation = false,
                isLocating = false,
                locationError = null,
            )
        }
    }

    fun onLocationSelected(lat: Double, lng: Double) {
        _uiState.update {
            it.copy(editLatitude = lat, editLongitude = lng, locationError = null)
        }
    }

    fun useMyLocation() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLocating = true, locationError = null) }
            try {
                val loc = deviceLocationProvider.getCurrentLocation()
                if (loc != null) {
                    _uiState.update {
                        it.copy(
                            editLatitude = loc.latitude,
                            editLongitude = loc.longitude,
                            isLocating = false,
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(isLocating = false, locationError = "location_failed")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLocating = false, locationError = ApiErrorMapper.toKey(e))
                }
            }
        }
    }

    fun saveLocation() {
        if (!_uiState.value.canEditClients) {
            _uiState.update {
                it.copy(
                    showLocationEditor = false,
                    isSavingLocation = false,
                    showEditDeniedToast = true,
                )
            }
            return
        }
        val client = _uiState.value.client ?: return
        val lat = _uiState.value.editLatitude
        val lng = _uiState.value.editLongitude
        viewModelScope.launch {
            _uiState.update { it.copy(isSavingLocation = true, locationError = null) }
            try {
                val result = clientRepository.updateClientLocation(client.id, lat, lng)
                _uiState.update {
                    it.copy(
                        client = result.client ?: it.client,
                        isSavingLocation = false,
                        showLocationEditor = false,
                        locationSaved = !result.pendingRequest,
                        locationPendingApproval = result.pendingRequest,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSavingLocation = false,
                        locationError = ApiErrorMapper.toKey(e),
                    )
                }
            }
        }
    }

    fun consumeLocationSaved() {
        _uiState.update { it.copy(locationSaved = false, locationPendingApproval = false) }
    }
}
