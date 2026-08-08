package uz.distributor.crm.util

import uz.distributor.crm.domain.model.Client
import java.time.LocalDate
import java.time.ZoneId

/**
 * Liniya visitDays: 1=Dushanba … 7=Yakshanba (ISO / Java DayOfWeek).
 * ClientsScreen selectedDay: 0=Yakshanba … 6=Shanba (Calendar.DAY_OF_WEEK - 1).
 */
object VisitSchedule {
    private val tashkent: ZoneId = ZoneId.of("Asia/Tashkent")

    /** Bugungi kun (Toshkent): 1=Du … 7=Yak */
    fun todayVisitDay(): Int = LocalDate.now(tashkent).dayOfWeek.value

    /** Calendar index (0=Yak … 6=Sha) → visitDay (1=Du … 7=Yak) */
    fun fromCalendarIndex(selectedDay: Int): Int = when (selectedDay) {
        0 -> 7
        in 1..6 -> selectedDay
        else -> todayVisitDay()
    }

    fun englishKey(visitDay: Int): String = when (visitDay) {
        1 -> "monday"
        2 -> "tuesday"
        3 -> "wednesday"
        4 -> "thursday"
        5 -> "friday"
        6 -> "saturday"
        else -> "sunday"
    }

    fun englishKeyToVisitDay(key: String): Int? = when (key.lowercase().trim()) {
        "monday" -> 1
        "tuesday" -> 2
        "wednesday" -> 3
        "thursday" -> 4
        "friday" -> 5
        "saturday" -> 6
        "sunday" -> 7
        else -> null
    }

    /**
     * Mijoz shu kunga mosmi:
     * - Liniyada visitDays bor → faqat shu kunlarda
     * - Liniyada visitDays yo‘q → har kuni ko‘rinadi (yoki eski territory)
     */
    fun clientMatchesDay(
        client: Client,
        visitDay: Int,
        daysByLineCode: Map<String, List<Int>>,
    ): Boolean {
        val code = client.lineCode?.trim().orEmpty()
        if (code.isNotEmpty()) {
            val days = daysByLineCode[code]
            if (!days.isNullOrEmpty()) {
                return visitDay in days
            }
            // Bu liniyada kun belgilanmagan — yashirma
            if (daysByLineCode.isNotEmpty()) return true
        }
        if (daysByLineCode.isNotEmpty()) {
            // Boshqa liniyalar sozlangan, bu mijozda line/kun yo‘q — ko‘rsat
            return true
        }
        val territory = client.territory?.lowercase()?.trim().orEmpty()
        if (territory.isEmpty()) return true
        return territory == englishKey(visitDay)
    }

    fun buildDaysByLineCode(lines: List<Pair<String, List<Int>>>): Map<String, List<Int>> {
        val map = LinkedHashMap<String, List<Int>>()
        for ((code, days) in lines) {
            val key = code.trim()
            if (key.isEmpty()) continue
            val cleaned = days.filter { it in 1..7 }.distinct().sorted()
            if (cleaned.isNotEmpty()) map[key] = cleaned
        }
        return map
    }
}
