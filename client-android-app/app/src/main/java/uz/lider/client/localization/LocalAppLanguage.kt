package uz.lider.client.localization

import androidx.compose.runtime.compositionLocalOf

enum class AppLanguage(val code: String, val shortLabel: String, val menuLabel: String) {
    UZ("uz", "UZ", "O'zbek (Lotin)"),
    UZ_KRIL("uz_kril", "УЗ", "Ўзбек (Кирил)"),
    RU("ru", "RU", "Русский"),
    EN("en", "EN", "English"),
    ;

    companion object {
        val DEFAULT = UZ

        val menuOrder: List<AppLanguage> = listOf(UZ, UZ_KRIL, RU, EN)

        fun fromCode(code: String?): AppLanguage = when (code) {
            UZ.code, "uz_latn" -> UZ
            UZ_KRIL.code, "uz_cyr", "uz_cyrl" -> UZ_KRIL
            RU.code -> RU
            EN.code -> EN
            null -> DEFAULT
            else -> DEFAULT
        }
    }
}

val LocalAppLanguage = compositionLocalOf { AppLanguage.DEFAULT }
