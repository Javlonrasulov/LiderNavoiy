package uz.lider.client.map

/**
 * Ko‘p org xaritada ajratish — chiziq / manzil / mashina.
 * Zamonaviy app uslubi: yumshoq, aniq, chalkashmaydigan ranglar.
 */
object OrgMapColors {
    private val PALETTE = intArrayOf(
        0xFF3B82F6.toInt(), // sky blue
        0xFF14B8A6.toInt(), // teal
        0xFF8B5CF6.toInt(), // soft violet
        0xFF06B6D4.toInt(), // cyan
        0xFFEC4899.toInt(), // soft pink
        0xFF6366F1.toInt(), // indigo
    )

    fun forCompany(companyId: String?): Int {
        if (companyId.isNullOrBlank()) return PALETTE[0]
        val idx = (companyId.hashCode().toLong() and 0x7FFF_FFFFL).toInt() % PALETTE.size
        return PALETTE[idx]
    }
}
