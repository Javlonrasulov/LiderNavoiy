package uz.distributor.crm.data.repository

import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.MessagesSocketManager
import uz.distributor.crm.data.remote.dto.ChatContactDto
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import uz.distributor.crm.BuildConfig
import uz.distributor.crm.data.remote.dto.ChatMessageDto
import uz.distributor.crm.data.remote.dto.MessageAttachmentRequest
import uz.distributor.crm.data.remote.dto.ConversationDto
import uz.distributor.crm.data.remote.dto.DeleteMessagesRequest
import uz.distributor.crm.data.remote.dto.SendMessageRequest
import uz.distributor.crm.data.remote.dto.StartConversationRequest
import uz.distributor.crm.data.remote.dto.UploadResponseDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MessageRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiService,
    private val socket: MessagesSocketManager,
) {
    suspend fun getConversations(): List<ConversationDto> = api.getConversations()

    suspend fun getContacts(): List<ChatContactDto> = api.getChatContacts()

    suspend fun startConversation(userId: String): ConversationDto =
        api.startConversation(StartConversationRequest(userId))

    suspend fun getMessages(conversationId: String): List<ChatMessageDto> =
        api.getChatMessages(conversationId)

    suspend fun sendMessage(
        conversationId: String,
        text: String = "",
        attachment: MessageAttachmentRequest? = null,
    ): ChatMessageDto =
        api.sendChatMessage(conversationId, SendMessageRequest(text, attachment))

    suspend fun uploadAndSend(conversationId: String, uri: Uri, caption: String = ""): ChatMessageDto {
        val uploaded = uploadFile(uri)
        val attachment = MessageAttachmentRequest(
            url = uploaded.url,
            fileName = uploaded.fileName,
            mimeType = uploaded.mimeType,
            fileSize = uploaded.fileSize,
            messageType = uploaded.messageType,
        )
        return sendMessage(conversationId, caption, attachment)
    }

    suspend fun uploadFile(uri: Uri): UploadResponseDto {
        val resolver = context.contentResolver
        val mime = resolver.getType(uri) ?: "application/octet-stream"
        val name = queryDisplayName(uri) ?: "file"
        val bytes = resolver.openInputStream(uri)?.readBytes()
            ?: throw IllegalArgumentException("Cannot read file")
        val body = bytes.toRequestBody(mime.toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("file", name, body)
        return api.uploadChatFile(part)
    }

    fun resolveFileUrl(path: String?): String {
        if (path.isNullOrBlank()) return ""
        if (path.startsWith("http")) return path
        val base = BuildConfig.API_BASE_URL.trimEnd('/').removeSuffix("/api/v1")
        return "$base$path"
    }

    private fun queryDisplayName(uri: Uri): String? {
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && cursor.moveToFirst()) return cursor.getString(idx)
        }
        return null
    }

    suspend fun markRead(conversationId: String) {
        api.markConversationRead(conversationId)
    }

    suspend fun deleteMessages(
        conversationId: String,
        messageIds: List<String>,
        forEveryone: Boolean,
    ): List<String> =
        api.deleteChatMessages(
            conversationId,
            DeleteMessagesRequest(messageIds, forEveryone),
        ).deleted

    fun connectSocket() = socket.connect()

    fun disconnectSocket() = socket.disconnect()

    fun sendViaSocket(conversationId: String, text: String) =
        socket.sendMessage(conversationId, text)

    val socketEvents get() = socket.events

    val deletedSocketEvents get() = socket.deletedEvents
}
