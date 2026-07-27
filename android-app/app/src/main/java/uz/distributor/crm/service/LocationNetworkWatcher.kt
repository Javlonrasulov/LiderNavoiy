package uz.distributor.crm.service

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.LocationRepository
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Internet qayta yoqilganda offline GPS navbatini darhol yuboradi.
 */
@Singleton
class LocationNetworkWatcher @Inject constructor(
    @ApplicationContext private val context: Context,
    private val locationRepository: LocationRepository,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    @Volatile private var registered = false

    fun start() {
        if (registered) return
        registered = true
        val cm = context.getSystemService(ConnectivityManager::class.java) ?: return
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        cm.registerNetworkCallback(
            request,
            object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    scope.launch {
                        runCatching {
                            // Bir necha batch — to‘liq yetkazish
                            repeat(5) {
                                val saved = locationRepository.syncPendingLocations()
                                if (saved == 0) return@launch
                            }
                        }
                        LocationSyncWorker.enqueueImmediate(context)
                    }
                }
            },
        )
    }
}
