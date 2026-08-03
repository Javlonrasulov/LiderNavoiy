package uz.lider.client

import android.app.Application
import dagger.hilt.android.HiltAndroidApp
import uz.lider.client.map.OsmdroidConfig
import uz.lider.client.push.NotificationHelper
import uz.lider.client.security.ScreenSecurity

@HiltAndroidApp
class ClientApp : Application() {
    override fun onCreate() {
        super.onCreate()
        ScreenSecurity.install(this)
        OsmdroidConfig.init(this)
        NotificationHelper.createChannel(this)
    }
}
