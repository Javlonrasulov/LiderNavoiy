package uz.lider.client.presentation.chat

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties
import androidx.compose.ui.zIndex
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import coil.compose.AsyncImage
import coil.request.ImageRequest
import kotlinx.coroutines.launch
import uz.lider.client.data.remote.dto.ChatMessageDto
import uz.lider.client.presentation.components.FullScreenImageViewer
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassThemed
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    onBack: () -> Unit,
    viewModel: ChatViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    var input by remember { mutableStateOf("") }
    var showAttach by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var deleteForEveryone by remember { mutableStateOf(true) }
    var previewImageUrl by remember { mutableStateOf<String?>(null) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    val isDark = LiquidTheme.bg.luminance() < 0.5f
    val selectionMode = state.selectedIds.isNotEmpty()
    val canDeleteForAll = state.selectedIds.any { id ->
        state.messages.find { it.id == id }?.senderId == state.myUserId
    }
    val screenTitle = state.contactPosition.takeIf { it.isNotBlank() }
        ?: state.contactName.takeIf { it.isNotBlank() }
        ?: localized("chat_title")

    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { viewModel.sendFile(it, input.trim().also { input = "" }) }
        showAttach = false
    }
    val docPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { viewModel.sendFile(it) }
        showAttach = false
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.load()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) {
            scope.launch { listState.animateScrollToItem(state.messages.lastIndex) }
        }
    }

    previewImageUrl?.let { url ->
        FullScreenImageViewer(
            imageUrl = url,
            contentDescription = null,
            onDismiss = { previewImageUrl = null },
        )
    }

    Scaffold(
        topBar = {
            if (selectionMode) {
                TopAppBar(
                    title = {},
                    navigationIcon = {},
                    actions = {
                        TextButton(
                            onClick = {
                                deleteForEveryone = canDeleteForAll
                                showDeleteDialog = true
                            },
                        ) {
                            Text(
                                "${localized("chat_delete").uppercase()} ${state.selectedIds.size}",
                                color = LiquidGlass.Indigo,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                        TextButton(onClick = { viewModel.clearSelection() }) {
                            Text(
                                localized("com_cancel").uppercase(),
                                color = LiquidGlass.Indigo,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = LiquidTheme.bgMid.copy(alpha = 0.95f),
                    ),
                )
            } else {
                TopAppBar(
                    title = {
                        Column {
                            Text(screenTitle, fontWeight = FontWeight.Bold, color = text, fontSize = 16.sp)
                            if (state.contactName.isNotBlank()) {
                                Text(state.contactName, fontSize = 12.sp, color = textMuted)
                            }
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = LiquidGlass.Indigo)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = LiquidTheme.bgMid.copy(alpha = 0.95f),
                    ),
                )
            }
        },
        containerColor = LiquidTheme.bg,
    ) { padding ->
        LiquidBackground(modifier = Modifier.fillMaxSize()) {
            Box(
                Modifier
                    .fillMaxSize()
                    .padding(padding),
            ) {
                Column(Modifier.fillMaxSize()) {
                    state.error?.let {
                        Surface(Modifier.fillMaxWidth(), color = LiquidGlass.Rose.copy(alpha = 0.2f)) {
                            Text(
                                localized("chat_error"),
                                modifier = Modifier.padding(12.dp),
                                color = LiquidGlass.Rose,
                                fontSize = 13.sp,
                            )
                        }
                    }

                    if (state.isLoading) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = LiquidGlass.Indigo)
                        }
                    } else if (state.messages.isEmpty() && state.error == null) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(localized("chat_empty"), color = textMuted, fontSize = 14.sp)
                        }
                    } else {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(vertical = 12.dp),
                        ) {
                            items(state.messages, key = { it.id }) { msg ->
                                val isSelected = state.selectedIds.contains(msg.id)
                                val isMine = msg.senderId == state.myUserId
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .clickable { viewModel.toggleSelection(msg.id) },
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    MessageBubble(
                                        msg = msg,
                                        isMine = isMine,
                                        text = text,
                                        textMuted = textMuted,
                                        isDark = isDark,
                                        resolveUrl = viewModel::resolveFileUrl,
                                        onImageClick = { previewImageUrl = it },
                                        onDocumentClick = { url ->
                                            context.startActivity(
                                                Intent(Intent.ACTION_VIEW, Uri.parse(url)),
                                            )
                                        },
                                        modifier = Modifier.weight(1f),
                                    )
                                    if (selectionMode) {
                                        Icon(
                                            if (isSelected) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                            null,
                                            tint = if (isSelected) LiquidGlass.Indigo else textMuted,
                                            modifier = Modifier
                                                .padding(start = 8.dp)
                                                .size(26.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (!selectionMode) {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .liquidGlassThemed(radius = 0.dp)
                                .navigationBarsPadding(),
                        ) {
                            val attachMenuBg = if (isDark) Color(0xFF2A2D3E) else Color.White
                            val density = LocalDensity.current
                            val inputBg = if (isDark) Color(0xFF1E2130) else Color(0xFFF3F4F6)

                            Row(
                                Modifier
                                    .align(Alignment.BottomCenter)
                                    .fillMaxWidth()
                                    .padding(horizontal = 6.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Box {
                                    IconButton(
                                        onClick = { showAttach = !showAttach },
                                        modifier = Modifier.size(48.dp),
                                    ) {
                                        Icon(
                                            Icons.Default.AttachFile,
                                            null,
                                            tint = if (showAttach) LiquidGlass.Indigo else textMuted,
                                            modifier = Modifier.size(24.dp),
                                        )
                                    }
                                    if (showAttach) {
                                        val menuUpPx = with(density) { (48.dp + 8.dp).roundToPx() }
                                        Popup(
                                            alignment = Alignment.BottomStart,
                                            offset = IntOffset(0, -menuUpPx),
                                            onDismissRequest = { showAttach = false },
                                            properties = PopupProperties(focusable = true),
                                        ) {
                                            Surface(
                                                modifier = Modifier.width(AttachMenuWidth),
                                                shape = RoundedCornerShape(10.dp),
                                                color = attachMenuBg,
                                                shadowElevation = 16.dp,
                                                border = BorderStroke(
                                                    0.5.dp,
                                                    if (isDark) Color(0xFF5E6D7E) else Color(0xFFE5E7EB),
                                                ),
                                            ) {
                                                AttachPickerMenu(
                                                    text = text,
                                                    iconTint = textMuted,
                                                    onPhoto = {
                                                        showAttach = false
                                                        imagePicker.launch("image/*")
                                                    },
                                                    onDocument = {
                                                        showAttach = false
                                                        docPicker.launch("*/*")
                                                    },
                                                )
                                            }
                                        }
                                    }
                                }
                                OutlinedTextField(
                                    value = input,
                                    onValueChange = { input = it },
                                    modifier = Modifier.weight(1f),
                                    placeholder = { Text(localized("chat_placeholder"), color = textMuted) },
                                    shape = RoundedCornerShape(24.dp),
                                    maxLines = 4,
                                    enabled = !state.sending && state.conversation != null,
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedContainerColor = inputBg,
                                        unfocusedContainerColor = inputBg,
                                        focusedBorderColor = LiquidGlass.Indigo,
                                        unfocusedBorderColor = Color.Transparent,
                                        focusedTextColor = text,
                                        unfocusedTextColor = text,
                                        cursorColor = LiquidGlass.Indigo,
                                    ),
                                )
                                Spacer(Modifier.width(8.dp))
                                FilledIconButton(
                                    onClick = {
                                        viewModel.send(input)
                                        input = ""
                                    },
                                    enabled = input.isNotBlank() && !state.sending,
                                    modifier = Modifier.size(48.dp),
                                    shape = CircleShape,
                                    colors = IconButtonDefaults.filledIconButtonColors(
                                        containerColor = LiquidGlass.Indigo,
                                        disabledContainerColor = LiquidGlass.Indigo.copy(alpha = 0.4f),
                                    ),
                                ) {
                                    Icon(Icons.AutoMirrored.Filled.Send, null, tint = Color.White)
                                }
                            }
                        }
                    }
                }

                if (!selectionMode && showAttach) {
                    Box(
                        Modifier
                            .fillMaxSize()
                            .zIndex(8f)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                                onClick = { showAttach = false },
                            )
                            .background(Color.Black.copy(alpha = if (isDark) 0.45f else 0.25f)),
                    )
                }
            }
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text(localized("chat_delete_confirm"), color = text) },
            text = {
                if (canDeleteForAll) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = deleteForEveryone,
                            onCheckedChange = { deleteForEveryone = it },
                            colors = CheckboxDefaults.colors(checkedColor = LiquidGlass.Indigo),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            localized("chat_delete_for_all").replace("{name}", state.contactName),
                            color = text,
                            fontSize = 14.sp,
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        viewModel.deleteSelected(deleteForEveryone)
                    },
                    enabled = !state.deleting,
                ) {
                    Text(localized("chat_delete"), color = LiquidGlass.Indigo)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text(localized("com_cancel"), color = textMuted)
                }
            },
        )
    }
}

