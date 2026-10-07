package uz.distributor.crm.presentation.clients

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.PackageManager
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.WindowCompat
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.rememberAsyncImagePainter
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import java.io.File
import kotlin.math.roundToInt

/** Manager APK `theme.ts` palitrasi — forma Manager bilan bir xil ko‘rinishi uchun. */
private data class FormPalette(
    val bg: Color,
    val text: Color,
    val card: Color,
    val muted: Color,
    val mutedText: Color,
    val border: Color,
    val rowBg: Color,
    val photoBg: Color,
    val offButton: Color,
    val primary: Color = Color(0xFF6C5CE7),
    val indigo: Color = Color(0xFF6366F1),
    val indigoSoft: Color = Color(0x246366F1),
    val red: Color = Color(0xFFF44336),
    val greenSoft: Color = Color(0x2410B981),
    val greenOn: Color = Color(0x2910B981),
    val greenText: Color = Color(0xFF059669),
)

private fun formPalette(dark: Boolean) = if (dark) {
    FormPalette(
        bg = Color(0xFF080812),
        text = Color(0xFFF0EEFF),
        card = Color(0xFF13132A),
        muted = Color(0xFF1E1E38),
        mutedText = Color(0xFF9E9BC4),
        border = Color(0x1F9682FF),
        rowBg = Color(0xFF1A1A2E),
        photoBg = Color(0xFF1A1A2E),
        offButton = Color(0xFF252540),
    )
} else {
    FormPalette(
        bg = Color(0xFFF8F9FC),
        text = Color(0xFF0D0D1A),
        card = Color.White,
        muted = Color(0xFFF1F2F8),
        mutedText = Color(0xFF6B7280),
        border = Color(0x146C5CE7),
        rowBg = Color(0xFFF9FAFB),
        photoBg = Color(0xFFF3F4F6),
        offButton = Color(0xFFE5E7EB),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerFormScreen(
    onBack: () -> Unit,
    onSaved: (CustomerFormResult) -> Unit,
    viewModel: CustomerFormViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val c = remember(isDark) { formPalette(isDark) }
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    var picker by remember { mutableStateOf<CustomerCatalogKind?>(null) }
    var mapFullscreen by remember { mutableStateOf(false) }
    var photoFullscreen by remember { mutableStateOf(false) }
    var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }

    LightStatusBarIcons(enabled = !isDark)

    val galleryPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let(viewModel::onPhotoPicked)
    }
    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        if (success) pendingCameraUri?.let(viewModel::onPhotoPicked)
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
        if (granted) viewModel.useMyLocation() else viewModel.showMessage(CustomerFormMessage.LocationDenied)
    }

    fun requestMyLocation() {
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        if (fine || coarse) {
            viewModel.useMyLocation()
        } else {
            locationPermissionLauncher.launch(
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
            )
        }
    }

    fun launchCamera() {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) {
            val uri = createCameraImageUri(context)
            pendingCameraUri = uri
            cameraLauncher.launch(uri)
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    // consumeMessage() kalitni null qiladi va LaunchedEffect'ni bekor qiladi,
    // shuning uchun snackbar ekran darajasidagi scope'da ko'rsatiladi.
    val messageScope = rememberCoroutineScope()
    LaunchedEffect(state.message) {
        val message = state.message ?: return@LaunchedEffect
        val text = formMessageText(lang, message)
        viewModel.consumeMessage()
        messageScope.launch {
            snackbarHostState.currentSnackbarData?.dismiss()
            snackbarHostState.showSnackbar(text)
        }
    }

    LaunchedEffect(state.result) {
        val result = state.result ?: return@LaunchedEffect
        val text = when {
            result.pendingApproval -> AppStrings.customerRequestSubmitted(lang)
            result.isEdit -> AppStrings.customerUpdated(lang)
            else -> AppStrings.customerCreated(lang)
        }
        Toast.makeText(context, text, Toast.LENGTH_SHORT).show()
        onSaved(result)
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(c.bg),
    ) {
        Column(Modifier.fillMaxSize()) {
            FormHeader(
                title = if (state.isEdit) AppStrings.customerEditTitle(lang) else AppStrings.customerAddTitle(lang),
                c = c,
                lang = lang,
                onBack = onBack,
                onAddLine = { viewModel.openModal(CustomerCatalogKind.LINE) },
                onAddCategory = { viewModel.openModal(CustomerCatalogKind.CATEGORY) },
            )

            when {
                state.prefillLoading -> Box(
                    Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(AppStrings.msgLoading(lang), color = c.mutedText, fontSize = 14.sp)
                }
                state.prefillFailed -> Column(
                    Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(AppStrings.customerLoadFailed(lang), color = c.mutedText, fontSize = 14.sp)
                    Spacer(Modifier.height(12.dp))
                    SoftButton(
                        text = AppStrings.retryLoad(lang),
                        background = c.indigoSoft,
                        contentColor = c.primary,
                        onClick = viewModel::retryPrefill,
                        modifier = Modifier.width(180.dp),
                    )
                }
                else -> FormContent(
                    state = state,
                    viewModel = viewModel,
                    c = c,
                    lang = lang,
                    isDark = isDark,
                    onBack = onBack,
                    onOpenPicker = { picker = it },
                    onOpenMapFullscreen = { mapFullscreen = true },
                    onOpenPhotoFullscreen = { photoFullscreen = true },
                    onMyLocation = ::requestMyLocation,
                    onCamera = ::launchCamera,
                    onGallery = { galleryPicker.launch("image/*") },
                )
            }
        }

        if (mapFullscreen) {
            FullscreenMapOverlay(
                state = state,
                c = c,
                lang = lang,
                isDark = isDark,
                onLocationSelected = viewModel::onLocationSelected,
                onRadiusChange = viewModel::onRadiusChange,
                onMyLocation = ::requestMyLocation,
                onDismiss = { mapFullscreen = false },
            )
        }

        val preview = state.photoPreview
        if (photoFullscreen && preview != null) {
            FullscreenPhotoOverlay(
                model = preview,
                title = AppStrings.customerPhoto(lang),
                onDismiss = { photoFullscreen = false },
            )
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 12.dp),
        )
    }

    picker?.let { kind ->
        CatalogPickerSheet(
            kind = kind,
            state = state,
            c = c,
            lang = lang,
            onDismiss = { picker = null },
            onSelect = { value ->
                if (kind == CustomerCatalogKind.LINE) viewModel.onLineSelected(value) else viewModel.onCategorySelected(value)
                picker = null
            },
            onEdit = { id, name ->
                picker = null
                viewModel.openModal(kind, id, name)
            },
            onAdd = {
                picker = null
                viewModel.openModal(kind)
            },
        )
    }

    state.modal?.let { modal ->
        CatalogModal(
            modal = modal,
            similarLines = state.similarLines,
            c = c,
            lang = lang,
            onNameChange = viewModel::onModalNameChange,
            onPickExisting = viewModel::pickExistingLine,
            onSave = viewModel::saveModal,
            onDismiss = viewModel::closeModal,
        )
    }

    state.similarity?.let { match ->
        SimilaritySheet(
            match = match,
            isSaving = state.isSaving,
            isDark = isDark,
            c = c,
            lang = lang,
            onDismiss = viewModel::dismissSimilarity,
            onAddAnyway = viewModel::confirmAddAnyway,
        )
    }
}

