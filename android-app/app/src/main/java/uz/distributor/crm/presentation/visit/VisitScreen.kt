package uz.distributor.crm.presentation.visit

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinSubpageHeader
import uz.distributor.crm.presentation.theme.sherinPageBackground
import java.text.DecimalFormat

@Composable
fun VisitScreen(
    clientId: String,
    onBack: () -> Unit,
    onOrderSummary: (String) -> Unit,
    viewModel: VisitViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val fmt = remember { DecimalFormat("#,###") }
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f

    val pageBg = sherinPageBackground(isDark)
    val cardBg = if (isDark) SherinColors.CardRowDark else Color.White
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val subColor = Color(0xFF9CA3AF)
    val cartBarBg = if (isDark) SherinColors.CardDark else Color.White

    LaunchedEffect(clientId) { viewModel.init(clientId) }

    Column(modifier = Modifier.fillMaxSize().background(pageBg)) {
        SherinSubpageHeader(
            title = AppStrings.visitProducts(lang),
            isDark = isDark,
            onBack = onBack,
            trailing = { Spacer(Modifier.width(40.dp)) },
        )

        state.clientName?.let { name ->
            Text(
                name,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                color = titleColor,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
            )
        }

        when {
            state.isLoading -> {
                Box(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = SherinColors.Primary)
                }
            }
            state.error != null -> {
                val message = state.error!!
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(message, color = subColor, fontSize = 14.sp)
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = viewModel::retry,
                        colors = ButtonDefaults.buttonColors(containerColor = SherinColors.Primary),
                    ) {
                        Icon(Icons.Default.Refresh, null)
                        Spacer(Modifier.width(8.dp))
                        Text(AppStrings.reload(lang))
                    }
                }
            }
            else -> {
                if (state.categories.isNotEmpty()) {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(state.categories) { cat ->
                            val selected = cat == state.selectedCategory
                            val label = if (cat == VisitViewModel.ALL_CATEGORY) {
                                AppStrings.allProducts(lang)
                            } else cat
                            FilterChip(
                                selected = selected,
                                onClick = { viewModel.selectCategory(cat) },
                                label = { Text(label) },
                                colors = FilterChipDefaults.filterChipColors(
                                    containerColor = if (isDark) Color(0xFF374151) else Color(0xFFF3F4F6),
                                    labelColor = if (isDark) Color(0xFFD1D5DB) else Color(0xFF374151),
                                    selectedContainerColor = SherinColors.Primary,
                                    selectedLabelColor = Color.White,
                                ),
                            )
                        }
                    }
                }

                if (state.products.isEmpty()) {
                    Box(
                        modifier = Modifier.weight(1f).fillMaxWidth(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(AppStrings.noProductsInCategory(lang), color = subColor)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(state.products, key = { it.id }) { product ->
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = cardBg),
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(product.code, fontSize = 10.sp, color = Color(0xFF3B82F6))
                                        Text(
                                            product.name,
                                            fontWeight = FontWeight.Medium,
                                            fontSize = 13.sp,
                                            color = titleColor,
                                        )
                                        Text(
                                            "${fmt.format(product.price.toLong())} ${AppStrings.sumCurrency(lang)} / ${product.unit}",
                                            fontSize = 12.sp,
                                            color = SherinColors.Primary,
                                        )
                                    }
                                    IconButton(onClick = { viewModel.addProduct(product) }) {
                                        Icon(Icons.Default.Add, null, tint = SherinColors.Primary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Surface(shadowElevation = 8.dp, color = cartBarBg) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "${state.cart.size} ${AppStrings.items(lang)}",
                        fontSize = 13.sp,
                        color = subColor,
                    )
                    Text(
                        "${fmt.format(state.cartTotal.toLong())} ${AppStrings.sumCurrency(lang)}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = titleColor,
                    )
                }
                Button(
                    onClick = { onOrderSummary(clientId) },
                    enabled = state.cart.isNotEmpty(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = SherinColors.Primary,
                        disabledContainerColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB),
                    ),
                ) {
                    Text(AppStrings.order(lang))
                }
            }
        }
    }
}
