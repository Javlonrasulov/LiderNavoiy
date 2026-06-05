package uz.distributor.crm.data.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.suspendCancellableCoroutine
import uz.distributor.crm.data.local.AgentLocationHolder
import uz.distributor.crm.domain.model.LocationPoint
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

@Singleton
class DeviceLocationProvider @Inject constructor(
    @ApplicationContext private val context: Context,
    private val agentLocationHolder: AgentLocationHolder,
) {
    private val fusedClient = LocationServices.getFusedLocationProviderClient(context)

    fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_COARSE_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED

    suspend fun getCurrentLocation(): LocationPoint? {
        if (!hasLocationPermission()) {
            return agentLocationHolder.location.value
        }

        val fresh = requestFreshLocation()
        if (fresh != null) {
            agentLocationHolder.update(fresh)
            return fresh
        }
        return agentLocationHolder.location.value
    }

    private suspend fun requestFreshLocation(): LocationPoint? =
        suspendCancellableCoroutine { cont ->
            val tokenSource = CancellationTokenSource()
            fusedClient
                .getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, tokenSource.token)
                .addOnSuccessListener { location ->
                    when {
                        location != null -> cont.resume(location.toPoint())
                        else -> fetchLastLocation(cont)
                    }
                }
                .addOnFailureListener { fetchLastLocation(cont) }

            cont.invokeOnCancellation { tokenSource.cancel() }
        }

    private fun fetchLastLocation(cont: kotlinx.coroutines.CancellableContinuation<LocationPoint?>) {
        fusedClient.lastLocation
            .addOnSuccessListener { location ->
                cont.resume(location?.toPoint())
            }
            .addOnFailureListener {
                cont.resume(null)
            }
    }

    private fun android.location.Location.toPoint() = LocationPoint(
        latitude = latitude,
        longitude = longitude,
        accuracy = if (hasAccuracy()) accuracy else null,
        speed = if (hasSpeed()) speed else null,
        altitude = if (hasAltitude()) altitude else null,
        bearing = if (hasBearing()) bearing else null,
    )
}
