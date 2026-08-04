package uz.distributor.crm.presentation.auth

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.view.View
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.components.AppLanguageDropdownMenu
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.sherinHeroBrush
import uz.distributor.crm.service.LocationSyncWorker
import uz.distributor.crm.service.LocationTrackingService
import uz.distributor.crm.util.NotificationAccess

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNotificationRequired: () -> Unit = {},
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val lang = LocalAppLanguage.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var showLangMenu by remember { mutableStateOf(false) }
    var passwordVisible by remember { mutableStateOf(false) }
    var pendingLoginAfterPermission by remember { mutableStateOf(false) }
    var pendingLoginAfterNotification by remember { mutableStateOf(false) }

    val loginFieldColors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor = Color.White,
        unfocusedContainerColor = Color.White,
        focusedTextColor = Color(0xFF111827),
        unfocusedTextColor = Color(0xFF111827),
        focusedBorderColor = SherinColors.Primary,
        unfocusedBorderColor = Color(0xFFD1D5DB),
        focusedLabelColor = SherinColors.Primary,
        unfocusedLabelColor = Color(0xFF6B7280),
        cursorColor = SherinColors.Primary,
    )

    fun hasLocationPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    fun tryLogin() {
        if (!NotificationAccess.areEnabled(context)) {
            viewModel.setNotificationError()
            return
        }
        if (!hasLocationPermission()) {
            pendingLoginAfterPermission = true
            return
        }
        if (!viewModel.isLocationReady()) {
            viewModel.setLocationError()
            return
        }
        viewModel.login()
    }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted && NotificationAccess.areEnabled(context) && pendingLoginAfterNotification) {
            pendingLoginAfterNotification = false
            tryLogin()
        } else {
            pendingLoginAfterNotification = false
            viewModel.setNotificationError()
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { result ->
        val granted = result[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            result[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted && pendingLoginAfterPermission) {
            pendingLoginAfterPermission = false
            tryLogin()
        } else if (!granted) {
            pendingLoginAfterPermission = false
            viewModel.setLocationError()
        }
    }

    fun requestLogin() {
        if (!NotificationAccess.areEnabled(context)) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val granted = ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS,
                ) == PackageManager.PERMISSION_GRANTED
                if (!granted) {
                    pendingLoginAfterNotification = true
                    notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    return
                }
            }
            viewModel.setNotificationError()
            return
        }
        if (!hasLocationPermission()) {
            pendingLoginAfterPermission = true
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                ),
            )
            return
        }
        tryLogin()
    }

    LaunchedEffect(Unit) {
        viewModel.resetForm()
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event != Lifecycle.Event.ON_RESUME) return@LifecycleEventObserver
            when {
                state.errorKey == "notification_permission_denied" &&
                    viewModel.isNotificationReady() -> viewModel.clearError()
                state.errorKey in setOf("gps_disabled", "location_permission_denied") &&
                    viewModel.isLocationReady() -> viewModel.clearError()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val rootView = LocalView.current
    DisposableEffect(Unit) {
        val previous = rootView.importantForAutofill
        rootView.importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
        onDispose { rootView.importantForAutofill = previous }
    }

    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) {
            if (!viewModel.isNotificationReady()) {
                onNotificationRequired()
                return@LaunchedEffect
            }
            if (!viewModel.isLocationReady()) {
                viewModel.setLocationError()
                return@LaunchedEffect
            }
            runCatching {
                LocationSyncWorker.enqueue(context)
                LocationSyncWorker.enqueueImmediate(context)
            }
            runCatching {
                ContextCompat.startForegroundService(
                    context,
                    Intent(context, LocationTrackingService::class.java).apply {
                        action = LocationTrackingService.ACTION_START
                    },
                )
            }
            onLoginSuccess()
        }
    }

    val imeVisible = WindowInsets.ime.getBottom(LocalDensity.current) > 0
    val scrollState = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(sherinHeroBrush(false))
            .imePadding(),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.End,
        ) {
            Box {
                SherinGlassIconButton(onClick = { showLangMenu = true }, icon = Icons.Default.Language, size = 40.dp)
                AppLanguageDropdownMenu(
                    expanded = showLangMenu,
                    onDismissRequest = { showLangMenu = false },
                    current = lang,
                    isDark = false,
                    onSelect = viewModel::setLanguage,
                )
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp)
                .padding(top = if (imeVisible) 72.dp else 0.dp, bottom = 24.dp),
            verticalArrangement = if (imeVisible) Arrangement.Top else Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(16.dp),
            ) {
                Column(modifier = Modifier.padding(28.dp)) {
                    Text(AppStrings.loginTitle(lang), fontSize = 26.sp, fontWeight = FontWeight.Bold, color = Color(0xFF111827))
                    Text(AppStrings.loginSubtitle(lang), color = Color(0xFF6B7280), fontSize = 14.sp)
                    Spacer(Modifier.height(28.dp))

                    OutlinedTextField(
                        value = state.username,
                        onValueChange = viewModel::onUsernameChange,
                        label = { Text(AppStrings.loginField(lang)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        colors = loginFieldColors,
                    )
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = state.password,
                        onValueChange = viewModel::onPasswordChange,
                        label = { Text(AppStrings.password(lang)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        visualTransformation = if (passwordVisible) {
                            VisualTransformation.None
                        } else {
                            PasswordVisualTransformation()
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) {
                                        Icons.Default.Visibility
                                    } else {
                                        Icons.Outlined.VisibilityOff
                                    },
                                    contentDescription = if (passwordVisible) {
                                        AppStrings.hide(lang)
                                    } else {
                                        AppStrings.showPassword(lang)
                                    },
                                    tint = Color(0xFF6B7280),
                                )
                            }
                        },
                        shape = RoundedCornerShape(14.dp),
                        colors = loginFieldColors,
                    )

                    state.errorKey?.let { key ->
                        Spacer(Modifier.height(8.dp))
                        Text(
                            AppStrings.apiError(lang, key),
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 13.sp,
                            lineHeight = 18.sp,
                        )
                        if (key == "gps_disabled") {
                            Spacer(Modifier.height(8.dp))
                            TextButton(
                                onClick = {
                                    context.startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))
                                },
                            ) {
                                Text(AppStrings.enableGpsButton(lang), color = SherinColors.Primary)
                            }
                        }
                        if (key == "notification_permission_denied") {
                            Spacer(Modifier.height(8.dp))
                            TextButton(
                                onClick = {
                                    runCatching {
                                        context.startActivity(
                                            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                                putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                                            },
                                        )
                                    }
                                },
                            ) {
                                Text(AppStrings.notificationRequiredEnable(lang), color = SherinColors.Primary)
                            }
                        }
                    }

                    Spacer(Modifier.height(24.dp))
                    Button(
                        onClick = ::requestLogin,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        enabled = !state.isLoading,
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = SherinColors.Primary),
                    ) {
                        if (state.isLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                        } else {
                            Text(
                                AppStrings.loginButton(lang),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.White,
                            )
                        }
                    }
                }
            }
        }
    }
}
