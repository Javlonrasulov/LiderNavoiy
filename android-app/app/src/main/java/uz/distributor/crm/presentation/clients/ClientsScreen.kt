package uz.distributor.crm.presentation.clients

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.domain.model.Client
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.navigation.BottomNavHeight
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.sherinHeroBrush
import uz.distributor.crm.presentation.theme.sherinPageBackground
import java.text.DecimalFormat

@Composable
fun ClientsScreen(
    onBack: () -> Unit,
    onClientClick: (String) -> Unit,
    onAddClientClick: () -> Unit = {},
    viewModel: ClientsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val fmt = remember { DecimalFormat("#,##0.00") }
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f

    val pageBg = sherinPageBackground(isDark)
    val cardBg = if (isDark) SherinColors.CardRowDark else Color.White
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val subColor = Color(0xFF9CA3AF)
    val dividerColor = if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
    val tabInactiveBg = if (isDark) Color(0xFF374151) else Color(0xFFF3F4F6)

    var showDayMenu by remember { mutableStateOf(false) }
    val dayOptions = (0..6).map { it to AppStrings.dayName(it, lang) }
    val selectedDayLabel = AppStrings.dayName(state.selectedDay, lang)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(pageBg),
    ) {
        Column(Modifier.fillMaxSize()) {
            Box(Modifier.fillMaxWidth().background(sherinHeroBrush(isDark))) {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .padding(top = 36.dp, bottom = 16.dp),
                ) {
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        SherinGlassIconButton(
                            onClick = onBack,
                            icon = Icons.AutoMirrored.Filled.ArrowBack,
                            size = 40.dp,
                        )
                        Text(
                            AppStrings.clientsListTitle(lang),
                            modifier = Modifier.weight(1f),
                            color = Color.White,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.SemiBold,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        )
                        SherinGlassIconButton(
                            onClick = onAddClientClick,
                            icon = Icons.Default.Add,
                            size = 40.dp,
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    Box {
                        Surface(
                            onClick = { showDayMenu = !showDayMenu },
                            shape = RoundedCornerShape(16.dp),
                            color = Color.White.copy(0.12f),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, Color.White.copy(0.2f), RoundedCornerShape(16.dp)),
                        ) {
                            Row(
                                Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(selectedDayLabel, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Medium)
                                Icon(Icons.Default.KeyboardArrowDown, null, tint = Color.White, modifier = Modifier.size(22.dp))
                            }
                        }
                        DropdownMenu(expanded = showDayMenu, onDismissRequest = { showDayMenu = false }) {
                            dayOptions.forEach { (value, label) ->
                                DropdownMenuItem(
                                    text = { Text(label) },
                                    onClick = {
                                        viewModel.setSelectedDay(value)
                                        showDayMenu = false
                                    },
                                )
                            }
                        }
                    }
                }
            }

            Row(
                Modifier
                    .fillMaxWidth()
                    .background(if (isDark) SherinColors.CardDark else Color.White)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                ClientsTabChip(
                    label = AppStrings.tabSchedule(lang),
                    selected = state.activeTab == ClientsListTab.SCHEDULE,
                    isDark = isDark,
                    inactiveBg = tabInactiveBg,
                    modifier = Modifier.weight(1f),
                    onClick = { viewModel.setActiveTab(ClientsListTab.SCHEDULE) },
                )
                ClientsTabChip(
                    label = AppStrings.tabRouteDrops(lang),
                    selected = state.activeTab == ClientsListTab.ROUTE_DROPS,
                    isDark = isDark,
                    inactiveBg = tabInactiveBg,
                    modifier = Modifier.weight(1f),
                    onClick = { viewModel.setActiveTab(ClientsListTab.ROUTE_DROPS) },
                )
                ClientsTabChip(
                    label = AppStrings.tabSearchClients(lang),
                    selected = state.activeTab == ClientsListTab.SEARCH,
                    isDark = isDark,
                    inactiveBg = tabInactiveBg,
                    modifier = Modifier.weight(1f),
                    onClick = { viewModel.setActiveTab(ClientsListTab.SEARCH) },
                )
            }

            if (state.isLoading) {
                Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SherinColors.Primary)
                }
            } else {
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = cardBg,
                    shadowElevation = if (isDark) 0.dp else 2.dp,
                ) {
                    if (state.clients.isEmpty() && state.activeTab != ClientsListTab.SEARCH) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(AppStrings.clientNotFound(lang), color = subColor)
                        }
                    } else if (state.activeTab != ClientsListTab.SEARCH || state.searchQuery.length >= 2) {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(top = 4.dp, bottom = BottomNavHeight + 4.dp),
                        ) {
                            items(state.clients, key = { it.id }) { client ->
                                ClientListRow(
                                    client = client,
                                    fmt = fmt,
                                    lang = lang,
                                    isDark = isDark,
                                    subColor = subColor,
                                    dividerColor = dividerColor,
                                    onClick = { onClientClick(client.id) },
                                )
                                HorizontalDivider(
                                    modifier = Modifier.padding(horizontal = 16.dp),
                                    color = dividerColor,
                                )
                            }
                        }
                    }
                }
            }
        }

        if (state.activeTab == ClientsListTab.SEARCH) {
            ClientSearchPanel(
                query = state.searchQuery,
                onQueryChange = viewModel::onSearchChange,
                onClose = { viewModel.setActiveTab(ClientsListTab.SCHEDULE) },
                lang = lang,
                isDark = isDark,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = BottomNavHeight),
            )
        }
    }
}

