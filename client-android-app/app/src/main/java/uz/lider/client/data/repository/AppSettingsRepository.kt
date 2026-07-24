package uz.lider.client.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import uz.lider.client.localization.AppLanguage
import uz.lider.client.presentation.components.ChartVisualStyle
import uz.lider.client.presentation.theme.TextTone
import javax.inject.Inject
import javax.inject.Singleton

private val Context.settingsDataStore by preferencesDataStore("client_app_settings")

enum class ThemeMode(val code: String) {
    DARK("dark"),
    LIGHT("light"),
    SYSTEM("system");

    companion object {
        fun fromCode(code: String?): ThemeMode = entries.firstOrNull { it.code == code } ?: DARK
    }
}

@Singleton
class AppSettingsRepository @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val themeModeKey = stringPreferencesKey("theme_mode")
    private val languageKey  = stringPreferencesKey("language")
    private val chartStyleKey = stringPreferencesKey("chart_style")
    private val textToneKey = stringPreferencesKey("text_tone")

    val themeMode: Flow<ThemeMode> = context.settingsDataStore.data.map { prefs ->
        ThemeMode.fromCode(prefs[themeModeKey])
    }

    /** Legacy convenience — resolves SYSTEM to the actual boolean using the provided system value. */
    fun resolvedDark(themeMode: ThemeMode, isSystemDark: Boolean): Boolean = when (themeMode) {
        ThemeMode.DARK   -> true
        ThemeMode.LIGHT  -> false
        ThemeMode.SYSTEM -> isSystemDark
    }

    val language: Flow<AppLanguage> = context.settingsDataStore.data.map { prefs ->
        AppLanguage.fromCode(prefs[languageKey])
    }

    val chartStyle: Flow<ChartVisualStyle> = context.settingsDataStore.data.map { prefs ->
        ChartVisualStyle.fromKey(prefs[chartStyleKey])
    }

    val textTone: Flow<TextTone> = context.settingsDataStore.data.map { prefs ->
        TextTone.fromCode(prefs[textToneKey])
    }

    suspend fun setThemeMode(mode: ThemeMode) {
        context.settingsDataStore.edit { it[themeModeKey] = mode.code }
    }

    suspend fun setLanguage(language: AppLanguage) {
        context.settingsDataStore.edit { it[languageKey] = language.code }
    }

    suspend fun setChartStyle(style: ChartVisualStyle) {
        context.settingsDataStore.edit { it[chartStyleKey] = style.key }
    }

    suspend fun setTextTone(tone: TextTone) {
        context.settingsDataStore.edit { it[textToneKey] = tone.code }
    }
}
