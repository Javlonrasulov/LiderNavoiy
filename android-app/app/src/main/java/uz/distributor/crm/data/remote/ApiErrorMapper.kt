package uz.distributor.crm.data.remote

import com.google.gson.JsonParser
import kotlinx.coroutines.TimeoutCancellationException
import retrofit2.HttpException
import uz.distributor.crm.data.repository.AgentOnlyException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

object ApiErrorMapper {
    fun toKey(e: Throwable): String = when (e) {
        is AgentOnlyException -> "agent_only"
        is TimeoutCancellationException -> "network_error"
        is SocketTimeoutException -> "network_error"
        is UnknownHostException -> "network_error"
        is HttpException -> mapHttpException(e)
        is IOException -> "network_error"
        is IllegalArgumentException, is IllegalStateException -> mapLocalMessage(e.message)
        else -> when {
            e.cause is TimeoutCancellationException -> "network_error"
            e.cause is SocketTimeoutException -> "network_error"
            e.cause is IOException -> "network_error"
            else -> mapLocalMessage(e.message)
        }
    }

    private fun mapHttpException(e: HttpException): String {
        val body = e.response()?.errorBody()?.use { it.string() }
        if (e.code() == 409 && body != null) {
            val sessionKey = sessionActiveKey(body)
            if (sessionKey != null) return sessionKey
        }
        val serverMsg = body?.let(::parseMessage)
        if (serverMsg != null) {
            if (serverMsg.equals("SESSION_ACTIVE", ignoreCase = true)) {
                return "session_active"
            }
            val mapped = mapServerMessage(serverMsg)
            return if (mapped == "save_failed" || mapped == "photo_upload_failed") {
                "raw:$serverMsg"
            } else {
                mapped
            }
        }
        return when (e.code()) {
            in 500..599 -> "server_error"
            401, 403 -> "unauthorized"
            409 -> "session_active"
            else -> "save_failed"
        }
    }

    /** session_active yoki session_active:Samsung Galaxy... */
    private fun sessionActiveKey(body: String): String? {
        return try {
            val json = JsonParser.parseString(body).asJsonObject
            val code = when {
                json.has("code") && json.get("code").isJsonPrimitive ->
                    json.get("code").asString
                json.has("message") && json.get("message").isJsonPrimitive ->
                    json.get("message").asString
                else -> null
            }
            if (code != "SESSION_ACTIVE") return null
            val device = if (json.has("activeDevice") && !json.get("activeDevice").isJsonNull) {
                json.get("activeDevice").asString?.trim().orEmpty()
            } else {
                ""
            }
            if (device.isNotBlank()) "session_active:$device" else "session_active"
        } catch (_: Exception) {
            null
        }
    }

    private fun parseMessage(body: String): String? {
        return try {
            val json = JsonParser.parseString(body).asJsonObject
            if (!json.has("message")) return null
            val message = json.get("message")
            when {
                message.isJsonArray -> message.asJsonArray.firstOrNull()?.asString
                message.isJsonPrimitive -> message.asString
                else -> null
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun mapLocalMessage(msg: String?): String {
        if (msg.isNullOrBlank()) return "save_failed"
        // Lokal aniq xabar — UI da ko‘rinsin
        if (msg.contains("Cannot read", ignoreCase = true) ||
            msg.contains("Photo", ignoreCase = true) ||
            msg.contains("decode", ignoreCase = true) ||
            msg.contains("empty", ignoreCase = true)
        ) {
            return "raw:$msg"
        }
        return mapServerMessage(msg)
    }

    private fun mapServerMessage(msg: String): String = when {
        msg.contains("Invalid credentials", ignoreCase = true) ->
            "invalid_credentials"
        msg.contains("Invalid current password", ignoreCase = true) ->
            "invalid_current_password"
        msg.contains("kutilayotgan", ignoreCase = true) && msg.contains("INN", ignoreCase = true) ->
            "inn_request_exists"
        msg.contains("mavjud", ignoreCase = true) && msg.contains("INN", ignoreCase = true) ->
            "inn_client_exists"
        msg.contains("photo", ignoreCase = true) ||
            msg.contains("image", ignoreCase = true) ||
            msg.contains("File", ignoreCase = true) ||
            msg.contains("upload", ignoreCase = true) ||
            msg.contains("rasm", ignoreCase = true) ->
            "photo_upload_failed"
        msg.contains("SESSION_ACTIVE", ignoreCase = true) ->
            "session_active"
        msg.contains("Invalid amount", ignoreCase = true) ->
            "invalid_amount"
        else -> "save_failed"
    }
}
