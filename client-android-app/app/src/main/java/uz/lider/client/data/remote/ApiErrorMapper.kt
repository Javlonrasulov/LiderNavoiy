package uz.lider.client.data.remote

import com.google.gson.JsonParser
import retrofit2.HttpException
import java.io.IOException

object ApiErrorMapper {
    const val CLIENT_ONLY = "client_only"
    const val INVALID_CREDENTIALS = "invalid_credentials"
    const val CREDENTIALS_REQUIRED = "credentials_required"
    const val NETWORK_ERROR = "network_error"
    const val SERVER_ERROR = "server_error"
    const val UNAUTHORIZED = "unauthorized"
    const val SAVE_FAILED = "save_failed"

    fun toKey(e: Throwable): String = when (e) {
        is ClientOnlyException -> CLIENT_ONLY
        is HttpException -> mapHttpException(e)
        is IOException -> NETWORK_ERROR
        else -> {
            if (e.message == "CLIENT_ONLY") CLIENT_ONLY else SAVE_FAILED
        }
    }

    private fun mapHttpException(e: HttpException): String {
        val serverMsg = e.response()?.errorBody()?.use { it.string() }?.let(::parseMessage)
        if (serverMsg != null) return mapServerMessage(serverMsg)
        return when (e.code()) {
            in 500..599 -> SERVER_ERROR
            401, 403 -> UNAUTHORIZED
            else -> SAVE_FAILED
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

    private fun mapServerMessage(msg: String): String = when {
        msg.contains("Invalid credentials", ignoreCase = true) -> INVALID_CREDENTIALS
        msg == "CLIENT_ONLY" -> CLIENT_ONLY
        else -> SAVE_FAILED
    }
}

class ClientOnlyException : Exception("CLIENT_ONLY")
