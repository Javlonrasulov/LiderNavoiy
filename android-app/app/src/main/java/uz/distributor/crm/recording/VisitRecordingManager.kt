package uz.distributor.crm.recording

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import uz.distributor.crm.data.local.AppDatabase
import uz.distributor.crm.data.local.PendingRecordingEntity
import uz.distributor.crm.data.local.SyncStatus
import uz.distributor.crm.data.location.DeviceLocationProvider
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.CompleteVisitRequest
import uz.distributor.crm.data.remote.dto.FinishRecordingRequest
import uz.distributor.crm.data.remote.dto.LinkRecordingOrderRequest
import uz.distributor.crm.data.remote.dto.OpenRecordingSessionRequest
import uz.distributor.crm.data.remote.dto.StartVisitRequest
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.service.RecordingUploadWorker
import uz.distributor.crm.util.MicAccess
import uz.distributor.crm.util.NetworkMonitor
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject
import javax.inject.Singleton

enum class VisitRecordingPhase {
    Idle,
    Recording,
    Interrupted,
    Stopped,
    Uploading,
    Uploaded,
    Failed,
}

data class VisitRecordingUiState(
    val visitId: String? = null,
    val recordingId: String? = null,
    val clientId: String? = null,
    val phase: VisitRecordingPhase = VisitRecordingPhase.Idle,
    val elapsedSeconds: Int = 0,
    val amplitude: Float = 0f,
    val clientConsent: Boolean = false,
    val recordEnabled: Boolean = false,
    /** Banner faqat haqiqiy yozuv (consent + MediaRecorder) */
    val showBanner: Boolean = false,
    val errorKey: String? = null,
)

/**
 * Tashrif audio sessiyasi — singleton. Timer navigatsiyada saqlanadi.
 * Ruxsat berish / ilovani ochish o‘zi yozuvni boshlamaydi.
 */
