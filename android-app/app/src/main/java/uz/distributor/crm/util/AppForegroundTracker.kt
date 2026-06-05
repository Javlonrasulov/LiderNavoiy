package uz.distributor.crm.util

import android.os.Handler
import android.os.Looper
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner

object AppForegroundTracker : DefaultLifecycleObserver {
    @Volatile
    var isInForeground: Boolean = false
        private set

    fun init() {
        // Application.onCreate da darhol chaqirilsa ba'zi qurilmalarda crash beradi
        Handler(Looper.getMainLooper()).post {
            ProcessLifecycleOwner.get().lifecycle.addObserver(this)
        }
    }

    override fun onStart(owner: LifecycleOwner) {
        isInForeground = true
    }

    override fun onStop(owner: LifecycleOwner) {
        isInForeground = false
    }
}
