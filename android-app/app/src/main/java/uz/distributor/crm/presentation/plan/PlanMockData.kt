package uz.distributor.crm.presentation.plan

import uz.distributor.crm.localization.AppLanguage

data class PlanCategory(
    val id: String,
    val labelLatin: String,
    val labelCyrillic: String,
    val labelRussian: String,
    val color: Long,
    val plan: Long,
    val done: Long,
) {
    fun label(lang: AppLanguage) = when (lang) {
        AppLanguage.UZ_LATIN -> labelLatin
        AppLanguage.UZ_CYRILLIC -> labelCyrillic
        AppLanguage.RUS -> labelRussian
    }
}

data class PlanAgent(
    val distributorId: String,
    val name: String,
    val plan: Long,
    val done: Long,
    val categoryPcts: List<Pair<String, Int>>,
)

data class ChartPoint(val label: String, val sales: Long)

val dailyChartData = listOf(
    ChartPoint("08:00", 120_000),
    ChartPoint("10:00", 350_000),
    ChartPoint("12:00", 580_000),
    ChartPoint("14:00", 720_000),
    ChartPoint("16:00", 950_000),
    ChartPoint("18:00", 1_200_000),
    ChartPoint("20:00", 1_350_000),
)

val weeklyChartData = listOf(
    ChartPoint("Dush", 2_100_000),
    ChartPoint("Sesh", 1_850_000),
    ChartPoint("Chor", 2_450_000),
    ChartPoint("Pay", 2_200_000),
    ChartPoint("Jum", 2_800_000),
    ChartPoint("Shan", 3_100_000),
    ChartPoint("Yak", 2_650_000),
)

val monthlyChartData = listOf(
    ChartPoint("Yan", 12_500_000),
    ChartPoint("Fev", 14_200_000),
    ChartPoint("Mar", 13_800_000),
    ChartPoint("Apr", 15_600_000),
    ChartPoint("May", 16_500_000),
    ChartPoint("Iyun", 17_200_000),
    ChartPoint("Iyul", 18_900_000),
    ChartPoint("Avg", 16_800_000),
    ChartPoint("Sen", 19_200_000),
    ChartPoint("Okt", 20_100_000),
    ChartPoint("Noy", 18_500_000),
    ChartPoint("Dek", 21_300_000),
)

fun planFmt(n: Long): String = when {
    n >= 1_000_000 -> "%.1f mln".format(n / 1_000_000.0)
    n >= 1_000 -> "%.0f ming".format(n / 1_000.0)
    else -> n.toString()
}

fun planPct(done: Long, plan: Long): Int =
    if (plan <= 0) 0 else minOf(100, ((done.toDouble() / plan) * 100).toInt())