@Composable
private fun FormContent(
    state: CustomerFormUiState,
    viewModel: CustomerFormViewModel,
    c: FormPalette,
    lang: AppLanguage,
    isDark: Boolean,
    onBack: () -> Unit,
    onOpenPicker: (CustomerCatalogKind) -> Unit,
    onOpenMapFullscreen: () -> Unit,
    onOpenPhotoFullscreen: () -> Unit,
    onMyLocation: () -> Unit,
    onCamera: () -> Unit,
    onGallery: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
            .padding(top = 8.dp),
    ) {
        LabeledInput(AppStrings.customerName(lang), true, state.name, viewModel::onNameChange, c)
        LabeledInput(AppStrings.customerFullName(lang), true, state.fullName, viewModel::onFullNameChange, c)
        LabeledInput(
            label = AppStrings.customerInn(lang),
            required = false,
            value = state.inn,
            onValueChange = viewModel::onInnChange,
            c = c,
            keyboardType = KeyboardType.Number,
        )

        FieldBlock {
            FieldLabel("${AppStrings.customerPhone(lang)} *", c)
            PhoneInput(value = state.phone, onValueChange = viewModel::onPhoneChange, c = c)
        }

        ExtraPhonesSection(state = state, viewModel = viewModel, c = c, lang = lang)

        LabeledInput(AppStrings.customerAddress(lang), true, state.address, viewModel::onAddressChange, c)
        LabeledInput(AppStrings.customerOrientir(lang), false, state.territory, viewModel::onTerritoryChange, c)

        PhotoSection(
            state = state,
            c = c,
            lang = lang,
            onRemove = viewModel::removePhoto,
            onOpenFullscreen = onOpenPhotoFullscreen,
            onCamera = onCamera,
            onGallery = onGallery,
        )

        MarkColorSection(selected = state.markColor, onSelect = viewModel::onMarkColorChange, c = c, lang = lang)

        val lineLabel = state.lines.find { it.code == state.lineCode }?.name.orEmpty()
        PickerField(
            label = AppStrings.customerLine(lang),
            valueLabel = lineLabel,
            placeholder = AppStrings.customerLineSelect(lang),
            loading = state.linesLoading,
            c = c,
            lang = lang,
            onOpen = { onOpenPicker(CustomerCatalogKind.LINE) },
        )
        PickerField(
            label = AppStrings.customerCategory(lang),
            valueLabel = state.category,
            placeholder = AppStrings.customerCategorySelect(lang),
            loading = state.categoriesLoading,
            c = c,
            lang = lang,
            onOpen = { onOpenPicker(CustomerCatalogKind.CATEGORY) },
        )

        MapSection(
            state = state,
            c = c,
            lang = lang,
            isDark = isDark,
            onLocationSelected = viewModel::onLocationSelected,
            onMyLocation = onMyLocation,
            onFullscreen = onOpenMapFullscreen,
        )

        RadiusSlider(radius = state.radius, onChange = viewModel::onRadiusChange, c = c, lang = lang)
        Text(
            AppStrings.customerOrderRadiusHint(lang),
            modifier = Modifier.padding(top = 4.dp),
            fontSize = 11.sp,
            lineHeight = 15.sp,
            color = c.mutedText,
        )

        Row(
            Modifier
                .padding(top = 14.dp)
                .fillMaxWidth()
                .height(IntrinsicSize.Min),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            SettingCard(
                title = AppStrings.customerAppAccess(lang),
                hint = AppStrings.customerAppAccessHint(lang),
                enabled = state.appAccess,
                onLabel = AppStrings.customerAppAccessOn(lang),
                offLabel = AppStrings.customerAppAccessOff(lang),
                onToggle = viewModel::toggleAppAccess,
                c = c,
                modifier = Modifier.weight(1f),
            )
            SettingCard(
                title = AppStrings.customerCanSeePromotions(lang),
                hint = AppStrings.customerCanSeePromotionsHint(lang),
                enabled = state.canSeePromotions,
                onLabel = AppStrings.customerCanSeePromotionsOn(lang),
                offLabel = AppStrings.customerCanSeePromotionsOff(lang),
                onToggle = viewModel::togglePromotions,
                c = c,
                modifier = Modifier.weight(1f),
            )
        }

        if (state.appCredOpen) {
            AppCredentialsPanel(state = state, viewModel = viewModel, c = c, lang = lang)
        }

        Spacer(Modifier.height(22.dp))
        PrimaryGradientButton(
            text = if (state.isSaving) AppStrings.msgLoading(lang) else AppStrings.customerSave(lang),
            loading = state.isSaving,
            enabled = !state.isSaving && !state.photoUploading,
            onClick = viewModel::submit,
        )
        Spacer(Modifier.height(10.dp))
        Surface(
            onClick = onBack,
            enabled = !state.isSaving,
            shape = RoundedCornerShape(16.dp),
            color = c.muted,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(AppStrings.customerCancel(lang), color = c.mutedText, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
        }
        // Tizim navigatsiya paneli (3 tugma / gesture) ustida qolishi uchun
        Spacer(
            Modifier
                .navigationBarsPadding()
                .height(28.dp),
        )
    }
}

// ─── Header ───

@Composable
private fun FormHeader(
    title: String,
    c: FormPalette,
    lang: AppLanguage,
    onBack: () -> Unit,
    onAddLine: () -> Unit,
    onAddCategory: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 16.dp)
            .padding(top = 10.dp, bottom = 10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Surface(
                onClick = onBack,
                shape = RoundedCornerShape(13.dp),
                color = c.muted,
                modifier = Modifier.size(40.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = AppStrings.close(lang),
                        tint = c.text,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            Text(
                title,
                modifier = Modifier.weight(1f),
                color = c.text,
                fontSize = 20.sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            HeaderActionButton(AppStrings.customerAddLine(lang), c, onAddLine, Modifier.weight(1f))
            HeaderActionButton(AppStrings.customerAddCategory(lang), c, onAddCategory, Modifier.weight(1f))
        }
    }
}

@Composable
private fun HeaderActionButton(label: String, c: FormPalette, onClick: () -> Unit, modifier: Modifier) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = c.indigoSoft,
        modifier = modifier.height(40.dp),
    ) {
        Row(
            Modifier.padding(horizontal = 12.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Default.Add, contentDescription = null, tint = c.primary, modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(6.dp))
            Text(label, color = c.primary, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1)
        }
    }
}

// ─── Inputs ───

@Composable
private fun FieldBlock(content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.padding(bottom = 12.dp), content = content)
}

@Composable
private fun FieldLabel(text: String, c: FormPalette) {
    Text(
        text,
        modifier = Modifier.padding(bottom = 6.dp),
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        color = c.mutedText,
    )
}

@Composable
private fun LabeledInput(
    label: String,
    required: Boolean,
    value: String,
    onValueChange: (String) -> Unit,
    c: FormPalette,
    keyboardType: KeyboardType = KeyboardType.Text,
) {
    FieldBlock {
        FieldLabel(if (required) "$label *" else label, c)
        FormInput(value = value, onValueChange = onValueChange, c = c, keyboardType = keyboardType)
    }
}

