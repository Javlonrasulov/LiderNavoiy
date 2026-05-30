package uz.distributor.crm.localization

enum class AppLanguage(val code: String, val shortLabel: String, val menuLabel: String) {
    UZ_LATIN("uz", "UZ", "O'zbek (Lotin)"),
    RUS("ru", "RU", "Русский"),
    UZ_CYRILLIC("uz_cyr", "УЗ", "Ўзбек (Кирил)"),
    ;

    /** Menyu tartibi: o'zbek lotin → rus → o'zbek kirill */
    fun next(): AppLanguage = when (this) {
        UZ_LATIN -> RUS
        RUS -> UZ_CYRILLIC
        UZ_CYRILLIC -> UZ_LATIN
    }

    companion object {
        val DEFAULT = UZ_CYRILLIC

        /** Til tanlash menyusidagi tartib */
        val menuOrder: List<AppLanguage> = listOf(UZ_LATIN, RUS, UZ_CYRILLIC)

        fun fromCode(code: String?): AppLanguage = when (code) {
            UZ_LATIN.code, "uz_latn" -> UZ_LATIN
            RUS.code -> RUS
            UZ_CYRILLIC.code, "uz_cyrl", null -> UZ_CYRILLIC
            else -> DEFAULT
        }
    }
}
