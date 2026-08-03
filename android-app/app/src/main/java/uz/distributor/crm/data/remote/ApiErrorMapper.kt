package uz.distributor.crm.data.remote

import com.google.gson.JsonParser
import kotlinx.coroutines.TimeoutCancellationException
import retrofit2.HttpException
import uz.distributor.crm.data.repository.AgentOnlyException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

object ApiErrorMapper {
    const val SERVER_WAKING = "server_waking"

    fun toKey(e: Throwable): String = when (e) {
        is AgentOnlyException -> "agent_only"
        is TimeoutCancellationException -> SERVER_WAKING
        is SocketTimeoutException -> SERVER_WAKING
        is UnknownHostException -> "network_error"
        is HttpException -> mapHttpException(e)
        is IOException -> "network_error"
        else -> when {
            e.cause is TimeoutCancellationException -> SERVER_WAKING
            e.cause is SocketTimeoutException -> SERVER_WAKING
            e.cause is IOException -> "network_error"
            else -> "save_failed"
        }
    }

    private fun mapHttpException(e: HttpException): String {
        val serverMsg = e.response()?.errorBody()?.use { it.string() }?.let(::parseMessage)
        if (serverMsg != null) return mapServerMessage(serverMsg)
        return when (e.code()) {
            in 500..599 -> "server_error"
            401, 403 -> "unauthorized"
            else -> "save_failed"
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
        msg.contains("Invalid credentials", ignoreCase = true) ->
            "invalid_credentials"
        msg.contains("Invalid current password", ignoreCase = true) ->
            "invalid_current_password"
        msg.contains("kutilayotgan", ignoreCase = true) && msg.contains("INN", ignoreCase = true) ->
            "inn_request_exists"
        msg.contains("mavjud", ignoreCase = true) && msg.contains("INN", ignoreCase = true) ->
            "inn_client_exists"
        else -> "save_failed"
    }
}
