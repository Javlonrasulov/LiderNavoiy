package uz.lider.client.data.remote

import android.util.Log
import com.google.gson.Gson
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
import uz.lider.client.BuildConfig
import uz.lider.client.data.local.TokenHolder
import uz.lider.client.data.remote.dto.ChatMessageDto
import uz.lider.client.data.remote.dto.ConversationDto
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
                val base = BuildConfig.API_BASE_URL
                    .trimEnd('/')
                    .removeSuffix("/api/v1")
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
                        parseMessageEvent(args)?.let { event ->
                            scope.launch { _events.emit(event) }
                        }
                    }
                    on("message:deleted") { args ->
                        parseDeletedEvent(args)?.let { event ->
                            scope.launch { _deletedEvents.emit(event) }
                        }
                    }
                    on("message:read") { args ->
                        parseReadEvent(args)?.let { event ->
                            scope.launch { _readEvents.emit(event) }
                        }
                    }
                }
                socket?.connect()
            } catch (e: Exception) {
                Log.e(TAG, "Messages socket setup failed", e)
            }
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

    private fun parseMessageEvent(args: Array<out Any>): NewMessageEvent? {
        if (args.isEmpty()) return null
        return try {
            val root = args[0] as? JSONObject ?: return null
            val msgJson = root.optJSONObject("message") ?: return null
            val convJson = root.optJSONObject("conversation")
            val message = gson.fromJson(msgJson.toString(), ChatMessageDto::class.java)
            val conversation = convJson?.let {
                gson.fromJson(it.toString(), ConversationDto::class.java)
            }
            NewMessageEvent(message, conversation)
        } catch (e: Exception) {
            Log.e(TAG, "message:new parse failed", e)
            null
        }
    }

    private fun parseDeletedEvent(args: Array<out Any>): DeletedMessagesEvent? {
        if (args.isEmpty()) return null
        return try {
            val root = args[0] as? JSONObject ?: return null
            val conversationId = root.optString("conversationId")
            val messageIds = root.optJSONArray("messageIds")?.let { arr ->
                (0 until arr.length()).map { arr.getString(it) }
            } ?: emptyList()
            val forEveryone = root.optBoolean("forEveryone", false)
            val convJson = root.optJSONObject("conversation")
            val conversation = convJson?.let {
                gson.fromJson(it.toString(), ConversationDto::class.java)
            }
            DeletedMessagesEvent(conversationId, messageIds, forEveryone, conversation)
        } catch (e: Exception) {
            Log.e(TAG, "message:deleted parse failed", e)
            null
        }
    }

    private fun parseReadEvent(args: Array<out Any>): ReadMessagesEvent? {
        if (args.isEmpty()) return null
        return try {
            val root = args[0] as? JSONObject ?: return null
            val conversationId = root.optString("conversationId")
            val messageIds = root.optJSONArray("messageIds")?.let { arr ->
                (0 until arr.length()).map { arr.getString(it) }
            } ?: emptyList()
            ReadMessagesEvent(conversationId, messageIds)
        } catch (e: Exception) {
            Log.e(TAG, "message:read parse failed", e)
            null
        }
    }

    companion object {
        private const val TAG = "ClientMessagesSocket"
    }
}
