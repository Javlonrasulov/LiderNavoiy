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


fun planFmt(n: Long): String = when {
    n >= 1_000_000 -> "%.1f mln".format(n / 1_000_000.0)
    n >= 1_000 -> "%.0f ming".format(n / 1_000.0)
    else -> n.toString()
}

fun planFmtFull(n: Long): String =
    java.text.DecimalFormat("#,###").format(n).replace(',', '\u00A0')

fun planPct(done: Long, plan: Long): Int =
    if (plan <= 0) 0 else minOf(100, ((done.toDouble() / plan) * 100).toInt())

data class SalesPeriodChart(
    val points: List<ChartPoint> = emptyList(),
    val total: Long = 0,
)
