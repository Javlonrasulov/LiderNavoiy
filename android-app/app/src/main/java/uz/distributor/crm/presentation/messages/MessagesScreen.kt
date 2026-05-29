package uz.distributor.crm.presentation.messages

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.distributor.crm.domain.model.Message
import uz.distributor.crm.presentation.components.MainScaffold
import uz.distributor.crm.presentation.components.NavTab

private val mockMessages = listOf(
    Message("1", "Ofis", "Bugungi hisobotni yuboring", System.currentTimeMillis() - 3600000, 2),
    Message("2", "Menejer", "Plan 85% ga yetishi kerak", System.currentTimeMillis() - 86400000, 0),
    Message("3", "Buxgalter", "Akt-sverka tayyor", System.currentTimeMillis() - 172800000, 1),
)

@Composable
fun MessagesScreen(onNavigate: (NavTab) -> Unit) {
    MainScaffold(currentTab = NavTab.MESSAGES, onTabSelected = onNavigate) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).background(Color(0xFFF9FAFB))) {
            Text("Xabarlar", fontWeight = FontWeight.Bold, fontSize = 20.sp,
                modifier = Modifier.padding(16.dp))
            LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(mockMessages) { msg ->
                    Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(44.dp).clip(CircleShape).background(Color(0xFF6366F1)),
                                contentAlignment = Alignment.Center) {
                                Text(msg.senderName.first().toString(), color = Color.White, fontWeight = FontWeight.Bold)
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(msg.senderName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                Text(msg.lastMessage, fontSize = 13.sp, color = Color.Gray, maxLines = 1)
                            }
                            if (msg.unread > 0) {
                                Badge { Text("${msg.unread}") }
                            }
                        }
                    }
                }
            }
        }
    }
}
