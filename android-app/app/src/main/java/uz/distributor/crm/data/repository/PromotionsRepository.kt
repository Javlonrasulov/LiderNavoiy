package uz.distributor.crm.data.repository

import uz.distributor.crm.data.remote.ApiService
import uz.distributor.crm.data.remote.dto.PromotionDto
import uz.distributor.crm.domain.model.ProductPromotion
import uz.distributor.crm.domain.model.PromotionCondition
import uz.distributor.crm.domain.model.PromotionReward
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PromotionsRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getActivePromotions(): List<ProductPromotion> {
        return try {
            api.getActivePromotions().map { it.toDomain() }
        } catch (_: Exception) {
            emptyList()
        }
    }

    suspend fun getProductPromotionMap(): Map<String, ProductPromotion> {
        val map = LinkedHashMap<String, ProductPromotion>()
        for (promo in getActivePromotions()) {
            for (pid in promo.conditionProductIds()) {
                if (!map.containsKey(pid)) map[pid] = promo
            }
        }
        return map
    }

    suspend fun getGeneralPromotions(): List<ProductPromotion> {
        return getActivePromotions().filter { it.resolvedConditions().isEmpty() && !it.hasReward() }
    }

    private fun PromotionDto.toDomain(): ProductPromotion {
        val conds = conditions.orEmpty().mapNotNull { c ->
            if (c.productId.isBlank() || c.buyQuantity <= 0) null
            else PromotionCondition(
                productId = c.productId,
                productName = c.productName.orEmpty(),
                buyQuantity = c.buyQuantity,
            )
        }
        val rewardList = rewards.orEmpty().mapNotNull { r ->
            if (r.productId.isBlank() || r.quantity <= 0) null
            else PromotionReward(
                productId = r.productId,
                productName = r.productName.orEmpty(),
                quantity = r.quantity,
                price = r.price,
            )
        }
        val rewardQty = rewardQuantity ?: freeQuantity ?: 0.0
        return ProductPromotion(
            id = id,
            title = title,
            subtitle = subtitle?.trim().orEmpty(),
            discountPercent = discountPercent,
            productId = productId,
            buyQuantity = buyQuantity ?: 0.0,
            conditions = conds,
            rewards = rewardList,
            rewardProductId = rewardProductId ?: productId,
            rewardProductName = rewardProductName?.trim().orEmpty()
                .ifBlank { productName?.trim().orEmpty() },
            rewardQuantity = rewardQty,
            rewardPrice = rewardPrice ?: 0.0,
            colorStart = colorStart?.takeIf { it.isNotBlank() } ?: "#6366F1",
            colorEnd = colorEnd?.takeIf { it.isNotBlank() } ?: "#9333EA",
            emoji = emoji?.takeIf { it.isNotBlank() } ?: "🎁",
        )
    }
}
