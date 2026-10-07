package uz.distributor.crm.presentation.clients

import android.net.Uri
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.location.DeviceLocationProvider
import uz.distributor.crm.data.remote.ApiErrorMapper
import uz.distributor.crm.data.remote.dto.ClientAppCredentialsDto
import uz.distributor.crm.data.remote.dto.ClientCategoryDto
import uz.distributor.crm.data.remote.dto.ClientDto
import uz.distributor.crm.data.remote.dto.ClientExtraPhoneDto
import uz.distributor.crm.data.remote.dto.CreateClientRequest
import uz.distributor.crm.data.remote.dto.LineDto
import uz.distributor.crm.data.remote.dto.UpdateClientRequest
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.ClientRepository
import uz.distributor.crm.presentation.clients.CustomerFormLogic.SimilarityMatch
import javax.inject.Inject
import kotlin.math.roundToInt

enum class CustomerMarkColor(val apiValue: String) {
    GREEN("green"), YELLOW("yellow"), RED("red");

    companion object {
        fun fromApi(value: String?): CustomerMarkColor = when (value?.trim()?.lowercase()) {
            "yellow" -> YELLOW
            "red" -> RED
            else -> GREEN
        }
    }
}

data class ExtraPhoneRow(val phone: String = "+998", val note: String = "")

enum class CustomerField { NAME, FULL_NAME, ADDRESS, LINE, CATEGORY }

enum class CustomerCatalogKind { LINE, CATEGORY }

sealed interface CustomerFormMessage {
    data class FieldRequired(val field: CustomerField) : CustomerFormMessage
    data object PhoneInvalid : CustomerFormMessage
    data object LocationRequired : CustomerFormMessage
    data object LocationOff : CustomerFormMessage
    data object LocationDenied : CustomerFormMessage
    data object PhotoUploadFailed : CustomerFormMessage
    data object PermissionDenied : CustomerFormMessage
    data object LineSaved : CustomerFormMessage
    data object LineUpdated : CustomerFormMessage
    data object CategorySaved : CustomerFormMessage
    data object CategoryUpdated : CustomerFormMessage
    data object LineSimilarWarning : CustomerFormMessage
    data class CatalogNameRequired(val kind: CustomerCatalogKind) : CustomerFormMessage
    data class Api(val key: String) : CustomerFormMessage
}

sealed interface AppCredText {
    data object LoginShort : AppCredText
    data object PasswordShort : AppCredText
    data class Taken(val owner: String?) : AppCredText
    data object Saved : AppCredText
    data object Created : AppCredText
    data object Ready : AppCredText
    data object Needed : AppCredText
    data class Api(val key: String) : AppCredText
}

data class CatalogModalState(
    val kind: CustomerCatalogKind,
    val editId: String? = null,
    val name: String = "",
    val duplicateConfirmed: Boolean = false,
    val saving: Boolean = false,
)

data class CustomerFormResult(val isEdit: Boolean, val pendingApproval: Boolean)

