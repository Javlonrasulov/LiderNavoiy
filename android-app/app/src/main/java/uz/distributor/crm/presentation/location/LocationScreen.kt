package uz.distributor.crm.presentation.location

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.presentation.components.MainScaffold
import uz.distributor.crm.presentation.components.NavTab
import java.text.DecimalFormat

@Composable
fun LocationScreen(
    onNavigate: (NavTab) -> Unit,
    viewModel: LocationViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val fmt = remember { DecimalFormat("#,##0.00") }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { viewModel.loadClients() }

    LaunchedEffect(Unit) {
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
        if (fine != PackageManager.PERMISSION_GRANTED) {
            permissionLauncher.launch(arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
            ))
        } else {
            viewModel.loadClients()
        }
    }

    MainScaffold(currentTab = NavTab.LOCATION, onTabSelected = onNavigate) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).background(Color(0xFFF9FAFB)),
        ) {
            // Map placeholder — Yandex MapKit View keyingi versiyada
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp)
                    .background(Color(0xFFE0E7FF)),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.LocationOn, null, tint = Color(0xFF6366F1), modifier = Modifier.size(48.dp))
                    Text("Yandex MapKit", color = Color(0xFF6366F1), fontWeight = FontWeight.Medium)
                    state.currentLat?.let { lat ->
                        Text("GPS: $lat, ${state.currentLng}", fontSize = 12.sp, color = Color.Gray)
                    }
                }
            }

            Text(
                "Bugungi klientlar",
                modifier = Modifier.padding(16.dp),
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
            )

            LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(state.clients) { client ->
                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, null, tint = Color(0xFF6366F1))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(client.name, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                Text(client.address ?: "", fontSize = 12.sp, color = Color.Gray, maxLines = 1)
                            }
                            Text(fmt.format(client.balance), fontSize = 12.sp,
                                color = if (client.balance < 0) Color(0xFFEF4444) else Color(0xFF22C55E))
                        }
                    }
                }
            }
        }
    }
}
