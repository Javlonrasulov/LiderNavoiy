package uz.distributor.crm.data.repository

import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.PromotionDto
import uz.distributor.crm.domain.model.ProductPromotion
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PromotionsRepository @Inject constructor(
    private val api: ApiService,
) {
    /** Aktiv aksiyalarni yuklab, productId → ProductPromotion map sifatida qaytaradi.
     *  Bir mahsulotda bir nechta aksiya bo'lsa — birinchisini oladi (sortOrder bo'yicha). */
    suspend fun getProductPromotionMap(): Map<String, ProductPromotion> {
        return try {
            api.getActivePromotions()
                .filter { it.productId != null }
                .map { it.toDomain() }
                .associateBy { it.productId!! }
        } catch (_: Exception) {
            emptyMap()
        }
    }

    /** Productga bog'liq bo'lmagan (umumiy) aksiyalar */
    suspend fun getGeneralPromotions(): List<ProductPromotion> {
        return try {
            api.getActivePromotions()
                .filter { it.productId == null }
                .map { it.toDomain() }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun PromotionDto.toDomain() = ProductPromotion(
        id = id,
        title = title,
        subtitle = subtitle?.trim().orEmpty(),
        discountPercent = discountPercent,
        productId = productId,
        colorStart = colorStart?.takeIf { it.isNotBlank() } ?: "#6366F1",
        colorEnd = colorEnd?.takeIf { it.isNotBlank() } ?: "#9333EA",
        emoji = emoji?.takeIf { it.isNotBlank() } ?: "🎁",
    )
}
