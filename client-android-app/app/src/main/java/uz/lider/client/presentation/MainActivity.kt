package uz.lider.client.presentation

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.AppSettingsRepository
import uz.lider.client.data.repository.AuthRepository
import uz.lider.client.data.repository.PushRepository
import uz.lider.client.data.repository.ThemeMode
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.navigation.ClientNavHost
import uz.lider.client.presentation.theme.ClientTheme
import uz.lider.client.presentation.theme.LocalTextTone
import uz.lider.client.presentation.theme.TextTone
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var appSettingsRepository: AppSettingsRepository

    @Inject
    lateinit var authRepository: AuthRepository

    @Inject
    lateinit var pushRepository: PushRepository

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
            val themeMode by appSettingsRepository.themeMode.collectAsState(initial = ThemeMode.DARK)
            val language  by appSettingsRepository.language.collectAsState(initial = AppLanguage.DEFAULT)
            val textTone by appSettingsRepository.textTone.collectAsState(initial = TextTone.DEFAULT)
            val isSystemDark = isSystemInDarkTheme()
            val isDark = appSettingsRepository.resolvedDark(themeMode, isSystemDark)

            ClientTheme(darkTheme = isDark) {
                CompositionLocalProvider(
                    LocalAppLanguage provides language,
                    LocalTextTone provides textTone,
                ) {
                    ClientNavHost()
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
