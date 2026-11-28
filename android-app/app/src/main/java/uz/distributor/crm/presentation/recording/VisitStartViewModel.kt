package uz.distributor.crm.presentation.recording

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.recording.VisitRecordingManager
import javax.inject.Inject

@HiltViewModel
class VisitStartViewModel @Inject constructor(
    authRepository: AuthRepository,
    private val visitRecordingManager: VisitRecordingManager,
) : ViewModel() {
    val currentUser = authRepository.getUserFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val recordingState = visitRecordingManager.state

    fun beginVisit(
        clientId: String,
        clientConsent: Boolean?,
        onReady: () -> Unit,
    ) {
        viewModelScope.launch {
            runCatching { visitRecordingManager.beginVisit(clientId, clientConsent) }
            onReady()
        }
    }

    fun endVisit(
        outcome: String,
        orderId: String? = null,
        orderTotal: Double? = null,
        onDone: (uploaded: Boolean) -> Unit = {},
    ) {
        viewModelScope.launch {
            val uploaded = runCatching {
                visitRecordingManager.endVisit(outcome, orderId, orderTotal)
            }.getOrDefault(false)
            onDone(uploaded)
        }
    }
}
