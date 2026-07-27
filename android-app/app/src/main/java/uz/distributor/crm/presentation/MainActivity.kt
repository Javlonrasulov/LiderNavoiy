package uz.distributor.crm.presentation

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.CompositionLocalProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import uz.distributor.crm.data.repository.AppSettingsRepository
import uz.distributor.crm.data.repository.AuthRepository
import uz.distributor.crm.data.repository.MessagesRealtimeCoordinator
import uz.distributor.crm.data.repository.PushRepository
import uz.distributor.crm.presentation.navigation.OpenChatHolder
import uz.distributor.crm.push.EXTRA_OPEN_CONVERSATION_ID
import uz.distributor.crm.push.EXTRA_OPEN_SCREEN
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.navigation.AppNavHost
import uz.distributor.crm.presentation.theme.DistributorTheme
import uz.distributor.crm.service.LocationTrackingController
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var pushRepository: PushRepository
    @Inject lateinit var authRepository: AuthRepository
    @Inject lateinit var appSettingsRepository: AppSettingsRepository
    @Inject lateinit var messagesRealtime: MessagesRealtimeCoordinator
    @Inject lateinit var locationTrackingController: LocationTrackingController

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) registerFcmIfLoggedIn()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        captureOpenIntent(intent)
        lifecycleScope.launch {
            if (authRepository.restoreSession()) {
                messagesRealtime.start()
                // Sessiya tiklanganda GPS kuzatuvni qayta yoqish (admin online uchun muhim)
                locationTrackingController.startIfReady()
            }
        }
        requestNotificationPermission()
        setContent {
            val darkMode by appSettingsRepository.darkMode.collectAsState(initial = false)
            val language by appSettingsRepository.language.collectAsState(initial = AppLanguage.DEFAULT)
            DistributorTheme(darkTheme = darkMode) {
                CompositionLocalProvider(LocalAppLanguage provides language) {
                    AppNavHost()
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        lifecycleScope.launch {
            if (authRepository.restoreSession()) {
                locationTrackingController.startIfReady()
            }
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            registerFcmIfLoggedIn()
            return
        }
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED -> registerFcmIfLoggedIn()
            else -> notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        captureOpenIntent(intent)
    }

    private fun captureOpenIntent(intent: android.content.Intent?) {
        if (intent == null) return
        // Bizning PendingIntent + FCM system tray data extras
        (intent.getStringExtra(EXTRA_OPEN_CONVERSATION_ID)
            ?: intent.getStringExtra("conversationId"))?.let {
            OpenChatHolder.requestOpenChat(it)
        }
        val screen = intent.getStringExtra(EXTRA_OPEN_SCREEN)
            ?: intent.getStringExtra("screen")
            ?: intent.extras?.getString("screen")
        if (screen == "plan" || intent.getStringExtra("type") == "plan") {
            OpenChatHolder.requestOpenPlan()
        }
    }

    private fun registerFcmIfLoggedIn() {
        lifecycleScope.launch {
            if (authRepository.restoreSession()) {
                messagesRealtime.start()
                runCatching { pushRepository.registerCurrentToken() }
            }
        }
    }
}
