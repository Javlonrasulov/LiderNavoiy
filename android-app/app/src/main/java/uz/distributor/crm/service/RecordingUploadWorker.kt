package uz.distributor.crm.service

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import uz.distributor.crm.recording.VisitRecordingManager

@HiltWorker
class RecordingUploadWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val visitRecordingManager: VisitRecordingManager,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        visitRecordingManager.syncPendingUploads()
        return Result.success()
    }

    companion object {
        private const val IMMEDIATE_NAME = "recording_upload_immediate"

        fun enqueueImmediate(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<RecordingUploadWorker>()
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                IMMEDIATE_NAME,
                ExistingWorkPolicy.REPLACE,
                request,
            )
        }

        /** Internet qaytganda periodik sync (offline yakun). */
        fun enqueueOnConnected(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<RecordingUploadWorker>()
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                "recording_upload_on_connected",
                ExistingWorkPolicy.REPLACE,
                request,
            )
        }
    }
}