@Composable
private fun FormInput(
    value: String,
    onValueChange: (String) -> Unit,
    c: FormPalette,
    modifier: Modifier = Modifier,
    height: Dp = 48.dp,
    placeholder: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.Sentences,
    imeAction: ImeAction = ImeAction.Next,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    fontSize: Int = 14,
    trailing: (@Composable () -> Unit)? = null,
) {
    val shape = RoundedCornerShape(14.dp)
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        textStyle = TextStyle(color = c.text, fontSize = fontSize.sp, fontWeight = FontWeight.SemiBold),
        cursorBrush = SolidColor(c.primary),
        keyboardOptions = KeyboardOptions(
            keyboardType = keyboardType,
            imeAction = imeAction,
            capitalization = capitalization,
        ),
        visualTransformation = visualTransformation,
        modifier = modifier
            .fillMaxWidth()
            .height(height),
        decorationBox = { inner ->
            InputDecoration(shape, c, value.isEmpty(), placeholder, fontSize, trailing, inner)
        },
    )
}

@Composable
private fun InputDecoration(
    shape: RoundedCornerShape,
    c: FormPalette,
    isEmpty: Boolean,
    placeholder: String?,
    fontSize: Int,
    trailing: (@Composable () -> Unit)?,
    inner: @Composable () -> Unit,
) {
    Row(
        Modifier
            .fillMaxSize()
            .clip(shape)
            .background(c.muted)
            .border(1.dp, c.border, shape)
            .padding(start = 14.dp, end = if (trailing != null) 6.dp else 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
            if (isEmpty && placeholder != null) {
                Text(placeholder, color = c.mutedText, fontSize = fontSize.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
            }
            inner()
        }
        trailing?.invoke()
    }
}

/** +998 maskasi — formatlashdan keyin kursor oxirida qoladi. */
@Composable
private fun PhoneInput(
    value: String,
    onValueChange: (String) -> Unit,
    c: FormPalette,
    modifier: Modifier = Modifier,
    height: Dp = 48.dp,
    placeholder: String? = null,
) {
    var field by remember { mutableStateOf(TextFieldValue(value, TextRange(value.length))) }
    LaunchedEffect(value) {
        if (field.text != value) field = TextFieldValue(value, TextRange(value.length))
    }
    val shape = RoundedCornerShape(14.dp)
    BasicTextField(
        value = field,
        onValueChange = { next ->
            val formatted = CustomerFormLogic.formatUzPhone(next.text)
            field = TextFieldValue(formatted, TextRange(formatted.length))
            onValueChange(formatted)
        },
        singleLine = true,
        textStyle = TextStyle(color = c.text, fontSize = 14.sp, fontWeight = FontWeight.SemiBold),
        cursorBrush = SolidColor(c.primary),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
        modifier = modifier
            .fillMaxWidth()
            .height(height),
        decorationBox = { inner ->
            InputDecoration(shape, c, field.text.isEmpty(), placeholder, 14, null, inner)
        },
    )
}

@Composable
private fun ExtraPhonesSection(
    state: CustomerFormUiState,
    viewModel: CustomerFormViewModel,
    c: FormPalette,
    lang: AppLanguage,
) {
    FieldBlock {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                AppStrings.customerExtraPhone(lang),
                modifier = Modifier.weight(1f),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = c.mutedText,
            )
            Surface(
                onClick = viewModel::addExtraPhone,
                shape = RoundedCornerShape(10.dp),
                color = c.indigoSoft,
                modifier = Modifier.size(32.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = AppStrings.customerExtraPhone(lang),
                        tint = c.primary,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
        state.extraPhones.forEachIndexed { index, row ->
            val shape = RoundedCornerShape(14.dp)
            Column(
                Modifier
                    .padding(bottom = 8.dp)
                    .fillMaxWidth()
                    .clip(shape)
                    .background(c.rowBg)
                    .border(1.dp, c.border, shape)
                    .padding(10.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    PhoneInput(
                        value = row.phone,
                        onValueChange = { viewModel.onExtraPhoneChange(index, it) },
                        c = c,
                        modifier = Modifier.weight(1f),
                        height = 42.dp,
                        placeholder = AppStrings.customerExtraPhone(lang),
                    )
                    Spacer(Modifier.width(8.dp))
                    Surface(
                        onClick = { viewModel.removeExtraPhone(index) },
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0x1FF44336),
                        modifier = Modifier.size(42.dp),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Close, contentDescription = null, tint = c.red, modifier = Modifier.size(14.dp))
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                FormInput(
                    value = row.note,
                    onValueChange = { viewModel.onExtraPhoneNoteChange(index, it) },
                    c = c,
                    height = 42.dp,
                    placeholder = AppStrings.customerExtraPhoneNote(lang),
                )
            }
        }
    }
}

// ─── Rasm ───

@Composable
private fun PhotoSection(
    state: CustomerFormUiState,
    c: FormPalette,
    lang: AppLanguage,
    onRemove: () -> Unit,
    onOpenFullscreen: () -> Unit,
    onCamera: () -> Unit,
    onGallery: () -> Unit,
) {
    Column(Modifier.padding(bottom = 14.dp)) {
        FieldLabel(AppStrings.customerPhoto(lang), c)
        val shape = RoundedCornerShape(16.dp)
        Column(
            Modifier
                .fillMaxWidth()
                .clip(shape)
                .background(c.card)
                .border(1.dp, c.border, shape),
        ) {
            val preview = state.photoPreview
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .background(c.photoBg)
                    .clickable(enabled = preview != null && !state.photoUploading, onClick = onOpenFullscreen),
                contentAlignment = Alignment.Center,
            ) {
                if (preview != null) {
                    Image(
                        painter = rememberAsyncImagePainter(preview),
                        contentDescription = AppStrings.customerPhoto(lang),
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.CameraAlt, contentDescription = null, tint = c.mutedText, modifier = Modifier.size(28.dp))
                        Spacer(Modifier.height(8.dp))
                        Text(AppStrings.customerPhoto(lang), color = c.mutedText, fontSize = 12.sp)
                    }
                }
                if (state.photoUploading) {
                    Box(
                        Modifier
                            .fillMaxSize()
                            .background(Color(0x73000000)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CircularProgressIndicator(Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                            Spacer(Modifier.width(8.dp))
                            Text(
                                AppStrings.customerPhotoUploading(lang),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                            )
                        }
                    }
                }
                if (preview != null && !state.photoUploading) {
                    PhotoOverlayButton(
                        icon = Icons.Default.Fullscreen,
                        description = AppStrings.customerMapFullscreen(lang),
                        onClick = onOpenFullscreen,
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(8.dp),
                    )
                    PhotoOverlayButton(
                        icon = Icons.Default.Close,
                        description = AppStrings.close(lang),
                        onClick = onRemove,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp),
                    )
                }
            }
            Row(
                Modifier.padding(10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                val busy = state.photoUploading || state.isSaving
                PhotoActionButton(
                    icon = Icons.Default.CameraAlt,
                    label = AppStrings.customerTakePhoto(lang),
                    background = Color(0x1F6C5CE7),
                    contentColor = c.primary,
                    enabled = !busy,
                    onClick = onCamera,
                    modifier = Modifier.weight(1f),
                )
                PhotoActionButton(
                    icon = Icons.Default.PhotoLibrary,
                    label = AppStrings.customerPickGallery(lang),
                    background = c.muted,
                    contentColor = c.text,
                    enabled = !busy,
                    onClick = onGallery,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun PhotoOverlayButton(icon: ImageVector, description: String, onClick: () -> Unit, modifier: Modifier) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        color = Color(0x80000000),
        modifier = modifier.size(32.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = description, tint = Color.White, modifier = Modifier.size(16.dp))
        }
    }
}

@Composable
private fun PhotoActionButton(
    icon: ImageVector,
    label: String,
    background: Color,
    contentColor: Color,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        color = background,
        modifier = modifier
            .height(40.dp)
            .alpha(if (enabled) 1f else 0.6f),
    ) {
        Row(horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = contentColor, modifier = Modifier.size(15.dp))
            Spacer(Modifier.width(6.dp))
            Text(label, color = contentColor, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
        }
    }
}

// ─── Belgi ───

@Composable
private fun MarkColorSection(
    selected: CustomerMarkColor,
    onSelect: (CustomerMarkColor) -> Unit,
    c: FormPalette,
    lang: AppLanguage,
) {
    val shape = RoundedCornerShape(16.dp)
    Column(
        Modifier
            .padding(bottom = 14.dp)
            .fillMaxWidth()
            .clip(shape)
            .background(c.card)
            .border(1.dp, c.border, shape)
            .padding(14.dp),
    ) {
        Text(
            AppStrings.customerMarkColor(lang),
            modifier = Modifier.padding(bottom = 10.dp),
            fontSize = 13.sp,
            fontWeight = FontWeight.ExtraBold,
            color = c.text,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            listOf(
                Triple(CustomerMarkColor.GREEN, Color(0xFF22C55E), AppStrings.customerMarkGreen(lang)),
                Triple(CustomerMarkColor.YELLOW, Color(0xFFEAB308), AppStrings.customerMarkYellow(lang)),
                Triple(CustomerMarkColor.RED, Color(0xFFEF4444), AppStrings.customerMarkRed(lang)),
            ).forEach { (option, color, label) ->
                val isSelected = option == selected
                val itemShape = RoundedCornerShape(14.dp)
                Box(
                    Modifier
                        .weight(1f)
                        .then(
                            if (isSelected) {
                                Modifier.border(3.dp, color.copy(alpha = 0.2f), RoundedCornerShape(17.dp)).padding(3.dp)
                            } else {
                                Modifier.padding(3.dp)
                            },
                        ),
                ) {
                    Surface(
                        onClick = { onSelect(option) },
                        shape = itemShape,
                        color = if (isSelected) color.copy(alpha = 0.13f) else c.rowBg,
                        border = androidx.compose.foundation.BorderStroke(
                            if (isSelected) 2.dp else 1.dp,
                            if (isSelected) color else c.border,
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                    ) {
                        Column(
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Box(
                                Modifier
                                    .size(20.dp)
                                    .clip(CircleShape)
                                    .background(color),
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                label,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = if (isSelected) color else c.mutedText,
                                maxLines = 1,
                            )
                        }
                    }
                }
            }
        }
    }
}

// ─── Picker ───

@Composable
private fun PickerField(
    label: String,
    valueLabel: String,
    placeholder: String,
    loading: Boolean,
    c: FormPalette,
    lang: AppLanguage,
    onOpen: () -> Unit,
) {
    FieldBlock {
        FieldLabel("$label *", c)
        val shape = RoundedCornerShape(14.dp)
        Surface(
            onClick = onOpen,
            enabled = !loading,
            shape = shape,
            color = c.muted,
            border = androidx.compose.foundation.BorderStroke(1.dp, c.border),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
        ) {
            Row(
                Modifier.padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    when {
                        loading -> AppStrings.msgLoading(lang)
                        valueLabel.isNotBlank() -> valueLabel
                        else -> placeholder
                    },
                    modifier = Modifier.weight(1f),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (valueLabel.isNotBlank() && !loading) c.text else c.mutedText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = c.mutedText, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CatalogPickerSheet(
    kind: CustomerCatalogKind,
    state: CustomerFormUiState,
    c: FormPalette,
    lang: AppLanguage,
    onDismiss: () -> Unit,
    onSelect: (String) -> Unit,
    onEdit: (String, String) -> Unit,
    onAdd: () -> Unit,
) {
    val isLine = kind == CustomerCatalogKind.LINE
    val items: List<Triple<String?, String, String>> = if (isLine) {
        state.lines.map { Triple(it.id, it.code, it.name) }
    } else {
        state.categories.map { Triple(it.id, it.name, it.name) }
    }
    val selectedValue = if (isLine) state.lineCode else state.category
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = c.card,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
    ) {
        Column(Modifier.padding(horizontal = 16.dp)) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    if (isLine) AppStrings.customerLineSelect(lang) else AppStrings.customerCategorySelect(lang),
                    modifier = Modifier.weight(1f),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = c.text,
                )
                SquareIconButton(Icons.Default.Close, AppStrings.close(lang), c, onDismiss)
            }
            Column(
                Modifier
                    .heightIn(max = 420.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                PickerRow(
                    label = "—",
                    selected = selectedValue.isBlank(),
                    c = c,
                    labelColor = c.mutedText,
                    onClick = { onSelect("") },
                    onEdit = null,
                    editLabel = "",
                )
                if (items.isEmpty()) {
                    Text(
                        AppStrings.customerNoData(lang),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        color = c.mutedText,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
                items.forEach { (id, value, label) ->
                    PickerRow(
                        label = label,
                        selected = value == selectedValue,
                        c = c,
                        labelColor = c.text,
                        onClick = { onSelect(value) },
                        onEdit = id?.let { safeId -> { onEdit(safeId, label) } },
                        editLabel = AppStrings.customerEditItem(lang),
                    )
                }
            }
            Surface(
                onClick = onAdd,
                shape = RoundedCornerShape(14.dp),
                color = c.indigoSoft,
                modifier = Modifier
                    .padding(top = 12.dp)
                    .fillMaxWidth()
                    .height(48.dp),
            ) {
                Row(horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Add, contentDescription = null, tint = c.primary, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(
                        if (isLine) AppStrings.customerAddLine(lang) else AppStrings.customerAddCategory(lang),
                        color = c.primary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.ExtraBold,
                    )
                }
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun PickerRow(
    label: String,
    selected: Boolean,
    c: FormPalette,
    labelColor: Color,
    onClick: () -> Unit,
    onEdit: (() -> Unit)?,
    editLabel: String,
) {
    val shape = RoundedCornerShape(14.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .clip(shape)
            .background(if (selected) Color(0x1F6366F1) else c.rowBg)
            .border(1.dp, if (selected) Color(0x736366F1) else c.border, shape),
    ) {
        Row(
            Modifier
                .weight(1f)
                .clickable(onClick = onClick)
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(label, modifier = Modifier.weight(1f), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = labelColor)
            if (selected && onEdit != null) {
                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = c.primary, modifier = Modifier.size(18.dp))
            }
        }
        if (onEdit != null) {
            Box(
                Modifier
                    .width(1.dp)
                    .fillMaxHeight()
                    .background(c.border),
            )
            Box(
                Modifier
                    .width(48.dp)
                    .fillMaxHeight()
                    .clickable(onClick = onEdit),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Edit, contentDescription = editLabel, tint = c.mutedText, modifier = Modifier.size(16.dp))
            }
        }
    }
}

@Composable
private fun CatalogModal(
    modal: CatalogModalState,
    similarLines: List<uz.distributor.crm.data.remote.dto.LineDto>,
    c: FormPalette,
    lang: AppLanguage,
    onNameChange: (String) -> Unit,
    onPickExisting: (String) -> Unit,
    onSave: () -> Unit,
    onDismiss: () -> Unit,
) {
    val isLine = modal.kind == CustomerCatalogKind.LINE
    val focusRequester = remember { FocusRequester() }
    LaunchedEffect(Unit) { runCatching { focusRequester.requestFocus() } }
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(
            Modifier
                .padding(horizontal = 16.dp)
                .widthIn(max = 420.dp)
                .fillMaxWidth()
                .shadow(16.dp, RoundedCornerShape(20.dp))
                .clip(RoundedCornerShape(20.dp))
                .background(c.card)
                .padding(16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 14.dp)) {
                Text(
                    when {
                        isLine && modal.editId != null -> AppStrings.customerEditLine(lang)
                        isLine -> AppStrings.customerAddLine(lang)
                        modal.editId != null -> AppStrings.customerEditCategory(lang)
                        else -> AppStrings.customerAddCategory(lang)
                    },
                    modifier = Modifier.weight(1f),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = c.text,
                )
                SquareIconButton(Icons.Default.Close, AppStrings.close(lang), c, onDismiss)
            }
            val fieldLabel = if (isLine) AppStrings.customerLineName(lang) else AppStrings.customerCategoryName(lang)
            FieldLabel("$fieldLabel *", c)
            FormInput(
                value = modal.name,
                onValueChange = onNameChange,
                c = c,
                modifier = Modifier.focusRequester(focusRequester),
                placeholder = fieldLabel,
                imeAction = ImeAction.Done,
                fontSize = 16,
            )
            if (similarLines.isNotEmpty()) {
                val warnShape = RoundedCornerShape(14.dp)
                Column(
                    Modifier
                        .padding(top = 12.dp)
                        .fillMaxWidth()
                        .clip(warnShape)
                        .background(Color(0x1FF59E0B))
                        .border(1.dp, Color(0x73F59E0B), warnShape)
                        .padding(12.dp),
                ) {
                    Text(
                        AppStrings.customerLineSimilarWarning(lang),
                        modifier = Modifier.padding(bottom = 8.dp),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFB45309),
                    )
                    Column(
                        Modifier
                            .heightIn(max = 160.dp)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        similarLines.forEach { line ->
                            Surface(
                                onClick = { onPickExisting(line.code) },
                                shape = RoundedCornerShape(10.dp),
                                color = c.card,
                                border = androidx.compose.foundation.BorderStroke(1.dp, c.border),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(
                                    "${line.code} — ${line.name}",
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = c.text,
                                )
                            }
                        }
                    }
                }
            }
            val confirmDuplicate = similarLines.isNotEmpty() && modal.duplicateConfirmed
            Surface(
                onClick = onSave,
                enabled = !modal.saving,
                shape = RoundedCornerShape(14.dp),
                color = if (confirmDuplicate) Color(0xFFD97706) else c.primary,
                modifier = Modifier
                    .padding(top = 14.dp)
                    .fillMaxWidth()
                    .height(50.dp)
                    .alpha(if (modal.saving) 0.7f else 1f),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        when {
                            modal.saving -> AppStrings.msgLoading(lang)
                            confirmDuplicate -> AppStrings.customerLineAddAnyway(lang)
                            else -> AppStrings.customerSave(lang)
                        },
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                    )
                }
            }
        }
    }
}

// ─── Xarita ───

@Composable
private fun MapSection(
    state: CustomerFormUiState,
    c: FormPalette,
    lang: AppLanguage,
    isDark: Boolean,
    onLocationSelected: (Double, Double) -> Unit,
    onMyLocation: () -> Unit,
    onFullscreen: () -> Unit,
) {
    Column(Modifier.padding(bottom = 10.dp)) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    "${AppStrings.customerMapTitle(lang)} *",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = c.mutedText,
                )
                Text(
                    AppStrings.customerMapHint(lang),
                    modifier = Modifier.padding(top = 2.dp),
                    fontSize = 11.sp,
                    color = c.mutedText,
                )
            }
            Spacer(Modifier.width(8.dp))
            MyLocationButton(state.isLocating, c, lang, onMyLocation)
            Spacer(Modifier.width(6.dp))
            SquareIconButton(Icons.Default.Fullscreen, AppStrings.customerMapFullscreen(lang), c, onFullscreen)
        }
        val shape = RoundedCornerShape(16.dp)
        LocationPickerMap(
            latitude = state.latitude,
            longitude = state.longitude,
            isDark = isDark,
            onLocationSelected = onLocationSelected,
            radiusMeters = state.radius,
            controls = MapControlLabels(
                standard = AppStrings.customerMapLayerOsm(lang),
                satellite = AppStrings.customerMapLayerSat(lang),
            ),
            pinColor = 0xFF6366F1.toInt(),
            initialZoom = 15.0,
            modifier = Modifier
                .fillMaxWidth()
                .height(220.dp)
                .clip(shape)
                .border(1.dp, if (isDark) Color(0xFF2A2A3E) else Color(0xFFE5E7EB), shape),
        )
        val lat = state.latitude
        val lng = state.longitude
        if (lat != null && lng != null) {
            Text(
                String.format(java.util.Locale.US, "%.6f, %.6f", lat, lng),
                modifier = Modifier.padding(top = 6.dp),
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                color = c.mutedText,
            )
        }
    }
}

