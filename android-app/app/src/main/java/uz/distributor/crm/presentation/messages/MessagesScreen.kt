package uz.distributor.crm.presentation.messages

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import uz.distributor.crm.data.remote.dto.ChatContactDto
import uz.distributor.crm.data.remote.dto.ConversationDto
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.components.NavTab
import uz.distributor.crm.presentation.components.SherinPageHeader
import uz.distributor.crm.presentation.navigation.bottomNavHeight
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

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.load()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val filteredChats = remember(search, state.conversations) {
        state.conversations.filter { conv ->
            conv.otherUser.fullName.contains(search, ignoreCase = true)
        }.sortedByDescending { it.updatedAt }
    }

    val filteredContacts = remember(search, state.contacts) {
        state.contacts
            .distinctBy { it.id }
            .filter { contact ->
                val name = contact.fullName.orEmpty()
                val user = contact.username.orEmpty()
                name.contains(search, ignoreCase = true) ||
                    user.contains(search, ignoreCase = true)
            }
            .sortedWith(
                compareBy(
                    { sectionLetter(it.fullName.orEmpty()) },
                    { it.fullName.orEmpty().lowercase() },
                ),
            )
    }

    val contactListItems = remember(filteredContacts) {
        buildContactListItems(filteredContacts)
    }

    val totalUnread = state.conversations.sumOf { it.unreadCount }
    val apiHost = remember {
        BuildConfig.API_BASE_URL
            .removePrefix("https://")
            .removePrefix("http://")
            .substringBefore("/")
            .ifBlank { "?" }
    }

    val navBottom = bottomNavHeight()

    Box(Modifier.fillMaxSize().background(listBg)) {
        Column(
            Modifier
                .fillMaxSize()
                .padding(bottom = navBottom),
        ) {
            val onContactsTab = state.selectedTab == MessagesListTab.CONTACTS
            SherinPageHeader(
                title = if (onContactsTab) AppStrings.contactsTab(lang) else AppStrings.messagesTitle(lang),
                isDark = isDark,
                onBack = { onNavigate(NavTab.HOME) },
                searchQuery = search,
                onSearchChange = { search = it },
                searchPlaceholder = if (onContactsTab) AppStrings.searchContacts(lang) else AppStrings.search(lang),
                centerBadge = {
                    if (!onContactsTab && totalUnread > 0) {
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
            )

            MessagesTabRow(
                selected = state.selectedTab,
                onSelect = { viewModel.selectTab(it) },
                isDark = isDark,
                lang = lang,
            )

            // weight to‘g‘ridan-to‘g‘ri Column bolasida — aks holda list balandligi qisqarib
            // pastida oq “blok” ko‘rinadi va nomlar uning orqasida qolib ketadi.
            Box(Modifier.weight(1f).fillMaxWidth()) {
                when (state.selectedTab) {
                    MessagesListTab.CHATS -> ChatsTabContent(
                        modifier = Modifier.fillMaxSize(),
                        isLoading = state.isLoading,
                        filtered = filteredChats,
                        error = state.error,
                        myUserId = state.myUserId,
                        isDark = isDark,
                        lang = lang,
                        apiHost = apiHost,
                        onReload = { viewModel.load() },
                        onOpenContacts = { viewModel.selectTab(MessagesListTab.CONTACTS) },
                        onChatClick = onChatClick,
                        previewLast = { previewLast(it, lang) },
                    )
                    MessagesListTab.CONTACTS -> ContactsTabContent(
                        modifier = Modifier.fillMaxSize(),
                        isLoading = state.contactsLoading,
                        listItems = contactListItems,
                        error = state.error,
                        isDark = isDark,
                        lang = lang,
                        onReload = { viewModel.loadContacts(force = true) },
                        onContactClick = { viewModel.startConversation(it, onChatClick) },
                    )
                }
            }
        }
    }
}

@Composable
private fun MessagesTabRow(
    selected: MessagesListTab,
    onSelect: (MessagesListTab) -> Unit,
    isDark: Boolean,
    lang: uz.distributor.crm.localization.AppLanguage,
) {
    val bg = if (isDark) Color(0xFF17212B) else Color.White
    val activeColor = Color(0xFF6AB2F2)
    val inactiveColor = if (isDark) Color(0xFF8E9BA7) else Color(0xFF9CA3AF)
    val divider = if (isDark) Color(0xFF0E1621) else Color(0xFFE8E8E8)
    val tabs = listOf(
        MessagesListTab.CHATS to AppStrings.chatsTab(lang),
        MessagesListTab.CONTACTS to AppStrings.contactsTab(lang),
    )

    Column(Modifier.fillMaxWidth().background(bg)) {
        Row(Modifier.fillMaxWidth().height(48.dp)) {
            tabs.forEach { (tab, label) ->
                val isSelected = selected == tab
                Box(
                    Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clickable { onSelect(tab) },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        label,
                        fontSize = 15.sp,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (isSelected) activeColor else inactiveColor,
                    )
                    if (isSelected) {
                        Box(
                            Modifier
                                .align(Alignment.BottomCenter)
                                .fillMaxWidth(0.55f)
                                .height(3.dp)
                                .clip(RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp))
                                .background(activeColor),
                        )
                    }
                }
            }
        }
        HorizontalDivider(color = divider, thickness = 0.5.dp)
    }
}

