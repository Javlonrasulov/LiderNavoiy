package uz.lider.client.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.AppSettingsRepository
import uz.lider.client.localization.AppLanguage
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val appSettingsRepository: AppSettingsRepository,
) : ViewModel() {

    val darkMode: StateFlow<Boolean> = appSettingsRepository.darkMode
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    val language: StateFlow<AppLanguage> = appSettingsRepository.language
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AppLanguage.DEFAULT)

    fun setDarkMode(enabled: Boolean) {
        viewModelScope.launch { appSettingsRepository.setDarkMode(enabled) }
    }

    fun toggleDarkMode() {
        viewModelScope.launch { appSettingsRepository.toggleDarkMode() }
    }

    fun setLanguage(language: AppLanguage) {
        viewModelScope.launch { appSettingsRepository.setLanguage(language) }
    }
}
