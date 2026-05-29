package uz.distributor.crm.presentation.plan

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.distributor.crm.presentation.components.MainScaffold
import uz.distributor.crm.presentation.components.NavTab

@Composable
fun PlanScreen(onNavigate: (NavTab) -> Unit) {
    MainScaffold(currentTab = NavTab.PLAN, onTabSelected = onNavigate) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).background(Color(0xFFF9FAFB)).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Savdo rejasi", fontWeight = FontWeight.Bold, fontSize = 20.sp)
            PlanCard("Kunlik plan", "45,600,000", "38,200,000", 84)
            PlanCard("Haftalik plan", "228,000,000", "195,400,000", 86)
            PlanCard("Oylik plan", "912,000,000", "678,300,000", 74)
        }
    }
}

@Composable
private fun PlanCard(title: String, plan: String, done: String, pct: Int) {
    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)) {
        Column(Modifier.padding(20.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("Plan", fontSize = 11.sp, color = Color.Gray)
                    Text(plan, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Bajarildi", fontSize = 11.sp, color = Color.Gray)
                    Text(done, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF6366F1))
                }
            }
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { pct / 100f },
                modifier = Modifier.fillMaxWidth().height(8.dp),
                color = if (pct >= 80) Color(0xFF22C55E) else Color(0xFFF97316),
                trackColor = Color(0xFFE5E7EB),
            )
            Text("$pct%", modifier = Modifier.padding(top = 4.dp), fontSize = 12.sp, color = Color.Gray)
        }
    }
}
