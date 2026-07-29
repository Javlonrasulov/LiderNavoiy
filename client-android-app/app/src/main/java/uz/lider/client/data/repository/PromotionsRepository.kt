package uz.lider.client.data.repository

import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.PromotionDto
import uz.lider.client.domain.model.Promotion
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PromotionsRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getPromotions(): List<Promotion> {
        return try {
            api.getPromotions().map { it.toDomain() }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun PromotionDto.toDomain() = Promotion(
        id = id,
        title = title,
        subtitle = subtitle?.trim().orEmpty(),
        discountPercent = discountPercent,
        productId = productId,
        productName = productName,
        colorStart = colorStart?.takeIf { it.isNotBlank() } ?: "#4F46E5",
        colorEnd = colorEnd?.takeIf { it.isNotBlank() } ?: "#9333EA",
        emoji = emoji?.takeIf { it.isNotBlank() } ?: "🎁",
        validFrom = validFrom,
        validTo = validTo,
    )
}
