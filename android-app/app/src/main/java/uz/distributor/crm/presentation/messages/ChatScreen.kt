package uz.distributor.crm.presentation.messages

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import kotlinx.coroutines.launch
import uz.distributor.crm.data.remote.dto.ChatMessageDto
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
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
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
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
    val menuBg = if (isDark) Color(0xFF17212B) else Color.White

    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { viewModel.sendFile(it, input.trim().also { input = "" }) }
        showAttach = false
    }
    val docPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { viewModel.sendFile(it) }
        showAttach = false
    }

    val lifecycleOwner = LocalLifecycleOwner.current
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

    Scaffold(
        topBar = {
            if (selectionMode) {
                TopAppBar(
                    title = {},
                    navigationIcon = {},
                    actions = {
                        TextButton(onClick = { /* forward */ }, enabled = false) {
                            Text(
                                "${AppStrings.msgForward(lang).uppercase()} ${state.selectedIds.size}",
                                color = Color(0xFF6AB2F2).copy(alpha = 0.5f),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
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
                                Text(it, fontSize = 12.sp, color = textMuted)
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
                            err,
                            modifier = Modifier.padding(12.dp),
                            color = Color(0xFFB91C1C),
                            fontSize = 13.sp,
                        )
                    }
                }
                if (state.isLoading) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF6AB2F2))
                    }
                } else if (state.messages.isEmpty() && state.error == null) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(AppStrings.noChats(lang), color = textMuted, fontSize = 14.sp)
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
                                    .clickable { viewModel.toggleSelection(msg.id) },
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
                Box {
                    if (showAttach) {
                        Column(
                            Modifier
                                .padding(start = 12.dp, bottom = 8.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(menuBg)
                                .widthIn(min = 220.dp),
                        ) {
                            AttachRow(Icons.Default.Image, AppStrings.attachPhoto(lang), textPrimary) {
                                imagePicker.launch("image/*")
                            }
                            AttachRow(Icons.Default.Description, AppStrings.attachDoc(lang), textPrimary) {
                                docPicker.launch("*/*")
                            }
                        }
                    }

                    Row(
                        Modifier
                            .fillMaxWidth()
                            .background(barBg)
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        IconButton(onClick = { showAttach = !showAttach }) {
                            Icon(Icons.Default.AttachFile, contentDescription = null, tint = textMuted)
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

@Composable
private fun AttachRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    textColor: Color,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = Color(0xFF6AB2F2), modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(14.dp))
        Text(label, color = textColor, fontSize = 15.sp)
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
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(resolveUrl(msg.fileUrl))
                            .crossfade(true)
                            .build(),
                        contentDescription = msg.fileName,
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 220.dp)
                            .clip(RoundedCornerShape(8.dp)),
                        contentScale = ContentScale.Crop,
                    )
                    Spacer(Modifier.height(4.dp))
                }
                if (msg.messageType == "document" && !msg.fileUrl.isNullOrBlank()) {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isMine) Color.White.copy(0.1f) else if (isDark) Color(0xFF242F3D) else Color(0xFFF3F4F6))
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
                Text(
                    formatChatTime(msg.createdAt),
                    fontSize = 10.sp,
                    color = if (isMine) Color(0xFFE0E7FF) else textMuted,
                    modifier = Modifier.align(Alignment.End),
                )
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
