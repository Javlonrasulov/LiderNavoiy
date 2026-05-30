package uz.distributor.crm

import android.app.Application
import com.yandex.mapkit.MapKitFactory
import dagger.hilt.android.HiltAndroidApp
import uz.distributor.crm.push.NotificationHelper
import uz.distributor.crm.util.AppForegroundTracker

@HiltAndroidApp
class DistributorApp : Application() {
    override fun onCreate() {
        super.onCreate()
        AppForegroundTracker.init()
        NotificationHelper.createChannel(this)
        MapKitFactory.setApiKey(BuildConfig.MAPKIT_API_KEY.ifEmpty { "YOUR_YANDEX_MAPKIT_KEY" })
        MapKitFactory.initialize(this)
    }
}
