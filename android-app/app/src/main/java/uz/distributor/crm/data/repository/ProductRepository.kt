package uz.distributor.crm.data.repository

import uz.distributor.crm.BuildConfig
import uz.distributor.crm.data.local.*
import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.ProductDto
import uz.distributor.crm.domain.model.Product
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProductRepository @Inject constructor(
    private val api: ApiService,
    private val db: AppDatabase,
) {
    suspend fun refreshFromApi(): Boolean {
        return try {
            val dtos = api.getProducts()
            db.productDao().clearAll()
            db.productDao().insertAll(dtos.map { it.toEntity() })
            true
        } catch (_: Exception) {
            false
        }
    }

    /** API dan kelgan ro'yxatni to'g'ridan-to'g'ri keshga yozadi */
    suspend fun replaceCache(dtos: List<ProductDto>) {
        db.productDao().clearAll()
        db.productDao().insertAll(dtos.map { it.toEntity() })
    }

    suspend fun getProducts(forceRefresh: Boolean = false): List<Product> {
        if (forceRefresh) {
            refreshFromApi()
            return db.productDao().getAll().map { it.toDomain() }
        }
        val cached = db.productDao().getAll()
        if (cached.isNotEmpty()) return cached.map { it.toDomain() }
        refreshFromApi()
        return db.productDao().getAll().map { it.toDomain() }
    }

    suspend fun getCategories(): List<String> {
        if (db.productDao().getAll().isEmpty()) refreshFromApi()
        val fromDb = db.productDao().getCategories()
        if (fromDb.isNotEmpty()) return fromDb
        return fetchCategoriesFromApi().ifEmpty {
            db.productDao().getAll().mapNotNull { it.category?.takeIf { c -> c.isNotBlank() } }.distinct()
        }
    }

    suspend fun getByCategory(category: String): List<Product> {
        return db.productDao().getByCategory(category).map { it.toDomain() }
    }

    suspend fun getProduct(id: String): Product? {
        return db.productDao().getById(id)?.toDomain()
    }

    private suspend fun fetchCategoriesFromApi(): List<String> {
        return try {
            api.getProductCategories()
                .mapNotNull { row -> row["category"]?.takeIf { it.isNotBlank() } }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun ProductDto.toEntity() = ProductEntity(
        id = id, code = code, name = name, category = category, brand = brand,
        price = price, unit = unit, stockBalance = stockBalance, imageUrl = imageUrl,
    )

    fun resolveImageUrl(path: String?): String {
        if (path.isNullOrBlank()) return ""
        if (path.startsWith("http")) return path
        val base = BuildConfig.API_BASE_URL.trimEnd('/').removeSuffix("/api/v1")
        return "$base$path"
    }
}
