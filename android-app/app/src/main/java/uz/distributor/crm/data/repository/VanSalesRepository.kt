package uz.distributor.crm.data.repository

import android.content.Context
import android.net.Uri
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.VanClientDto
import uz.distributor.crm.data.remote.dto.VanLoadDto
import uz.distributor.crm.data.remote.dto.VanReturnRequest
import uz.distributor.crm.data.remote.dto.VanSellItemRequest
import uz.distributor.crm.data.remote.dto.VanSellRequest
import uz.distributor.crm.data.remote.dto.VanSellResponse
import uz.distributor.crm.data.remote.dto.PaymentTerminalDto
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class VanSalesRepository @Inject constructor(
    private val api: ApiService,
    private val gson: Gson,
    @ApplicationContext private val context: Context,
) {
    private val prefs by lazy {
        context.getSharedPreferences("van_sales_offline", Context.MODE_PRIVATE)
    }

    suspend fun getStock(): List<VanLoadDto> = api.getVanMyStock()

    suspend fun getClients(): List<VanClientDto> = api.getVanMyClients()

    suspend fun getMyTerminals(): List<PaymentTerminalDto> = api.getMyTerminals()

    suspend fun sell(
        clientId: String,
        loadId: String?,
        items: List<VanSellItemRequest>,
        paymentMethod: String,
        terminalId: String?,
        amount: Double?,
        dueAt: String?,
        photoUri: Uri?,
    ): VanSellResponse {
        val offlineId = UUID.randomUUID().toString()
        val photoBase64 = photoUri?.let { uriToBase64(it) }
        val body = VanSellRequest(
            clientId = clientId,
            loadId = loadId,
            items = items,
            paymentMethod = paymentMethod,
            terminalId = terminalId,
            amount = amount,
            dueAt = dueAt,
            photoBase64 = photoBase64,
            offlineId = offlineId,
        )
        return try {
            api.vanSell(body)
        } catch (e: Exception) {
            enqueueOffline(body)
            throw e
        }
    }

    suspend fun sellOfflineSafe(
        clientId: String,
        loadId: String?,
        items: List<VanSellItemRequest>,
        paymentMethod: String,
        terminalId: String?,
        amount: Double?,
        dueAt: String?,
        photoUri: Uri?,
    ): Pair<VanSellResponse?, Boolean> {
        val offlineId = UUID.randomUUID().toString()
        val photoBase64 = photoUri?.let { runCatching { uriToBase64(it) }.getOrNull() }
        val body = VanSellRequest(
            clientId = clientId,
            loadId = loadId,
            items = items,
            paymentMethod = paymentMethod,
            terminalId = terminalId,
            amount = amount,
            dueAt = dueAt,
            photoBase64 = photoBase64,
            offlineId = offlineId,
        )
        return try {
            api.vanSell(body) to false
        } catch (_: Exception) {
            enqueueOffline(body)
            null to true
        }
    }

    suspend fun submitReturn(loadId: String, submittedCash: Double? = null): VanLoadDto =
        api.submitVanReturn(loadId, VanReturnRequest(submittedCash = submittedCash))

    suspend fun syncPending(): Int {
        val pending = loadQueue()
        if (pending.isEmpty()) return 0
        val remaining = mutableListOf<VanSellRequest>()
        var synced = 0
        for (body in pending) {
            try {
                api.vanSell(body)
                synced++
            } catch (_: Exception) {
                remaining.add(body)
            }
        }
        saveQueue(remaining)
        return synced
    }

    fun pendingCount(): Int = loadQueue().size

    private fun enqueueOffline(body: VanSellRequest) {
        val q = loadQueue().toMutableList()
        q.add(body)
        saveQueue(q)
    }

    private fun loadQueue(): List<VanSellRequest> {
        val raw = prefs.getString(KEY_QUEUE, null) ?: return emptyList()
        return try {
            val type = object : TypeToken<List<VanSellRequest>>() {}.type
            gson.fromJson<List<VanSellRequest>>(raw, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun saveQueue(list: List<VanSellRequest>) {
        prefs.edit().putString(KEY_QUEUE, gson.toJson(list)).apply()
    }

    private suspend fun uriToBase64(uri: Uri): String = withContext(Dispatchers.IO) {
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            ?: throw IllegalStateException("Cannot read photo")
        android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
    }

    companion object {
        private const val KEY_QUEUE = "pending_van_sales"
    }
}
