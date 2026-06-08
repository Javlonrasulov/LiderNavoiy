package uz.lider.client.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import dagger.hilt.android.AndroidEntryPoint
import uz.lider.client.data.repository.AppSettingsRepository
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.navigation.ClientNavHost
import uz.lider.client.presentation.theme.ClientTheme
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var appSettingsRepository: AppSettingsRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val darkMode by appSettingsRepository.darkMode.collectAsState(initial = true)
            val language by appSettingsRepository.language.collectAsState(initial = AppLanguage.DEFAULT)
            ClientTheme(darkTheme = darkMode) {
                CompositionLocalProvider(LocalAppLanguage provides language) {
                    ClientNavHost()
                }
            }
        }
    }
}
