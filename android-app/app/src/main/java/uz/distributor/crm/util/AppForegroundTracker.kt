package uz.distributor.crm.util

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner

object AppForegroundTracker : DefaultLifecycleObserver {
    @Volatile
    var isInForeground: Boolean = false
        private set

    fun init() {
        ProcessLifecycleOwner.get().lifecycle.addObserver(this)
    }

    override fun onStart(owner: LifecycleOwner) {
        isInForeground = true
    }

    override fun onStop(owner: LifecycleOwner) {
        isInForeground = false
    }
}
