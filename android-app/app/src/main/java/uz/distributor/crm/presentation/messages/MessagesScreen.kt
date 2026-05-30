package uz.distributor.crm.presentation.messages

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import uz.distributor.crm.BuildConfig
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.components.BottomNavBar
import uz.distributor.crm.presentation.components.NavTab
import uz.distributor.crm.presentation.components.SherinGlassButton
import uz.distributor.crm.presentation.components.SherinPageHeader
import uz.distributor.crm.presentation.theme.sherinPageBackground
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessagesScreen(
    onNavigate: (NavTab) -> Unit,
    onChatClick: (String) -> Unit,
    viewModel: MessagesViewModel = hiltViewModel(),
) {
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val listBg = if (isDark) Color(0xFF0E1621) else sherinPageBackground(isDark)
    var search by remember { mutableStateOf("") }
    val state by viewModel.uiState.collectAsState()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.load()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val filtered = remember(search, state.conversations) {
        state.conversations.filter { conv ->
            conv.otherUser.fullName.contains(search, ignoreCase = true)
        }.sortedByDescending { it.updatedAt }
    }

    fun previewLast(conv: uz.distributor.crm.data.remote.dto.ConversationDto): String {
        val last = conv.lastMessage ?: return ""
        if (last.text.isNotBlank()) return last.text
        return when (last.messageType) {
            "image" -> "📷 ${AppStrings.previewImage(lang)}"
            "document" -> "📎 ${last.fileName ?: AppStrings.previewFile(lang)}"
            else -> last.text
        }
    }

    val totalUnread = state.conversations.sumOf { it.unreadCount }
    val apiHost = remember {
        BuildConfig.API_BASE_URL.removePrefix("http://").substringBefore(":").ifBlank { "?" }
    }

    if (state.showContactPicker) {
        ModalBottomSheet(
            onDismissRequest = { viewModel.dismissContactPicker() },
            sheetState = sheetState,
            containerColor = if (isDark) Color(0xFF17212B) else Color.White,
        ) {
            Text(
                AppStrings.selectContact(lang),
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
                color = if (isDark) Color.White else Color.Black,
            )
            LazyColumn(Modifier.padding(bottom = 24.dp)) {
                items(state.contacts, key = { it.id }) { contact ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable {
                                viewModel.startConversation(contact.id, onChatClick)
                            }
                            .padding(horizontal = 20.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        val color = avatarColorForId(contact.id)
                        Box(
                            Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(color),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                initialsFromName(contact.fullName),
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(
                                contact.fullName,
                                fontWeight = FontWeight.Medium,
                                color = if (isDark) Color.White else Color.Black,
                            )
                            Text(contact.role, fontSize = 12.sp, color = Color(0xFF9CA3AF))
                        }
                    }
                }
            }
        }
    }

    Box(Modifier.fillMaxSize().background(listBg)) {
        Column(Modifier.fillMaxSize()) {
            SherinPageHeader(
                title = AppStrings.messagesTitle(lang),
                isDark = isDark,
                onBack = { onNavigate(NavTab.HOME) },
                searchQuery = search,
                onSearchChange = { search = it },
                searchPlaceholder = AppStrings.search(lang),
                centerBadge = {
                    if (totalUnread > 0) {
                        Box(
                            Modifier
                                .background(Color(0xFFEF4444), CircleShape)
                                .padding(horizontal = 6.dp, vertical = 2.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("$totalUnread", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                },
                trailing = {
                    SherinGlassButton(
                        onClick = { viewModel.openContactPicker() },
                        icon = Icons.Default.Edit,
                        size = 40.dp,
                    )
                },
            )

            when {
                state.isLoading -> {
                    Box(Modifier.fillMaxSize().weight(1f), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF6AB2F2))
                    }
                }
                filtered.isEmpty() -> {
                    Column(
                        Modifier
                            .fillMaxSize()
                            .weight(1f)
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Text(
                            if (state.error != null) AppStrings.msgLoadError(lang) else AppStrings.noChats(lang),
                            color = Color(0xFF9CA3AF),
                            textAlign = TextAlign.Center,
                        )
                        state.error?.let { err ->
                            Spacer(Modifier.height(8.dp))
                            Text(err, color = Color(0xFFEF4444), fontSize = 13.sp, textAlign = TextAlign.Center)
                            Spacer(Modifier.height(8.dp))
                            Text(
                                AppStrings.serverHint(lang, apiHost),
                                color = Color(0xFF9CA3AF),
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center,
                            )
                        }
                        Spacer(Modifier.height(20.dp))
                        Button(
                            onClick = { viewModel.load() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                        ) {
                            Text(AppStrings.reload(lang))
                        }
                        Spacer(Modifier.height(12.dp))
                        OutlinedButton(onClick = { viewModel.openContactPicker() }) {
                            Text(AppStrings.startChat(lang))
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.weight(1f).padding(bottom = 88.dp),
                    ) {
                        items(filtered, key = { it.id }) { conv ->
                            val last = conv.lastMessage
                            val unread = conv.unreadCount
                            val fromMe = last?.senderId == state.myUserId
                            val user = conv.otherUser
                            val color = avatarColorForId(user.id)

                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .clickable { onChatClick(conv.id) }
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Box(contentAlignment = Alignment.TopEnd) {
                                    Box(
                                        Modifier
                                            .size(56.dp)
                                            .clip(CircleShape)
                                            .background(color),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text(
                                            initialsFromName(user.fullName),
                                            color = Color.White,
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                    }
                                    if (unread > 0) {
                                        Box(
                                            Modifier
                                                .offset(x = 4.dp, y = (-2).dp)
                                                .size(20.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFF3B82F6))
                                                .border(2.dp, if (isDark) Color.Black else Color.White, CircleShape),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Text("$unread", color = Color.White, fontSize = 10.sp)
                                        }
                                    }
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(
                                            user.fullName,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = if (isDark) Color.White else Color.Black,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.weight(1f),
                                        )
                                        last?.let {
                                            Text(
                                                formatListTime(it.createdAt),
                                                fontSize = 12.sp,
                                                color = if (unread > 0) Color(0xFF60A5FA) else Color(0xFF9CA3AF),
                                            )
                                        }
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        if (fromMe) {
                                            Text("✓✓ ", fontSize = 12.sp, color = Color(0xFF9CA3AF))
                                        }
                                        Text(
                                            previewLast(conv),
                                            fontSize = 14.sp,
                                            color = when {
                                                unread > 0 -> if (isDark) Color(0xFFD1D5DB) else Color(0xFF374151)
                                                else -> Color(0xFF9CA3AF)
                                            },
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                    }
                                }
                            }
                            HorizontalDivider(
                                modifier = Modifier.padding(start = 80.dp),
                                color = if (isDark) Color(0xFF1F2937) else Color(0xFFF3F4F6),
                            )
                        }
                    }
                }
            }
        }
        BottomNavBar(NavTab.MESSAGES, onNavigate, isDark, Modifier.align(Alignment.BottomCenter))
    }
}

private fun formatListTime(iso: String): String {
    return try {
        val instant = Instant.parse(iso)
        DateTimeFormatter.ofPattern("HH:mm")
            .withZone(ZoneId.systemDefault())
            .format(instant)
    } catch (_: Exception) {
        ""
    }
}
