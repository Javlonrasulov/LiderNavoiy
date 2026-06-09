package uz.distributor.crm.presentation.plan

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.components.NavTab
import uz.distributor.crm.presentation.navigation.BottomNavHeight
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.sherinHeroBrush
import uz.distributor.crm.presentation.theme.sherinPageBackground

private enum class PlanTab { MY, ALL }

@Composable
fun PlanScreen(
    onNavigate: (NavTab) -> Unit,
    viewModel: PlanViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val uiState by viewModel.uiState.collectAsState()
    var tab by remember { mutableStateOf(PlanTab.MY) }
    var statsPeriod by remember { mutableStateOf(StatsPeriod.DAY) }
    var openAgentId by remember { mutableStateOf<String?>(null) }

    val cardBg = if (isDark) Color(0xFF111827) else Color.White
    val sub = if (isDark) Color(0xFF9CA3AF) else Color(0xFF6B7280)
    val txt = if (isDark) Color.White else Color.Black

    Box(Modifier.fillMaxSize().background(sherinPageBackground(isDark))) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = BottomNavHeight + 16.dp)) {
            Box(Modifier.fillMaxWidth().background(sherinHeroBrush(isDark))) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 40.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    SherinGlassIconButton(onClick = { onNavigate(NavTab.HOME) }, icon = Icons.AutoMirrored.Filled.ArrowBack, size = 48.dp)
                    Text(
                        AppStrings.planTitle(lang),
                        modifier = Modifier.weight(1f),
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        textAlign = TextAlign.Center,
                    )
                    SherinGlassIconButton(onClick = {}, icon = Icons.Default.BarChart, size = 48.dp)
                }
            }

            Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                PlanTabButton(AppStrings.myPlan(lang), tab == PlanTab.MY, isDark) { tab = PlanTab.MY }
                PlanTabButton(AppStrings.allAgents(lang), tab == PlanTab.ALL, isDark) { tab = PlanTab.ALL }
            }

            when {
                uiState.isLoading -> Box(Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF3B82F6))
                }
                tab == PlanTab.MY -> MyPlanContent(
                    lang, isDark, cardBg, sub, txt,
                    uiState.categories, uiState.totalPlan, uiState.totalDone, uiState.totalPct,
                    uiState.hasPlan, statsPeriod,
                ) { statsPeriod = it }
                else -> AllAgentsContent(
                    uiState.agents, uiState.myDistributorId, openAgentId, isDark, cardBg, sub, txt,
                ) { openAgentId = if (openAgentId == it) null else it }
            }
        }
    }
}

@Composable
private fun RowScope.PlanTabButton(label: String, selected: Boolean, isDark: Boolean, onClick: () -> Unit) {
    val bg = if (selected) Color(0xFF3B82F6) else if (isDark) Color(0xFF111827) else Color.White
    val fg = if (selected) Color.White else if (isDark) Color(0xFF9CA3AF) else Color(0xFF6B7280)
    Box(
        Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).background(bg).clickable(onClick = onClick).padding(vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = fg, fontSize = 14.sp)
    }
}

