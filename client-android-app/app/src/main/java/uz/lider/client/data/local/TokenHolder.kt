package uz.lider.client.data.local

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenHolder @Inject constructor() {
    private val tokenFlow = MutableStateFlow<String?>(null)

    fun setToken(token: String?) {
        tokenFlow.value = token
    }

    suspend fun getToken(): String? = tokenFlow.first { true }
}