@Singleton
class VisitRecordingManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiService,
    private val db: AppDatabase,
    private val authRepository: AuthRepository,
    private val deviceLocationProvider: DeviceLocationProvider,
    private val networkMonitor: NetworkMonitor,
    private val recorder: VisitAudioRecorder,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val mutex = Mutex()
    private var timerJob: Job? = null
    private var amplitudeJob: Job? = null
    private var startedAtElapsedRealtime = 0L
    private var localFilePath: String? = null

    private val _state = MutableStateFlow(VisitRecordingUiState())
    val state: StateFlow<VisitRecordingUiState> = _state.asStateFlow()

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    fun peekVisitId(): String? = _state.value.visitId
    fun peekRecordingId(): String? = _state.value.recordingId
    fun isActivelyRecording(): Boolean = _state.value.phase == VisitRecordingPhase.Recording

    /**
     * «Tashrif» tugmasi: visit start + ixtiyoriy recording session.
     * @return visitId (yoki null agar start muvaffaqiyatsiz — baribir navigatsiya qilinishi mumkin)
     */
    suspend fun beginVisit(
        clientId: String,
        clientConsent: Boolean?,
        forceRecordFlag: Boolean? = null,
    ): Result<String?> = mutex.withLock {
        // Oldingi faol yozuvni tashlab yubormaslik — avval navbatga qo‘yib yakunlash
        val prev = _state.value
        val prevActive =
            prev.phase == VisitRecordingPhase.Recording ||
                prev.phase == VisitRecordingPhase.Interrupted ||
                prev.phase == VisitRecordingPhase.Stopped ||
                (prev.clientConsent && prev.recordingId != null && recorder.isRecording)
        if (prevActive) {
            endSessionInternal(outcome = "cancelled", upload = true, clearOnly = false)
        } else {
            endSessionInternal(outcome = "cancelled", upload = false, clearOnly = true)
        }

        // Prefer FRESH server value from refresh — eski lokal true yozuvni boshlamasin
        runCatching { authRepository.refreshAccessToken() }
        val userAfter = authRepository.getUserFlow().first()
        val recordEnabled = forceRecordFlag
            ?: userAfter?.shouldRecordVisitAudio()
            ?: false

        val location = runCatching { deviceLocationProvider.getCurrentLocation() }.getOrNull()
        val startResult = runCatching {
            withContext(Dispatchers.IO) {
                api.startVisit(
                    StartVisitRequest(
                        clientId = clientId,
                        checkInLatitude = location?.latitude,
                        checkInLongitude = location?.longitude,
                        visitedAt = isoFormat.format(Date()),
                    ),
                )
            }
        }

        val start = startResult.getOrNull()
        val visitId = start?.visit?.id
        val serverRecordFlag = start?.recordVisitAudio == true
        // Server qiymati ustun — eski lokal true yozuvni boshlamasin
        val shouldRecord = serverRecordFlag && recordEnabled

        if (visitId == null) {
            _state.update {
                VisitRecordingUiState(clientId = clientId, errorKey = "visit_start_failed")
            }
            return@withLock Result.success(null)
        }

        _state.update {
            VisitRecordingUiState(
                visitId = visitId,
                clientId = clientId,
                recordEnabled = shouldRecord,
                phase = VisitRecordingPhase.Idle,
            )
        }

        if (!shouldRecord || clientConsent == null) {
            return@withLock Result.success(visitId)
        }

        val session = runCatching {
            withContext(Dispatchers.IO) {
                api.openRecordingSession(
                    OpenRecordingSessionRequest(
                        visitId = visitId,
                        clientConsent = clientConsent,
                    ),
                )
            }
        }.getOrNull()

        if (session == null) {
            return@withLock Result.success(visitId)
        }

        if (!clientConsent || session.status == "consent_denied") {
            _state.update {
                it.copy(
                    recordingId = session.id,
                    clientConsent = false,
                    phase = VisitRecordingPhase.Idle,
                    showBanner = false,
                )
            }
            return@withLock Result.success(visitId)
        }

        if (!MicAccess.isGranted(context)) {
            _state.update {
                it.copy(
                    recordingId = session.id,
                    clientConsent = true,
                    phase = VisitRecordingPhase.Failed,
                    showBanner = false,
                    errorKey = "mic_permission_denied",
                )
            }
            return@withLock Result.success(visitId)
        }

        val started = startLocalRecording(session.id, visitId, clientId)
        if (!started) {
            _state.update {
                it.copy(
                    recordingId = session.id,
                    clientConsent = true,
                    phase = VisitRecordingPhase.Failed,
                    showBanner = false,
                    errorKey = "recording_start_failed",
                )
            }
        }
        Result.success(visitId)
    }

    private fun startLocalRecording(recordingId: String, visitId: String, clientId: String): Boolean {
        return try {
            val file = recorder.start(recordingId)
            localFilePath = file.absolutePath
            startedAtElapsedRealtime = android.os.SystemClock.elapsedRealtime()
            _state.update {
                it.copy(
                    visitId = visitId,
                    recordingId = recordingId,
                    clientId = clientId,
                    clientConsent = true,
                    recordEnabled = true,
                    phase = VisitRecordingPhase.Recording,
                    elapsedSeconds = 0,
                    amplitude = 0f,
                    showBanner = true,
                    errorKey = null,
                )
            }
            startForegroundService()
            startTimer()
            startAmplitudePolling()
            true
        } catch (_: Exception) {
            recorder.cancel()
            localFilePath = null
            false
        }
    }

    /** Tizim recorder ni to‘xtatganda (chiquvchi qo‘ng‘iroq, mic lost). */
    fun onRecorderInterrupted(reason: String = "interrupted") {
        scope.launch {
            mutex.withLock {
                if (_state.value.phase != VisitRecordingPhase.Recording) return@withLock
                val file = runCatching { recorder.stop() }.getOrNull()
                localFilePath = file?.absolutePath ?: localFilePath
                stopTimer()
                stopForegroundService()
                val seconds = _state.value.elapsedSeconds
                _state.update {
                    it.copy(
                        phase = VisitRecordingPhase.Interrupted,
                        showBanner = true,
                        amplitude = 0f,
                        errorKey = reason,
                    )
                }
                val recordingId = _state.value.recordingId ?: return@withLock
                queuePending(
                    recordingId = recordingId,
                    visitId = _state.value.visitId,
                    clientId = _state.value.clientId,
                    interrupted = true,
                    failureReason = reason,
                    durationSeconds = seconds,
                )
            }
        }
    }

    /**
     * Tashrif tugashi: buyurtma bilan / buysiz / bekor.
     * Audio xatosi buyurtmani yo‘qotmasin.
     */
    /** @return true — audio muvaffaqiyatli yuklandi (toast uchun) */
    suspend fun endVisit(
        outcome: String,
        orderId: String? = null,
        orderTotal: Double? = null,
        notes: String? = null,
    ): Boolean = mutex.withLock {
        endSessionInternal(
            outcome = outcome,
            orderId = orderId,
            orderTotal = orderTotal,
            notes = notes,
            upload = true,
            clearOnly = false,
        )
    }

    /** Faqat lokal holatni tozalash (yangi tashrif oldidan). */
    suspend fun clearIfIdle() = mutex.withLock {
        if (_state.value.phase == VisitRecordingPhase.Idle &&
            _state.value.visitId == null
        ) {
            return@withLock
        }
        if (_state.value.phase == VisitRecordingPhase.Recording) return@withLock
        _state.value = VisitRecordingUiState()
    }

    private suspend fun endSessionInternal(
        outcome: String,
        orderId: String? = null,
        orderTotal: Double? = null,
        notes: String? = null,
        upload: Boolean,
        clearOnly: Boolean,
    ): Boolean {
        val snapshot = _state.value
        val visitId = snapshot.visitId
        val recordingId = snapshot.recordingId
        val wasRecording = snapshot.phase == VisitRecordingPhase.Recording ||
            snapshot.phase == VisitRecordingPhase.Interrupted ||
            snapshot.phase == VisitRecordingPhase.Stopped
        val hadConsentAudio = snapshot.clientConsent && recordingId != null

        stopTimer()
        var file: File? = null
        if (recorder.isRecording) {
            file = runCatching { recorder.stop() }.getOrNull()
            localFilePath = file?.absolutePath ?: localFilePath
        } else if (localFilePath != null) {
            file = File(localFilePath!!)
        }
        stopForegroundService()

        val duration = snapshot.elapsedSeconds
        val interrupted = snapshot.phase == VisitRecordingPhase.Interrupted
        var uploaded = false

        // Avval audio finish+upload, keyin visit complete — aks holda yozuv «pending»da qolib ketadi
        if (!clearOnly && upload && hadConsentAudio && recordingId != null &&
            (wasRecording || file != null)
        ) {
            _state.update {
                it.copy(
                    phase = VisitRecordingPhase.Uploading,
                    showBanner = false,
                    amplitude = 0f,
                )
            }
            val path = file?.absolutePath ?: localFilePath
            runCatching {
                queuePending(
                    recordingId = recordingId,
                    visitId = visitId,
                    clientId = snapshot.clientId,
                    interrupted = interrupted,
                    failureReason = if (interrupted) snapshot.errorKey else null,
                    durationSeconds = duration,
                    orderId = orderId,
                    outcome = outcome,
                    localPath = path,
                )
            }.onFailure {
                android.util.Log.e("VisitRecording", "queuePending failed id=$recordingId", it)
            }
            uploaded = tryUploadNow(
                recordingId = recordingId,
                visitId = visitId,
                localPath = path,
                durationSeconds = duration,
                interrupted = interrupted,
                failureReason = if (interrupted) snapshot.errorKey else null,
                orderId = orderId,
                outcome = outcome,
                orderTotal = orderTotal,
            )
            _state.update {
                it.copy(
                    phase = if (uploaded) VisitRecordingPhase.Uploaded else VisitRecordingPhase.Failed,
                    showBanner = false,
                )
            }
            RecordingUploadWorker.enqueueImmediate(context)
            if (!uploaded) {
                RecordingUploadWorker.enqueueOnConnected(context)
            }
        }

        if (!clearOnly && visitId != null) {
            runCatching {
                withContext(Dispatchers.IO) {
                    api.completeVisit(
                        visitId,
                        CompleteVisitRequest(
                            orderTotal = orderTotal,
                            orderId = orderId,
                            outcome = outcome,
                            notes = notes,
                        ),
                    )
                }
            }
        }

        localFilePath = null
        startedAtElapsedRealtime = 0L
        _state.value = VisitRecordingUiState()
        return uploaded
    }

    private suspend fun queuePending(
        recordingId: String,
        visitId: String?,
        clientId: String?,
        interrupted: Boolean,
        failureReason: String?,
        durationSeconds: Int,
        orderId: String? = null,
        outcome: String? = null,
        localPath: String? = localFilePath,
    ) {
        val path = localPath ?: return
        if (!File(path).exists() || File(path).length() <= 0L) return
        val vId = visitId ?: _state.value.visitId ?: return
        val cId = clientId ?: _state.value.clientId ?: return
        withContext(Dispatchers.IO) {
            db.pendingRecordingDao().insert(
                PendingRecordingEntity(
                    recordingId = recordingId,
                    visitId = vId,
                    clientId = cId,
                    localFilePath = path,
                    durationSeconds = durationSeconds,
                    interrupted = interrupted,
                    failureReason = failureReason,
                    orderId = orderId,
                    outcome = outcome,
                ),
            )
        }
    }

    private suspend fun tryUploadNow(
        recordingId: String,
        visitId: String?,
        localPath: String?,
        durationSeconds: Int,
        interrupted: Boolean,
        failureReason: String?,
        orderId: String?,
        outcome: String?,
        orderTotal: Double? = null,
    ): Boolean {
        if (!networkMonitor.isCurrentlyOnline()) return false
        val file = localPath?.let { File(it) }?.takeIf { it.exists() && it.length() > 0 }
            ?: return false
        return withContext(Dispatchers.IO) {
            try {
                val pending = db.pendingRecordingDao().getById(recordingId)
                val resolvedVisitId = visitId ?: pending?.visitId
                var finishSent = pending?.finishSent == true
                var uploadSent = pending?.uploadSent == true
                var linkSent = pending?.linkSent == true

                if (!finishSent) {
                    api.finishRecording(
                        recordingId,
                        FinishRecordingRequest(
                            durationSeconds = durationSeconds,
                            interrupted = interrupted,
                            failureReason = failureReason,
                            orderId = orderId,
                            outcome = outcome,
                        ),
                    )
                    finishSent = true
                    db.pendingRecordingDao().updateProgress(
                        id = recordingId,
                        finishSent = true,
                        uploadSent = uploadSent,
                        linkSent = linkSent,
                        orderId = orderId,
                        outcome = outcome,
                        syncStatus = SyncStatus.PENDING.name,
                    )
                }
                // Offline paytda completeVisit yiqilgan bo'lsa — upload paytida qayta uriniladi
                if (!resolvedVisitId.isNullOrBlank()) {
                    runCatching {
                        api.completeVisit(
                            resolvedVisitId,
                            CompleteVisitRequest(
                                orderTotal = orderTotal,
                                orderId = orderId,
                                outcome = outcome ?: "without_order",
                            ),
                        )
                    }
                }
                if (!uploadSent) {
                    val body = file.asRequestBody("audio/mp4".toMediaTypeOrNull())
                    val part = MultipartBody.Part.createFormData("file", file.name, body)
                    api.uploadRecording(recordingId, part)
                    uploadSent = true
                }
                if (!linkSent && !orderId.isNullOrBlank()) {
                    runCatching {
                        api.linkRecordingOrder(recordingId, LinkRecordingOrderRequest(orderId))
                    }
                    linkSent = true
                }
                db.pendingRecordingDao().updateProgress(
                    id = recordingId,
                    finishSent = finishSent,
                    uploadSent = uploadSent,
                    linkSent = linkSent,
                    orderId = orderId,
                    outcome = outcome,
                    syncStatus = if (uploadSent) SyncStatus.SYNCED.name else SyncStatus.PENDING.name,
                )
                if (uploadSent) {
                    file.delete()
                    db.pendingRecordingDao().delete(recordingId)
                }
                uploadSent
            } catch (e: Exception) {
                android.util.Log.e("VisitRecording", "upload failed id=$recordingId", e)
                false
            }
        }
    }

    /** WorkManager / sync: navbatdagi fayllarni yuborish (idempotent). */
    suspend fun syncPendingUploads(): Int {
        if (!networkMonitor.isCurrentlyOnline()) return 0
        var synced = 0
        val pending = withContext(Dispatchers.IO) { db.pendingRecordingDao().getPending() }
        for (row in pending) {
            val ok = tryUploadNow(
                recordingId = row.recordingId,
                visitId = row.visitId,
                localPath = row.localFilePath,
                durationSeconds = row.durationSeconds,
                interrupted = row.interrupted,
                failureReason = row.failureReason,
                orderId = row.orderId,
                outcome = row.outcome,
            )
            if (ok) synced++
        }
        return synced
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = scope.launch {
            while (isActive && _state.value.phase == VisitRecordingPhase.Recording) {
                val elapsed = ((android.os.SystemClock.elapsedRealtime() - startedAtElapsedRealtime) / 1000L)
                    .toInt()
                    .coerceAtLeast(0)
                _state.update { it.copy(elapsedSeconds = elapsed) }
                delay(250)
            }
        }
    }

    private fun startAmplitudePolling() {
        amplitudeJob?.cancel()
        amplitudeJob = scope.launch {
            while (isActive && _state.value.phase == VisitRecordingPhase.Recording) {
                val amp = recorder.amplitudeNorm()
                _state.update { it.copy(amplitude = amp) }
                delay(80)
            }
        }
    }

    private fun stopTimer() {
        timerJob?.cancel()
        timerJob = null
        amplitudeJob?.cancel()
        amplitudeJob = null
    }

    private fun startForegroundService() {
        runCatching {
            ContextCompat.startForegroundService(
                context,
                Intent(context, VisitRecordingService::class.java).apply {
                    action = VisitRecordingService.ACTION_START
                },
            )
        }
    }

    private fun stopForegroundService() {
        runCatching {
            context.startService(
                Intent(context, VisitRecordingService::class.java).apply {
                    action = VisitRecordingService.ACTION_STOP
                },
            )
        }
    }
}
