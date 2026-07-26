package uz.distributor.crm.presentation.auth

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uz.distributor.crm.data.location.DeviceLocationProvider
import uz.distributor.crm.data.location.LocationAccessState
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.sherinHeroBrush
import uz.distributor.crm.service.LocationSyncWorker
import uz.distributor.crm.service.LocationTrackingService
import javax.inject.Inject

data class LocationRequiredUiState(
    val errorKey: String = "gps_disabled",
    val ready: Boolean = false,
)

@HiltViewModel
class LocationRequiredViewModel @Inject constructor(
    private val deviceLocationProvider: DeviceLocationProvider,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LocationRequiredUiState())
    val uiState = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            val key = when (deviceLocationProvider.locationAccessState()) {
                LocationAccessState.PERMISSION_DENIED -> "location_permission_denied"
                LocationAccessState.GPS_DISABLED -> "gps_disabled"
                LocationAccessState.READY -> null
            }
            _uiState.update {
                it.copy(
                    errorKey = key ?: "gps_disabled",
                    ready = key == null,
                )
            }
        }
    }

    fun isReady(): Boolean = deviceLocationProvider.isReadyForTracking()
}

@Composable
fun LocationRequiredScreen(
    onReady: () -> Unit,
    viewModel: LocationRequiredViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val lang = LocalAppLanguage.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var continued by remember { mutableStateOf(false) }

    fun continueIfReady() {
        if (continued || !viewModel.isReady()) return
        continued = true
        startTrackingAndContinue(context, onReady)
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) {
        viewModel.refresh()
        continueIfReady()
    }

    fun ensurePermissionThenCheck() {
        val fine = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        if (!fine && !coarse) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                ),
            )
            return
        }
        viewModel.refresh()
        continueIfReady()
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.refresh()
                continueIfReady()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(state.ready) {
        if (state.ready) continueIfReady()
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(sherinHeroBrush(false)),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(16.dp),
        ) {
            Column(
                Modifier.padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    Icons.Default.LocationOff,
                    contentDescription = null,
                    tint = Color(0xFFEF4444),
                    modifier = Modifier.size(48.dp),
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    AppStrings.locationRequiredTitle(lang),
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF111827),
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    AppStrings.apiError(lang, state.errorKey),
                    color = Color(0xFF6B7280),
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(24.dp))
                if (state.errorKey == "gps_disabled") {
                    Button(
                        onClick = {
                            context.startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))
                        },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SherinColors.Primary),
                    ) {
                        Text(AppStrings.enableGpsButton(lang), fontWeight = FontWeight.SemiBold)
                    }
                    Spacer(Modifier.height(12.dp))
                }
                OutlinedButton(
                    onClick = ::ensurePermissionThenCheck,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Text(AppStrings.locationRequiredContinue(lang))
                }
            }
        }
    }
}

private fun startTrackingAndContinue(context: android.content.Context, onReady: () -> Unit) {
    LocationSyncWorker.enqueue(context)
    ContextCompat.startForegroundService(
        context,
        Intent(context, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_START
        },
    )
    onReady()
}
