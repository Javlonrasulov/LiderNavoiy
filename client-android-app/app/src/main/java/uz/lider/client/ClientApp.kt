package uz.lider.client

import android.app.Application
import coil.Coil
import coil.ImageLoader
import coil.ImageLoaderFactory
import dagger.Lazy
import dagger.hilt.android.HiltAndroidApp
import uz.lider.client.map.OsmdroidConfig
import uz.lider.client.push.NotificationHelper
import uz.lider.client.security.ScreenSecurity
import javax.inject.Inject

@HiltAndroidApp
class ClientApp : Application(), ImageLoaderFactory {
    @Inject
    lateinit var imageLoader: Lazy<ImageLoader>

    override fun onCreate() {
        super.onCreate()
        Coil.setImageLoader(imageLoader.get())
        ScreenSecurity.install(this)
        OsmdroidConfig.init(this)
        NotificationHelper.createChannel(this)
    }

    override fun newImageLoader(): ImageLoader = imageLoader.get()
}
