package uz.distributor.crm.presentation.clients

import uz.distributor.crm.data.remote.dto.ClientDto
import uz.distributor.crm.data.remote.dto.LineDto
import java.text.Normalizer

/**
 * Manager APK `AddClientScreen.tsx`, `utils/clientSimilarity.ts`, `utils/clientLogin.ts`
 * dagi mantiqning Kotlin nusxasi — natijalar bir xil bo‘lishi kerak.
 */
object CustomerFormLogic {

    const val DEFAULT_CLIENT_APP_PASSWORD = "123456"
    const val RADIUS_MIN = 50
    const val RADIUS_MAX = 500
    const val RADIUS_STEP = 10
    const val RADIUS_DEFAULT = 50

    /** UI: +998 93 559 96 99 */
    fun formatUzPhone(raw: String): String {
        var digits = raw.filter { it.isDigit() }
        digits = when {
            digits.startsWith("998") -> digits.drop(3)
            digits.startsWith("0") -> digits.drop(1)
            else -> digits
        }.take(9)
        val out = StringBuilder("+998")
        if (digits.isEmpty()) return out.toString()
        out.append(' ').append(digits.take(2))
        if (digits.length > 2) out.append(' ').append(digits.substring(2, minOf(5, digits.length)))
        if (digits.length > 5) out.append(' ').append(digits.substring(5, minOf(7, digits.length)))
        if (digits.length > 7) out.append(' ').append(digits.substring(7, minOf(9, digits.length)))
        return out.toString()
    }

    /** API: +998 93 559 96 99 yoki null (bo‘sh) */
    fun phoneToStorage(formatted: String): String? {
        val digits = formatted.filter { it.isDigit() }
        if (digits.isEmpty() || digits == "998") return null
        val local = if (digits.startsWith("998")) digits.drop(3) else digits
        if (local.isEmpty()) return null
        return formatUzPhone(digits)
    }

    fun isPhoneComplete(formatted: String): Boolean {
        val stored = phoneToStorage(formatted) ?: return false
        return stored.count { it.isDigit() } >= 12
    }

    fun normalizeInnInput(raw: String): String = raw.filter { it.isDigit() }.take(14)

    /** Keyingi raqamli kod: 01, 02, 03… */
    fun nextNumericLineCode(existing: List<LineDto>): String {
        var max = 0
        for (row in existing) {
            val code = row.code.trim()
            if (code.isEmpty() || !code.all { it.isDigit() }) continue
            val n = code.toIntOrNull() ?: continue
            if (n > max) max = n
        }
        return (max + 1).toString().padStart(2, '0')
    }

    private val latinToCyr: List<Pair<Regex, String>> = listOf(
        Regex("o['‘’`ʻ]") to "ў", Regex("g['‘’`ʻ]") to "ғ", Regex("sh") to "ш", Regex("ch") to "ч",
        Regex("ya") to "я", Regex("yu") to "ю", Regex("yo") to "ё",
        Regex("a") to "а", Regex("b") to "б", Regex("d") to "д", Regex("e") to "е", Regex("f") to "ф",
        Regex("g") to "г", Regex("h") to "ҳ", Regex("i") to "и", Regex("j") to "ж", Regex("k") to "к",
        Regex("l") to "л", Regex("m") to "м", Regex("n") to "н", Regex("o") to "о", Regex("p") to "п",
        Regex("q") to "қ", Regex("r") to "р", Regex("s") to "с", Regex("t") to "т", Regex("u") to "у",
        Regex("v") to "в", Regex("x") to "х", Regex("y") to "й", Regex("z") to "з",
    )
    private val microDistrict = Regex("^(микро?р?(айон|н)?|мкрн?)$")
    private val tokenSplit = Regex("[^\\p{L}\\p{N}]+")

    private fun lineNameTokens(raw: String): List<String> {
        var s = raw.lowercase()
        for ((re, to) in latinToCyr) s = s.replace(re, to)
        s = s.replace('ё', 'е').replace('ҳ', 'х').replace('ў', 'у').replace('қ', 'к').replace('ғ', 'г')
        return s.split(tokenSplit)
            .filter { it.isNotEmpty() }
            .map { if (microDistrict.matches(it)) "мкр" else it }
    }

    private fun tokensMatch(a: String, b: String): Boolean {
        if (a == b) return true
        if (a.all { it.isDigit() } || b.all { it.isDigit() } || a.length < 4 || b.length < 4) return false
        return a.startsWith(b) || b.startsWith(a)
    }

    /** "7 мкр" ≈ "7-микр", "Вокзал Мира" ≈ "Вокзал" */
    fun findSimilarLines(name: String, existing: List<LineDto>): List<LineDto> {
        val tokens = lineNameTokens(name)
        if (tokens.isEmpty()) return emptyList()
        return existing.filter { line ->
            val other = lineNameTokens(line.name)
            if (other.isEmpty()) return@filter false
            val (small, big) = if (tokens.size <= other.size) tokens to other else other to tokens
            small.all { tok -> big.any { b -> tokensMatch(tok, b) } }
        }
    }

    // ─── Mijoz ilovasi logini (backend nameToLogin bilan bir xil) ───

