package uz.lider.client.security

import android.content.Context
import android.os.Build
import uz.lider.client.BuildConfig
import java.io.File

object DeviceIntegrity {
    fun isCompromised(context: Context): Boolean {
        if (BuildConfig.DEBUG) return false
        if (android.os.Debug.isDebuggerConnected() || android.os.Debug.waitingForDebugger()) return true
        if (Build.TAGS?.contains("test-keys") == true) return true
        val paths = listOf(
            "/system/bin/su",
            "/system/xbin/su",
            "/sbin/su",
            "/system/app/Superuser.apk",
            "/system/app/SuperSU.apk",
            "/data/local/xbin/su",
            "/data/local/bin/su",
        )
        if (paths.any { File(it).exists() }) return true
        val pkgs = listOf(
            "com.topjohnwu.magisk",
            "eu.chainfire.supersu",
            "com.koushikdutta.superuser",
            "com.noshufou.android.su",
        )
        val pm = context.packageManager
        return pkgs.any { pkg ->
            runCatching { pm.getPackageInfo(pkg, 0); true }.getOrDefault(false)
        }
    }
}