@Composable
private fun ClientsTabChip(
    label: String,
    selected: Boolean,
    isDark: Boolean,
    inactiveBg: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val bg = if (selected) Color.Black else inactiveBg
    val fg = if (selected) Color.White else if (isDark) Color(0xFF9CA3AF) else Color(0xFF6B7280)
    Surface(
        onClick = onClick,
        modifier = modifier.height(40.dp),
        shape = RoundedCornerShape(20.dp),
        color = bg,
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
            Text(label, color = fg, fontSize = 12.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal, maxLines = 1)
        }
    }
}

@Composable
private fun ClientListRow(
    client: Client,
    fmt: DecimalFormat,
    lang: AppLanguage,
    isDark: Boolean,
    subColor: Color,
    dividerColor: Color,
    onClick: () -> Unit,
) {
    val blue = Color(0xFF2563EB)
    val amount = kotlin.math.abs(client.balance)
    val amountColor = if (amount > 0.005) Color(0xFFB91C1C) else if (isDark) Color.White else Color.Black
    val subtitle = client.territory?.takeIf { it.isNotBlank() }
        ?: client.contactPerson?.takeIf { it.isNotBlank() }
        ?: client.address?.takeIf { it.isNotBlank() }
    val bottomLeft = buildString {
        client.lineCode?.takeIf { it.isNotBlank() }?.let { append("$it - ") }
        append(client.territory?.takeIf { it.isNotBlank() } ?: client.address?.takeIf { it.isNotBlank() } ?: "—")
    }

    Column(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "${client.code} - ${client.name.uppercase()}",
                modifier = Modifier.weight(1f),
                color = blue,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = subColor, modifier = Modifier.size(20.dp))
        }
        subtitle?.let {
            Spacer(Modifier.height(4.dp))
            Text(it, color = subColor, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(
                bottomLeft,
                modifier = Modifier.weight(1f).padding(end = 8.dp),
                color = subColor,
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                fmt.format(amount),
                color = amountColor,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
            )
        }
    }
}

@Composable
private fun ClientSearchPanel(
    query: String,
    onQueryChange: (String) -> Unit,
    onClose: () -> Unit,
    lang: AppLanguage,
    isDark: Boolean,
    modifier: Modifier = Modifier,
) {
    val panelBg = if (isDark) Color(0xFF111827) else Color.White
    val fieldBg = if (isDark) Color(0xFF1F2937) else Color(0xFFF3F4F6)
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val subColor = Color(0xFF9CA3AF)

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
        color = panelBg,
        shadowElevation = 12.dp,
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(AppStrings.tabSearchClients(lang), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = titleColor)
                IconButton(onClick = onClose) {
                    Icon(Icons.Default.Close, null, tint = subColor)
                }
            }
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = query,
                onValueChange = onQueryChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text(AppStrings.searchClientHint(lang), color = subColor) },
                leadingIcon = { Icon(Icons.Default.Search, null, tint = subColor) },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = fieldBg,
                    unfocusedContainerColor = fieldBg,
                    focusedBorderColor = Color.Transparent,
                    unfocusedBorderColor = Color.Transparent,
                ),
            )
            if (query.isBlank()) {
                Spacer(Modifier.height(32.dp))
                Column(
                    Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(Icons.Default.Search, null, tint = subColor.copy(alpha = 0.35f), modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(8.dp))
                    Text(AppStrings.searchClientHint(lang), color = subColor, fontSize = 14.sp)
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}
