package uz.distributor.crm.data.repository

import kotlinx.coroutines.flow.first
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.ConversationDto
import uz.distributor.crm.data.remote.dto.ProductDto
import uz.distributor.crm.data.remote.dto.PushNotificationDto
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

    /**
     * Faqat birinchi marta (snapshot yo‘q) joriy holatni yozadi.
     * Har resume/load da qayta yozilmasin — aks holda importdan keyin farq yo‘qoladi.
     */
    suspend fun syncSessionBaseline(): Int {
        val existing = snapshotRepository.load()
        if (existing != null) {
            return existing.productCount
        }
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
        val notifications = runCatching { api.getMyNotifications() }.getOrDefault(emptyList())
        val unreadNotifs = notifications.count { !it.isRead }.takeIf { it > 0 }
            ?: runCatching { api.getUnreadNotificationCount().count }.getOrDefault(0)
        val userId = authRepository.getUserFlow().first()?.id

        val current = snapshotFrom(
            products = products,
            clients = clients,
            conversations = conversations,
            stats = stats,
            unreadNotifs = unreadNotifs,
            notifications = notifications,
        )
        val updates = buildUpdates(
            before = previous,
            after = current,
            products = products,
            conversations = conversations,
            notifications = notifications,
            userId = userId,
            lang = lang,
        )
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
        val notifications = runCatching { api.getMyNotifications() }.getOrDefault(emptyList())
        val unreadNotifs = notifications.count { !it.isRead }.takeIf { it > 0 }
            ?: runCatching { api.getUnreadNotificationCount().count }.getOrDefault(0)
        return snapshotFrom(
            products = products,
            clients = clients,
            conversations = conversations,
            stats = stats,
            unreadNotifs = unreadNotifs,
            notifications = notifications,
        )
    }

    private fun snapshotFrom(
        products: List<ProductDto>,
        clients: List<uz.distributor.crm.data.remote.dto.ClientDto>,
        conversations: List<ConversationDto>,
        stats: DashboardStats,
        unreadNotifs: Int,
        notifications: List<PushNotificationDto>,
    ) = RefreshSnapshot(
        clientIds = clients.map { it.id }.toSet(),
        productStock = products.associate { it.id to it.stockBalance },
        productNames = products.associate { it.id to it.name },
        productUnits = products.associate { it.id to it.unit },
        unreadMessages = conversations.sumOf { it.unreadCount },
        unreadNotifications = unreadNotifs,
        seenNotificationIds = notifications.map { it.id }.toSet(),
        totalClients = stats.totalClients,
        visitedClients = stats.visitedClients,
        totalSales = stats.totalSales,
        productCount = products.size,
        conversationLastMessages = conversations.lastMessageMap(),
    )

    private fun List<ConversationDto>.lastMessageMap(): Map<String, String> =
        mapNotNull { conv ->
            conv.lastMessage?.id?.let { conv.id to it }
        }.toMap()

    private fun buildUpdates(
        before: RefreshSnapshot?,
        after: RefreshSnapshot,
        products: List<ProductDto>,
        conversations: List<ConversationDto>,
        notifications: List<PushNotificationDto>,
        userId: String?,
        lang: AppLanguage,
    ): List<String> {
        if (before == null) {
            return listOf(AppStrings.refreshFirstDone(lang))
        }

        val updates = mutableListOf<String>()
        val byId = products.associateBy { it.id }

        fun nameOf(id: String): String =
            byId[id]?.name
                ?: after.productNames[id]
                ?: before.productNames[id]
                ?: id

        val newClients = after.clientIds - before.clientIds
        if (newClients.isNotEmpty()) {
            updates.add(AppStrings.newClientsAdded(lang, newClients.size))
        }

        val newProductIds = after.productStock.keys - before.productStock.keys
        for (id in newProductIds) {
            updates.add(AppStrings.newProductImportedLine(lang, nameOf(id)))
        }

        val stockIncreases = after.productStock.mapNotNull { (id, stock) ->
            val prev = before.productStock[id] ?: return@mapNotNull null
            val delta = stock - prev
            if (delta <= 0.0001) return@mapNotNull null
            nameOf(id) to delta
        }.sortedByDescending { it.second }

        if (stockIncreases.isNotEmpty()) {
            updates.add(AppStrings.productsImportedTitle(lang))
            stockIncreases.take(30).forEach { (name, _) ->
                updates.add(AppStrings.productStockImportLine(lang, name))
            }
            if (stockIncreases.size > 30) {
                updates.add("+${stockIncreases.size - 30}")
            }
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

        // Bildirishnomalar — title + body aniq ko‘rinsin
        val newNotifs = notifications
            .filter { it.id !in before.seenNotificationIds }
            .sortedByDescending { it.createdAt.orEmpty() }
        if (newNotifs.isNotEmpty()) {
            updates.add(AppStrings.notificationsSectionTitle(lang))
            newNotifs.take(10).forEach { n ->
                updates.add(AppStrings.notificationUpdateLine(lang, n.title, n.body))
            }
            if (newNotifs.size > 10) {
                updates.add("+${newNotifs.size - 10}")
            }
        } else {
            val unreadDelta = after.unreadNotifications - before.unreadNotifications
            if (unreadDelta > 0) {
                updates.add(AppStrings.newNotificationsReceived(lang, unreadDelta))
            }
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
