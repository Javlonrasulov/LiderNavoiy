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
import uz.distributor.crm.data.repository.PushRepository
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.navigation.AppNavHost
import uz.distributor.crm.presentation.theme.DistributorTheme
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var pushRepository: PushRepository
    @Inject lateinit var authRepository: AuthRepository
    @Inject lateinit var appSettingsRepository: AppSettingsRepository

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) registerFcmIfLoggedIn()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
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

    private fun registerFcmIfLoggedIn() {
        lifecycleScope.launch {
            if (authRepository.restoreSession()) {
                runCatching { pushRepository.registerCurrentToken() }
            }
        }
    }
}
