package uz.distributor.crm.data.repository

import kotlinx.coroutines.flow.first
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.ConversationDto
import uz.distributor.crm.domain.model.DashboardStats
import uz.distributor.crm.localization.AppLanguage
import uz.distributor.crm.localization.AppStrings
import javax.inject.Inject
import javax.inject.Singleton

data class RefreshResult(
    val stats: DashboardStats,
    val productCount: Int,
    val updates: List<String>,
    val snapshot: RefreshSnapshot,
)

@Singleton
class DashboardRefreshRepository @Inject constructor(
    private val api: ApiService,
    private val authRepository: AuthRepository,
    private val dashboardRepository: DashboardRepository,
    private val snapshotRepository: RefreshSnapshotRepository,
) {

    /** Har safar ilova ochilganda joriy holatni bazaga yozadi (o'zgarishsiz). */
    suspend fun syncSessionBaseline(): Int {
        val snapshot = fetchCurrentSnapshot()
        snapshotRepository.save(snapshot)
        return snapshot.productCount
    }

    suspend fun refreshAndDetectChanges(lang: AppLanguage): RefreshResult {
        val previous = snapshotRepository.load()
        val stats = dashboardRepository.getStats()
        val clients = runCatching { api.getClients() }.getOrDefault(emptyList())
        val products = runCatching { api.getProducts() }.getOrDefault(emptyList())
        val conversations = runCatching { api.getConversations() }.getOrDefault(emptyList())
        val unreadNotifs = runCatching {
            api.getUnreadNotificationCount().count
        }.getOrDefault(0)
        val userId = authRepository.getUserFlow().first()?.id

        val current = RefreshSnapshot(
            clientIds = clients.map { it.id }.toSet(),
            productStock = products.associate { it.id to it.stockBalance },
            unreadMessages = conversations.sumOf { it.unreadCount },
            unreadNotifications = unreadNotifs,
            totalClients = stats.totalClients,
            visitedClients = stats.visitedClients,
            totalSales = stats.totalSales,
            productCount = products.size,
            conversationLastMessages = conversations.lastMessageMap(),
        )

        val updates = buildUpdates(previous, current, conversations, userId, lang)
        snapshotRepository.save(current)

        return RefreshResult(
            stats = stats,
            productCount = products.size,
            updates = updates,
            snapshot = current,
        )
    }

    private suspend fun fetchCurrentSnapshot(): RefreshSnapshot {
        val stats = dashboardRepository.getStats()
        val clients = runCatching { api.getClients() }.getOrDefault(emptyList())
        val products = runCatching { api.getProducts() }.getOrDefault(emptyList())
        val conversations = runCatching { api.getConversations() }.getOrDefault(emptyList())
        val unreadNotifs = runCatching {
            api.getUnreadNotificationCount().count
        }.getOrDefault(0)

        return RefreshSnapshot(
            clientIds = clients.map { it.id }.toSet(),
            productStock = products.associate { it.id to it.stockBalance },
            unreadMessages = conversations.sumOf { it.unreadCount },
            unreadNotifications = unreadNotifs,
            totalClients = stats.totalClients,
            visitedClients = stats.visitedClients,
            totalSales = stats.totalSales,
            productCount = products.size,
            conversationLastMessages = conversations.lastMessageMap(),
        )
    }

    private fun List<ConversationDto>.lastMessageMap(): Map<String, String> =
        mapNotNull { conv ->
            conv.lastMessage?.id?.let { conv.id to it }
        }.toMap()

    private fun buildUpdates(
        before: RefreshSnapshot?,
        after: RefreshSnapshot,
        conversations: List<ConversationDto>,
        userId: String?,
        lang: AppLanguage,
    ): List<String> {
        if (before == null) {
            return listOf(AppStrings.refreshFirstDone(lang))
        }

        val updates = mutableListOf<String>()

        val newClients = after.clientIds - before.clientIds
        if (newClients.isNotEmpty()) {
            updates.add(AppStrings.newClientsAdded(lang, newClients.size))
        }

        val newProductIds = after.productStock.keys - before.productStock.keys
        if (newProductIds.isNotEmpty()) {
            updates.add(AppStrings.newProductsInWarehouse(lang, newProductIds.size))
        }

        val stockIncreased = after.productStock.count { (id, stock) ->
            val prev = before.productStock[id] ?: return@count false
            stock > prev
        }
        if (stockIncreased > 0) {
            updates.add(AppStrings.productsStockIncreased(lang, stockIncreased))
        }

        val incomingMessages = countIncomingMessages(before, conversations, userId)
        if (incomingMessages > 0) {
            updates.add(AppStrings.newMessagesReceived(lang, incomingMessages))
        } else {
            val unreadDelta = after.unreadMessages - before.unreadMessages
            if (unreadDelta > 0) {
                updates.add(AppStrings.newMessagesReceived(lang, unreadDelta))
            }
        }

        val newNotifs = after.unreadNotifications - before.unreadNotifications
        if (newNotifs > 0) {
            updates.add(AppStrings.newNotificationsReceived(lang, newNotifs))
        }

        if (after.visitedClients > before.visitedClients) {
            updates.add(
                AppStrings.visitsUpdated(
                    lang,
                    after.visitedClients - before.visitedClients,
                ),
            )
        }

        if (after.totalSales > before.totalSales) {
            updates.add(AppStrings.salesUpdated(lang))
        }

        if (updates.isEmpty()) {
            updates.add(AppStrings.noNewUpdates(lang))
        }

        return updates
    }

    private fun countIncomingMessages(
        before: RefreshSnapshot,
        conversations: List<ConversationDto>,
        userId: String?,
    ): Int {
        if (userId == null) return 0

        var count = 0
        for (conv in conversations) {
            val last = conv.lastMessage ?: continue
            if (last.senderId == userId) continue

            val prevMessageId = before.conversationLastMessages[conv.id]
            if (prevMessageId != last.id) {
                count++
            }
        }
        return count
    }
}
