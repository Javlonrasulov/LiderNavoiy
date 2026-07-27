package uz.distributor.crm

import android.app.Application
import dagger.hilt.android.HiltAndroidApp
import uz.distributor.crm.map.OsmdroidConfig
import uz.distributor.crm.push.NotificationHelper
import uz.distributor.crm.service.LocationNetworkWatcher
import uz.distributor.crm.util.AppForegroundTracker
import javax.inject.Inject

@HiltAndroidApp
class DistributorApp : Application() {

    @Inject lateinit var locationNetworkWatcher: LocationNetworkWatcher

    override fun onCreate() {
        super.onCreate()
        AppForegroundTracker.init()
        NotificationHelper.createChannel(this)
        OsmdroidConfig.init(this)
        locationNetworkWatcher.start()
    }
}