@Composable
private fun ChatsTabContent(
    modifier: Modifier = Modifier,
    isLoading: Boolean,
    filtered: List<ConversationDto>,
    error: String?,
    myUserId: String?,
    isDark: Boolean,
    lang: uz.distributor.crm.localization.AppLanguage,
    apiHost: String,
    onReload: () -> Unit,
    onOpenContacts: () -> Unit,
    onChatClick: (String) -> Unit,
    previewLast: (ConversationDto) -> String,
) {
    when {
        isLoading -> {
            Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF6AB2F2))
            }
        }
        filtered.isEmpty() -> {
            Column(
                modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    if (error != null) AppStrings.apiError(lang, error) else AppStrings.noChats(lang),
                    color = Color(0xFF9CA3AF),
                    textAlign = TextAlign.Center,
                )
                error?.let {
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
                    onClick = onReload,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                ) {
                    Text(AppStrings.reload(lang))
                }
                Spacer(Modifier.height(12.dp))
                OutlinedButton(onClick = onOpenContacts) {
                    Text(AppStrings.startChat(lang))
                }
            }
        }
        else -> {
            LazyColumn(
                modifier = modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 16.dp),
            ) {
                items(filtered, key = { it.id }) { conv ->
                    ConversationRow(
                        conv = conv,
                        myUserId = myUserId,
                        isDark = isDark,
                        preview = previewLast(conv),
                        onClick = { onChatClick(conv.id) },
                    )
                    HorizontalDivider(
                        modifier = Modifier.padding(start = 80.dp),
                        color = if (isDark) Color(0xFF1F2937) else Color(0xFFF3F4F6),
                    )
                }
            }
        }
    }
}

