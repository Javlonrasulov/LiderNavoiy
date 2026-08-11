package uz.distributor.crm.presentation.clients

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.location.DeviceLocationProvider
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.ClientRepository
import uz.distributor.crm.data.remote.dto.LineDto
import uz.distributor.crm.map.MapDefaults
import javax.inject.Inject

enum class AddClientValidationError {
    NAME,
    INN,
    PHONE,
    LINE,
    ADDRESS,
}

data class AddClientUiState(
    val name: String = "",
    val inn: String = "",
    val phoneDigits: String = "",
    val address: String = "",
    val territory: String = "",
    val lines: List<LineDto> = emptyList(),
    val selectedLineCode: String? = null,
    val isLoadingLines: Boolean = true,
    val linesLoadFailed: Boolean = false,
    val latitude: Double = MapDefaults.NAVOIY_LAT,
    val longitude: Double = MapDefaults.NAVOIY_LNG,
    val photoUri: Uri? = null,
    val isSaving: Boolean = false,
    val isLocating: Boolean = false,
    val validationError: AddClientValidationError? = null,
    val errorMessage: String? = null,
    val saved: Boolean = false,
    val savedAsRequest: Boolean = false,
)

@HiltViewModel
class AddClientViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
    private val authRepository: AuthRepository,
    private val deviceLocationProvider: DeviceLocationProvider,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AddClientUiState())
    val uiState: StateFlow<AddClientUiState> = _uiState.asStateFlow()

    init {
        loadLines()
    }

    private fun loadLines() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingLines = true, linesLoadFailed = false) }
            try {
                val lines = clientRepository.getLines()
                _uiState.update {
                    it.copy(
                        lines = lines,
                        isLoadingLines = false,
                        linesLoadFailed = lines.isEmpty(),
                    )
                }
            } catch (_: Exception) {
                _uiState.update {
                    it.copy(
                        isLoadingLines = false,
                        linesLoadFailed = true,
                        errorMessage = "lines_load_failed",
                    )
                }
            }
        }
    }

    fun onNameChange(value: String) = _uiState.update { it.copy(name = value, validationError = null, errorMessage = null) }

    fun onInnChange(value: String) = _uiState.update { it.copy(inn = value, validationError = null, errorMessage = null) }

    fun onPhoneChange(value: String) {
        val digits = value.filter { it.isDigit() }.take(9)
        _uiState.update { it.copy(phoneDigits = digits, validationError = null, errorMessage = null) }
    }

    fun onAddressChange(value: String) = _uiState.update {
        it.copy(address = value, validationError = null, errorMessage = null)
    }

    fun onTerritoryChange(value: String) = _uiState.update {
        it.copy(territory = value, validationError = null, errorMessage = null)
    }

    fun onLineSelected(code: String) {
        _uiState.update { it.copy(selectedLineCode = code, validationError = null, errorMessage = null) }
    }

    fun onLocationSelected(lat: Double, lng: Double) {
        _uiState.update { it.copy(latitude = lat, longitude = lng, validationError = null, errorMessage = null) }
    }

    fun onPhotoSelected(uri: Uri?) = _uiState.update { it.copy(photoUri = uri, validationError = null, errorMessage = null) }

    fun useMyLocation() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLocating = true, validationError = null, errorMessage = null) }
            val loc = deviceLocationProvider.getCurrentLocation()
            if (loc != null) {
                _uiState.update {
                    it.copy(
                        latitude = loc.latitude,
                        longitude = loc.longitude,
                        isLocating = false,
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        isLocating = false,
                        errorMessage = "location_failed",
                    )
                }
            }
        }
    }

    fun save() {
        val state = _uiState.value
        if (state.name.trim().length < 2) {
            _uiState.update { it.copy(validationError = AddClientValidationError.NAME, errorMessage = null) }
            return
        }
        if (state.inn.trim().length < 9) {
            _uiState.update { it.copy(validationError = AddClientValidationError.INN, errorMessage = null) }
            return
        }
        if (state.phoneDigits.length != 9) {
            _uiState.update { it.copy(validationError = AddClientValidationError.PHONE, errorMessage = null) }
            return
        }
        if (state.selectedLineCode.isNullOrBlank()) {
            _uiState.update { it.copy(validationError = AddClientValidationError.LINE, errorMessage = null) }
            return
        }
        if (state.address.trim().length < 3) {
            _uiState.update { it.copy(validationError = AddClientValidationError.ADDRESS, errorMessage = null) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, validationError = null, errorMessage = null) }
            try {
                val user = authRepository.getUserFlow().first()
                val d = state.phoneDigits.filter { it.isDigit() }.take(9)
                val phoneFormatted = buildString {
                    append("+998")
                    if (d.isNotEmpty()) append(" ${d.take(2)}")
                    if (d.length > 2) append(" ${d.substring(2, minOf(5, d.length))}")
                    if (d.length > 5) append(" ${d.substring(5, minOf(7, d.length))}")
                    if (d.length > 7) append(" ${d.substring(7, minOf(9, d.length))}")
                }
                val result = clientRepository.createClient(
                    name = state.name,
                    inn = state.inn,
                    phone = phoneFormatted,
                    address = state.address,
                    territory = state.territory,
                    latitude = state.latitude,
                    longitude = state.longitude,
                    photoUri = state.photoUri,
                    distributorId = user?.distributorId,
                    lineCode = state.selectedLineCode!!,
                )
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        saved = true,
                        savedAsRequest = result.pendingRequest,
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSaving = false, errorMessage = ApiErrorMapper.toKey(e))
                }
            }
        }
    }
}
