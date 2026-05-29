package uz.distributor.crm.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Message
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

enum class NavTab { HOME, DELIVERY, LOCATION, PLAN, MESSAGES }

val NavTab.route: String
    get() = when (this) {
        NavTab.HOME -> "main"
        NavTab.DELIVERY -> "clients"
        NavTab.LOCATION -> "location"
        NavTab.PLAN -> "plan"
        NavTab.MESSAGES -> "messages"
    }

@Composable
fun BottomNavBar(
    selected: NavTab,
    onTabSelected: (NavTab) -> Unit,
    modifier: Modifier = Modifier,
) {
    val tabs = listOf(
        Triple(NavTab.HOME, Icons.Default.Home, "Asosiy"),
        Triple(NavTab.DELIVERY, Icons.Default.LocalShipping, "Dostavka"),
        Triple(NavTab.LOCATION, Icons.Default.Map, "Locatsiya"),
        Triple(NavTab.PLAN, Icons.Default.BarChart, "Plan"),
        Triple(NavTab.MESSAGES, Icons.AutoMirrored.Filled.Message, "Xabarlar"),
    )

    Surface(
        modifier = modifier.fillMaxWidth(),
        shadowElevation = 8.dp,
        color = Color.White,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp, bottom = 16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            tabs.forEach { (tab, icon, label) ->
                val active = selected == tab
                val color = if (active) Color(0xFF6366F1) else Color(0xFF9CA3AF)
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onTabSelected(tab) }
                        .padding(4.dp),
                ) {
                    if (active) {
                        Box(
                            modifier = Modifier
                                .width(28.dp)
                                .height(3.dp)
                                .background(Color(0xFF6366F1), shape = MaterialTheme.shapes.small),
                        )
                        Spacer(Modifier.height(4.dp))
                    } else {
                        Spacer(Modifier.height(7.dp))
                    }
                    Icon(icon, null, tint = color, modifier = Modifier.size(22.dp))
                    Spacer(Modifier.height(2.dp))
                    Text(label, fontSize = 10.sp, color = color,
                        fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal)
                }
            }
        }
    }
}
