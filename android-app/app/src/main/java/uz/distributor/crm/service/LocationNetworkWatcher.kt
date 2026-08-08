package uz.distributor.crm.service

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.CartRepository
import uz.distributor.crm.data.repository.LocationRepository
import uz.distributor.crm.util.NetworkMonitor
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Internet qayta yoqilganda offline GPS va buyurtma navbatini yuboradi.
 */
@Singleton
class LocationNetworkWatcher @Inject constructor(
    @ApplicationContext private val context: Context,
    private val locationRepository: LocationRepository,
    private val cartRepository: CartRepository,
    private val networkMonitor: NetworkMonitor,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    @Volatile private var started = false

    fun start() {
        if (started) return
        started = true
        networkMonitor.start()
        scope.launch {
            networkMonitor.isOnline
                .collect { online ->
                    if (!online) return@collect
                    runCatching {
                        repeat(5) {
                            val saved = locationRepository.syncPendingLocations()
                            if (saved == 0) return@repeat
                        }
                    }
                    runCatching { cartRepository.syncPending() }
                    LocationSyncWorker.enqueueImmediate(context)
                }
        }
    }
}
