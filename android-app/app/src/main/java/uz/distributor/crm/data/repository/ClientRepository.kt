package uz.distributor.crm.data.repository

import uz.distributor.crm.data.local.*
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.ClientDto
import uz.distributor.crm.domain.model.Client
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ClientRepository @Inject constructor(
    private val api: ApiService,
    private val db: AppDatabase,
) {
    suspend fun getClients(forceRefresh: Boolean = false): List<Client> {
        if (forceRefresh) refreshFromApi()
        val cached = db.clientDao().getAll()
        if (cached.isNotEmpty()) return cached.map { it.toDomain() }
        refreshFromApi()
        return db.clientDao().getAll().map { it.toDomain() }
    }

    suspend fun getClient(id: String): Client? {
        return db.clientDao().getById(id)?.toDomain()
            ?: api.getClient(id).toEntity().toDomain()
    }

    suspend fun search(query: String): List<Client> {
        return try {
            api.searchClients(query).map { it.toEntity() }.also {
                db.clientDao().insertAll(it)
            }.map { it.toDomain() }
        } catch (_: Exception) {
            db.clientDao().search(query).map { it.toDomain() }
        }
    }

    private suspend fun refreshFromApi() {
        try {
            val dtos = api.getClients()
            db.clientDao().insertAll(dtos.map { it.toEntity() })
        } catch (_: Exception) { /* use cache */ }
    }

    private fun ClientDto.toEntity() = ClientEntity(
        id = id, code = code, name = name, address = address,
        balance = balance,
        latitude = latitude, longitude = longitude,
    )
}
