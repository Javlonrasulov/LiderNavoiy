package uz.distributor.crm.presentation.visit

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
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
fun VisitScreen(
    clientId: String,
    onBack: () -> Unit,
    onOrderSummary: (String) -> Unit,
    viewModel: VisitViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val fmt = remember { DecimalFormat("#,###") }

    LaunchedEffect(clientId) { viewModel.init(clientId) }

    Column(modifier = Modifier.fillMaxSize().background(Color(0xFFF9FAFB))) {
        TopAppBar(
            title = { Text("Vizit — Mahsulotlar") },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
        )

        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(state.categories) { cat ->
                val selected = cat == state.selectedCategory
                FilterChip(
                    selected = selected,
                    onClick = { viewModel.selectCategory(cat) },
                    label = { Text(cat) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Color(0xFF6366F1),
                        selectedLabelColor = Color.White,
                    ),
                )
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(state.products, key = { it.id }) { product ->
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(product.code, fontSize = 10.sp, color = Color.Gray)
                            Text(product.name, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                            Text("${fmt.format(product.price.toLong())} SUM / ${product.unit}",
                                fontSize = 12.sp, color = Color(0xFF6366F1))
                        }
                        IconButton(onClick = { viewModel.addProduct(product) }) {
                            Icon(Icons.Default.Add, null, tint = Color(0xFF6366F1))
                        }
                    }
                }
            }
        }

        // Cart bar
        Surface(shadowElevation = 8.dp, color = Color.White) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("${state.cart.size} mahsulot", fontSize = 13.sp, color = Color.Gray)
                    Text("${fmt.format(state.cartTotal.toLong())} SUM", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                }
                Button(
                    onClick = { onOrderSummary(clientId) },
                    enabled = state.cart.isNotEmpty(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                ) {
                    Text("Buyurtma")
                }
            }
        }
    }
}
