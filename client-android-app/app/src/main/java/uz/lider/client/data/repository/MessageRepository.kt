package uz.lider.client.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.SharedFlow
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import uz.lider.client.BuildConfig
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.DeletedMessagesEvent
import uz.lider.client.data.remote.MessagesSocketManager
import uz.lider.client.data.remote.NewMessageEvent
import uz.lider.client.data.remote.ReadMessagesEvent
import uz.lider.client.data.remote.dto.ChatMessageDto
import uz.lider.client.data.remote.dto.ConversationDto
import uz.lider.client.data.remote.dto.DeleteMessagesRequest
import uz.lider.client.data.remote.dto.MessageAttachmentRequest
import uz.lider.client.data.remote.dto.SendMessageRequest
import uz.lider.client.data.remote.dto.StartConversationRequest
import uz.lider.client.data.remote.dto.UploadResponseDto
import java.io.ByteArrayOutputStream
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MessageRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiService,
    private val socket: MessagesSocketManager,
) {
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
        val bytes = if (mime.startsWith("image/") && mime != "image/gif") {
            compressImage(uri) ?: resolver.openInputStream(uri)?.readBytes()
                ?: throw IllegalArgumentException("Cannot read file")
        } else {
            resolver.openInputStream(uri)?.readBytes()
                ?: throw IllegalArgumentException("Cannot read file")
        }
        val uploadMime = if (mime.startsWith("image/") && mime != "image/gif") "image/jpeg" else mime
        val uploadName = if (uploadMime == "image/jpeg") {
            name.replace(Regex("\\.[^.]+$"), ".jpg")
        } else {
            name
        }
        val body = bytes.toRequestBody(uploadMime.toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("file", uploadName, body)
        return api.uploadChatFile(part)
    }

    private fun compressImage(uri: Uri): ByteArray? {
        val resolver = context.contentResolver
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        val maxDim = 1280
        var sample = 1
        while (bounds.outWidth / sample > maxDim || bounds.outHeight / sample > maxDim) {
            sample *= 2
        }

        val opts = BitmapFactory.Options().apply { inSampleSize = sample }
        val bitmap = resolver.openInputStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, opts)
        } ?: return null

        val scaled = if (bitmap.width > maxDim || bitmap.height > maxDim) {
            val ratio = minOf(maxDim.toFloat() / bitmap.width, maxDim.toFloat() / bitmap.height)
            val w = (bitmap.width * ratio).toInt().coerceAtLeast(1)
            val h = (bitmap.height * ratio).toInt().coerceAtLeast(1)
            Bitmap.createScaledBitmap(bitmap, w, h, true).also {
                if (it !== bitmap) bitmap.recycle()
            }
        } else {
            bitmap
        }

        return ByteArrayOutputStream().use { out ->
            scaled.compress(Bitmap.CompressFormat.JPEG, 82, out)
            scaled.recycle()
            out.toByteArray()
        }
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

    val socketEvents: SharedFlow<NewMessageEvent> = socket.events

    val deletedSocketEvents: SharedFlow<DeletedMessagesEvent> = socket.deletedEvents

    val readSocketEvents: SharedFlow<ReadMessagesEvent> = socket.readEvents
}