data class CustomerFormUiState(
    val clientId: String? = null,
    val prefillLoading: Boolean = false,
    val prefillFailed: Boolean = false,
    val canEditClients: Boolean = false,
    val name: String = "",
    val fullName: String = "",
    val inn: String = "",
    val phone: String = "+998",
    val extraPhones: List<ExtraPhoneRow> = emptyList(),
    val address: String = "",
    val territory: String = "",
    val photoUrl: String? = null,
    val photoPreview: String? = null,
    val photoUploading: Boolean = false,
    val markColor: CustomerMarkColor = CustomerMarkColor.GREEN,
    val lines: List<LineDto> = emptyList(),
    val linesLoading: Boolean = true,
    val categories: List<ClientCategoryDto> = emptyList(),
    val categoriesLoading: Boolean = true,
    val lineCode: String = "",
    val category: String = "",
    val latitude: Double? = null,
    val longitude: Double? = null,
    val radius: Int = CustomerFormLogic.RADIUS_DEFAULT,
    val isLocating: Boolean = false,
    val canSeePromotions: Boolean = false,
    val appAccess: Boolean = false,
    val appCredOpen: Boolean = false,
    val appLogin: String = "",
    val appPassword: String = CustomerFormLogic.DEFAULT_CLIENT_APP_PASSWORD,
    val appPasswordVisible: Boolean = true,
    val hasAppLogin: Boolean = false,
    val appCredBusy: Boolean = false,
    val appCredError: AppCredText? = null,
    val appCredNote: AppCredText? = null,
    val appCredDraftReady: Boolean = false,
    val modal: CatalogModalState? = null,
    val similarity: SimilarityMatch? = null,
    val isSaving: Boolean = false,
    val message: CustomerFormMessage? = null,
    val result: CustomerFormResult? = null,
) {
    val isEdit: Boolean get() = clientId != null
    val similarLines: List<LineDto>
        get() {
            val m = modal ?: return emptyList()
            if (m.kind != CustomerCatalogKind.LINE || m.editId != null) return emptyList()
            return CustomerFormLogic.findSimilarLines(m.name, lines)
        }
}

