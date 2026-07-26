package uz.distributor.crm.presentation.visit

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
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
import uz.distributor.crm.data.remote.dto.VisitDto
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import java.text.DecimalFormat
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VisitsListScreen(
    onBack: () -> Unit,
    viewModel: VisitsListViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val state by viewModel.uiState.collectAsState()
    val formatter = remember { DecimalFormat("#,###") }
    val bg = if (isDark) Color(0xFF0E1621) else Color(0xFFF3F4F6)
    val cardBg = if (isDark) Color(0xFF17212B) else Color.White
    val textPrimary = if (isDark) Color.White else Color.Black
    val textMuted = if (isDark) Color(0xFF8E9BA7) else Color(0xFF6B7280)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        AppStrings.visitsTitle(lang),
                        fontWeight = FontWeight.SemiBold,
                        color = textPrimary,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = textPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = if (isDark) Color(0xFF17212B) else Color.White,
                ),
            )
        },
        containerColor = bg,
    ) { padding ->
        Box(
            Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.isLoading -> {
                    CircularProgressIndicator(
                        Modifier.align(Alignment.Center),
                        color = Color(0xFF6366F1),
                    )
                }
                state.visits.isEmpty() -> {
                    Column(
                        Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Icon(
                            Icons.Default.CalendarMonth,
                            null,
                            tint = textMuted,
                            modifier = Modifier.size(48.dp),
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            AppStrings.noVisits(lang),
                            color = textMuted,
                            fontSize = 15.sp,
                        )
                    }
                }
                else -> {
                    LazyColumn(
                        Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(state.visits, key = { it.id }) { visit ->
                            VisitListCard(
                                visit = visit,
                                formatter = formatter,
                                cardBg = cardBg,
                                textPrimary = textPrimary,
                                textMuted = textMuted,
                                isDark = isDark,
                                lang = lang,
                            )
                        }
                    }
                }
            }

            state.error?.let { err ->
                Snackbar(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp),
                    action = {
                        TextButton(onClick = viewModel::clearError) {
                            Text("OK")
                        }
                    },
                ) {
                    Text(AppStrings.apiError(lang, err))
                }
            }
        }
    }
}

@Composable
private fun VisitListCard(
    visit: VisitDto,
    formatter: DecimalFormat,
    cardBg: Color,
    textPrimary: Color,
    textMuted: Color,
    isDark: Boolean,
    lang: AppLanguage,
) {
    val fromClientOrder = visit.fromClientOrder ||
        visit.notes?.startsWith("client_order:") == true

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = cardBg,
        shadowElevation = if (isDark) 0.dp else 4.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        visit.clientName ?: AppStrings.clientFallback(lang),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                        color = textPrimary,
                    )
                    if (!visit.clientCode.isNullOrBlank()) {
                        Text("#${visit.clientCode}", fontSize = 12.sp, color = textMuted)
                    }
                    visit.clientAddress?.takeIf { it.isNotBlank() }?.let {
                        Spacer(Modifier.height(2.dp))
                        Text(it, fontSize = 12.sp, color = textMuted, maxLines = 2)
                    }
                }
                Text(
                    formatVisitTime(visit.visitedAt),
                    fontSize = 12.sp,
                    color = textMuted,
                )
            }

            if (fromClientOrder) {
                Spacer(Modifier.height(10.dp))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFEA580C).copy(alpha = 0.12f),
                ) {
                    Text(
                        AppStrings.visitFromClientOrder(lang),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFFEA580C),
                    )
                }
            }

            if (visit.orderTotal > 0) {
                Spacer(Modifier.height(12.dp))
                HorizontalDivider(color = if (isDark) Color(0xFF242F3D) else Color(0xFFF3F4F6))
                Spacer(Modifier.height(8.dp))
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(AppStrings.totalSales(lang), fontSize = 13.sp, color = textMuted)
                    Text(
                        "${formatter.format(visit.orderTotal.toLong())} ${AppStrings.sumCurrency(lang)}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = textPrimary,
                    )
                }
            }
        }
    }
}

private fun formatVisitTime(iso: String): String {
    return try {
        val instant = Instant.parse(iso)
        DateTimeFormatter.ofPattern("HH:mm")
            .withZone(ZoneId.of("Asia/Tashkent"))
            .format(instant)
    } catch (_: Exception) {
        iso.takeLast(8).take(5)
    }
}
