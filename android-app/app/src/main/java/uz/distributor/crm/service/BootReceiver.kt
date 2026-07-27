package uz.distributor.crm.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import dagger.hilt.android.EntryPointAccessors
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.AuthRepository

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val pending = goAsync()
        val entry = EntryPointAccessors.fromApplication(
            context.applicationContext,
            BootEntryPoint::class.java,
        )
        CoroutineScope(Dispatchers.IO).launch {
            try {
                if (entry.authRepository().restoreSession()) {
                    entry.locationTrackingController().startIfReady()
                }
            } finally {
                pending.finish()
            }
        }
    }

    @dagger.hilt.EntryPoint
    @dagger.hilt.InstallIn(dagger.hilt.components.SingletonComponent::class)
    interface BootEntryPoint {
        fun authRepository(): AuthRepository
        fun locationTrackingController(): LocationTrackingController
    }
}
