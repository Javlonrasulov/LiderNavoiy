package uz.lider.client

import android.app.Application
import dagger.hilt.android.HiltAndroidApp
import uz.lider.client.map.OsmdroidConfig

@HiltAndroidApp
class ClientApp : Application() {
    override fun onCreate() {
        super.onCreate()
        OsmdroidConfig.init(this)
    }
}