    private val cyrillicToLatin: Map<Char, String> = mapOf(
        'а' to "a", 'б' to "b", 'в' to "v", 'г' to "g", 'д' to "d", 'е' to "e", 'ё' to "yo", 'ж' to "zh",
        'з' to "z", 'и' to "i", 'й' to "y", 'к' to "k", 'л' to "l", 'м' to "m", 'н' to "n", 'о' to "o",
        'п' to "p", 'р' to "r", 'с' to "s", 'т' to "t", 'у' to "u", 'ф' to "f", 'х' to "h", 'ц' to "ts",
        'ч' to "ch", 'ш' to "sh", 'щ' to "shch", 'ъ' to "", 'ы' to "y", 'ь' to "", 'э' to "e", 'ю' to "yu",
        'я' to "ya", 'ғ' to "g", 'қ' to "q", 'ҳ' to "h", 'ў' to "o", 'ӯ' to "u",
    )

    private fun transliterateWord(word: String): String {
        val raw = word.trim()
            .replace(Regex("o['''`ʼ]", RegexOption.IGNORE_CASE), "o")
            .replace(Regex("g['''`ʼ]", RegexOption.IGNORE_CASE), "g")
        val latin = buildString {
            for (ch in raw) append(cyrillicToLatin[ch.lowercaseChar()] ?: ch.toString())
        }
        return Normalizer.normalize(latin, Normalizer.Form.NFD)
            .replace(Regex("\\p{M}"), "")
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), "")
    }

    fun clientNameToLogin(name: String): String {
        val firstWord = name.trim().split(Regex("\\s+")).firstOrNull { it.isNotEmpty() }.orEmpty()
        val login = transliterateWord(firstWord).take(20)
        return if (login.length < 3) "" else login
    }

    fun normalizeAppLogin(value: String): String =
        value.lowercase().replace(Regex("[^a-z0-9_.]"), "").take(32)

    // ─── O‘xshash mijoz (clientSimilarity.ts) ───

    enum class SimilarityField(val weight: Int) {
        NAME(30), FULL_NAME(20), PHONE(25), INN(20), TERRITORY(5),
    }

    data class SimilarityFieldScore(val field: SimilarityField, val pct: Int)

    data class SimilarityMatch(
        val client: ClientDto,
        val overallPct: Int,
        val fields: List<SimilarityFieldScore>,
    )

    data class SimilarityCandidate(
        val name: String,
        val fullName: String?,
        val phone: String?,
        val inn: String?,
        val territory: String?,
    )

    enum class SimilarityRisk { RED, YELLOW, GREEN }

    private const val SIMILARITY_DIALOG_THRESHOLD = 20

    private fun normalizeText(raw: String?): String =
        (raw ?: "").lowercase()
            .replace(Regex("[ʼ'`´]"), "'")
            .replace(Regex("[^\\p{L}\\p{N}\\s+]"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()

    private fun digitsOnly(raw: String?): String = (raw ?: "").filter { it.isDigit() }

    private fun textFieldScore(a: String, b: String): Int {
        if (a.isEmpty() || b.isEmpty()) return 0
        if (a == b) return 100
        if (a.contains(b) || b.contains(a)) return 50
        val ta = a.split(' ').filter { it.length >= 2 }.toSet()
        val tb = b.split(' ').filter { it.length >= 2 }.toSet()
        if (ta.isEmpty() || tb.isEmpty()) return 0
        val overlap = ta.count { it in tb }
        val ratio = overlap.toDouble() / maxOf(ta.size, tb.size)
        return if (ratio >= 0.6) 50 else 0
    }

    private fun scoreAgainst(input: SimilarityCandidate, existing: ClientDto): SimilarityMatch {
        val fields = mutableListOf<SimilarityFieldScore>()
        fun add(field: SimilarityField, inputVal: String?, existingVal: String?, score: (String, String) -> Int) {
            val numeric = field == SimilarityField.PHONE || field == SimilarityField.INN
            val a = if (numeric) digitsOnly(inputVal) else normalizeText(inputVal)
            val b = if (numeric) digitsOnly(existingVal) else normalizeText(existingVal)
            if (a.isEmpty() || b.isEmpty()) return
            fields += SimilarityFieldScore(field, score(a, b))
        }
        val exact: (String, String) -> Int = { a, b -> if (a == b) 100 else 0 }
        add(SimilarityField.NAME, input.name, existing.name, ::textFieldScore)
        add(SimilarityField.FULL_NAME, input.fullName, existing.fullName, ::textFieldScore)
        add(SimilarityField.PHONE, input.phone, existing.phone, exact)
        add(SimilarityField.INN, input.inn, existing.inn, exact)
        add(SimilarityField.TERRITORY, input.territory, existing.territory, ::textFieldScore)

        val totalWeight = fields.sumOf { it.field.weight }
        if (totalWeight <= 0) return SimilarityMatch(existing, 0, emptyList())
        val weighted = fields.sumOf { it.pct / 100.0 * it.field.weight }
        val overall = Math.round(weighted / totalWeight * 100).toInt()
        return SimilarityMatch(existing, overall, fields)
    }

    fun findBestSimilarityMatch(input: SimilarityCandidate, clients: List<ClientDto>): SimilarityMatch? {
        var best: SimilarityMatch? = null
        for (cl in clients) {
            val match = scoreAgainst(input, cl)
            if (best == null || match.overallPct > best.overallPct) best = match
        }
        return best?.takeIf { it.overallPct >= SIMILARITY_DIALOG_THRESHOLD }
    }

    fun hasExactInnCollision(match: SimilarityMatch?): Boolean =
        match?.fields?.any { it.field == SimilarityField.INN && it.pct >= 100 } == true

    fun similarityRisk(pct: Int): SimilarityRisk = when {
        pct >= 70 -> SimilarityRisk.RED
        pct >= 40 -> SimilarityRisk.YELLOW
        else -> SimilarityRisk.GREEN
    }
}
