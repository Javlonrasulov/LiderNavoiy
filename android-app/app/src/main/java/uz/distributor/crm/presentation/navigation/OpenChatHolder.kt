package uz.distributor.crm.presentation.navigation

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow

object OpenChatHolder {
    @Volatile
    var pendingConversationId: String? = null

    @Volatile
    var pendingOpenPlan: Boolean = false

    private val _deepLinks = MutableSharedFlow<String>(extraBufferCapacity = 8)
    val deepLinks = _deepLinks.asSharedFlow()

    fun requestOpenChat(conversationId: String) {
        pendingConversationId = conversationId
        _deepLinks.tryEmit("chat:$conversationId")
    }

    fun requestOpenPlan() {
        pendingOpenPlan = true
        _deepLinks.tryEmit("plan")
    }
}
