package uz.distributor.crm.util

/**
 * O‘zbek lotin ↔ kirill (offline qidiruv uchun).
 * Backend [uz-script.util.ts] bilan mos.
 */
object UzScript {
    private val cyrToLat = mapOf(
        'а' to "a", 'б' to "b", 'в' to "v", 'г' to "g", 'д' to "d", 'е' to "e",
        'ё' to "yo", 'ж' to "j", 'з' to "z", 'и' to "i", 'й' to "y", 'к' to "k",
        'л' to "l", 'м' to "m", 'н' to "n", 'о' to "o", 'п' to "p", 'р' to "r",
        'с' to "s", 'т' to "t", 'у' to "u", 'ф' to "f", 'х' to "x", 'ц' to "ts",
        'ч' to "ch", 'ш' to "sh", 'щ' to "sh", 'ъ' to "'", 'ы' to "i", 'ь' to "",
        'э' to "e", 'ю' to "yu", 'я' to "ya",
        'ғ' to "g'", 'қ' to "q", 'ҳ' to "h", 'ў' to "o'", 'ӯ' to "u",
    )

    private val latToCyrDigraphs = listOf(
        "o'" to "ў",
        "g'" to "ғ",
        "sh" to "ш",
        "ch" to "ч",
        "yo" to "ё",
        "yu" to "ю",
        "ya" to "я",
        "ts" to "ц",
        "ye" to "е",
    )

    private val latToCyrSingle = mapOf(
        'a' to 'а', 'b' to 'б', 'v' to 'в', 'g' to 'г', 'd' to 'д', 'e' to 'е',
        'j' to 'ж', 'z' to 'з', 'i' to 'и', 'y' to 'й', 'k' to 'к', 'l' to 'л',
        'm' to 'м', 'n' to 'н', 'o' to 'о', 'p' to 'п', 'r' to 'р', 's' to 'с',
        't' to 'т', 'u' to 'у', 'f' to 'ф', 'x' to 'х', 'q' to 'қ', 'h' to 'ҳ',
    )

    private fun normalizeApostrophes(s: String): String =
        s.replace(Regex("[ʼ'`´ʻ’]"), "'")
            .replace("oʻ", "o'", ignoreCase = true)
            .replace("gʻ", "g'", ignoreCase = true)

    fun cyrillicToLatin(input: String): String {
        val raw = normalizeApostrophes(input)
        val out = StringBuilder()
        for (ch in raw) {
            val lower = ch.lowercaseChar()
            val mapped = cyrToLat[lower]
            if (mapped == null) {
                out.append(ch)
            } else if (ch.isUpperCase() && mapped.isNotEmpty()) {
                out.append(mapped.replaceFirstChar { it.uppercaseChar() })
            } else {
                out.append(mapped)
            }
        }
        return out.toString()
    }

    fun latinToCyrillic(input: String): String {
        val raw = normalizeApostrophes(input)
        val out = StringBuilder()
        var i = 0
        while (i < raw.length) {
            val restLower = raw.substring(i).lowercase()
            var matched = false
            for ((lat, cyr) in latToCyrDigraphs) {
                if (restLower.startsWith(lat)) {
                    val src = raw.substring(i, i + lat.length)
                    out.append(if (src.firstOrNull()?.isUpperCase() == true) cyr.uppercase() else cyr)
                    i += lat.length
                    matched = true
                    break
                }
            }
            if (matched) continue
            val ch = raw[i]
            val mapped = latToCyrSingle[ch.lowercaseChar()]
            if (mapped != null) {
                out.append(if (ch.isUpperCase()) mapped.uppercaseChar() else mapped)
            } else {
                out.append(ch)
            }
            i++
        }
        return out.toString()
    }

    fun searchVariants(query: String): List<String> {
        val q = query.trim()
        if (q.isEmpty()) return emptyList()
        return linkedSetOf(q, cyrillicToLatin(q), latinToCyrillic(q))
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .distinct()
    }

    fun matches(haystack: String?, query: String): Boolean {
        if (haystack.isNullOrBlank() || query.isBlank()) return false
        val h = haystack.lowercase()
        val hLat = cyrillicToLatin(haystack).lowercase()
        return searchVariants(query).any { v ->
            val vl = v.lowercase()
            h.contains(vl) || hLat.contains(cyrillicToLatin(v).lowercase())
        }
    }
}
