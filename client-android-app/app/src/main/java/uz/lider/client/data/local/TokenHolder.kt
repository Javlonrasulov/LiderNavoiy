package uz.lider.client.data.local

import kotlinx.coroutines.flow.MutableStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenHolder @Inject constructor() {
    private val tokenFlow = MutableStateFlow<String?>(null)

    fun setToken(token: String?) {
        tokenFlow.value = token
    }

    /** Interceptor uchun — runBlocking/DataStore kutmasin */
    fun peekToken(): String? = tokenFlow.value

    suspend fun getToken(): String? = tokenFlow.value
}
