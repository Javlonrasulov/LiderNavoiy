package uz.distributor.crm.presentation.location

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.domain.model.Client
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.components.AppLanguageDropdownMenu
import uz.distributor.crm.presentation.components.BottomNavBar
import uz.distributor.crm.presentation.components.NavTab
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.sherinHeroBrush
import uz.distributor.crm.map.MapTileSources
import uz.distributor.crm.util.NavigationHelper
import java.text.DecimalFormat

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationScreen(
    onNavigate: (NavTab) -> Unit,
    viewModel: LocationViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val darkMode by viewModel.darkMode.collectAsState()
    val lang = LocalAppLanguage.current
    val context = LocalContext.current
    val fmt = remember { DecimalFormat("#,##0") }
    val isDark = darkMode
    val filtered = remember(state.clients) { viewModel.filteredClients() }
    var showDayMenu by remember { mutableStateOf(false) }
    var showLangMenu by remember { mutableStateOf(false) }
    var activeMapLayer by remember { mutableStateOf(MapTileSources.defaultLayer) }

    val dayOptions = listOf(
        "today" to AppStrings.todayClients(lang),
        "all" to AppStrings.allClients(lang),
        "monday" to AppStrings.dayName(1, lang),
        "tuesday" to AppStrings.dayName(2, lang),
        "wednesday" to AppStrings.dayName(3, lang),
        "thursday" to AppStrings.dayName(4, lang),
        "friday" to AppStrings.dayName(5, lang),
        "saturday" to AppStrings.dayName(6, lang),
        "sunday" to AppStrings.dayName(0, lang),
    )
    val selectedLabel = dayOptions.find { it.first == state.selectedDay }?.second ?: AppStrings.todayClients(lang)

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { viewModel.loadClients() }

    LaunchedEffect(Unit) {
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
        if (fine != PackageManager.PERMISSION_GRANTED) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                ),
            )
        } else {
            viewModel.loadClients()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(if (isDark) Color.Black else Color(0xFFF9FAFB)),
    ) {
        LocationMapView(
            clients = filtered,
            agentLocation = state.agentLocation,
            selectedClientId = state.selectedClient?.id,
            isDark = isDark,
            activeLayer = activeMapLayer,
            onClientSelected = viewModel::selectClient,
            modifier = Modifier.fillMaxSize(),
        )

        MapLayerPicker(
            activeLayer = activeMapLayer,
            onLayerChange = { activeMapLayer = it },
            modifier = Modifier
                .align(Alignment.BottomStart)
                .zIndex(6f),
            bottomPadding = (state.sheetFraction * 600).dp.coerceIn(140.dp, 420.dp),
        )

        Column(Modifier.fillMaxWidth().zIndex(10f)) {
            Box(Modifier.fillMaxWidth().background(sherinHeroBrush(isDark))) {
                Column(Modifier.padding(horizontal = 20.dp, vertical = 24.dp).padding(top = 16.dp)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SherinGlassIconButton(onClick = { onNavigate(NavTab.HOME) }, icon = Icons.AutoMirrored.Filled.ArrowBack, size = 40.dp)
                        Box(Modifier.weight(1f)) {
                            Surface(
                                onClick = { showDayMenu = !showDayMenu },
                                shape = RoundedCornerShape(16.dp),
                                color = Color.White.copy(0.10f),
                                modifier = Modifier.fillMaxWidth().border(1.dp, Color.White.copy(0.20f), RoundedCornerShape(16.dp)),
                            ) {
                                Row(
                                    Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(selectedLabel, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Medium, maxLines = 1)
                                    Icon(
                                        Icons.Default.KeyboardArrowDown,
                                        null,
                                        tint = Color.White,
                                        modifier = Modifier.size(20.dp),
                                    )
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
                        SherinGlassIconButton(
                            onClick = viewModel::toggleDarkMode,
                            icon = if (isDark) Icons.Default.LightMode else Icons.Default.DarkMode,
                            size = 40.dp,
                        )
                        Box {
                            SherinGlassIconButton(onClick = { showLangMenu = true }, icon = Icons.Default.Language, size = 40.dp)
                            AppLanguageDropdownMenu(
                                expanded = showLangMenu,
                                onDismissRequest = { showLangMenu = false },
                                current = lang,
                                isDark = isDark,
                                onSelect = viewModel::setLanguage,
                            )
                        }
                    }
                }
            }
        }

        val sheetFraction = state.sheetFraction
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .fillMaxHeight(sheetFraction)
                .padding(bottom = 72.dp)
                .zIndex(5f),
        ) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                color = if (isDark) Color(0xFF111827) else Color.White,
                shadowElevation = 16.dp,
            ) {
                Column(Modifier.fillMaxSize()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .pointerInput(Unit) {
                                detectVerticalDragGestures { _, dragAmount ->
                                    val delta = -dragAmount / size.height
                                    viewModel.updateSheetFraction(sheetFraction + delta)
                                }
                            }
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Box(
                            modifier = Modifier
                                .width(48.dp)
                                .height(6.dp)
                                .background(
                                    if (isDark) Color(0xFF374151) else Color(0xFFD1D5DB),
                                    RoundedCornerShape(3.dp),
                                ),
                        )
                    }

                    if (state.isLoading) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = SherinColors.Primary)
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            items(filtered, key = { it.id }) { client ->
                                SherinClientSheetCard(
                                    client = client,
                                    isDark = isDark,
                                    lang = lang,
                                    fmt = fmt,
                                    onNavigate = {
                                        val lat = client.latitude
                                        val lng = client.longitude
                                        if (lat != null && lng != null) {
                                            NavigationHelper.openToClient(context, lat, lng, client.name)
                                        }
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }

        BottomNavBar(
            selected = NavTab.LOCATION,
            onTabSelected = onNavigate,
            isDark = isDark,
            modifier = Modifier.align(Alignment.BottomCenter).zIndex(20f),
        )
    }
}

@Composable
private fun SherinClientSheetCard(
    client: Client,
    isDark: Boolean,
    lang: AppLanguage,
    fmt: DecimalFormat,
    onNavigate: () -> Unit,
) {
    val cardBg = if (isDark) Color(0xFF1F2937) else Color(0xFFF9FAFB)
    val debt = client.balance.coerceAtLeast(0.0)

    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(cardBg)
            .padding(16.dp),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                Modifier.size(40.dp).clip(CircleShape).background(Color(0xFF3B82F6)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Person, null, tint = Color.White, modifier = Modifier.size(20.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(client.name, fontWeight = FontWeight.Medium, fontSize = 15.sp, color = if (isDark) Color.White else Color.Black)
                client.address?.let {
                    Text(it, fontSize = 13.sp, color = Color(0xFF9CA3AF), modifier = Modifier.padding(top = 2.dp))
                }
                Spacer(Modifier.height(12.dp))
                Row(Modifier.fillMaxWidth()) {
                    Column(Modifier.weight(1f)) {
                        Text(AppStrings.debt(lang), fontSize = 11.sp, color = Color(0xFF9CA3AF))
                        Text("${fmt.format(debt)} ${AppStrings.sumCurrency(lang)}", fontSize = 13.sp, color = Color(0xFFEF4444), fontWeight = FontWeight.Medium)
                    }
                    Column(Modifier.weight(1f)) {
                        Text(AppStrings.lastVisit(lang), fontSize = 11.sp, color = Color(0xFF9CA3AF))
                        Text("—", fontSize = 13.sp, color = if (isDark) Color(0xFFD1D5DB) else Color(0xFF4B5563))
                    }
                }
            }
        }
        Spacer(Modifier.height(16.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(
                onClick = {},
                modifier = Modifier.weight(1f).height(48.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF374151)),
            ) {
                Icon(Icons.Default.Image, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text(AppStrings.viewImage(lang), fontSize = 13.sp)
            }
            Button(
                onClick = onNavigate,
                enabled = client.latitude != null && client.longitude != null,
                modifier = Modifier.weight(1f).height(48.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                contentPadding = PaddingValues(0.dp),
            ) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(
                            Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF4F46E5), Color(0xFF7C3AED))),
                            RoundedCornerShape(16.dp),
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Navigation, null, tint = Color.White, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(AppStrings.openNavigator(lang), color = Color.White, fontSize = 13.sp)
                    }
                }
            }
        }
    }
}
