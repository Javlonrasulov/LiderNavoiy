package uz.distributor.crm.presentation.dashboard

import androidx.compose.foundation.clickable
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.presentation.components.BottomNavBar
import uz.distributor.crm.presentation.components.NavTab
import java.text.DecimalFormat

private val GradientStart = Color(0xFF4F8EF7)
private val GradientEnd = Color(0xFF7B5CF6)

@Composable
fun DashboardScreen(
    onNavigate: (NavTab) -> Unit,
    onClientsClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val formatter = remember { DecimalFormat("#,###") }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(bottom = 80.dp),
        ) {
            // ── Header gradient ──
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.linearGradient(listOf(GradientStart, GradientEnd)))
                    .padding(horizontal = 20.dp, vertical = 16.dp),
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Default.Person, null, tint = Color.White,
                            modifier = Modifier.size(28.dp).clickable { onProfileClick() })
                        Text(
                            state.user?.companyName ?: "OOO \"BORAN LEADERS\"",
                            color = Color.White.copy(0.9f),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Default.Language, null, tint = Color.White, modifier = Modifier.size(22.dp))
                            Icon(Icons.Default.DarkMode, null, tint = Color.White, modifier = Modifier.size(22.dp))
                        }
                    }

                    Spacer(Modifier.height(20.dp))

                    Text(
                        state.user?.fullName ?: "Абдужакимов Диёрбек",
                        color = Color.White,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                    )

                    Spacer(Modifier.height(12.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Jami sotish", color = Color.White.copy(0.85f), fontSize = 14.sp)
                        Spacer(Modifier.width(8.dp))
                        IconButton(onClick = viewModel::toggleBalance, modifier = Modifier.size(20.dp)) {
                            Icon(
                                if (state.showBalance) Icons.Default.Visibility else Icons.Outlined.VisibilityOff,
                                null, tint = Color.White.copy(0.7f), modifier = Modifier.size(18.dp),
                            )
                        }
                    }

                    if (state.showBalance) {
                        Text(
                            "${formatter.format(state.stats.totalSales)} СУМ",
                            color = Color.White,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    } else {
                        Text("●●●●●●●●  СУМ", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                    }

                    Spacer(Modifier.height(8.dp))
                    Text(state.formattedDate.ifEmpty { "Juma 29.05.2026" }, color = Color.White.copy(0.75f), fontSize = 13.sp)

                    Spacer(Modifier.height(20.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                    ) {
                        QuickAction(Icons.Default.Add, "Qo'shish") {}
                        QuickAction(Icons.Default.Refresh, "Yangilash", viewModel::refresh)
                        QuickAction(Icons.Default.Info, "Batafsil") {}
                        QuickAction(Icons.Default.MoreHoriz, "Ko'proq") {}
                    }

                    Spacer(Modifier.height(16.dp))
                }
            }

            // ── Stats card ──
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .offset(y = (-12).dp),
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(8.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
            ) {
                Column(modifier = Modifier.padding(vertical = 8.dp)) {
                    StatRow(
                        icon = Icons.Default.Person,
                        iconColor = Color(0xFF22C55E),
                        label = "Klientlar ro'yxati",
                        value = "${state.stats.totalClients} / ${state.stats.visitedClients} / ${state.stats.pendingClients}",
                        badge = "${String.format("%.1f", state.stats.clientProgressPercent)}%",
                        badgeColor = Color(0xFF22C55E),
                        onClick = onClientsClick,
                    )
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = Color(0xFFF3F4F6))
                    StatRow(
                        icon = Icons.Default.CalendarMonth,
                        iconColor = Color(0xFFF97316),
                        label = "Vizitlar soni",
                        value = "${state.stats.visitCount} / ${state.stats.completedVisits} / ${state.stats.pendingVisits}",
                        badge = "${state.stats.visitProgressPercent.toInt()}%",
                        badgeColor = Color(0xFF22C55E),
                    )
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = Color(0xFFF3F4F6))
                    StatRow(
                        icon = Icons.Default.ShoppingCart,
                        iconColor = Color(0xFF3B82F6),
                        label = "Jami sotish",
                        value = formatter.format(state.stats.totalSales.toLong()),
                    )

                    TextButton(
                        onClick = viewModel::toggleShowAll,
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                    ) {
                        Text(
                            if (state.showAll) "Yashirish" else "Hammasini ko'rish",
                            color = Color(0xFF6366F1),
                            fontSize = 14.sp,
                        )
                        Icon(
                            if (state.showAll) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                            null, tint = Color(0xFF6366F1), modifier = Modifier.size(18.dp),
                        )
                    }
                }
            }
        }

        BottomNavBar(
            selected = NavTab.HOME,
            onTabSelected = onNavigate,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}

@Composable
private fun QuickAction(icon: ImageVector, label: String, onClick: () -> Unit = {}) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable(onClick = onClick)) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(CircleShape)
                .background(Color.White.copy(0.2f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = Color.White, modifier = Modifier.size(24.dp))
        }
        Spacer(Modifier.height(6.dp))
        Text(label, color = Color.White.copy(0.9f), fontSize = 11.sp)
    }
}

@Composable
private fun StatRow(
    icon: ImageVector,
    iconColor: Color,
    label: String,
    value: String,
    badge: String? = null,
    badgeColor: Color = Color.Gray,
    onClick: () -> Unit = {},
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(40.dp).clip(CircleShape).background(iconColor.copy(0.12f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = iconColor, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(label, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color(0xFF374151))
            Text(value, fontSize = 13.sp, color = Color(0xFF9CA3AF))
        }
        if (badge != null) {
            Surface(shape = RoundedCornerShape(12.dp), color = badgeColor.copy(0.12f)) {
                Text(badge, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    fontSize = 12.sp, color = badgeColor, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.width(8.dp))
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = Color(0xFFD1D5DB))
    }
}
