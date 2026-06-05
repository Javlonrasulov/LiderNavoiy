package uz.distributor.crm.presentation.clients

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.rememberAsyncImagePainter
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinSubpageHeader
import uz.distributor.crm.presentation.theme.sherinPageBackground
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddClientScreen(
    onBack: () -> Unit,
    onSaved: () -> Unit,
    viewModel: AddClientViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val cardBg = if (isDark) SherinColors.CardDark else Color.White
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    val snackbarHostState = remember { SnackbarHostState() }

    val feedbackMessage = remember(state.validationError, state.errorMessage, lang) {
        when (state.validationError) {
            AddClientValidationError.NAME -> AppStrings.errorNameRequired(lang)
            AddClientValidationError.INN -> AppStrings.errorInnRequired(lang)
            AddClientValidationError.PHONE -> AppStrings.errorPhoneRequired(lang)
            AddClientValidationError.LINE -> AppStrings.errorLineRequired(lang)
            AddClientValidationError.ADDRESS -> AppStrings.errorAddressRequired(lang)
            null -> state.errorMessage?.let { AppStrings.addClientError(lang, it) }
        }
    }

    var showFullScreenMap by remember { mutableStateOf(false) }
    var showPhotoSource by remember { mutableStateOf(false) }
    var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }

    val galleryPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent(),
    ) { uri: Uri? ->
        viewModel.onPhotoSelected(uri)
        showPhotoSource = false
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture(),
    ) { success ->
        if (success) {
            pendingCameraUri?.let { viewModel.onPhotoSelected(it) }
        }
        showPhotoSource = false
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            val uri = createCameraImageUri(context)
            pendingCameraUri = uri
            cameraLauncher.launch(uri)
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            viewModel.useMyLocation()
        }
    }

    fun requestMyLocation() {
        val fineGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        if (fineGranted || coarseGranted) {
            viewModel.useMyLocation()
        } else {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                ),
            )
        }
    }

    fun launchCamera() {
        val granted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA,
        ) == PackageManager.PERMISSION_GRANTED
        if (granted) {
            val uri = createCameraImageUri(context)
            pendingCameraUri = uri
            cameraLauncher.launch(uri)
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    LaunchedEffect(state.saved) {
        if (!state.saved) return@LaunchedEffect
        val message = if (state.savedAsRequest) {
            AppStrings.clientRequestSubmitted(lang)
        } else {
            AppStrings.clientSaved(lang)
        }
        snackbarHostState.showSnackbar(message)
        onSaved()
    }

    LaunchedEffect(state.validationError, state.errorMessage) {
        val message = feedbackMessage ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(message)
    }

    if (showFullScreenMap) {
        FullScreenMapDialog(
            latitude = state.latitude,
            longitude = state.longitude,
            isDark = isDark,
            lang = lang,
            onLocationSelected = viewModel::onLocationSelected,
            onDismiss = { showFullScreenMap = false },
        )
    }

    if (showPhotoSource) {
        ModalBottomSheet(onDismissRequest = { showPhotoSource = false }) {
            ListItem(
                headlineContent = { Text(AppStrings.takePhoto(lang)) },
                leadingContent = {
                    Icon(Icons.Default.CameraAlt, contentDescription = null)
                },
                modifier = Modifier.clickable {
                    showPhotoSource = false
                    launchCamera()
                },
            )
            ListItem(
                headlineContent = { Text(AppStrings.chooseFromGallery(lang)) },
                leadingContent = {
                    Icon(Icons.Default.PhotoLibrary, contentDescription = null)
                },
                modifier = Modifier.clickable {
                    galleryPicker.launch("image/*")
                },
            )
            Spacer(Modifier.height(24.dp))
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(sherinPageBackground(isDark)),
    ) {
        Column(Modifier.fillMaxSize()) {
            SherinSubpageHeader(
                title = AppStrings.addClientTitle(lang),
                isDark = isDark,
                onBack = onBack,
            )

            Column(
                Modifier
                    .weight(1f)
                    .verticalScroll(scrollState)
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
            OutlinedTextField(
                value = state.name,
                onValueChange = viewModel::onNameChange,
                label = { Text(AppStrings.clientName(lang)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
            )
            OutlinedTextField(
                value = state.inn,
                onValueChange = viewModel::onInnChange,
                label = { Text(AppStrings.clientInn(lang)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                shape = RoundedCornerShape(14.dp),
            )
            OutlinedTextField(
                value = state.phoneDigits,
                onValueChange = viewModel::onPhoneChange,
                label = { Text(AppStrings.clientPhone(lang)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                prefix = { Text("+998 ", fontWeight = FontWeight.Medium) },
                placeholder = { Text("90 123 45 67") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                shape = RoundedCornerShape(14.dp),
            )

            LinePickerField(
                lines = state.lines,
                selectedCode = state.selectedLineCode,
                isLoading = state.isLoadingLines,
                lang = lang,
                onLineSelected = viewModel::onLineSelected,
            )

            OutlinedTextField(
                value = state.address,
                onValueChange = viewModel::onAddressChange,
                label = { Text(AppStrings.clientAddress(lang)) },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                maxLines = 4,
                shape = RoundedCornerShape(14.dp),
            )

            Surface(shape = RoundedCornerShape(20.dp), color = cardBg) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        AppStrings.clientLocation(lang),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                        color = if (isDark) Color.White else Color.Black,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        AppStrings.tapMapHint(lang),
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                        color = Color(0xFF9CA3AF),
                    )
                    Spacer(Modifier.height(12.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(240.dp)
                            .clip(RoundedCornerShape(16.dp)),
                    ) {
                        LocationPickerMap(
                            latitude = state.latitude,
                            longitude = state.longitude,
                            isDark = isDark,
                            onLocationSelected = viewModel::onLocationSelected,
                            modifier = Modifier.fillMaxSize(),
                        )
                        MapOverlayButton(
                            onClick = { showFullScreenMap = true },
                            icon = Icons.Default.Fullscreen,
                            label = AppStrings.fullScreenMap(lang),
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(10.dp),
                        )
                        MapOverlayButton(
                            onClick = ::requestMyLocation,
                            icon = Icons.Default.MyLocation,
                            label = AppStrings.useMyLocation(lang),
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(10.dp),
                            tint = SherinColors.Primary,
                            loading = state.isLocating,
                        )
                    }
                    state.latitude.let { lat ->
                        state.longitude.let { lng ->
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 10.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = if (isDark) Color(0xFF1E3A5F) else Color(0xFFEEF2FF),
                            ) {
                                Row(
                                    Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        Icons.Default.MyLocation,
                                        contentDescription = null,
                                        tint = Color(0xFF6366F1),
                                        modifier = Modifier.size(18.dp),
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    Text(
                                        "${String.format("%.6f", lat)}, ${String.format("%.6f", lng)}",
                                        fontSize = 13.sp,
                                        color = Color(0xFF6366F1),
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Surface(shape = RoundedCornerShape(20.dp), color = cardBg) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        AppStrings.clientPhoto(lang),
                        fontWeight = FontWeight.SemiBold,
                        color = if (isDark) Color.White else Color.Black,
                    )
                    Spacer(Modifier.height(12.dp))
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(160.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (isDark) Color(0xFF1F2937) else Color(0xFFF3F4F6))
                            .border(
                                1.dp,
                                if (isDark) Color(0xFF374151) else Color(0xFFE5E7EB),
                                RoundedCornerShape(16.dp),
                            )
                            .clickable { showPhotoSource = true },
                        contentAlignment = Alignment.Center,
                    ) {
                        if (state.photoUri != null) {
                            Image(
                                painter = rememberAsyncImagePainter(state.photoUri),
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop,
                            )
                        } else {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.CameraAlt, null, tint = Color(0xFF9CA3AF))
                                Text(AppStrings.selectPhoto(lang), color = Color(0xFF9CA3AF), fontSize = 13.sp)
                            }
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = { showPhotoSource = true },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Text(AppStrings.selectPhoto(lang))
                    }
                }
            }
        }

        feedbackMessage?.let { message ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.errorContainer,
            ) {
                Row(
                    Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Default.ErrorOutline,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        message,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                    )
                }
            }
        }

        Button(
            onClick = viewModel::save,
            enabled = !state.isSaving && !state.isLoadingLines && state.lines.isNotEmpty(),
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
                .height(52.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SherinColors.Primary),
        ) {
            if (state.isSaving) {
                CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White)
            } else {
                Text(AppStrings.saveClient(lang), fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 88.dp),
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LinePickerField(
    lines: List<uz.distributor.crm.data.remote.dto.LineDto>,
    selectedCode: String?,
    isLoading: Boolean,
    lang: uz.distributor.crm.localization.AppLanguage,
    onLineSelected: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLine = lines.find { it.code == selectedCode }
    val displayValue = when {
        isLoading -> AppStrings.msgLoading(lang)
        selectedLine != null -> AppStrings.lineDisplayLabel(
            selectedLine.code,
            selectedLine.name,
        )
        else -> ""
    }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { if (!isLoading && lines.isNotEmpty()) expanded = it },
        modifier = Modifier.fillMaxWidth(),
    ) {
        OutlinedTextField(
            value = displayValue,
            onValueChange = {},
            readOnly = true,
            label = { Text(AppStrings.clientLine(lang)) },
            placeholder = { Text(AppStrings.selectLine(lang)) },
            trailingIcon = {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                }
            },
            modifier = Modifier
                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                .fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            enabled = !isLoading && lines.isNotEmpty(),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            lines.forEach { line ->
                DropdownMenuItem(
                    text = {
                        Text(
                            AppStrings.lineDisplayLabel(line.code, line.name),
                            fontSize = 14.sp,
                        )
                    },
                    onClick = {
                        onLineSelected(line.code)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
private fun FullScreenMapDialog(
    latitude: Double?,
    longitude: Double?,
    isDark: Boolean,
    lang: uz.distributor.crm.localization.AppLanguage,
    onLocationSelected: (Double, Double) -> Unit,
    onDismiss: () -> Unit,
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .background(if (isDark) Color(0xFF111827) else Color.White),
        ) {
            LocationPickerMap(
                latitude = latitude,
                longitude = longitude,
                isDark = isDark,
                onLocationSelected = onLocationSelected,
                modifier = Modifier.fillMaxSize(),
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp)
                    .align(Alignment.TopCenter),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = null, tint = Color.White)
                }
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color.Black.copy(alpha = 0.55f),
                ) {
                    Text(
                        AppStrings.clientLocation(lang),
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        fontSize = 14.sp,
                    )
                }
                Spacer(Modifier.width(48.dp))
            }
            Button(
                onClick = onDismiss,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(20.dp)
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = SherinColors.Primary),
            ) {
                Text(AppStrings.done(lang), fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

private fun createCameraImageUri(context: android.content.Context): Uri {
    val file = File(context.cacheDir, "client_photo_${System.currentTimeMillis()}.jpg")
    return FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )
}

@Composable
private fun MapOverlayButton(
    onClick: () -> Unit,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    modifier: Modifier = Modifier,
    tint: Color = Color.White,
    loading: Boolean = false,
) {
    Surface(
        onClick = onClick,
        modifier = modifier.size(44.dp),
        shape = RoundedCornerShape(12.dp),
        color = Color.Black.copy(alpha = 0.55f),
        shadowElevation = 4.dp,
        enabled = !loading,
    ) {
        Box(contentAlignment = Alignment.Center) {
            if (loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = tint,
                    strokeWidth = 2.dp,
                )
            } else {
                Icon(
                    icon,
                    contentDescription = label,
                    tint = tint,
                    modifier = Modifier.size(22.dp),
                )
            }
        }
    }
}
