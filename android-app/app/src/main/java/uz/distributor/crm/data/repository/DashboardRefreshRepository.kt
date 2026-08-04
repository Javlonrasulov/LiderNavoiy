package uz.distributor.crm.data.repository

import kotlinx.coroutines.flow.first
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.ConversationDto
import uz.distributor.crm.data.remote.dto.ProductDto
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
        val unreadNotifs = runCatching {
            api.getUnreadNotificationCount().count
        }.getOrDefault(0)
        val userId = authRepository.getUserFlow().first()?.id

        val current = snapshotFrom(products, clients, conversations, stats, unreadNotifs)
        val updates = buildUpdates(previous, current, products, conversations, userId, lang)
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
        return snapshotFrom(products, clients, conversations, stats, unreadNotifs)
    }

    private fun snapshotFrom(
        products: List<ProductDto>,
        clients: List<uz.distributor.crm.data.remote.dto.ClientDto>,
        conversations: List<ConversationDto>,
        stats: DashboardStats,
        unreadNotifs: Int,
    ) = RefreshSnapshot(
        clientIds = clients.map { it.id }.toSet(),
        productStock = products.associate { it.id to it.stockBalance },
        productNames = products.associate { it.id to it.name },
        productUnits = products.associate { it.id to it.unit },
        unreadMessages = conversations.sumOf { it.unreadCount },
        unreadNotifications = unreadNotifs,
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

        fun unitOf(id: String): String =
            byId[id]?.unit
                ?: after.productUnits[id]
                ?: before.productUnits[id]
                ?: ""

        val newClients = after.clientIds - before.clientIds
        if (newClients.isNotEmpty()) {
            updates.add(AppStrings.newClientsAdded(lang, newClients.size))
        }

        // Yangi mahsulotlar
        val newProductIds = after.productStock.keys - before.productStock.keys
        for (id in newProductIds) {
            val qty = after.productStock[id] ?: 0.0
            updates.add(
                AppStrings.newProductImportedLine(lang, nameOf(id), qty, unitOf(id)),
            )
        }

        // Qoldiq oshgan — har bir tovar alohida: "Coca Cola: +50 dona"
        val stockIncreases = after.productStock.mapNotNull { (id, stock) ->
            val prev = before.productStock[id] ?: return@mapNotNull null
            val delta = stock - prev
            if (delta <= 0.0001) return@mapNotNull null
            Triple(nameOf(id), delta, unitOf(id))
        }.sortedByDescending { it.second }

        if (stockIncreases.isNotEmpty()) {
            updates.add(AppStrings.productsImportedTitle(lang))
            stockIncreases.take(30).forEach { (name, qty, unit) ->
                updates.add(AppStrings.productStockImportLine(lang, name, qty, unit))
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
