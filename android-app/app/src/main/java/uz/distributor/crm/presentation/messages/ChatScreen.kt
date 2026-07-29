package uz.distributor.crm.presentation.messages

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
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
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
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
import uz.distributor.crm.data.local.ChatSessionHolder
import uz.distributor.crm.data.remote.dto.ChatMessageDto
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatScreen(
    conversationId: String,
    onBack: () -> Unit,
    viewModel: ChatViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val state by viewModel.uiState.collectAsState()
    var input by remember { mutableStateOf("") }
    var showAttach by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var deleteForEveryone by remember { mutableStateOf(true) }
    var previewImageUrl by remember { mutableStateOf<String?>(null) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val selectionMode = state.selectedIds.isNotEmpty()
    val canDeleteForAll = state.selectedIds.any { id ->
        state.messages.find { it.id == id }?.senderId == state.myUserId
    }

    val chatBg = if (isDark) Color(0xFF0E1621) else Color(0xFFECE5DD)
    val barBg = if (isDark) Color(0xFF17212B) else Color.White
    val inputBg = if (isDark) Color(0xFF242F3D) else Color(0xFFF3F4F6)
    val bubbleMine = if (isDark) Color(0xFF2B5278) else Color(0xFF6366F1)
    val bubbleOther = if (isDark) Color(0xFF182533) else Color.White
    val textPrimary = if (isDark) Color.White else Color.Black
    val textMuted = if (isDark) Color(0xFF708499) else Color(0xFF6B7280)

    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { viewModel.sendFile(it, input.trim().also { input = "" }) }
        showAttach = false
    }
    val docPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { viewModel.sendFile(it) }
        showAttach = false
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(conversationId) {
        ChatSessionHolder.openConversationId = conversationId
        onDispose { ChatSessionHolder.openConversationId = null }
    }
    DisposableEffect(lifecycleOwner, conversationId) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.load()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) {
            scope.launch { listState.animateScrollToItem(state.messages.lastIndex) }
        }
    }

    val other = state.conversation?.otherUser
    val title = other?.fullName ?: AppStrings.messagesTitle(lang)

    previewImageUrl?.let { url ->
        Dialog(
            onDismissRequest = { previewImageUrl = null },
            properties = DialogProperties(usePlatformDefaultWidth = false),
        ) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Color.Black)
                    .clickable { previewImageUrl = null },
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(context).data(url).crossfade(true).build(),
                    contentDescription = null,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    contentScale = ContentScale.Fit,
                )
                IconButton(
                    onClick = { previewImageUrl = null },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .statusBarsPadding()
                        .padding(8.dp),
                ) {
                    Icon(Icons.Default.Close, contentDescription = null, tint = Color.White)
                }
            }
        }
    }

    Scaffold(
        topBar = {
            if (selectionMode) {
                TopAppBar(
                    title = {
                        Text(
                            "${state.selectedIds.size}",
                            color = textPrimary,
                            fontWeight = FontWeight.SemiBold,
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = { viewModel.clearSelection() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = textPrimary)
                        }
                    },
                    actions = {
                        TextButton(onClick = {
                            deleteForEveryone = canDeleteForAll
                            showDeleteDialog = true
                        }) {
                            Text(
                                "${AppStrings.msgDelete(lang).uppercase()} ${state.selectedIds.size}",
                                color = Color(0xFF6AB2F2),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                        TextButton(onClick = { viewModel.clearSelection() }) {
                            Text(
                                AppStrings.msgCancel(lang).uppercase(),
                                color = Color(0xFF6AB2F2),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = barBg),
                )
            } else {
                TopAppBar(
                    title = {
                        Column {
                            Text(title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = textPrimary)
                            other?.role?.let {
                                Text(
                                    AppStrings.userRoleLabel(lang, it),
                                    fontSize = 12.sp,
                                    color = textMuted,
                                )
                            }
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = textPrimary)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = barBg),
                )
            }
        },
        containerColor = chatBg,
    ) { padding ->
        Box(
            Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            Column(Modifier.fillMaxSize()) {
                state.error?.let { err ->
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = Color(0xFFFEE2E2),
                    ) {
                        Text(
                            AppStrings.apiError(lang, err),
                            modifier = Modifier.padding(12.dp),
                            color = Color(0xFFB91C1C),
                            fontSize = 13.sp,
                        )
                    }
                }
                if (state.isLoading) {
                    Box(
                        Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(color = Color(0xFF6AB2F2))
                    }
                } else if (state.messages.isEmpty() && state.error == null) {
                    Box(
                        Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(AppStrings.chatEmpty(lang), color = textMuted, fontSize = 14.sp)
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
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .combinedClickable(
                                        onClick = {
                                            if (selectionMode) viewModel.toggleSelection(msg.id)
                                        },
                                        onLongClick = { viewModel.toggleSelection(msg.id) },
                                    ),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                MessageBubble(
                                    msg = msg,
                                    isMine = msg.senderId == state.myUserId,
                                    isDark = isDark,
                                    bubbleMine = bubbleMine,
                                    bubbleOther = bubbleOther,
                                    textPrimary = textPrimary,
                                    textMuted = textMuted,
                                    resolveUrl = { viewModel.resolveFileUrl(it) },
                                    onImageClick = { url ->
                                        if (!selectionMode) previewImageUrl = url
                                    },
                                    onDocumentClick = { url ->
                                        if (!selectionMode) {
                                            runCatching {
                                                context.startActivity(
                                                    Intent(Intent.ACTION_VIEW, Uri.parse(url)),
                                                )
                                            }
                                        }
                                    },
                                    modifier = Modifier.weight(1f),
                                )
                                if (selectionMode) {
                                    Icon(
                                        if (isSelected) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                        contentDescription = null,
                                        tint = if (isSelected) Color(0xFF6AB2F2) else textMuted,
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
                            .background(barBg)
                            .navigationBarsPadding(),
                    ) {
                        val attachMenuBg = if (isDark) Color(0xFF3D4A56) else Color(0xFFFFFFFF)
                        val density = LocalDensity.current

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
                                        contentDescription = null,
                                        tint = if (showAttach) Color(0xFF6AB2F2) else textMuted,
                                        modifier = Modifier.size(24.dp),
                                    )
                                }
                                if (showAttach) {
                                    val menuUpPx = with(density) {
                                        (48.dp + 8.dp).roundToPx()
                                    }
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
                                            AttachPickerMenuContent(
                                                isDark = isDark,
                                                lang = lang,
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
                                placeholder = { Text(AppStrings.chatPlaceholder(lang), color = textMuted) },
                                shape = RoundedCornerShape(24.dp),
                                maxLines = 4,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = inputBg,
                                    unfocusedContainerColor = inputBg,
                                    focusedBorderColor = Color(0xFF6AB2F2),
                                    unfocusedBorderColor = Color.Transparent,
                                    focusedTextColor = textPrimary,
                                    unfocusedTextColor = textPrimary,
                                    cursorColor = Color(0xFF6AB2F2),
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
                                    containerColor = bubbleMine,
                                    disabledContainerColor = bubbleMine.copy(alpha = 0.4f),
                                ),
                            ) {
                                Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, tint = Color.White)
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

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            containerColor = if (isDark) Color(0xFF1C242C) else Color.White,
            title = {
                Text(AppStrings.msgDeleteConfirm(lang), color = textPrimary)
            },
            text = {
                if (canDeleteForAll) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = deleteForEveryone,
                            onCheckedChange = { deleteForEveryone = it },
                            colors = CheckboxDefaults.colors(checkedColor = Color(0xFF6AB2F2)),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            AppStrings.msgDeleteForAll(lang, other?.fullName ?: ""),
                            color = textPrimary,
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
                    Text(AppStrings.msgDelete(lang), color = Color(0xFF6AB2F2))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text(AppStrings.msgCancel(lang), color = Color(0xFF6AB2F2))
                }
            },
        )
    }
}

/** Telegram attach popup o‘lchamlari */
private val AttachMenuWidth = 248.dp

@Composable
private fun AttachPickerMenuContent(
    isDark: Boolean,
    lang: AppLanguage,
    onPhoto: () -> Unit,
    onDocument: () -> Unit,
) {
    val labelColor = if (isDark) Color(0xFFFFFFFF) else Color(0xFF000000)
    val iconTint = if (isDark) Color(0xFFCBD5E1) else Color(0xFF6B7280)

    Column(Modifier.padding(vertical = 4.dp)) {
        AttachMenuItem(
            icon = Icons.Outlined.Image,
            label = AppStrings.attachPhoto(lang),
            labelColor = labelColor,
            iconTint = iconTint,
            onClick = onPhoto,
        )
        AttachMenuItem(
            icon = Icons.Outlined.Description,
            label = AppStrings.attachDoc(lang),
            labelColor = labelColor,
            iconTint = iconTint,
            onClick = onDocument,
        )
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
        Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(24.dp))
        Spacer(Modifier.width(20.dp))
        Text(
            label,
            color = labelColor,
            fontSize = 15.sp,
            fontWeight = FontWeight.Normal,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun MessageBubble(
    msg: ChatMessageDto,
    isMine: Boolean,
    isDark: Boolean,
    bubbleMine: Color,
    bubbleOther: Color,
    textPrimary: Color,
    textMuted: Color,
    resolveUrl: (String?) -> String,
    onImageClick: (String) -> Unit = {},
    onDocumentClick: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    Row(
        modifier.fillMaxWidth(),
        horizontalArrangement = if (isMine) Arrangement.End else Arrangement.Start,
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isMine) 16.dp else 4.dp,
                bottomEnd = if (isMine) 4.dp else 16.dp,
            ),
            color = if (isMine) bubbleMine else bubbleOther,
        ) {
            Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp).widthIn(max = 280.dp)) {
                if (msg.messageType == "image" && !msg.fileUrl.isNullOrBlank()) {
                    val imageUrl = resolveUrl(msg.fileUrl)
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(imageUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = msg.fileName,
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 220.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { onImageClick(imageUrl) },
                        contentScale = ContentScale.Crop,
                    )
                    Spacer(Modifier.height(4.dp))
                }
                if (msg.messageType == "document" && !msg.fileUrl.isNullOrBlank()) {
                    val docUrl = resolveUrl(msg.fileUrl)
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isMine) Color.White.copy(0.1f) else if (isDark) Color(0xFF242F3D) else Color(0xFFF3F4F6))
                            .clickable { onDocumentClick(docUrl) }
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Default.Description, contentDescription = null, tint = textPrimary.copy(0.7f))
                        Spacer(Modifier.width(8.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                msg.fileName ?: "Fayl",
                                color = if (isMine) Color.White else textPrimary,
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
                        color = if (isMine) Color.White else textPrimary,
                        fontSize = 14.sp,
                    )
                }
                Row(
                    Modifier.align(Alignment.End),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                ) {
                    Text(
                        formatChatTime(msg.createdAt),
                        fontSize = 10.sp,
                        color = if (isMine) Color(0xFFE0E7FF) else textMuted,
                    )
                    if (isMine) {
                        Icon(
                            imageVector = if (msg.isRead) Icons.Default.DoneAll else Icons.Default.Done,
                            contentDescription = null,
                            modifier = Modifier.size(15.dp),
                            tint = if (msg.isRead) Color(0xFF6AB2F2) else Color.White.copy(alpha = 0.65f),
                        )
                    }
                }
            }
        }
    }
}

private fun formatChatTime(iso: String): String {
    return try {
        val instant = Instant.parse(iso)
        DateTimeFormatter.ofPattern("HH:mm")
            .withZone(ZoneId.systemDefault())
            .format(instant)
    } catch (_: Exception) {
        ""
    }
}

private fun formatBytes(n: Int): String {
    if (n < 1024) return "$n B"
    if (n < 1024 * 1024) return "${"%.1f".format(n / 1024.0)} KB"
    return "${"%.1f".format(n / (1024.0 * 1024.0))} MB"
}

fun avatarColorForId(id: String): Color {
    val colors = listOf(
        Color(0xFF6366F1), Color(0xFF3B82F6), Color(0xFF10B981),
        Color(0xFFF59E0B), Color(0xFFEC4899), Color(0xFF8B5CF6),
    )
    var h = 0
    id.forEach { h = (h + it.code) % colors.size }
    return colors[h]
}

fun initialsFromName(name: String): String =
    name.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }.joinToString("")
