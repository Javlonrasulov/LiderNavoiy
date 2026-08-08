package uz.distributor.crm.presentation.plan

import uz.distributor.crm.localization.AppLanguage
import java.text.DecimalFormat

data class PlanCategory(
    val id: String,
    val labelLatin: String,
    val labelCyrillic: String,
    val labelRussian: String,
    val color: Long,
    val plan: Double,
    val done: Double,
    val products: List<PlanProductLine> = emptyList(),
) {
    fun label(lang: AppLanguage) = when (lang) {
        AppLanguage.UZ_LATIN -> labelLatin
        AppLanguage.UZ_CYRILLIC -> labelCyrillic
        AppLanguage.RUS -> labelRussian
    }
}

data class PlanProductLine(
    val productId: String,
    val name: String,
    val plan: Double,
    val done: Double,
)

data class PlanAgent(
    val distributorId: String,
    val name: String,
    val plan: Double,
    val done: Double,
    val unit: String = "som",
    val categoryPcts: List<Pair<String, Int>>,
)

data class ChartPoint(val label: String, val sales: Double)

fun planFmt(n: Double, unit: String = "som"): String {
    val abs = kotlin.math.abs(n)
    return when {
        unit == "som" && abs >= 1_000_000 -> "%.1f mln".format(n / 1_000_000.0)
        unit == "som" && abs >= 1_000 -> "%.0f ming".format(n / 1_000.0)
        unit != "som" && abs >= 1000 -> DecimalFormat("#,###.###").format(n).replace(',', '\u00A0')
        unit != "som" && n % 1.0 != 0.0 -> DecimalFormat("#.##").format(n)
        else -> DecimalFormat("#,###").format(n.toLong()).replace(',', '\u00A0')
    }
}

fun planFmtFull(n: Double, unit: String = "som"): String {
    val pattern = if (unit == "som") "#,###" else "#,###.###"
    return DecimalFormat(pattern).format(n).replace(',', '\u00A0')
}

fun planPct(done: Double, plan: Double): Int =
    if (plan <= 0) 0 else minOf(100, ((done / plan) * 100).toInt())

data class SalesPeriodChart(
    val points: List<ChartPoint> = emptyList(),
    val total: Double = 0.0,
)
