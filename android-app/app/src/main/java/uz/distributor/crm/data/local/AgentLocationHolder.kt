package uz.distributor.crm.data.local

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import uz.distributor.crm.domain.model.LocationPoint
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AgentLocationHolder @Inject constructor() {
    private val _location = MutableStateFlow<LocationPoint?>(null)
    val location: StateFlow<LocationPoint?> = _location.asStateFlow()

    fun update(point: LocationPoint) {
        _location.value = point
    }
}