@HiltViewModel
class CustomerFormViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val clientRepository: ClientRepository,
    private val authRepository: AuthRepository,
    private val deviceLocationProvider: DeviceLocationProvider,
) : ViewModel() {

    private val editClientId: String? = savedStateHandle.get<String>("clientId")?.takeIf { it.isNotBlank() }

    private val _uiState = MutableStateFlow(
        CustomerFormUiState(clientId = editClientId, prefillLoading = editClientId != null),
    )
    val uiState: StateFlow<CustomerFormUiState> = _uiState.asStateFlow()

    private var initialAppAccess = false
    private var savedAppLogin = ""
    private var appLoginTouched = false
    private var pendingCreate: CreateClientRequest? = null

    init {
        viewModelScope.launch {
            authRepository.getUserFlow().collect { user ->
                _uiState.update { it.copy(canEditClients = user?.canAddClients() == true) }
            }
        }
        loadCatalogs()
        if (editClientId != null) loadClient(editClientId)
    }

    private fun loadCatalogs() {
        viewModelScope.launch {
            _uiState.update { it.copy(linesLoading = true, categoriesLoading = true) }
            val linesJob = async { runCatching { clientRepository.getLines() }.getOrDefault(emptyList()) }
            val catsJob = async { runCatching { clientRepository.getClientCategories() }.getOrDefault(emptyList()) }
            val lines = linesJob.await()
            val cats = catsJob.await()
            _uiState.update {
                it.copy(
                    lines = lines,
                    categories = cats,
                    linesLoading = false,
                    categoriesLoading = false,
                )
            }
        }
    }

    fun retryPrefill() {
        val id = editClientId ?: return
        loadClient(id)
    }

    private fun loadClient(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(prefillLoading = true, prefillFailed = false) }
            try {
                applyClient(clientRepository.getClientForEdit(id))
                _uiState.update { it.copy(prefillLoading = false) }
            } catch (_: Exception) {
                _uiState.update { it.copy(prefillLoading = false, prefillFailed = true) }
                return@launch
            }
            runCatching { clientRepository.getClientAppCredentials(id) }
                .onSuccess(::applyCredentials)
        }
    }

    private fun applyClient(cl: ClientDto) {
        _uiState.update {
            it.copy(
                name = cl.name,
                fullName = cl.fullName.orEmpty(),
                inn = cl.inn.orEmpty(),
                phone = CustomerFormLogic.formatUzPhone(cl.phone ?: "+998"),
                extraPhones = cl.extraPhones.orEmpty()
                    .filter { p -> p.phone.isNotBlank() }
                    .map { p -> ExtraPhoneRow(CustomerFormLogic.formatUzPhone(p.phone), p.note.orEmpty()) },
                address = cl.address.orEmpty(),
                territory = cl.territory.orEmpty(),
                photoUrl = cl.photoUrl,
                photoPreview = cl.photoUrl?.let(clientRepository::resolvePhotoUrl)?.takeIf { url -> url.isNotBlank() },
                lineCode = cl.lineCode.orEmpty(),
                category = cl.category.orEmpty(),
                latitude = cl.latitude,
                longitude = cl.longitude,
                radius = cl.orderRadiusMeters
                    ?.takeIf { r -> r >= CustomerFormLogic.RADIUS_MIN }
                    ?.roundToInt()
                    ?: CustomerFormLogic.RADIUS_DEFAULT,
                canSeePromotions = cl.canSeePromotions == true,
                markColor = CustomerMarkColor.fromApi(cl.markColor),
            )
        }
    }

    private fun applyCredentials(cred: ClientAppCredentialsDto) {
        val active = cred.hasCredentials && cred.isActive != false
        initialAppAccess = active
        if (cred.hasCredentials) {
            savedAppLogin = cred.username.orEmpty()
            _uiState.update {
                it.copy(
                    appAccess = active,
                    hasAppLogin = true,
                    appLogin = cred.username.orEmpty(),
                    appPassword = "",
                    appCredOpen = active,
                )
            }
        } else {
            _uiState.update {
                it.copy(
                    appAccess = false,
                    hasAppLogin = false,
                    appLogin = cred.suggestedUsername.orEmpty(),
                    appPassword = CustomerFormLogic.DEFAULT_CLIENT_APP_PASSWORD,
                )
            }
        }
    }

    // ─── Maydonlar ───

    fun onNameChange(value: String) {
        _uiState.update { s ->
            val suggestion = if (!s.isEdit && !s.hasAppLogin && !appLoginTouched) {
                CustomerFormLogic.clientNameToLogin(value).ifEmpty { s.appLogin }
            } else s.appLogin
            s.copy(name = value, appLogin = suggestion)
        }
    }

    fun onFullNameChange(value: String) = _uiState.update { it.copy(fullName = value) }
    fun onInnChange(value: String) = _uiState.update { it.copy(inn = CustomerFormLogic.normalizeInnInput(value)) }
    fun onPhoneChange(value: String) = _uiState.update { it.copy(phone = CustomerFormLogic.formatUzPhone(value)) }
    fun onAddressChange(value: String) = _uiState.update { it.copy(address = value) }
    fun onTerritoryChange(value: String) = _uiState.update { it.copy(territory = value) }
    fun onMarkColorChange(value: CustomerMarkColor) = _uiState.update { it.copy(markColor = value) }
    fun onLineSelected(code: String) = _uiState.update { it.copy(lineCode = code) }
    fun onCategorySelected(name: String) = _uiState.update { it.copy(category = name) }
    fun onRadiusChange(value: Int) = _uiState.update {
        it.copy(radius = value.coerceIn(CustomerFormLogic.RADIUS_MIN, CustomerFormLogic.RADIUS_MAX))
    }
    fun togglePromotions() = _uiState.update { it.copy(canSeePromotions = !it.canSeePromotions) }
    fun onLocationSelected(lat: Double, lng: Double) = _uiState.update { it.copy(latitude = lat, longitude = lng) }

    fun addExtraPhone() = _uiState.update { it.copy(extraPhones = it.extraPhones + ExtraPhoneRow()) }

    fun removeExtraPhone(index: Int) = _uiState.update {
        it.copy(extraPhones = it.extraPhones.filterIndexed { i, _ -> i != index })
    }

    fun onExtraPhoneChange(index: Int, value: String) = _uiState.update {
        it.copy(
            extraPhones = it.extraPhones.mapIndexed { i, row ->
                if (i == index) row.copy(phone = CustomerFormLogic.formatUzPhone(value)) else row
            },
        )
    }

    fun onExtraPhoneNoteChange(index: Int, value: String) = _uiState.update {
        it.copy(extraPhones = it.extraPhones.mapIndexed { i, row -> if (i == index) row.copy(note = value) else row })
    }

    fun consumeMessage() = _uiState.update { it.copy(message = null) }

    fun showMessage(message: CustomerFormMessage) = _uiState.update { it.copy(message = message) }

    // ─── Rasm ───

    fun onPhotoPicked(uri: Uri) {
        if (_uiState.value.photoUploading) return
        val previous = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(photoPreview = uri.toString(), photoUploading = true) }
            try {
                val url = clientRepository.uploadPhoto(uri)
                _uiState.update { it.copy(photoUrl = url, photoUploading = false) }
            } catch (_: Exception) {
                _uiState.update {
                    it.copy(
                        photoPreview = previous.photoPreview,
                        photoUrl = previous.photoUrl,
                        photoUploading = false,
                        message = CustomerFormMessage.PhotoUploadFailed,
                    )
                }
            }
        }
    }

    fun removePhoto() = _uiState.update { it.copy(photoUrl = null, photoPreview = null) }

    // ─── Joylashuv ───

    fun useMyLocation() {
        if (_uiState.value.isLocating) return
        viewModelScope.launch {
            _uiState.update { it.copy(isLocating = true) }
            val loc = runCatching { deviceLocationProvider.getCurrentLocation() }.getOrNull()
            if (loc != null) {
                _uiState.update { it.copy(latitude = loc.latitude, longitude = loc.longitude, isLocating = false) }
            } else {
                _uiState.update { it.copy(isLocating = false, message = CustomerFormMessage.LocationOff) }
            }
        }
    }

    // ─── Liniya / kategoriya modal ───

    fun openModal(kind: CustomerCatalogKind, editId: String? = null, name: String = "") {
        _uiState.update { it.copy(modal = CatalogModalState(kind = kind, editId = editId, name = name)) }
    }

    fun closeModal() = _uiState.update { if (it.modal?.saving == true) it else it.copy(modal = null) }

    fun onModalNameChange(value: String) = _uiState.update {
        it.copy(modal = it.modal?.copy(name = value, duplicateConfirmed = false))
    }

    fun pickExistingLine(code: String) = _uiState.update { it.copy(lineCode = code, modal = null) }

    fun saveModal() {
        val state = _uiState.value
        val modal = state.modal ?: return
        if (modal.saving) return
        val value = modal.name.trim()
        if (value.isEmpty()) {
            _uiState.update { it.copy(message = CustomerFormMessage.CatalogNameRequired(modal.kind)) }
            return
        }
        if (state.similarLines.isNotEmpty() && !modal.duplicateConfirmed) {
            _uiState.update {
                it.copy(
                    modal = modal.copy(duplicateConfirmed = true),
                    message = CustomerFormMessage.LineSimilarWarning,
                )
            }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(modal = modal.copy(saving = true)) }
            try {
                when (modal.kind) {
                    CustomerCatalogKind.LINE -> saveLine(modal, value)
                    CustomerCatalogKind.CATEGORY -> saveCategory(modal, value)
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        modal = it.modal?.copy(saving = false),
                        message = CustomerFormMessage.Api(ApiErrorMapper.toKey(e)),
                    )
                }
            }
        }
    }

    private suspend fun saveLine(modal: CatalogModalState, value: String) {
        val editId = modal.editId
        if (editId != null) {
            val updated = clientRepository.updateLine(editId, value)
            _uiState.update { s ->
                s.copy(
                    lines = (s.lines.filter { it.id != updated.id } + updated).sortedBy { it.name },
                    modal = null,
                    message = CustomerFormMessage.LineUpdated,
                )
            }
        } else {
            val created = clientRepository.createLine(
                code = CustomerFormLogic.nextNumericLineCode(_uiState.value.lines),
                name = value,
            )
            _uiState.update { s ->
                s.copy(
                    lines = (s.lines.filter { it.id == null || it.id != created.id } + created).sortedBy { it.name },
                    lineCode = created.code,
                    modal = null,
                    message = CustomerFormMessage.LineSaved,
                )
            }
        }
    }

    private suspend fun saveCategory(modal: CatalogModalState, value: String) {
        val editId = modal.editId
        if (editId != null) {
            val prevName = _uiState.value.categories.find { it.id == editId }?.name
            val updated = clientRepository.updateClientCategory(editId, value)
            _uiState.update { s ->
                s.copy(
                    categories = (s.categories.filter { it.id != updated.id } + updated).sortedBy { it.name },
                    category = if (s.category == prevName || s.category == updated.name) updated.name else s.category,
                    modal = null,
                    message = CustomerFormMessage.CategoryUpdated,
                )
            }
        } else {
            val created = clientRepository.createClientCategory(value)
            _uiState.update { s ->
                s.copy(
                    categories = (s.categories.filter { it.id != created.id } + created).sortedBy { it.name },
                    category = created.name,
                    modal = null,
                    message = CustomerFormMessage.CategorySaved,
                )
            }
        }
    }

    // ─── Ilovaga kirish (login/parol) ───

    fun onAppLoginChange(value: String) {
        appLoginTouched = true
        _uiState.update { it.copy(appLogin = CustomerFormLogic.normalizeAppLogin(value), appCredError = null) }
    }

    fun onAppPasswordChange(value: String) =
        _uiState.update { it.copy(appPassword = value.trim(), appCredError = null) }

    fun toggleAppPasswordVisible() = _uiState.update { it.copy(appPasswordVisible = !it.appPasswordVisible) }

    fun closeAppCred() = _uiState.update { it.copy(appCredOpen = false, appCredError = null, appCredNote = null) }

    fun toggleAppAccess() {
        val s = _uiState.value
        _uiState.update { it.copy(appCredError = null, appCredNote = null) }
        val clientId = s.clientId
        if (s.appAccess) {
            _uiState.update { it.copy(appAccess = false) }
            if (clientId != null) {
                viewModelScope.launch {
                    try {
                        clientRepository.setClientAppLoginActive(clientId, false)
                        initialAppAccess = false
                    } catch (e: Exception) {
                        _uiState.update {
                            it.copy(appAccess = true, message = CustomerFormMessage.Api(ApiErrorMapper.toKey(e)))
                        }
                    }
                }
            }
            return
        }
        if (s.hasAppLogin || s.appCredDraftReady) {
            _uiState.update { it.copy(appAccess = true, appCredOpen = true) }
            if (clientId != null && s.hasAppLogin) {
                viewModelScope.launch {
                    try {
                        val res = clientRepository.setClientAppLoginActive(clientId, true)
                        val active = res.hasCredentials && res.isActive != false
                        initialAppAccess = active
                        _uiState.update { it.copy(appAccess = active) }
                    } catch (e: Exception) {
                        _uiState.update {
                            it.copy(appAccess = false, message = CustomerFormMessage.Api(ApiErrorMapper.toKey(e)))
                        }
                    }
                }
            }
            return
        }
        _uiState.update { it.copy(appCredOpen = true, appCredNote = AppCredText.Needed) }
    }

    fun saveAppCredentials() {
        val s = _uiState.value
        if (s.appCredBusy) return
        val login = CustomerFormLogic.normalizeAppLogin(s.appLogin)
        val password = s.appPassword.trim()
        _uiState.update { it.copy(appCredError = null, appCredNote = null) }

        if (login.length < 3) {
            _uiState.update { it.copy(appCredError = AppCredText.LoginShort) }
            return
        }
        val loginUnchanged = s.hasAppLogin && login == CustomerFormLogic.normalizeAppLogin(savedAppLogin)
        val onlyGrantAccess = loginUnchanged && password.isEmpty()
        if ((!s.hasAppLogin && password.length < 6) || (password.isNotEmpty() && password.length < 6)) {
            _uiState.update { it.copy(appCredError = AppCredText.PasswordShort) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(appCredBusy = true) }
            try {
                val clientId = s.clientId
                if (clientId != null && onlyGrantAccess) {
                    val res = clientRepository.setClientAppLoginActive(clientId, true)
                    val active = res.hasCredentials && res.isActive != false
                    initialAppAccess = active
                    _uiState.update { it.copy(appAccess = active, appCredNote = AppCredText.Saved) }
                    return@launch
                }

                val check = clientRepository.checkClientAppUsername(login, clientId)
                if (!check.available) {
                    _uiState.update { it.copy(appCredError = AppCredText.Taken(check.takenBy?.clientName)) }
                    return@launch
                }

                if (clientId == null) {
                    _uiState.update {
                        it.copy(
                            appLogin = login,
                            appCredDraftReady = true,
                            appAccess = true,
                            appCredNote = AppCredText.Ready,
                        )
                    }
                    return@launch
                }

                val res = clientRepository.setClientAppCredentials(
                    clientId = clientId,
                    username = login,
                    password = password.ifEmpty { null },
                    isActive = if (s.hasAppLogin) s.appAccess else true,
                )
                savedAppLogin = res.username.orEmpty()
                val active = res.isActive != false
                initialAppAccess = active
                _uiState.update {
                    it.copy(
                        appLogin = res.username ?: login,
                        hasAppLogin = true,
                        appAccess = active,
                        appCredNote = if (res.created == true) AppCredText.Created else AppCredText.Saved,
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(appCredError = AppCredText.Api(ApiErrorMapper.toKey(e))) }
            } finally {
                _uiState.update { it.copy(appCredBusy = false) }
            }
        }
    }

    private suspend fun syncAppAccess(clientId: String) {
        val access = _uiState.value.appAccess
        if (access == initialAppAccess) return
        try {
            clientRepository.setClientAppLoginActive(clientId, access)
            initialAppAccess = access
        } catch (e: Exception) {
            _uiState.update { it.copy(message = CustomerFormMessage.Api(ApiErrorMapper.toKey(e))) }
        }
    }

    // ─── Saqlash ───

    fun submit() {
        val s = _uiState.value
        if (s.isSaving || s.photoUploading || s.prefillLoading || s.result != null) return
        if (!s.canEditClients) {
            _uiState.update { it.copy(message = CustomerFormMessage.PermissionDenied) }
            return
        }
        val error: CustomerFormMessage? = when {
            s.name.isBlank() -> CustomerFormMessage.FieldRequired(CustomerField.NAME)
            s.fullName.isBlank() -> CustomerFormMessage.FieldRequired(CustomerField.FULL_NAME)
            !CustomerFormLogic.isPhoneComplete(s.phone) -> CustomerFormMessage.PhoneInvalid
            s.address.isBlank() -> CustomerFormMessage.FieldRequired(CustomerField.ADDRESS)
            s.lineCode.isBlank() -> CustomerFormMessage.FieldRequired(CustomerField.LINE)
            s.category.isBlank() -> CustomerFormMessage.FieldRequired(CustomerField.CATEGORY)
            s.latitude == null || s.longitude == null -> CustomerFormMessage.LocationRequired
            else -> null
        }
        if (error != null) {
            _uiState.update { it.copy(message = error) }
            return
        }

        val phone = CustomerFormLogic.phoneToStorage(s.phone)!!
        val extras = s.extraPhones.mapNotNull { row ->
            val p = CustomerFormLogic.phoneToStorage(row.phone) ?: return@mapNotNull null
            ClientExtraPhoneDto(phone = p, note = row.note.trim().ifEmpty { null })
        }

        val clientId = s.clientId
        if (clientId != null) {
            val body = UpdateClientRequest(
                name = s.name.trim(),
                fullName = s.fullName.trim(),
                inn = s.inn.trim().ifEmpty { null },
                phone = phone,
                extraPhones = extras,
                address = s.address.trim(),
                territory = s.territory.trim().ifEmpty { null },
                photoUrl = s.photoUrl,
                markColor = s.markColor.apiValue,
                lineCode = s.lineCode.trim(),
                category = s.category.trim(),
                latitude = s.latitude,
                longitude = s.longitude,
                orderRadiusMeters = s.radius,
                canSeePromotions = s.canSeePromotions,
            )
            persistUpdate(clientId, body)
            return
        }

        val draftLogin = if (s.appCredDraftReady) CustomerFormLogic.normalizeAppLogin(s.appLogin) else ""
        val draftPassword = if (s.appCredDraftReady) s.appPassword.trim() else ""
        val withCredentials = draftLogin.length >= 3 && draftPassword.length >= 6
        val body = CreateClientRequest(
            name = s.name.trim(),
            fullName = s.fullName.trim(),
            inn = s.inn.trim().ifEmpty { null },
            phone = phone,
            extraPhones = extras.ifEmpty { null },
            address = s.address.trim(),
            territory = s.territory.trim().ifEmpty { null },
            photoUrl = s.photoUrl,
            markColor = s.markColor.apiValue,
            lineCode = s.lineCode.trim(),
            category = s.category.trim(),
            latitude = s.latitude,
            longitude = s.longitude,
            orderRadiusMeters = s.radius,
            canSeePromotions = s.canSeePromotions,
            appUsername = draftLogin.takeIf { withCredentials },
            appPassword = draftPassword.takeIf { withCredentials },
            appLoginActive = s.appAccess.takeIf { withCredentials },
        )

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }
            val list = clientRepository.fetchClientsForSimilarity()
            val match = CustomerFormLogic.findBestSimilarityMatch(
                CustomerFormLogic.SimilarityCandidate(
                    name = body.name,
                    fullName = body.fullName,
                    phone = body.phone,
                    inn = body.inn,
                    territory = body.territory,
                ),
                list,
            )
            if (match != null) {
                pendingCreate = body
                _uiState.update { it.copy(isSaving = false, similarity = match) }
                return@launch
            }
            persistCreate(body)
        }
    }

    fun confirmAddAnyway() {
        val body = pendingCreate ?: return
        if (_uiState.value.isSaving) return
        if (CustomerFormLogic.hasExactInnCollision(_uiState.value.similarity)) return
        viewModelScope.launch { persistCreate(body) }
    }

    fun dismissSimilarity() {
        pendingCreate = null
        _uiState.update { it.copy(similarity = null) }
    }

    private suspend fun persistCreate(body: CreateClientRequest) {
        _uiState.update { it.copy(isSaving = true) }
        try {
            val user = authRepository.getUserFlow().first()
            val result = clientRepository.createClient(body.copy(distributorId = user?.distributorId))
            if (!result.pendingRequest) result.clientId?.let { syncAppAccess(it) }
            _uiState.update {
                it.copy(
                    isSaving = false,
                    similarity = null,
                    result = CustomerFormResult(isEdit = false, pendingApproval = result.pendingRequest),
                )
            }
        } catch (e: Exception) {
            _uiState.update {
                it.copy(isSaving = false, similarity = null, message = CustomerFormMessage.Api(ApiErrorMapper.toKey(e)))
            }
        } finally {
            pendingCreate = null
        }
    }

    private fun persistUpdate(clientId: String, body: UpdateClientRequest) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }
            try {
                val result = clientRepository.updateClient(clientId, body)
                if (!result.pendingRequest) syncAppAccess(clientId)
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        result = CustomerFormResult(isEdit = true, pendingApproval = result.pendingRequest),
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSaving = false, message = CustomerFormMessage.Api(ApiErrorMapper.toKey(e)))
                }
            }
        }
    }
}
