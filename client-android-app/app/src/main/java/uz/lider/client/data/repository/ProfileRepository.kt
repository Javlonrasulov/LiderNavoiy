package uz.lider.client.data.repository

import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import uz.lider.client.data.local.SelectedOrgHolder
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.ClientDashboardDto
import uz.lider.client.data.remote.dto.ClientOrganizationDto
import uz.lider.client.data.remote.dto.ClientProfileDto
import uz.lider.client.data.remote.dto.ContactPersonDto
import uz.lider.client.data.remote.dto.OrgPurchaseShareDto
import uz.lider.client.domain.model.ClientOrder
import uz.lider.client.domain.model.ClientOrganization
import uz.lider.client.domain.model.ClientProfile
import uz.lider.client.domain.model.ContactPerson
import uz.lider.client.domain.model.DashboardData
import uz.lider.client.domain.model.OrderStatus
import uz.lider.client.domain.model.OrgPurchaseShare
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.abs
import kotlin.math.floor

@Singleton
class ProfileRepository @Inject constructor(
    private val api: ApiService,
    private val orderRepository: OrderRepository,
    private val selectedOrgHolder: SelectedOrgHolder,
) {
    suspend fun getProfile(): ClientProfile? {
        return try {
            api.getProfile().toDomain().also { rememberOrgs(it.organizations) }
        } catch (_: Exception) {
            null
        }
    }

    suspend fun getAllOrders() = orderRepository.getOrders(companyId = null)

    /** Faqat `/client-portal/dashboard` — null agar xato. */
    suspend fun fetchDashboardSummary(): DashboardData? =
        runCatching {
            api.getClientDashboard().toDomain().also { rememberOrgs(it.organizations) }
        }.getOrNull()

    suspend fun getDashboardData(): DashboardData {
        fetchDashboardSummary()?.let { return it }
        return coroutineScope {
            val profileDeferred = async { getProfile() }
            val ordersDeferred = async { getAllOrders() }
            buildDashboardFromProfileOrders(profileDeferred.await(), ordersDeferred.await())
        }
    }

    fun buildDashboardFromProfileOrders(
        profile: ClientProfile?,
        orders: List<ClientOrder>,
    ): DashboardData {
        val effective = profile ?: ClientProfile(
            id = "",
            code = "",
            name = "",
            balance = 0.0,
            totalPurchases = 0.0,
            orderCount = orders.size,
        )
        val purchases = profile?.totalPurchases
            ?: orders.filter { OrderStatus.fromKey(it.status) != OrderStatus.CANCELLED }
                .sumOf { it.totalAmount }
        val balance = profile?.balance ?: 0.0
        val debt = profile?.debt?.takeIf { it > 0 }
            ?: if (balance < 0) abs(balance) else 0.0
        val bonus = profile?.bonusPoints?.takeIf { it > 0 }
            ?: floor(purchases / 1000.0).toInt().coerceAtLeast(0)
        val active = orders.count {
            val s = OrderStatus.fromKey(it.status)
            s != OrderStatus.DELIVERED && s != OrderStatus.CANCELLED
        }
        return DashboardData(
            profile = effective,
            recentOrders = orders.take(5),
            totalPurchases = purchases,
            orderCount = profile?.orderCount ?: orders.size,
            balance = balance,
            debt = debt,
            bonusPoints = bonus,
            activeOrderCount = active,
            discountLevel = effective.discountTitle(),
            discountSubtitle = effective.discountSubtitle(),
            organizations = effective.organizations,
            purchasesByOrg = purchasesByOrgFromOrders(orders),
        )
    }

    private fun rememberOrgs(orgs: List<ClientOrganization>) {
        if (orgs.isNotEmpty()) selectedOrgHolder.setOrganizations(orgs)
    }

    private fun purchasesByOrgFromOrders(orders: List<ClientOrder>): List<OrgPurchaseShare> {
        return orders
            .filter { OrderStatus.fromKey(it.status) != OrderStatus.CANCELLED }
            .groupBy { it.companyId.orEmpty() }
            .filterKeys { it.isNotEmpty() }
            .map { (companyId, list) ->
                OrgPurchaseShare(
                    companyId = companyId,
                    shortName = list.firstOrNull()?.companyShortName
                        ?: list.firstOrNull()?.companyName
                        ?: companyId,
                    name = list.firstOrNull()?.companyName.orEmpty(),
                    total = list.sumOf { it.totalAmount },
                )
            }
    }

    private fun ClientDashboardDto.toDomain(): DashboardData {
        val orgs = organizations.map { it.toDomain() }
        val profile = this.profile?.toDomain()
            ?: ClientProfile(
                id = "",
                code = "",
                name = "",
                balance = balance,
                totalPurchases = totalPurchases,
                orderCount = orderCount,
                debt = debt,
                bonusPoints = bonusPoints,
                category = discountLevel,
                organizations = orgs,
            )
        return DashboardData(
            profile = profile,
            recentOrders = emptyList(),
            totalPurchases = totalPurchases.takeIf { it > 0 } ?: profile.totalPurchases,
            orderCount = orderCount.takeIf { it > 0 } ?: profile.orderCount,
            balance = balance,
            debt = debt.takeIf { it > 0 } ?: profile.debt,
            bonusPoints = bonusPoints.takeIf { it > 0 } ?: profile.bonusPoints,
            activeOrderCount = activeOrders,
            discountLevel = discountLevel?.trim()?.takeIf { it.isNotEmpty() }
                ?: profile.discountTitle(),
            discountSubtitle = discountSubtitle?.trim()?.takeIf { it.isNotEmpty() }
                ?: profile.discountSubtitle(),
            organizations = orgs.ifEmpty { profile.organizations },
            purchasesByOrg = purchasesByOrg.map { it.toDomain() },
        )
    }

    private fun ContactPersonDto.toDomain(): ContactPerson? {
        val personName = name?.trim().orEmpty()
        if (personName.isEmpty()) return null
        return ContactPerson(
            userId = userId?.trim(),
            name = personName,
            position = position?.trim(),
            phone = phone?.trim(),
        )
    }

    private fun ClientOrganizationDto.toDomain() = ClientOrganization(
        companyId = companyId,
        name = name,
        shortName = shortName?.trim()?.takeIf { it.isNotEmpty() } ?: name,
        color = color,
        icon = icon,
        clientId = clientId,
    )

    private fun OrgPurchaseShareDto.toDomain() = OrgPurchaseShare(
        companyId = companyId,
        shortName = shortName?.trim()?.takeIf { it.isNotEmpty() }
            ?: name?.trim()?.takeIf { it.isNotEmpty() }
            ?: companyId,
        name = name.orEmpty(),
        color = color,
        total = total,
    )

    private fun ClientProfileDto.toDomain(): ClientProfile {
        val purchases = totalPurchases
        val bal = balance
        val orgs = organizations.map { it.toDomain() }
        return ClientProfile(
            id = id,
            code = code,
            name = name,
            fullName = fullName,
            phone = phone,
            address = address,
            territory = territory,
            latitude = latitude,
            longitude = longitude,
            category = category,
            clientClass = clientClass,
            priceCategory = priceCategory,
            balance = bal,
            debt = debt?.takeIf { it > 0 } ?: if (bal < 0) abs(bal) else 0.0,
            totalPurchases = purchases,
            bonusPoints = bonusPoints?.takeIf { it >= 0 }
                ?: floor(purchases / 1000.0).toInt().coerceAtLeast(0),
            orderCount = orderCount,
            agentName = agentName,
            agentPosition = agentPosition,
            agentPhone = agentPhone,
            agentUserId = agentUserId,
            hasAssignedAgent = hasAssignedAgent,
            deliveryPerson = deliveryPerson?.toDomain(),
            organizations = orgs,
            activeOrganization = activeOrganization?.toDomain(),
        )
    }
}