@Composable
private fun ContactsTabContent(
    modifier: Modifier = Modifier,
    isLoading: Boolean,
    listItems: List<ContactListItem>,
    error: String?,
    isDark: Boolean,
    lang: uz.distributor.crm.localization.AppLanguage,
    onReload: () -> Unit,
    onContactClick: (String) -> Unit,
) {
    val listBg = if (isDark) Color(0xFF0E1621) else Color(0xFFF7F8FA)
    val rowBg = if (isDark) Color(0xFF0E1621) else Color.White
    val dividerColor = if (isDark) Color(0xFF1A2634) else Color(0xFFE8EDF2)
    val hasContacts = listItems.any { it is ContactListItem.Row }

    when {
        isLoading && !hasContacts -> {
            Box(modifier.fillMaxSize().background(listBg), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF6AB2F2))
            }
        }
        !hasContacts -> {
            Column(
                modifier
                    .fillMaxSize()
                    .background(listBg)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    if (error != null) AppStrings.apiError(lang, error) else AppStrings.noContacts(lang),
                    color = Color(0xFF9CA3AF),
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(20.dp))
                Button(
                    onClick = onReload,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6AB2F2)),
                ) {
                    Text(AppStrings.reload(lang))
                }
            }
        }
        else -> {
            LazyColumn(
                modifier = modifier
                    .fillMaxSize()
                    .background(listBg),
                contentPadding = PaddingValues(bottom = 16.dp),
            ) {
                items(
                    items = listItems,
                    key = { it.key },
                    contentType = { it.contentType },
                ) { item ->
                    when (item) {
                        is ContactListItem.Summary -> {
                            Text(
                                AppStrings.contactsCount(lang, item.count),
                                modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                                fontSize = 14.sp,
                                color = Color(0xFF6AB2F2),
                                fontWeight = FontWeight.Medium,
                            )
                        }
                        is ContactListItem.Header -> {
                            TelegramContactSectionHeader(
                                letter = item.letter,
                                isDark = isDark,
                            )
                        }
                        is ContactListItem.Row -> {
                            Column(Modifier.background(rowBg)) {
                                TelegramContactRow(
                                    contact = item.contact,
                                    isDark = isDark,
                                    lang = lang,
                                    onClick = { onContactClick(item.contact.id) },
                                )
                                HorizontalDivider(
                                    modifier = Modifier.padding(start = 78.dp),
                                    color = dividerColor,
                                    thickness = 0.5.dp,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private sealed class ContactListItem {
    abstract val key: String
    abstract val contentType: String

    data class Summary(val count: Int) : ContactListItem() {
        override val key = "summary"
        override val contentType = "summary"
    }

    data class Header(val letter: String) : ContactListItem() {
        override val key = "header_$letter"
        override val contentType = "header"
    }

    data class Row(val contact: ChatContactDto, val index: Int) : ContactListItem() {
        override val key = "contact_${contact.id}_$index"
        override val contentType = "row"
    }
}

private fun buildContactListItems(contacts: List<ChatContactDto>): List<ContactListItem> {
    if (contacts.isEmpty()) return emptyList()
    val result = ArrayList<ContactListItem>(contacts.size + 8)
    result += ContactListItem.Summary(contacts.size)
    var lastLetter: String? = null
    contacts.forEachIndexed { index, contact ->
        val letter = sectionLetter(contact.fullName.orEmpty())
        if (letter != lastLetter) {
            result += ContactListItem.Header(letter)
            lastLetter = letter
        }
        result += ContactListItem.Row(contact, index)
    }
    return result
}

private fun sectionLetter(name: String): String {
    val trimmed = name.trim()
    if (trimmed.isEmpty()) return "#"
    val ch = trimmed.first().uppercaseChar()
    return if (ch.isLetter()) ch.toString() else "#"
}

@Composable
private fun TelegramContactSectionHeader(letter: String, isDark: Boolean) {
    Box(
        Modifier
            .fillMaxWidth()
            .background(if (isDark) Color(0xFF17212B) else Color(0xFFF4F8FB)),
    ) {
        Text(
            letter,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF6AB2F2),
        )
    }
}

@Composable
private fun TelegramContactRow(
    contact: ChatContactDto,
    isDark: Boolean,
    lang: uz.distributor.crm.localization.AppLanguage,
    onClick: () -> Unit,
) {
    val nameColor = if (isDark) Color(0xFFFFFFFF) else Color(0xFF000000)
    val subtitleColor = if (isDark) Color(0xFF8E9BA7) else Color(0xFF6B7C8F)
    val avatarColor = avatarColorForId(contact.id)

    Row(
        Modifier
            .fillMaxWidth()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            )
            .padding(start = 12.dp, end = 16.dp, top = 9.dp, bottom = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(54.dp)
                .clip(CircleShape)
                .background(avatarColor),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                initialsFromName(contact.fullName),
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                contact.fullName,
                fontSize = 16.sp,
                fontWeight = FontWeight.Normal,
                color = nameColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                "@${contact.username} · ${AppStrings.userRoleLabel(lang, contact.role)}",
                fontSize = 14.sp,
                color = subtitleColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun ConversationRow(
    conv: ConversationDto,
    myUserId: String?,
    isDark: Boolean,
    preview: String,
    onClick: () -> Unit,
) {
    val last = conv.lastMessage
    val unread = conv.unreadCount
    val fromMe = last?.senderId == myUserId
    val user = conv.otherUser
    val color = avatarColorForId(user.id)

    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
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
                    preview,
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
}

private fun previewLast(conv: ConversationDto, lang: uz.distributor.crm.localization.AppLanguage): String {
    val last = conv.lastMessage ?: return ""
    if (last.text.isNotBlank()) return last.text
    return when (last.messageType) {
        "image" -> "📷 ${AppStrings.previewImage(lang)}"
        "document" -> "📎 ${last.fileName ?: AppStrings.previewFile(lang)}"
        else -> last.text
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
