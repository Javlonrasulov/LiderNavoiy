package uz.lider.client.data.remote.dto

data class ChatContactDto(
    val id: String,
    val fullName: String,
    val role: String,
    val username: String,
)

data class ConversationDto(
    val id: String,
    val otherUser: ChatContactDto,
    val lastMessage: LastMessageDto?,
    val unreadCount: Int,
    val updatedAt: String,
)

data class LastMessageDto(
    val id: String,
    val text: String,
    val senderId: String,
    val createdAt: String,
    val isRead: Boolean,
    val messageType: String = "text",
    val fileName: String? = null,
)

data class ChatMessageDto(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val text: String,
    val isRead: Boolean,
    val createdAt: String,
    val messageType: String = "text",
    val fileUrl: String? = null,
    val fileName: String? = null,
    val fileMime: String? = null,
    val fileSize: Int? = null,
)

data class MessageAttachmentRequest(
    val url: String,
    val fileName: String,
    val mimeType: String,
    val fileSize: Int,
    val messageType: String,
)

data class SendMessageRequest(
    val text: String = "",
    val attachment: MessageAttachmentRequest? = null,
)

data class DeleteMessagesRequest(
    val messageIds: List<String>,
    val forEveryone: Boolean = false,
)

data class DeleteMessagesResponse(val deleted: List<String>)

data class UploadResponseDto(
    val url: String,
    val fullUrl: String,
    val fileName: String,
    val mimeType: String,
    val fileSize: Int,
    val messageType: String,
)

data class StartConversationRequest(val userId: String)
