package uz.distributor.crm.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

private val Context.refreshDataStore by preferencesDataStore("refresh_snapshot")

data class RefreshSnapshot(
    val clientIds: Set<String> = emptySet(),
    val productStock: Map<String, Double> = emptyMap(),
    /** productId -> name (import natijasida ko‘rsatish uchun) */
    val productNames: Map<String, String> = emptyMap(),
    /** productId -> unit */
    val productUnits: Map<String, String> = emptyMap(),
    val unreadMessages: Int = 0,
    val unreadNotifications: Int = 0,
    /** Ko‘rilgan bildirishnoma id lari */
    val seenNotificationIds: Set<String> = emptySet(),
    val totalClients: Int = 0,
    val visitedClients: Int = 0,
    val totalSales: Double = 0.0,
    val productCount: Int = 0,
    /** conversationId -> lastMessageId */
    val conversationLastMessages: Map<String, String> = emptyMap(),
)

private data class RefreshSnapshotPersisted(
    val clientIds: List<String> = emptyList(),
    val productStock: List<StockEntry> = emptyList(),
    val productNames: List<NamedEntry> = emptyList(),
    val productUnits: List<NamedEntry> = emptyList(),
    val unreadMessages: Int = 0,
    val unreadNotifications: Int = 0,
    val seenNotificationIds: List<String> = emptyList(),
    val totalClients: Int = 0,
    val visitedClients: Int = 0,
    val totalSales: Double = 0.0,
    val productCount: Int = 0,
    val conversationLastMessages: List<ConversationMessageEntry> = emptyList(),
) {
    fun toSnapshot() = RefreshSnapshot(
        clientIds = clientIds.toSet(),
        productStock = productStock.associate { it.id to it.stock },
        productNames = productNames.associate { it.id to it.value },
        productUnits = productUnits.associate { it.id to it.value },
        unreadMessages = unreadMessages,
        unreadNotifications = unreadNotifications,
        seenNotificationIds = seenNotificationIds.toSet(),
        totalClients = totalClients,
        visitedClients = visitedClients,
        totalSales = totalSales,
        productCount = productCount,
        conversationLastMessages = conversationLastMessages.associate { it.conversationId to it.lastMessageId },
    )

    companion object {
        fun from(snapshot: RefreshSnapshot) = RefreshSnapshotPersisted(
            clientIds = snapshot.clientIds.toList(),
            productStock = snapshot.productStock.map { StockEntry(it.key, it.value) },
            productNames = snapshot.productNames.map { NamedEntry(it.key, it.value) },
            productUnits = snapshot.productUnits.map { NamedEntry(it.key, it.value) },
            unreadMessages = snapshot.unreadMessages,
            unreadNotifications = snapshot.unreadNotifications,
            seenNotificationIds = snapshot.seenNotificationIds.toList(),
            totalClients = snapshot.totalClients,
            visitedClients = snapshot.visitedClients,
            totalSales = snapshot.totalSales,
            productCount = snapshot.productCount,
            conversationLastMessages = snapshot.conversationLastMessages.map {
                ConversationMessageEntry(it.key, it.value)
            },
        )
    }
}

private data class StockEntry(val id: String, val stock: Double)
private data class NamedEntry(val id: String, val value: String)
private data class ConversationMessageEntry(val conversationId: String, val lastMessageId: String)

@Singleton
class RefreshSnapshotRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val gson: Gson,
) {
    /** v4: seenNotificationIds — bildirishnoma mazmuni uchun */
    private val snapshotKey = stringPreferencesKey("last_snapshot_v4")

    suspend fun load(): RefreshSnapshot? {
        val json = context.refreshDataStore.data.first()[snapshotKey] ?: return null
        return runCatching {
            gson.fromJson(json, RefreshSnapshotPersisted::class.java).toSnapshot()
        }.getOrNull()
    }

    suspend fun save(snapshot: RefreshSnapshot) {
        val json = gson.toJson(RefreshSnapshotPersisted.from(snapshot))
        context.refreshDataStore.edit { it[snapshotKey] = json }
    }
}
