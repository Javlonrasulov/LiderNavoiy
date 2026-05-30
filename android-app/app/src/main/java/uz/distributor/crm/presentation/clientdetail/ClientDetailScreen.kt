package uz.distributor.crm.presentation.clientdetail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import java.text.DecimalFormat

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientDetailScreen(
    clientId: String,
    onBack: () -> Unit,
    onStartVisit: (String) -> Unit,
    viewModel: ClientDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val fmt = remember { DecimalFormat("#,##0.00") }
    val lang = LocalAppLanguage.current

    LaunchedEffect(clientId) { viewModel.load(clientId) }

    Column(modifier = Modifier.fillMaxSize().background(Color(0xFFF9FAFB))) {
        TopAppBar(
            title = { Text(AppStrings.clientTitle(lang)) },
            navigationIcon = {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
        )

        state.client?.let { client ->
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(client.code, color = Color.Gray, fontSize = 12.sp)
                    Text(client.name, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                    Spacer(Modifier.height(8.dp))
                    client.address?.let { Text(it, color = Color.Gray, fontSize = 14.sp) }
                    Spacer(Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text("${AppStrings.balance(lang)}:", fontWeight = FontWeight.Medium)
                        Text(
                            "${fmt.format(client.balance)} ${AppStrings.sumCurrency(lang)}",
                            fontWeight = FontWeight.Bold,
                            color = if (client.balance < 0) Color(0xFFEF4444) else Color(0xFF22C55E),
                        )
                    }
                }
            }

            Spacer(Modifier.weight(1f))

            Button(
                onClick = { onStartVisit(clientId) },
                modifier = Modifier.fillMaxWidth().padding(16.dp).height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
            ) {
                Icon(Icons.Default.ShoppingCart, null)
                Spacer(Modifier.width(8.dp))
                Text(AppStrings.startVisit(lang), fontSize = 16.sp)
            }
        } ?: Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            if (state.isLoading) CircularProgressIndicator() else Text(AppStrings.clientNotFound(lang))
        }
    }
}