@Composable
private fun MyPlanContent(
    lang: uz.distributor.crm.localization.AppLanguage,
    isDark: Boolean,
    cardBg: Color,
    sub: Color,
    txt: Color,
    categories: List<PlanCategory>,
    totalPlan: Long,
    totalDone: Long,
    totalPct: Int,
    hasPlan: Boolean,
    statsPeriod: StatsPeriod,
    onPeriodChange: (StatsPeriod) -> Unit,
) {
    Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (!hasPlan) {
            Surface(shape = RoundedCornerShape(24.dp), color = cardBg) {
                Text(
                    AppStrings.noPlanAssigned(lang),
                    modifier = Modifier.padding(24.dp),
                    color = sub,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                )
            }
            return@Column
        }
        Box(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp))
                .background(Brush.linearGradient(listOf(Color(0xFF312E81), Color(0xFF1E40AF), Color(0xFF0E7490)))),
        ) {
            Column(Modifier.padding(20.dp)) {
                Text(AppStrings.totalPlan(lang), color = Color.White.copy(0.7f), fontSize = 14.sp)
                Text("${planFmt(totalPlan)} ${AppStrings.sumCurrency(lang)}", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(16.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    SherinRadialProgress(totalPct, Color(0xFF60A5FA), 120.dp, Color.White)
                    Spacer(Modifier.width(24.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Column {
                            Text(AppStrings.completed(lang), color = Color.White.copy(0.6f), fontSize = 12.sp)
                            Text("${planFmt(totalDone)} ${AppStrings.sumCurrency(lang)}", color = Color.White, fontSize = 18.sp)
                        }
                        Column {
                            Text(AppStrings.remaining(lang), color = Color.White.copy(0.6f), fontSize = 12.sp)
                            Text("${planFmt(totalPlan - totalDone)} ${AppStrings.sumCurrency(lang)}", color = Color.White, fontSize = 18.sp)
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
                LinearProgressIndicator(
                    progress = { totalPct / 100f },
                    modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                    color = Color(0xFF60A5FA),
                    trackColor = Color.White.copy(0.2f),
                )
            }
        }

        Surface(shape = RoundedCornerShape(24.dp), color = cardBg) {
            Column(Modifier.padding(20.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text(AppStrings.statistics(lang), fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = txt)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PeriodChip(AppStrings.dayPeriod(lang), statsPeriod == StatsPeriod.DAY, isDark) { onPeriodChange(StatsPeriod.DAY) }
                        PeriodChip(AppStrings.weekPeriod(lang), statsPeriod == StatsPeriod.WEEK, isDark) { onPeriodChange(StatsPeriod.WEEK) }
                        PeriodChip(AppStrings.monthPeriod(lang), statsPeriod == StatsPeriod.MONTH, isDark) { onPeriodChange(StatsPeriod.MONTH) }
                    }
                }
                Spacer(Modifier.height(12.dp))
                SherinSalesChart(statsPeriod, isDark)
                HorizontalDivider(Modifier.padding(top = 16.dp), color = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB))
                Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(
                        when (statsPeriod) {
                            StatsPeriod.DAY -> AppStrings.todaySales(lang)
                            StatsPeriod.WEEK -> AppStrings.weekSales(lang)
                            else -> AppStrings.monthSales(lang)
                        },
                        color = sub, fontSize = 14.sp,
                    )
                    val sum = when (statsPeriod) {
                        StatsPeriod.DAY -> dailyChartData.last().sales
                        StatsPeriod.WEEK -> weeklyChartData.sumOf { it.sales }
                        StatsPeriod.MONTH -> monthlyChartData.last().sales
                    }
                    Text("${planFmt(sum)} ${AppStrings.sumCurrency(lang)}", color = txt, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        categories.forEach { cat ->
            val p = planPct(cat.done, cat.plan)
            Surface(shape = RoundedCornerShape(24.dp), color = cardBg) {
                Column(Modifier.padding(20.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(Color(cat.color)), contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.TrendingUp, null, tint = Color.White, modifier = Modifier.size(20.dp))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text(cat.label(lang), color = txt, fontWeight = FontWeight.Medium)
                                Text("${AppStrings.planLabel(lang)}: ${planFmt(cat.plan)} ${AppStrings.sumCurrency(lang)}", color = sub, fontSize = 12.sp)
                            }
                        }
                        SherinRadialProgress(p, Color(cat.color), 72.dp, txt)
                    }
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        MiniStatBox(AppStrings.completed(lang), "${planFmt(cat.done)} ${AppStrings.sumCurrency(lang)}", isDark, Modifier.weight(1f))
                        MiniStatBox(AppStrings.remaining(lang), "${planFmt(cat.plan - cat.done)} ${AppStrings.sumCurrency(lang)}", isDark, Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(12.dp))
                    LinearProgressIndicator(
                        progress = { p / 100f },
                        modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                        color = Color(cat.color),
                        trackColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB),
                    )
                }
            }
        }
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun PeriodChip(label: String, selected: Boolean, isDark: Boolean, onClick: () -> Unit) {
    val bg = if (selected) Color(0xFF3B82F6) else if (isDark) Color(0xFF1F2937) else Color(0xFFF3F4F6)
    val fg = if (selected) Color.White else if (isDark) Color(0xFF9CA3AF) else Color(0xFF4B5563)
    Text(label, modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(bg).clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 6.dp), color = fg, fontSize = 12.sp)
}

@Composable
private fun MiniStatBox(label: String, value: String, isDark: Boolean, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.clip(RoundedCornerShape(16.dp)).background(if (isDark) Color(0xFF1F2937) else Color(0xFFF9FAFB)).padding(12.dp),
    ) {
        Text(label, fontSize = 12.sp, color = Color(0xFF9CA3AF))
        Text(value, fontSize = 14.sp, color = if (isDark) Color.White else Color.Black)
    }
}

