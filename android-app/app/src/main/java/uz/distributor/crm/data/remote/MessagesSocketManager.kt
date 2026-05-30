package uz.distributor.crm.data.remote

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import uz.distributor.crm.BuildConfig
import uz.distributor.crm.data.local.ChatSessionHolder
import uz.distributor.crm.data.local.TokenHolder
import uz.distributor.crm.data.local.UserIdHolder
import uz.distributor.crm.data.remote.dto.ChatMessageDto
import uz.distributor.crm.data.remote.dto.ConversationDto
import uz.distributor.crm.push.IncomingMessageAlert
import uz.distributor.crm.push.IncomingMessageNotifier
import javax.inject.Inject
import javax.inject.Singleton

data class NewMessageEvent(
    val message: ChatMessageDto,
    val conversation: ConversationDto?,
)

data class DeletedMessagesEvent(
    val conversationId: String,
    val messageIds: List<String>,
    val forEveryone: Boolean,
    val conversation: ConversationDto?,
)

data class ReadMessagesEvent(
    val conversationId: String,
    val messageIds: List<String>,
)

@Singleton
class MessagesSocketManager @Inject constructor(
    private val tokenHolder: TokenHolder,
    private val userIdHolder: UserIdHolder,
    private val incomingNotifier: IncomingMessageNotifier,
    private val gson: Gson,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var socket: Socket? = null

    private val _events = MutableSharedFlow<NewMessageEvent>(extraBufferCapacity = 32)
    val events: SharedFlow<NewMessageEvent> = _events.asSharedFlow()

    private val _deletedEvents = MutableSharedFlow<DeletedMessagesEvent>(extraBufferCapacity = 32)
    val deletedEvents: SharedFlow<DeletedMessagesEvent> = _deletedEvents.asSharedFlow()

    private val _readEvents = MutableSharedFlow<ReadMessagesEvent>(extraBufferCapacity = 32)
    val readEvents: SharedFlow<ReadMessagesEvent> = _readEvents.asSharedFlow()

    fun connect() {
        scope.launch {
            val token = tokenHolder.getToken()
            if (token.isNullOrBlank()) return@launch
            if (socket?.connected() == true) return@launch

            disconnectInternal()
            try {
                val base = BuildConfig.WS_BASE_URL.trimEnd('/').replace("/tracking", "")
                val options = IO.Options().apply {
                    forceNew = true
                    reconnection = true
                    reconnectionAttempts = Int.MAX_VALUE
                    reconnectionDelay = 2_000
                    auth = mapOf("token" to token)
                }
                socket = IO.socket("$base/messages", options).apply {
                    on(Socket.EVENT_CONNECT) { Log.d(TAG, "Messages socket connected") }
                    on(Socket.EVENT_DISCONNECT) { Log.d(TAG, "Messages socket disconnected") }
                    on("message:new") { args ->
                        parseEvent(args.firstOrNull())?.let { event ->
                            scope.launch {
                                _events.emit(event)
                                maybeNotifyIncoming(event)
                            }
                        }
                    }
                    on("message:deleted") { args ->
                        parseDeletedEvent(args.firstOrNull())?.let { scope.launch { _deletedEvents.emit(it) } }
                    }
                    on("message:read") { args ->
                        parseReadEvent(args.firstOrNull())?.let { scope.launch { _readEvents.emit(it) } }
                    }
                }
                socket?.connect()
            } catch (e: Exception) {
                Log.e(TAG, "Messages socket setup failed", e)
            }
        }
    }

    fun sendMessage(conversationId: String, text: String) {
        if (socket?.connected() != true) {
            connect()
        }
        try {
            val payload = JSONObject(gson.toJson(mapOf("conversationId" to conversationId, "text" to text)))
            socket?.emit("message:send", payload)
        } catch (e: Exception) {
            Log.w(TAG, "emit message failed", e)
        }
    }

    fun disconnect() {
        scope.launch { disconnectInternal() }
    }

    private fun disconnectInternal() {
        socket?.off()
        socket?.disconnect()
        socket = null
    }

    private suspend fun maybeNotifyIncoming(event: NewMessageEvent) {
        val myId = userIdHolder.userId ?: return
        if (event.message.senderId == myId) return
        if (event.message.conversationId == ChatSessionHolder.openConversationId) return

        val name = event.conversation?.otherUser?.fullName ?: "Yangi xabar"
        val preview = previewText(event.message)
        incomingNotifier.notifyIncoming(
            IncomingMessageAlert(
                conversationId = event.message.conversationId,
                senderName = name,
                preview = preview,
            ),
        )
    }

    private fun previewText(msg: ChatMessageDto): String {
        if (msg.text.isNotBlank()) return msg.text
        if (msg.messageType == "image") return "📷 Rasm"
        if (msg.messageType == "document") return "📎 ${msg.fileName ?: "Fayl"}"
        return "Yangi xabar"
    }

    private fun toJsonString(raw: Any): String = when (raw) {
        is JSONObject -> raw.toString()
        is String -> raw
        else -> gson.toJson(raw)
    }

    private fun parseEvent(raw: Any?): NewMessageEvent? {
        if (raw == null) return null
        return try {
            val root = gson.fromJson(toJsonString(raw), JsonObject::class.java)
            val msgElement = root.get("message") ?: return null
            val message = gson.fromJson(msgElement, ChatMessageDto::class.java)
            val conversation = root.get("conversation")?.let {
                gson.fromJson(it, ConversationDto::class.java)
            }
            NewMessageEvent(message, conversation)
        } catch (e: Exception) {
            Log.w(TAG, "parse message event failed (${raw.javaClass.simpleName})", e)
            null
        }
    }

    private fun parseDeletedEvent(raw: Any?): DeletedMessagesEvent? {
        if (raw == null) return null
        return try {
            val root = gson.fromJson(toJsonString(raw), JsonObject::class.java)
            val conversationId = root.get("conversationId")?.asString ?: return null
            val messageIds = root.getAsJsonArray("messageIds")?.map { it.asString } ?: emptyList()
            val forEveryone = root.get("forEveryone")?.asBoolean == true
            val conversation = root.get("conversation")?.let {
                gson.fromJson(it, ConversationDto::class.java)
            }
            DeletedMessagesEvent(conversationId, messageIds, forEveryone, conversation)
        } catch (e: Exception) {
            Log.w(TAG, "parse deleted event failed (${raw.javaClass.simpleName})", e)
            null
        }
    }

    private fun parseReadEvent(raw: Any?): ReadMessagesEvent? {
        if (raw == null) return null
        return try {
            val root = gson.fromJson(toJsonString(raw), JsonObject::class.java)
            val conversationId = root.get("conversationId")?.asString ?: return null
            val messageIds = root.getAsJsonArray("messageIds")?.map { it.asString } ?: emptyList()
            ReadMessagesEvent(conversationId, messageIds)
        } catch (e: Exception) {
            Log.w(TAG, "parse read event failed (${raw.javaClass.simpleName})", e)
            null
        }
    }

    companion object {
        private const val TAG = "MessagesSocket"
    }
}
