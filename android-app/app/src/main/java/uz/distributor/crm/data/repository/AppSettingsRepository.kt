package uz.distributor.crm.data.repository

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import uz.distributor.crm.localization.AppLanguage
import javax.inject.Inject
import javax.inject.Singleton

private val Context.settingsDataStore by preferencesDataStore("app_settings")

@Singleton
class AppSettingsRepository @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val darkModeKey = booleanPreferencesKey("dark_mode")
    private val languageKey = stringPreferencesKey("language")
    private val activeClientIdKey = stringPreferencesKey("active_client_id")

    val darkMode: Flow<Boolean> = context.settingsDataStore.data.map { prefs ->
        prefs[darkModeKey] ?: false
    }

    val language: Flow<AppLanguage> = context.settingsDataStore.data.map { prefs ->
        AppLanguage.fromCode(prefs[languageKey])
    }

    suspend fun toggleDarkMode() {
        val current = darkMode.first()
        context.settingsDataStore.edit { it[darkModeKey] = !current }
    }

    suspend fun setLanguage(language: AppLanguage) {
        context.settingsDataStore.edit { it[languageKey] = language.code }
    }

    suspend fun setActiveClientId(clientId: String) {
        context.settingsDataStore.edit { it[activeClientIdKey] = clientId }
    }

    suspend fun getActiveClientId(): String? =
        context.settingsDataStore.data.first()[activeClientIdKey]
}