@Composable
private fun AllAgentsContent(
    agents: List<PlanAgent>,
    myDistributorId: String?,
    openAgentId: String?,
    isDark: Boolean,
    cardBg: Color,
    sub: Color,
    txt: Color,
    onToggle: (String) -> Unit,
) {
    if (agents.isEmpty()) {
        Column(Modifier.padding(horizontal = 20.dp)) {
            Surface(shape = RoundedCornerShape(24.dp), color = cardBg) {
                Text(
                    AppStrings.noTeamPlans(LocalAppLanguage.current),
                    modifier = Modifier.padding(24.dp),
                    color = sub,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                )
            }
        }
        return
    }
    val podiumOrder = listOf(1, 0, 2)
    val podiumHeights = listOf(112.dp, 80.dp, 64.dp)
    val podiumColors = listOf(Color(0xFFFACC15), Color(0xFF9CA3AF), Color(0xFFD97706))

    Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth().padding(vertical = 16.dp), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.Bottom) {
            podiumOrder.forEachIndexed { rankIdx, agentIdx ->
                val agent = agents.getOrNull(agentIdx) ?: return@forEachIndexed
                val p = planPct(agent.done, agent.plan)
                val isMe = agent.distributorId == myDistributorId
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                    Icon(
                        when (rankIdx) { 0 -> Icons.Default.EmojiEvents; 1 -> Icons.Default.MilitaryTech; else -> Icons.Default.WorkspacePremium },
                        null, tint = podiumColors[rankIdx], modifier = Modifier.size(24.dp),
                    )
                    Text(agent.name.split(" ").first(), fontSize = 11.sp, color = if (isMe) Color(0xFF3B82F6) else txt, textAlign = TextAlign.Center, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("$p%", fontSize = 14.sp, color = podiumColors[rankIdx], fontWeight = FontWeight.SemiBold)
                    Box(
                        Modifier.fillMaxWidth().height(podiumHeights[rankIdx])
                            .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                            .background(podiumColors[rankIdx].copy(0.15f))
                            .border(2.dp, podiumColors[rankIdx], RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("${rankIdx + 1}", color = podiumColors[rankIdx], fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        agents.forEachIndexed { idx, agent ->
            val p = planPct(agent.done, agent.plan)
            val isMe = agent.distributorId == myDistributorId
            val isOpen = openAgentId == agent.distributorId
            val barColor = when (idx) {
                0 -> Color(0xFFFACC15)
                1 -> Color(0xFF9CA3AF)
                2 -> Color(0xFFD97706)
                else -> Color(0xFF3B82F6)
            }
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = cardBg,
                modifier = if (isMe) Modifier.border(1.dp, Color(0xFF3B82F6).copy(0.4f), RoundedCornerShape(16.dp)) else Modifier,
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(
                        Modifier.fillMaxWidth().clickable { onToggle(agent.distributorId) },
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(32.dp).clip(RoundedCornerShape(16.dp))
                                .background(barColor.copy(0.2f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("${idx + 1}", fontSize = 12.sp, color = barColor, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                "${agent.name}${if (isMe) " ✦" else ""}",
                                fontSize = 14.sp,
                                color = if (isMe) Color(0xFF3B82F6) else txt,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            LinearProgressIndicator(
                                progress = { p / 100f },
                                modifier = Modifier.fillMaxWidth().padding(top = 6.dp).height(6.dp).clip(RoundedCornerShape(3.dp)),
                                color = barColor,
                                trackColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB),
                            )
                        }
                        Text("$p%", fontSize = 14.sp, color = if (isMe) Color(0xFF3B82F6) else txt, modifier = Modifier.padding(horizontal = 8.dp))
                        Icon(if (isOpen) Icons.Default.ExpandMore else Icons.Default.ChevronRight, null, tint = if (isOpen) Color(0xFF60A5FA) else sub, modifier = Modifier.size(18.dp))
                    }
                    if (isOpen) {
                        SherinCatBars(agent.categoryPcts, isDark)
                    }
                }
            }
        }
        Spacer(Modifier.height(8.dp))
    }
}
