package uz.distributor.crm.presentation.messages

data class ChatUser(
    val id: String,
    val name: String,
    val role: String,
    val initials: String,
    val color: Long,
)

data class ChatMessage(
    val id: String,
    val senderId: String,
    val text: String,
    val time: String,
    val read: Boolean,
)

data class ChatThread(
    val id: String,
    val userId: String,
    val messages: List<ChatMessage>,
)

const val ME_CHAT_ID = "diyorbek"

val chatUsers = listOf(
    ChatUser("diyorbek", "Diyorbek Abdujaqimov", "Agent", "DA", 0xFF3B82F6),
    ChatUser("jasur", "Jasur Nazarov", "Agent", "JN", 0xFF10B981),
    ChatUser("sherzod", "Sherzod Qodirov", "Agent", "SQ", 0xFFF59E0B),
    ChatUser("sanjar", "Sanjar Toshmatov", "Agent", "ST", 0xFF8B5CF6),
    ChatUser("bobur", "Bobur Mirzayev", "Agent", "BM", 0xFFEF4444),
    ChatUser("eldor", "Eldor Yusupov", "Agent", "EY", 0xFF06B6D4),
    ChatUser("timur", "Timur Raxmatullayev", "Agent", "TR", 0xFFF97316),
    ChatUser("ravshan", "Ravshan Holmatov", "Agent", "RH", 0xFF84CC16),
    ChatUser("manager", "Dilshod Rahimov", "Menejer", "DR", 0xFFEC4899),
    ChatUser("director", "Aziz Karimov", "Direktor", "AK", 0xFF6366F1),
)

val defaultChats = listOf(
    ChatThread("chat_jasur", "jasur", listOf(
        ChatMessage("1", "jasur", "Salom, bugun nechta mijoz bor?", "09:15", true),
        ChatMessage("2", ME_CHAT_ID, "8 ta mijoz bor, hammasi tayyor", "09:20", true),
        ChatMessage("3", "jasur", "Zo'r! Plan bajarilsinchi", "09:22", true),
    )),
    ChatThread("chat_manager", "manager", listOf(
        ChatMessage("1", "manager", "Bugungi hisobotni yuboring", "11:00", true),
        ChatMessage("2", ME_CHAT_ID, "Xop, hozir tayorlayman", "11:05", true),
        ChatMessage("3", "manager", "Iltimos tezroq", "11:10", false),
    )),
    ChatThread("chat_sherzod", "sherzod", listOf(
        ChatMessage("1", ME_CHAT_ID, "Sheringa nechchi foiz?", "14:30", true),
        ChatMessage("2", "sherzod", "88% chi, yaxshi ketmoqda", "14:35", true),
    )),
    ChatThread("chat_director", "director", listOf(
        ChatMessage("1", "director", "Ertaga yig'ilish bor, keling", "16:00", false),
    )),
    ChatThread("chat_sanjar", "sanjar", listOf(
        ChatMessage("1", "sanjar", "Ok tushundim", "08:45", true),
    )),
    ChatThread("chat_bobur", "bobur", listOf(
        ChatMessage("1", "bobur", "Rahmat kattakon", "07:30", true),
    )),
)

fun chatUser(id: String) = chatUsers.find { it.id == id }

fun lastMessage(thread: ChatThread) = thread.messages.lastOrNull()

fun unreadCount(thread: ChatThread) =
    thread.messages.count { !it.read && it.senderId != ME_CHAT_ID }
