package uz.distributor.crm.presentation.order

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import java.text.DecimalFormat

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderSummaryScreen(
    clientId: String,
    onBack: () -> Unit,
    onDone: () -> Unit,
    viewModel: OrderViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val fmt = remember { DecimalFormat("#,###") }

    if (state.submitted) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(64.dp))
                Spacer(Modifier.height(16.dp))
                Text("Buyurtma yuborildi!", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                Spacer(Modifier.height(24.dp))
                Button(onClick = onDone) { Text("Asosiy sahifaga") }
            }
        }
        return
    }

    Column(modifier = Modifier.fillMaxSize().background(Color(0xFFF9FAFB))) {
        TopAppBar(
            title = { Text("Buyurtma") },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
        )

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(state.items) { item ->
                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(item.productName, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                            Text("${item.quantity} ${item.unit} × ${fmt.format(item.price.toLong())}", fontSize = 12.sp, color = Color.Gray)
                        }
                        Text("${fmt.format((item.price * item.quantity).toLong())}", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Surface(shadowElevation = 8.dp, color = Color.White) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Jami:", fontSize = 16.sp)
                    Text("${fmt.format(state.total.toLong())} SUM", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                }
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = { viewModel.submit(clientId, onDone) },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    enabled = !state.isSubmitting,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                ) {
                    if (state.isSubmitting) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    else Text("Tasdiqlash", fontSize = 16.sp)
                }
            }
        }
    }
}
