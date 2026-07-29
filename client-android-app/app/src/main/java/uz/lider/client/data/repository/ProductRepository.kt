package uz.lider.client.data.repository

import uz.lider.client.BuildConfig
import uz.lider.client.data.local.SelectedOrgHolder
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.ProductDto
import uz.lider.client.domain.model.Product
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProductRepository @Inject constructor(
    private val api: ApiService,
    private val selectedOrgHolder: SelectedOrgHolder,
) {
    suspend fun getProducts(category: String? = null): List<Product> {
        return try {
            val companyId = selectedOrgHolder.getSelectedCompanyId()
            api.getProducts(category = category, companyId = companyId).map { it.toDomain() }
        } catch (_: Exception) {
            emptyList()
        }
    }

    suspend fun getCategories(): List<String> {
        return try {
            val companyId = selectedOrgHolder.getSelectedCompanyId()
            api.getProductCategories(companyId = companyId)
                .mapNotNull { row -> row.category.takeIf { it.isNotBlank() } }
        } catch (_: Exception) {
            emptyList()
        }
    }

    suspend fun getProduct(id: String): Product? {
        return getProducts().firstOrNull { it.id == id }
    }

    fun resolveImageUrl(path: String?): String {
        if (path.isNullOrBlank()) return ""
        val trimmed = path.trim()
        if (
            trimmed.startsWith("http://", ignoreCase = true) ||
            trimmed.startsWith("https://", ignoreCase = true) ||
            trimmed.startsWith("data:", ignoreCase = true) ||
            trimmed.startsWith("content:", ignoreCase = true) ||
            trimmed.startsWith("file:", ignoreCase = true)
        ) {
            return trimmed
        }
        val base = BuildConfig.API_BASE_URL.trimEnd('/').removeSuffix("/api/v1")
        val relative = if (trimmed.startsWith("/")) trimmed else "/$trimmed"
        return "$base$relative"
    }

    private fun ProductDto.toDomain() = Product(
        id = id,
        code = code,
        name = name,
        brand = brand,
        category = category,
        price = price,
        stockBalance = stockBalance,
        unit = unit,
        imageUrl = imageUrl,
    )
}
