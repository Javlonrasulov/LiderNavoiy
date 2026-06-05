package uz.distributor.crm.map

import android.app.Application
import org.osmdroid.config.Configuration
import java.io.File

object OsmdroidConfig {
    fun init(app: Application) {
        Configuration.getInstance().apply {
            userAgentValue = "${app.packageName}/1.0.0 (OpenStreetMap)"
            osmdroidBasePath = File(app.cacheDir, "osmdroid")
            osmdroidTileCache = File(osmdroidBasePath, "tiles")
            tileFileSystemCacheMaxBytes = 300L * 1024 * 1024
            tileFileSystemCacheTrimBytes = 200L * 1024 * 1024
            expirationExtendedDuration = 1000L * 60 * 60 * 24 * 30
        }
    }
}
