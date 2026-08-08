package uz.distributor.crm.presentation.vansales

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import uz.distributor.crm.data.remote.dto.VanClientDto
import uz.distributor.crm.data.remote.dto.VanLoadDto
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.delivery.DeliverySectionTabs

private val VanAccent = Color(0xFF0EA5E9)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VanSalesScreen(
    onClientClick: (String) -> Unit,
    onDeliveryClick: () -> Unit,
    onDebtsClick: () -> Unit,
    viewModel: VanSalesViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val state by viewModel.uiState.collectAsState()
    val bg = if (isDark) Color(0xFF0E1621) else Color(0xFFF3F4F6)
    val cardBg = if (isDark) Color(0xFF17212B) else Color.White
    val textPrimary = if (isDark) Color.White else Color.Black
    val textMuted = if (isDark) Color(0xFF8E9BA7) else Color(0xFF6B7280)
    var tab by remember { mutableStateOf(0) } // 0 clients, 1 stock, 2 return
    var cashText by remember { mutableStateOf("") }
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.refresh()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                title = {
                    DeliverySectionTabs(
                        selectedDebts = false,
                        selectedVan = true,
                        lang = lang,
                        onDelivery = onDeliveryClick,
                        onDebts = onDebtsClick,
                        onVan = {},
                    )
                },
                actions = {
                    IconButton(onClick = viewModel::refresh) {
                        Icon(Icons.Default.Refresh, null, tint = textPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = bg),
            )
        },
        containerColor = bg,
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            if (state.pendingOffline > 0) {
                Text(
                    AppStrings.offlinePendingOrders(lang, state.pendingOffline),
                    color = VanAccent,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                )
            }
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf(
                    Triple(0, Icons.Default.People, AppStrings.vanTabClients(lang)),
                    Triple(1, Icons.Default.Inventory2, AppStrings.vanTabStock(lang)),
                    Triple(2, Icons.Default.Undo, AppStrings.vanTabReturn(lang)),
                ).forEach { (id, icon, label) ->
                    val on = tab == id
                    Row(
                        Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (on) VanAccent.copy(alpha = 0.15f) else Color.Transparent)
                            .clickable { tab = id }
                            .padding(vertical = 10.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(icon, null, tint = if (on) VanAccent else textMuted, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(label, fontSize = 12.sp, fontWeight = if (on) FontWeight.Bold else FontWeight.Medium, color = if (on) VanAccent else textMuted)
                    }
                }
            }

            when {
                state.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = VanAccent)
                }
                tab == 0 -> ClientsList(state.clients, cardBg, textPrimary, textMuted, lang, onClientClick)
                tab == 1 -> StockList(state.loads, cardBg, textPrimary, textMuted, lang)
                else -> ReturnPanel(
                    loads = state.loads,
                    cardBg = cardBg,
                    textPrimary = textPrimary,
                    textMuted = textMuted,
                    lang = lang,
                    cashText = cashText,
                    onCashChange = { cashText = it },
                    submitting = state.isSubmittingReturn,
                    onSubmit = { loadId ->
                        val cash = cashText.toDoubleOrNull()
                        viewModel.submitReturn(loadId, cash)
                    },
                )
            }
        }
    }
}

@Composable
private fun ClientsList(
    clients: List<VanClientDto>,
    cardBg: Color,
    textPrimary: Color,
    textMuted: Color,
    lang: AppLanguage,
    onClientClick: (String) -> Unit,
) {
    if (clients.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(AppStrings.vanNoClients(lang), color = textMuted)
        }
        return
    }
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        items(clients, key = { it.id }) { c ->
            val progressColor = when (c.progress) {
                "sold" -> Color(0xFF059669)
                "visited" -> Color(0xFFF59E0B)
                else -> textMuted
            }
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onClientClick(c.id) },
                colors = CardDefaults.cardColors(containerColor = cardBg),
                shape = RoundedCornerShape(14.dp),
            ) {
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(c.name, fontWeight = FontWeight.SemiBold, color = textPrimary, modifier = Modifier.weight(1f))
                        Text(
                            when (c.progress) {
                                "sold" -> AppStrings.vanProgressSold(lang)
                                "visited" -> AppStrings.vanProgressVisited(lang)
                                else -> AppStrings.vanProgressPending(lang)
                            },
                            fontSize = 11.sp,
                            color = progressColor,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    if (!c.address.isNullOrBlank()) {
                        Text(c.address!!, fontSize = 12.sp, color = textMuted, modifier = Modifier.padding(top = 4.dp))
                    }
                    if (c.salesCount > 0) {
                        Text(
                            "${c.salesCount} · ${c.salesTotal.toLong()}",
                            fontSize = 12.sp,
                            color = VanAccent,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StockList(
    loads: List<VanLoadDto>,
    cardBg: Color,
    textPrimary: Color,
    textMuted: Color,
    lang: AppLanguage,
) {
    if (loads.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(AppStrings.vanNoStock(lang), color = textMuted)
        }
        return
    }
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        loads.forEach { load ->
            item {
                Text(
                    "${load.loadDate} · ${load.status}",
                    fontWeight = FontWeight.Bold,
                    color = textPrimary,
                    modifier = Modifier.padding(bottom = 6.dp),
                )
            }
            items(load.items, key = { it.id ?: it.productId }) { it ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = cardBg),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(it.productName ?: it.productCode ?: "—", color = textPrimary, fontWeight = FontWeight.Medium)
                            Text(
                                "${AppStrings.vanSold(lang)}: ${it.soldQty} · ${AppStrings.vanRemaining(lang)}: ${it.remainingQty}",
                                fontSize = 12.sp,
                                color = textMuted,
                            )
                        }
                        Text("${it.remainingQty}", fontWeight = FontWeight.Bold, color = VanAccent, fontSize = 18.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun ReturnPanel(
    loads: List<VanLoadDto>,
    cardBg: Color,
    textPrimary: Color,
    textMuted: Color,
    lang: AppLanguage,
    cashText: String,
    onCashChange: (String) -> Unit,
    submitting: Boolean,
    onSubmit: (String) -> Unit,
) {
    val active = loads.firstOrNull { it.status == "loaded" }
    if (active == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(AppStrings.vanNoStock(lang), color = textMuted)
        }
        return
    }
    Column(Modifier.padding(16.dp)) {
        Text(AppStrings.vanReturnHint(lang), color = textMuted, fontSize = 13.sp)
        Spacer(Modifier.height(12.dp))
        Card(colors = CardDefaults.cardColors(containerColor = cardBg), shape = RoundedCornerShape(14.dp)) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                active.items.forEach { it ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(it.productName ?: "—", color = textPrimary, modifier = Modifier.weight(1f))
                        Text("${it.remainingQty}", fontWeight = FontWeight.Bold, color = textPrimary)
                    }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = cashText,
            onValueChange = onCashChange,
            label = { Text(AppStrings.vanSubmittedCash(lang)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = { onSubmit(active.id) },
            enabled = !submitting,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = VanAccent),
            shape = RoundedCornerShape(12.dp),
        ) {
            if (submitting) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
            else Text(AppStrings.vanSubmitReturn(lang))
        }
    }
}
