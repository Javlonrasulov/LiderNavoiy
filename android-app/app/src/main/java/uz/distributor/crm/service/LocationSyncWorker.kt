package uz.distributor.crm.service

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import uz.distributor.crm.data.repository.LocationRepository
import java.util.concurrent.TimeUnit

@HiltWorker
class LocationSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val locationRepository: LocationRepository,
    private val cartRepository: uz.distributor.crm.data.repository.CartRepository,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        locationRepository.syncPendingLocations()
        cartRepository.syncPending()
        return Result.success()
    }

    companion object {
        fun enqueue(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<LocationSyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "location_sync",
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }
    }
}
