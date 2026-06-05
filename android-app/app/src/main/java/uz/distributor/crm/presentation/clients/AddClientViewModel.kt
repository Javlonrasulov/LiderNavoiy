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
import uz.distributor.crm.data.local.AgentLocationHolder
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.ClientRepository
import javax.inject.Inject

data class AddClientUiState(
    val name: String = "",
    val inn: String = "",
    val phoneDigits: String = "",
    val latitude: Double? = null,
    val longitude: Double? = null,
    val photoUri: Uri? = null,
    val isSaving: Boolean = false,
    val error: String? = null,
    val saved: Boolean = false,
)

@HiltViewModel
class AddClientViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
    private val authRepository: AuthRepository,
    private val agentLocationHolder: AgentLocationHolder,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AddClientUiState())
    val uiState: StateFlow<AddClientUiState> = _uiState.asStateFlow()

    init {
        useMyLocation()
    }

    fun onNameChange(value: String) = _uiState.update { it.copy(name = value, error = null) }

    fun onInnChange(value: String) = _uiState.update { it.copy(inn = value, error = null) }

    fun onPhoneChange(value: String) {
        val digits = value.filter { it.isDigit() }.take(9)
        _uiState.update { it.copy(phoneDigits = digits, error = null) }
    }

    fun onLocationSelected(lat: Double, lng: Double) {
        _uiState.update { it.copy(latitude = lat, longitude = lng, error = null) }
    }

    fun onPhotoSelected(uri: Uri?) = _uiState.update { it.copy(photoUri = uri, error = null) }

    fun useMyLocation() {
        agentLocationHolder.location.value?.let { loc ->
            _uiState.update { it.copy(latitude = loc.latitude, longitude = loc.longitude) }
        }
    }

    fun save() {
        val state = _uiState.value
        if (state.name.trim().length < 2) {
            _uiState.update { it.copy(error = "Ism kiriting") }
            return
        }
        if (state.inn.trim().length < 9) {
            _uiState.update { it.copy(error = "INN kiriting (kamida 9 raqam)") }
            return
        }
        if (state.phoneDigits.length != 9) {
            _uiState.update { it.copy(error = "Telefon raqamini to'liq kiriting (+998 dan keyin 9 ta raqam)") }
            return
        }
        if (state.latitude == null || state.longitude == null) {
            _uiState.update { it.copy(error = "Xaritada joyni belgilang") }
            return
        }
        if (state.photoUri == null) {
            _uiState.update { it.copy(error = "Do'kon rasmini qo'shing") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }
            try {
                val user = authRepository.getUserFlow().first()
                clientRepository.createClient(
                    name = state.name,
                    inn = state.inn,
                    phone = "+998${state.phoneDigits}",
                    latitude = state.latitude,
                    longitude = state.longitude,
                    photoUri = state.photoUri,
                    distributorId = user?.distributorId,
                )
                _uiState.update { it.copy(isSaving = false, saved = true) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSaving = false, error = e.message ?: "Saqlashda xatolik")
                }
            }
        }
    }
}
