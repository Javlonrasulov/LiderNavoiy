package uz.distributor.crm.presentation.clientdetail

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.launch
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.clients.LocationPickerMap
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.sherinHeroBrush
import uz.distributor.crm.presentation.theme.sherinPageBackground
import java.text.DecimalFormat

@OptIn(ExperimentalMaterial3Api::class)
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

    LaunchedEffect(state.locationSaved) {
        if (state.locationSaved) {
            snackbarHostState.showSnackbar(AppStrings.locationUpdated(lang))
            viewModel.consumeLocationSaved()
        }
    }

    LaunchedEffect(state.locationPendingApproval) {
        if (state.locationPendingApproval) {
            snackbarHostState.showSnackbar(AppStrings.clientRequestSubmitted(lang))
            viewModel.consumeLocationSaved()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = pageBg,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
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
                    val hasCoords = client.latitude != null && client.longitude != null &&
                        !(client.latitude == 0.0 && client.longitude == 0.0)

                    Column(
                        Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState()),
                    ) {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .background(sherinHeroBrush(isDark)),
                        ) {
                            Column(
                                Modifier
                                    .statusBarsPadding()
                                    .padding(horizontal = 16.dp)
                                    .padding(top = 8.dp, bottom = 20.dp),
                            ) {
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
                                trailing = {
                                    Icon(
                                        Icons.Default.Edit,
                                        contentDescription = AppStrings.changeClientLocation(lang),
                                        tint = Color(0xFF7C3AED),
                                        modifier = Modifier.size(18.dp),
                                    )
                                },
                                onClick = viewModel::openLocationEditor,
                                subtitle = if (hasCoords) {
                                    String.format("%.5f, %.5f", client.latitude, client.longitude)
                                } else {
                                    AppStrings.changeClientLocation(lang)
                                },
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

            if (state.showLocationEditor) {
                EditClientLocationDialog(
                    latitude = state.editLatitude,
                    longitude = state.editLongitude,
                    isDark = isDark,
                    lang = lang,
                    isSaving = state.isSavingLocation,
                    isLocating = state.isLocating,
                    errorKey = state.locationError,
                    onLocationSelected = viewModel::onLocationSelected,
                    onUseMyLocation = viewModel::useMyLocation,
                    onSave = viewModel::saveLocation,
                    onDismiss = viewModel::closeLocationEditor,
                )
            }
        }
    }
}

@Composable
private fun EditClientLocationDialog(
    latitude: Double,
    longitude: Double,
    isDark: Boolean,
    lang: AppLanguage,
    isSaving: Boolean,
    isLocating: Boolean,
    errorKey: String?,
    onLocationSelected: (Double, Double) -> Unit,
    onUseMyLocation: () -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit,
) {
    Dialog(
        onDismissRequest = { if (!isSaving) onDismiss() },
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .background(if (isDark) Color(0xFF111827) else Color.White),
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onDismiss, enabled = !isSaving) {
                    Icon(Icons.Default.Close, contentDescription = null, tint = titleColor(isDark))
                }
                Text(
                    AppStrings.changeClientLocation(lang),
                    modifier = Modifier.weight(1f),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 17.sp,
                    color = titleColor(isDark),
                )
                Spacer(Modifier.width(48.dp))
            }

            Text(
                AppStrings.tapMapHint(lang),
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                fontSize = 13.sp,
                color = Color(0xFF9CA3AF),
            )

            Box(
                Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .border(1.dp, if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB), RoundedCornerShape(16.dp)),
            ) {
                LocationPickerMap(
                    latitude = latitude,
                    longitude = longitude,
                    isDark = isDark,
                    onLocationSelected = onLocationSelected,
                    modifier = Modifier.fillMaxSize(),
                )
                Surface(
                    onClick = { if (!isLocating && !isSaving) onUseMyLocation() },
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White.copy(alpha = 0.92f),
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(12.dp),
                ) {
                    Row(
                        Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        if (isLocating) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                                color = SherinColors.Primary,
                            )
                        } else {
                            Icon(
                                Icons.Default.MyLocation,
                                contentDescription = null,
                                tint = SherinColors.Primary,
                                modifier = Modifier.size(18.dp),
                            )
                        }
                        Spacer(Modifier.width(8.dp))
                        Text(
                            AppStrings.useMyLocation(lang),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF111827),
                        )
                    }
                }
            }

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = if (isDark) Color(0xFF1E3A5F) else Color(0xFFEEF2FF),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
            ) {
                Text(
                    String.format("%.6f, %.6f", latitude, longitude),
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    fontSize = 13.sp,
                    color = Color(0xFF6366F1),
                )
            }

            if (errorKey != null) {
                Text(
                    AppStrings.apiError(lang, errorKey),
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    color = Color(0xFFEF4444),
                    fontSize = 13.sp,
                )
            } else {
                Spacer(Modifier.height(8.dp))
            }

            Button(
                onClick = onSave,
                enabled = !isSaving,
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 16.dp)
                    .padding(bottom = 16.dp)
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SherinColors.Primary),
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text(AppStrings.saveClient(lang), fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun titleColor(isDark: Boolean) =
    if (isDark) Color.White else Color(0xFF111827)

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
    subtitle: String? = null,
    trailing: (@Composable () -> Unit)? = null,
    onClick: (() -> Unit)? = null,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = cardBg,
        shadowElevation = if (cardBg == Color.White) 1.dp else 0.dp,
        modifier = if (onClick != null) {
            Modifier.clickable(onClick = onClick)
        } else {
            Modifier
        },
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
                if (subtitle != null) {
                    Spacer(Modifier.height(2.dp))
                    Text(subtitle, fontSize = 11.sp, color = Color(0xFF7C3AED))
                }
            }
            if (trailing != null) {
                Spacer(Modifier.width(8.dp))
                trailing()
                if (onClick != null) {
                    Icon(
                        Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = null,
                        tint = subColor,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        }
    }
}