@Composable
private fun MyLocationButton(loading: Boolean, c: FormPalette, lang: AppLanguage, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        enabled = !loading,
        shape = RoundedCornerShape(12.dp),
        color = c.greenSoft,
        modifier = Modifier
            .height(36.dp)
            .alpha(if (loading) 0.7f else 1f),
    ) {
        Row(
            Modifier.padding(horizontal = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (loading) {
                CircularProgressIndicator(Modifier.size(14.dp), color = c.greenText, strokeWidth = 2.dp)
            } else {
                Icon(Icons.Default.MyLocation, contentDescription = null, tint = c.greenText, modifier = Modifier.size(14.dp))
            }
            Spacer(Modifier.width(5.dp))
            Text(
                if (loading) AppStrings.msgLoading(lang) else AppStrings.customerMyLocation(lang),
                color = c.greenText,
                fontSize = 11.sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun SquareIconButton(icon: ImageVector, description: String, c: FormPalette, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = c.muted,
        modifier = Modifier.size(36.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = description, tint = c.text, modifier = Modifier.size(16.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RadiusSlider(radius: Int, onChange: (Int) -> Unit, c: FormPalette, lang: AppLanguage) {
    Column {
        FieldLabel("${AppStrings.customerOrderRadius(lang)}: $radius m", c)
        Slider(
            value = radius.toFloat(),
            onValueChange = { v ->
                onChange((v / CustomerFormLogic.RADIUS_STEP).roundToInt() * CustomerFormLogic.RADIUS_STEP)
            },
            valueRange = CustomerFormLogic.RADIUS_MIN.toFloat()..CustomerFormLogic.RADIUS_MAX.toFloat(),
            steps = (CustomerFormLogic.RADIUS_MAX - CustomerFormLogic.RADIUS_MIN) / CustomerFormLogic.RADIUS_STEP - 1,
            colors = SliderDefaults.colors(
                thumbColor = c.primary,
                activeTrackColor = c.primary,
                inactiveTrackColor = c.offButton,
                activeTickColor = Color.Transparent,
                inactiveTickColor = Color.Transparent,
            ),
            modifier = Modifier.height(32.dp),
        )
    }
}

/**
 * Dialog emas, shu ekran ustidagi overlay: Activity edge-to-edge bo‘lgani uchun
 * status bar va tizim navigatsiya tugmalari insetlari bu yerda to‘g‘ri keladi.
 */
@Composable
private fun FullscreenMapOverlay(
    state: CustomerFormUiState,
    c: FormPalette,
    lang: AppLanguage,
    isDark: Boolean,
    onLocationSelected: (Double, Double) -> Unit,
    onRadiusChange: (Int) -> Unit,
    onMyLocation: () -> Unit,
    onDismiss: () -> Unit,
) {
    BackHandler(onBack = onDismiss)
    Box(
        Modifier
            .fillMaxSize()
            .background(c.bg)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = {},
            ),
    ) {
        Column(Modifier.fillMaxSize()) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .background(c.bg)
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp)
                    .padding(top = 10.dp, bottom = 12.dp),
            ) {
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(
                        onClick = onDismiss,
                        shape = RoundedCornerShape(13.dp),
                        color = c.muted,
                        modifier = Modifier.size(40.dp),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Close, contentDescription = AppStrings.close(lang), tint = c.text, modifier = Modifier.size(18.dp))
                        }
                    }
                    Spacer(Modifier.width(12.dp))
                    Text(
                        AppStrings.customerMapTitle(lang),
                        fontSize = 17.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = c.text,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    Spacer(Modifier.width(8.dp))
                    MyLocationButton(state.isLocating, c, lang, onMyLocation)
                }
                Text(
                    AppStrings.customerMapHint(lang),
                    fontSize = 12.sp,
                    color = c.mutedText,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(c.border),
            )
            LocationPickerMap(
                latitude = state.latitude,
                longitude = state.longitude,
                isDark = isDark,
                onLocationSelected = onLocationSelected,
                radiusMeters = state.radius,
                controls = MapControlLabels(
                    standard = AppStrings.customerMapLayerOsm(lang),
                    satellite = AppStrings.customerMapLayerSat(lang),
                ),
                pinColor = 0xFF6366F1.toInt(),
                initialZoom = 15.0,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
            )
            Column(
                Modifier
                    .fillMaxWidth()
                    .background(c.card)
                    .padding(horizontal = 16.dp)
                    .padding(top = 14.dp)
                    .navigationBarsPadding()
                    .padding(bottom = 16.dp),
            ) {
                RadiusSlider(radius = state.radius, onChange = onRadiusChange, c = c, lang = lang)
                Surface(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(14.dp),
                    color = c.primary,
                    modifier = Modifier
                        .padding(top = 12.dp)
                        .fillMaxWidth()
                        .height(48.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(AppStrings.customerSave(lang), color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun FullscreenPhotoOverlay(model: String, title: String, onDismiss: () -> Unit) {
    BackHandler(onBack = onDismiss)
    LightStatusBarIcons(enabled = false)
    Box(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .fillMaxSize()
                .background(Color(0xF0000000))
                .clickable(onClick = onDismiss),
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(13.dp),
                    color = Color(0x1FFFFFFF),
                    modifier = Modifier.size(40.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                    }
                }
                Spacer(Modifier.width(10.dp))
                Text(title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold)
            }
            Image(
                painter = rememberAsyncImagePainter(model),
                contentDescription = title,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(12.dp),
                contentScale = ContentScale.Fit,
            )
        }
    }
}

// ─── Sozlamalar kartalari ───

@Composable
private fun SettingCard(
    title: String,
    hint: String,
    enabled: Boolean,
    onLabel: String,
    offLabel: String,
    onToggle: () -> Unit,
    c: FormPalette,
    modifier: Modifier,
) {
    val shape = RoundedCornerShape(14.dp)
    Column(
        modifier
            .fillMaxHeight()
            .clip(shape)
            .background(c.muted)
            .border(1.dp, c.border, shape)
            .padding(12.dp),
    ) {
        Text(title, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = c.text)
        Text(
            hint,
            modifier = Modifier.padding(top = 4.dp),
            fontSize = 11.sp,
            lineHeight = 15.sp,
            color = c.mutedText,
        )
        Spacer(Modifier.weight(1f).heightIn(min = 10.dp))
        Surface(
            onClick = onToggle,
            shape = RoundedCornerShape(12.dp),
            color = if (enabled) c.greenOn else c.offButton,
            modifier = Modifier
                .fillMaxWidth()
                .height(36.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    if (enabled) onLabel else offLabel,
                    color = if (enabled) c.greenText else c.mutedText,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
            }
        }
    }
}

@Composable
private fun AppCredentialsPanel(
    state: CustomerFormUiState,
    viewModel: CustomerFormViewModel,
    c: FormPalette,
    lang: AppLanguage,
) {
    val shape = RoundedCornerShape(16.dp)
    Column(
        Modifier
            .padding(top = 10.dp)
            .fillMaxWidth()
            .clip(shape)
            .background(c.card)
            .border(1.dp, c.border, shape)
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 12.dp)) {
            Box(
                Modifier
                    .size(28.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(c.indigoSoft),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Lock, contentDescription = null, tint = c.primary, modifier = Modifier.size(15.dp))
            }
            Spacer(Modifier.width(8.dp))
            Text(
                AppStrings.customerAppCredTitle(lang),
                modifier = Modifier.weight(1f),
                fontSize = 13.sp,
                fontWeight = FontWeight.ExtraBold,
                color = c.text,
            )
            if (state.hasAppLogin || state.appCredDraftReady) {
                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
            }
            Surface(
                onClick = viewModel::closeAppCred,
                shape = RoundedCornerShape(10.dp),
                color = c.muted,
                modifier = Modifier.size(32.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Close, contentDescription = AppStrings.customerCancel(lang), tint = c.mutedText, modifier = Modifier.size(16.dp))
                }
            }
        }

        FieldLabel(AppStrings.customerAppCredLogin(lang), c)
        FormInput(
            value = state.appLogin,
            onValueChange = viewModel::onAppLoginChange,
            c = c,
            placeholder = "mijoz01",
            keyboardType = KeyboardType.Ascii,
            capitalization = KeyboardCapitalization.None,
        )
        Spacer(Modifier.height(12.dp))
        FieldLabel(AppStrings.customerAppCredPassword(lang), c)
        FormInput(
            value = state.appPassword,
            onValueChange = viewModel::onAppPasswordChange,
            c = c,
            placeholder = if (state.hasAppLogin) AppStrings.customerAppCredPasswordKeep(lang) else CustomerFormLogic.DEFAULT_CLIENT_APP_PASSWORD,
            keyboardType = KeyboardType.Password,
            capitalization = KeyboardCapitalization.None,
            imeAction = ImeAction.Done,
            visualTransformation = if (state.appPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            trailing = {
                Surface(
                    onClick = viewModel::toggleAppPasswordVisible,
                    shape = RoundedCornerShape(12.dp),
                    color = c.muted,
                    modifier = Modifier.size(36.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            if (state.appPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = null,
                            tint = c.mutedText,
                            modifier = Modifier.size(16.dp),
                        )
                    }
                }
            },
        )
        val error = state.appCredError
        val note = state.appCredNote
        if (error != null) {
            Text(
                appCredText(lang, error),
                modifier = Modifier.padding(top = 6.dp),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFEF4444),
                lineHeight = 15.sp,
            )
        } else if (note != null) {
            Text(
                appCredText(lang, note),
                modifier = Modifier.padding(top = 6.dp),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = c.primary,
                lineHeight = 15.sp,
            )
        }
        if (!state.isEdit && !state.appCredDraftReady) {
            Text(
                AppStrings.customerAppCredPendingNote(lang),
                modifier = Modifier.padding(top = 6.dp),
                fontSize = 11.sp,
                color = c.mutedText,
                lineHeight = 15.sp,
            )
        }
        SoftButton(
            text = when {
                state.appCredBusy -> AppStrings.msgLoading(lang)
                state.hasAppLogin || state.appCredDraftReady -> AppStrings.customerAppCredSave(lang)
                else -> AppStrings.customerAppCredCreate(lang)
            },
            background = c.indigoSoft,
            contentColor = c.primary,
            enabled = !state.appCredBusy,
            onClick = viewModel::saveAppCredentials,
            modifier = Modifier
                .padding(top = 12.dp)
                .fillMaxWidth(),
            height = 46.dp,
        )
    }
}

// ─── O‘xshash mijoz ───

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SimilaritySheet(
    match: CustomerFormLogic.SimilarityMatch,
    isSaving: Boolean,
    isDark: Boolean,
    c: FormPalette,
    lang: AppLanguage,
    onDismiss: () -> Unit,
    onAddAnyway: () -> Unit,
) {
    val innBlocked = CustomerFormLogic.hasExactInnCollision(match)
    val risk = if (innBlocked) CustomerFormLogic.SimilarityRisk.RED else CustomerFormLogic.similarityRisk(match.overallPct)
    val colors = riskColors(risk, isDark)
    ModalBottomSheet(
        onDismissRequest = { if (!isSaving) onDismiss() },
        containerColor = c.card,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
    ) {
        Column(
            Modifier
                .padding(horizontal = 18.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Row(verticalAlignment = Alignment.Top, modifier = Modifier.padding(bottom = 14.dp)) {
                Column(Modifier.weight(1f)) {
                    Text(AppStrings.customerDupTitle(lang), fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, color = c.text)
                    Text(
                        AppStrings.customerDupChance(lang, match.overallPct),
                        modifier = Modifier.padding(top = 8.dp),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = colors.color,
                    )
                    Row(
                        Modifier
                            .padding(top = 8.dp)
                            .clip(RoundedCornerShape(999.dp))
                            .background(colors.bg)
                            .border(1.dp, colors.border, RoundedCornerShape(999.dp))
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(colors.color),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            when (risk) {
                                CustomerFormLogic.SimilarityRisk.RED -> AppStrings.customerDupRiskRed(lang)
                                CustomerFormLogic.SimilarityRisk.YELLOW -> AppStrings.customerDupRiskYellow(lang)
                                CustomerFormLogic.SimilarityRisk.GREEN -> AppStrings.customerDupRiskGreen(lang)
                            },
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = colors.color,
                        )
                    }
                }
                Box(
                    Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(colors.bg)
                        .border(1.dp, colors.border, RoundedCornerShape(18.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("${match.overallPct}%", fontSize = 20.sp, fontWeight = FontWeight.Black, color = colors.color)
                }
            }

            if (innBlocked) {
                Text(
                    AppStrings.customerDupInnBlocked(lang),
                    modifier = Modifier
                        .padding(bottom = 14.dp)
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(if (isDark) Color(0x1FEF4444) else Color(0x14EF4444))
                        .border(1.dp, if (isDark) Color(0x66EF4444) else Color(0x4DEF4444), RoundedCornerShape(14.dp))
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 17.sp,
                    color = if (isDark) Color(0xFFFCA5A5) else Color(0xFFDC2626),
                )
            }

            Column(
                Modifier
                    .padding(bottom = 14.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(c.photoBg)
                    .border(1.dp, colors.border, RoundedCornerShape(14.dp))
                    .padding(12.dp),
            ) {
                Text(AppStrings.customerDupMatchedClient(lang), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = c.mutedText)
                Text(
                    match.client.name,
                    modifier = Modifier.padding(top = 4.dp),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = c.text,
                )
                match.client.inn?.takeIf { it.isNotBlank() }?.let {
                    Text("INN: $it", fontSize = 12.sp, color = c.mutedText, fontFamily = FontFamily.Monospace)
                }
                match.client.phone?.takeIf { it.isNotBlank() }?.let {
                    Text(it, fontSize = 12.sp, color = c.mutedText)
                }
            }

            Column(Modifier.padding(bottom = 18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                match.fields.forEach { f ->
                    val barColor = if (f.pct <= 0) {
                        c.mutedText
                    } else {
                        riskColors(
                            when {
                                f.pct >= 70 -> CustomerFormLogic.SimilarityRisk.RED
                                f.pct >= 40 -> CustomerFormLogic.SimilarityRisk.YELLOW
                                else -> CustomerFormLogic.SimilarityRisk.GREEN
                            },
                            isDark,
                        ).color
                    }
                    Column {
                        Row(Modifier.padding(bottom = 4.dp)) {
                            Text(
                                similarityFieldLabel(lang, f.field),
                                modifier = Modifier.weight(1f),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = c.mutedText,
                            )
                            Text("${f.pct}%", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = barColor)
                        }
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(99.dp))
                                .background(if (isDark) Color(0xFF0F0F1A) else Color(0xFFE5E7EB)),
                        ) {
                            Box(
                                Modifier
                                    .fillMaxWidth(f.pct / 100f)
                                    .fillMaxHeight()
                                    .clip(RoundedCornerShape(99.dp))
                                    .background(barColor),
                            )
                        }
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Surface(
                    onClick = onDismiss,
                    enabled = !isSaving,
                    shape = RoundedCornerShape(14.dp),
                    color = if (innBlocked) c.primary else c.muted,
                    border = if (innBlocked) null else androidx.compose.foundation.BorderStroke(1.dp, c.border),
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            if (innBlocked) AppStrings.customerDupUnderstood(lang) else AppStrings.customerDupCancel(lang),
                            color = if (innBlocked) Color.White else c.text,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                    }
                }
                if (!innBlocked) {
                    Surface(
                        onClick = onAddAnyway,
                        enabled = !isSaving,
                        shape = RoundedCornerShape(14.dp),
                        color = c.primary,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .alpha(if (isSaving) 0.7f else 1f),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                if (isSaving) AppStrings.msgLoading(lang) else AppStrings.customerDupAddAnyway(lang),
                                color = Color.White,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.ExtraBold,
                            )
                        }
                    }
                }
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}

private data class RiskColors(val color: Color, val bg: Color, val border: Color)

private fun riskColors(risk: CustomerFormLogic.SimilarityRisk, dark: Boolean): RiskColors = when (risk) {
    CustomerFormLogic.SimilarityRisk.RED -> if (dark) {
        RiskColors(Color(0xFFFCA5A5), Color(0x2EEF4444), Color(0x73EF4444))
    } else {
        RiskColors(Color(0xFFDC2626), Color(0x1AEF4444), Color(0x59EF4444))
    }
    CustomerFormLogic.SimilarityRisk.YELLOW -> if (dark) {
        RiskColors(Color(0xFFFCD34D), Color(0x2EF59E0B), Color(0x73F59E0B))
    } else {
        RiskColors(Color(0xFFD97706), Color(0x1FF59E0B), Color(0x59F59E0B))
    }
    CustomerFormLogic.SimilarityRisk.GREEN -> if (dark) {
        RiskColors(Color(0xFF6EE7B7), Color(0x2E10B981), Color(0x7310B981))
    } else {
        RiskColors(Color(0xFF059669), Color(0x1A10B981), Color(0x4D10B981))
    }
}

private fun similarityFieldLabel(lang: AppLanguage, field: CustomerFormLogic.SimilarityField): String = when (field) {
    CustomerFormLogic.SimilarityField.NAME -> AppStrings.customerName(lang)
    CustomerFormLogic.SimilarityField.FULL_NAME -> AppStrings.customerFullName(lang)
    CustomerFormLogic.SimilarityField.PHONE -> AppStrings.customerPhone(lang)
    CustomerFormLogic.SimilarityField.INN -> AppStrings.customerInn(lang)
    CustomerFormLogic.SimilarityField.TERRITORY -> AppStrings.customerOrientir(lang)
}

// ─── Tugmalar ───

@Composable
private fun PrimaryGradientButton(text: String, loading: Boolean, enabled: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = shape,
        color = Color.Transparent,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .shadow(if (enabled) 10.dp else 0.dp, shape, ambientColor = Color(0x596C5CE7), spotColor = Color(0x596C5CE7))
            .alpha(if (loading || !enabled) 0.7f else 1f),
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Brush.linearGradient(listOf(Color(0xFF6C5CE7), Color(0xFF7C4DFF)))),
            contentAlignment = Alignment.Center,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (loading) {
                    CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                }
                Text(text, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun SoftButton(
    text: String,
    background: Color,
    contentColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    height: Dp = 44.dp,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(14.dp),
        color = background,
        modifier = modifier
            .height(height)
            .alpha(if (enabled) 1f else 0.7f),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(text, color = contentColor, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold)
        }
    }
}

// ─── Yordamchilar ───

private fun formMessageText(lang: AppLanguage, message: CustomerFormMessage): String = when (message) {
    is CustomerFormMessage.FieldRequired -> AppStrings.customerFieldRequired(
        lang,
        when (message.field) {
            CustomerField.NAME -> AppStrings.customerName(lang)
            CustomerField.FULL_NAME -> AppStrings.customerFullName(lang)
            CustomerField.ADDRESS -> AppStrings.customerAddress(lang)
            CustomerField.LINE -> AppStrings.customerLine(lang)
            CustomerField.CATEGORY -> AppStrings.customerCategory(lang)
        },
    )
    CustomerFormMessage.PhoneInvalid -> AppStrings.customerPhoneInvalid(lang)
    CustomerFormMessage.LocationRequired -> AppStrings.customerLocationRequired(lang)
    CustomerFormMessage.LocationOff -> AppStrings.customerLocationOff(lang)
    CustomerFormMessage.LocationDenied -> AppStrings.customerLocationDenied(lang)
    CustomerFormMessage.PhotoUploadFailed -> AppStrings.customerPhotoUploadFailed(lang)
    CustomerFormMessage.PermissionDenied -> AppStrings.addClientDeniedDetail(lang)
    CustomerFormMessage.LineSaved -> AppStrings.customerLineSaved(lang)
    CustomerFormMessage.LineUpdated -> AppStrings.customerLineUpdated(lang)
    CustomerFormMessage.CategorySaved -> AppStrings.customerCategorySaved(lang)
    CustomerFormMessage.CategoryUpdated -> AppStrings.customerCategoryUpdated(lang)
    CustomerFormMessage.LineSimilarWarning -> AppStrings.customerLineSimilarWarning(lang)
    is CustomerFormMessage.CatalogNameRequired -> if (message.kind == CustomerCatalogKind.LINE) {
        AppStrings.customerLineName(lang)
    } else {
        AppStrings.customerCategoryName(lang)
    }
    is CustomerFormMessage.Api -> AppStrings.apiError(lang, message.key)
}

private fun appCredText(lang: AppLanguage, text: AppCredText): String = when (text) {
    AppCredText.LoginShort -> AppStrings.customerAppCredLoginShort(lang)
    AppCredText.PasswordShort -> AppStrings.customerAppCredPasswordShort(lang)
    is AppCredText.Taken -> text.owner?.takeIf { it.isNotBlank() }
        ?.let { "${AppStrings.customerAppCredTaken(lang)} ($it)" }
        ?: AppStrings.customerAppCredTaken(lang)
    AppCredText.Saved -> AppStrings.customerAppCredSaved(lang)
    AppCredText.Created -> AppStrings.customerAppCredCreated(lang)
    AppCredText.Ready -> AppStrings.customerAppCredReady(lang)
    AppCredText.Needed -> AppStrings.customerAppCredNeeded(lang)
    is AppCredText.Api -> AppStrings.apiError(lang, text.key)
}

/** Och fonli sahifada status bar ikonkalari qorong‘i bo‘lsin; chiqishda avvalgi holat tiklanadi. */
@Composable
private fun LightStatusBarIcons(enabled: Boolean) {
    val view = LocalView.current
    DisposableEffect(enabled) {
        val window = view.context.findActivity()?.window
        if (window == null) {
            onDispose { }
        } else {
            val controller = WindowCompat.getInsetsController(window, view)
            val previous = controller.isAppearanceLightStatusBars
            controller.isAppearanceLightStatusBars = enabled
            onDispose { controller.isAppearanceLightStatusBars = previous }
        }
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

private fun createCameraImageUri(context: Context): Uri {
    val file = File(context.cacheDir, "client_photo_${System.currentTimeMillis()}.jpg")
    return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
}