private val AttachMenuWidth = 248.dp

@Composable
private fun AttachPickerMenu(
    text: Color,
    iconTint: Color,
    onPhoto: () -> Unit,
    onDocument: () -> Unit,
) {
    Column(Modifier.padding(vertical = 4.dp)) {
        AttachMenuItem(Icons.Outlined.Image, localized("chat_attach_photo"), text, iconTint, onPhoto)
        AttachMenuItem(Icons.Outlined.Description, localized("chat_attach_doc"), text, iconTint, onDocument)
    }
}

@Composable
private fun AttachMenuItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    labelColor: Color,
    iconTint: Color,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .height(44.dp)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            )
            .padding(start = 14.dp, end = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = iconTint, modifier = Modifier.size(24.dp))
        Spacer(Modifier.width(20.dp))
        Text(label, color = labelColor, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun MessageBubble(
    msg: ChatMessageDto,
    isMine: Boolean,
    text: Color,
    textMuted: Color,
    isDark: Boolean,
    resolveUrl: (String?) -> String,
    onImageClick: (String) -> Unit,
    onDocumentClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val bubbleMine = Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Violet))
    val context = LocalContext.current

    Row(
        modifier.fillMaxWidth(),
        horizontalArrangement = if (isMine) Arrangement.End else Arrangement.Start,
    ) {
        Box(
            Modifier
                .widthIn(max = 280.dp)
                .clip(
                    RoundedCornerShape(
                        topStart = 16.dp,
                        topEnd = 16.dp,
                        bottomStart = if (isMine) 16.dp else 4.dp,
                        bottomEnd = if (isMine) 4.dp else 16.dp,
                    ),
                )
                .then(
                    if (isMine) {
                        Modifier.background(bubbleMine)
                    } else {
                        Modifier.liquidGlassThemed()
                    },
                )
                .padding(horizontal = 12.dp, vertical = 8.dp),
        ) {
            Column {
                if (msg.messageType == "image" && !msg.fileUrl.isNullOrBlank()) {
                    val url = resolveUrl(msg.fileUrl)
                    AsyncImage(
                        model = ImageRequest.Builder(context)
                            .data(url)
                            .crossfade(true)
                            .build(),
                        contentDescription = msg.fileName,
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 220.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { onImageClick(url) },
                        contentScale = ContentScale.Crop,
                    )
                    Spacer(Modifier.height(4.dp))
                }
                if (msg.messageType == "document" && !msg.fileUrl.isNullOrBlank()) {
                    val url = resolveUrl(msg.fileUrl)
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                if (isMine) Color.White.copy(0.1f)
                                else if (isDark) Color(0xFF242F3D) else Color(0xFFF3F4F6),
                            )
                            .clickable { onDocumentClick(url) }
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Default.Description,
                            null,
                            tint = if (isMine) Color.White.copy(0.7f) else text.copy(0.7f),
                        )
                        Spacer(Modifier.width(8.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                msg.fileName ?: localized("chat_file"),
                                color = if (isMine) Color.White else text,
                                fontSize = 13.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            msg.fileSize?.let {
                                Text(formatBytes(it), color = textMuted, fontSize = 11.sp)
                            }
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                }
                if (msg.text.isNotBlank()) {
                    Text(
                        msg.text,
                        color = if (isMine) Color.White else text,
                        fontSize = 14.sp,
                    )
                }
                Row(
                    Modifier.align(Alignment.End),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                ) {
                    Text(
                        formatTime(msg.createdAt),
                        fontSize = 10.sp,
                        color = if (isMine) Color.White.copy(alpha = 0.65f) else textMuted,
                    )
                    if (isMine) {
                        Icon(
                            imageVector = if (msg.isRead) Icons.Default.DoneAll else Icons.Default.Done,
                            contentDescription = null,
                            modifier = Modifier.size(15.dp),
                            tint = if (msg.isRead) LiquidGlass.Cyan else Color.White.copy(alpha = 0.65f),
                        )
                    }
                }
            }
        }
    }
}

private fun formatTime(iso: String): String = try {
    val instant = Instant.parse(iso)
    DateTimeFormatter.ofPattern("HH:mm")
        .withZone(ZoneId.systemDefault())
        .format(instant)
} catch (_: Exception) {
    ""
}

private fun formatBytes(n: Int): String {
    if (n < 1024) return "$n B"
    if (n < 1024 * 1024) return "${"%.1f".format(n / 1024.0)} KB"
    return "${"%.1f".format(n / (1024.0 * 1024.0))} MB"
}
