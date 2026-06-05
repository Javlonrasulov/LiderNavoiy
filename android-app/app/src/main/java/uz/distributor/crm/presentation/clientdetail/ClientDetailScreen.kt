package uz.distributor.crm.presentation.clientdetail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.sherinHeroBrush
import uz.distributor.crm.presentation.theme.sherinPageBackground
import java.text.DecimalFormat

@Composable
fun ClientDetailScreen(
    clientId: String,
    onBack: () -> Unit,
    onStartVisit: (String) -> Unit,
    onReconciliation: (String) -> Unit,
    viewModel: ClientDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val fmt = remember { DecimalFormat("#,##0.00") }
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    var showPayment by remember { mutableStateOf(false) }

    val pageBg = sherinPageBackground(isDark)
    val cardBg = if (isDark) SherinColors.CardRowDark else Color.White
    val titleColor = if (isDark) Color.White else Color(0xFF111827)
    val subColor = Color(0xFF9CA3AF)

    LaunchedEffect(clientId) { viewModel.load(clientId) }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = pageBg,
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when {
                state.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SherinColors.Primary)
                }
                state.client == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(AppStrings.clientNotFound(lang), color = subColor)
                }
                else -> {
                    val client = state.client!!
                    val debtValue = if (client.balance < 0) client.balance else 0.0
                    val agentValue = if (client.balance > 0) client.balance else 0.0
                    val displayAddress = buildString {
                        client.lineCode?.takeIf { it.isNotBlank() }?.let { append("$it - ") }
                        append(client.address?.takeIf { it.isNotBlank() } ?: "—")
                    }
                    val displayLandmark = client.territory?.takeIf { it.isNotBlank() }
                        ?: client.contactPerson?.takeIf { it.isNotBlank() }
                        ?: "—"
                    val displayCategory = client.priceCategory?.takeIf { it.isNotBlank() }
                        ?: client.category?.takeIf { it.isNotBlank() }
                        ?: "Standart"

                    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .background(sherinHeroBrush(isDark))
                                .padding(bottom = 20.dp),
                        ) {
                            Column(Modifier.padding(horizontal = 16.dp).padding(top = 40.dp)) {
                                SherinGlassIconButton(
                                    onClick = onBack,
                                    icon = Icons.AutoMirrored.Filled.ArrowBack,
                                    size = 40.dp,
                                )
                                Spacer(Modifier.height(16.dp))
                                Text(client.code, color = Color.White.copy(0.75f), fontSize = 13.sp)
                                Text(
                                    client.name.uppercase(),
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 22.sp,
                                    lineHeight = 28.sp,
                                )
                                Spacer(Modifier.height(16.dp))
                                Surface(
                                    shape = RoundedCornerShape(16.dp),
                                    color = Color.White.copy(alpha = 0.15f),
                                ) {
                                    Row(
                                        Modifier.fillMaxWidth().padding(16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        BalanceStat(
                                            label = AppStrings.debt(lang),
                                            value = fmt.format(debtValue),
                                            valueColor = Color.White,
                                        )
                                        BalanceStat(
                                            label = AppStrings.agentLabel(lang),
                                            value = fmt.format(agentValue),
                                            valueColor = Color.White,
                                        )
                                    }
                                }
                            }
                        }

                        Column(Modifier.padding(horizontal = 16.dp)) {
                            Spacer(Modifier.height(8.dp))
                            Button(
                                onClick = { onStartVisit(clientId) },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color.Black),
                            ) {
                                Text(
                                    AppStrings.visitShort(lang),
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                            Spacer(Modifier.height(10.dp))
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                OutlinedButton(
                                    onClick = { onReconciliation(clientId) },
                                    modifier = Modifier.weight(1f).height(52.dp),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(
                                        containerColor = if (isDark) Color(0xFF374151) else Color(0xFFF3F4F6),
                                        contentColor = titleColor,
                                    ),
                                    border = null,
                                ) {
                                    Text(AppStrings.reconciliation(lang), fontWeight = FontWeight.SemiBold)
                                }
                                Button(
                                    onClick = { showPayment = true },
                                    modifier = Modifier.weight(1f).height(52.dp),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                                ) {
                                    Icon(Icons.Default.Payments, null, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text(AppStrings.payment(lang), fontWeight = FontWeight.SemiBold)
                                }
                            }
                            Spacer(Modifier.height(16.dp))
                            ClientInfoCard(
                                icon = Icons.Default.Phone,
                                iconBg = Color(0xFFDCFCE7),
                                iconTint = Color(0xFF16A34A),
                                label = AppStrings.phoneLabel(lang),
                                value = client.phone?.takeIf { it.isNotBlank() } ?: "—",
                                cardBg = cardBg,
                                titleColor = titleColor,
                                subColor = subColor,
                            )
                            Spacer(Modifier.height(10.dp))
                            ClientInfoCard(
                                icon = Icons.Default.Place,
                                iconBg = Color(0xFFEDE9FE),
                                iconTint = Color(0xFF7C3AED),
                                label = AppStrings.addressLabel(lang),
                                value = displayAddress,
                                cardBg = cardBg,
                                titleColor = titleColor,
                                subColor = subColor,
                            )
                            Spacer(Modifier.height(10.dp))
                            ClientInfoCard(
                                icon = Icons.Default.Store,
                                iconBg = Color(0xFFDBEAFE),
                                iconTint = Color(0xFF2563EB),
                                label = AppStrings.landmarkLabel(lang),
                                value = displayLandmark,
                                cardBg = cardBg,
                                titleColor = titleColor,
                                subColor = subColor,
                            )
                            Spacer(Modifier.height(10.dp))
                            ClientInfoCard(
                                icon = Icons.Default.Person,
                                iconBg = Color(0xFFFFEDD5),
                                iconTint = Color(0xFFEA580C),
                                label = AppStrings.categoryLabel(lang),
                                value = displayCategory,
                                cardBg = cardBg,
                                titleColor = titleColor,
                                subColor = subColor,
                            )
                            Spacer(Modifier.height(24.dp))
                        }
                    }
                }
            }

            ClientPaymentFlow(
                visible = showPayment,
                isDark = isDark,
                lang = lang,
                onDismiss = { showPayment = false },
                onPaymentCompleted = { _, _, _ ->
                    scope.launch {
                        snackbarHostState.showSnackbar(AppStrings.paymentAccepted(lang))
                    }
                },
            )
        }
    }
}

@Composable
private fun BalanceStat(label: String, value: String, valueColor: Color) {
    Column {
        Text(label, color = Color.White.copy(0.7f), fontSize = 12.sp)
        Spacer(Modifier.height(4.dp))
        Text(value, color = valueColor, fontWeight = FontWeight.Bold, fontSize = 22.sp)
    }
}

@Composable
private fun ClientInfoCard(
    icon: ImageVector,
    iconBg: Color,
    iconTint: Color,
    label: String,
    value: String,
    cardBg: Color,
    titleColor: Color,
    subColor: Color,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = cardBg,
        shadowElevation = if (cardBg == Color.White) 1.dp else 0.dp,
    ) {
        Row(
            Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(iconBg),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, null, tint = iconTint, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(label, fontSize = 12.sp, color = subColor)
                Spacer(Modifier.height(2.dp))
                Text(
                    value,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    color = titleColor,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}
