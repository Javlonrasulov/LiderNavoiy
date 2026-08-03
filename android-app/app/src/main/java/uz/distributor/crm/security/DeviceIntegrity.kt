package uz.distributor.crm.security

import android.content.Context
import android.os.Build
import uz.distributor.crm.BuildConfig
import java.io.File

object DeviceIntegrity {
    /** Release: root / obvious emulator / debugger attached → block login. */
    fun isCompromised(context: Context): Boolean {
        if (BuildConfig.DEBUG) return false
        if (isDebuggerAttached()) return true
        if (hasTestKeys()) return true
        if (hasSuBinary()) return true
        if (hasRootManagementApps(context)) return true
        return false
    }

    private fun isDebuggerAttached(): Boolean =
        android.os.Debug.isDebuggerConnected() || android.os.Debug.waitingForDebugger()

    private fun hasTestKeys(): Boolean =
        Build.TAGS?.contains("test-keys") == true

    private fun hasSuBinary(): Boolean {
        val paths = listOf(
            "/system/bin/su",
            "/system/xbin/su",
            "/sbin/su",
            "/system/app/Superuser.apk",
            "/system/app/SuperSU.apk",
            "/data/local/xbin/su",
            "/data/local/bin/su",
        )
        return paths.any { File(it).exists() }
    }

    private fun hasRootManagementApps(context: Context): Boolean {
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
