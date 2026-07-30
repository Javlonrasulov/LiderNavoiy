package uz.lider.client.data.repository

import uz.lider.client.data.local.SelectedOrgHolder
import uz.lider.client.data.remote.ApiService
import uz.lider.client.data.remote.dto.ClientDebtDto
import uz.lider.client.data.remote.dto.DebtHistoryItemDto
import uz.lider.client.data.remote.dto.DebtMonthlyPointDto
import uz.lider.client.presentation.debt.DebtPayment
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

data class ClientDebtData(
    val currentDebt: Double,
    val balance: Double,
    val creditLimit: Double?,
    val totalPaid: Double,
    val history: List<DebtPayment>,
    val monthlyDebt: List<Float>,
    val monthlyLabels: List<String>,
)

@Singleton
class DebtRepository @Inject constructor(
    private val api: ApiService,
    private val selectedOrgHolder: SelectedOrgHolder,
) {
    suspend fun getDebt(from: String? = null, to: String? = null): ClientDebtData? {
        return try {
            val companyId = selectedOrgHolder.getSelectedCompanyId()
            api.getDebt(companyId = companyId, from = from, to = to).toDomain()
        } catch (_: Exception) {
            null
        }
    }

    private fun ClientDebtDto.toDomain(): ClientDebtData {
        val points = monthlyDebt.ifEmpty { emptyList() }
        return ClientDebtData(
            currentDebt = currentDebt,
            balance = balance,
            creditLimit = creditLimit.takeIf { it > 0 },
            totalPaid = totalPaid,
            history = history.map { it.toPayment() },
            monthlyDebt = points.map { it.amount.toFloat() },
            monthlyLabels = points.map { monthShortLabel(it) },
        )
    }

    private fun DebtHistoryItemDto.toPayment(): DebtPayment {
        val isPayment = type.equals("payment", ignoreCase = true)
        return DebtPayment(
            id = id.orEmpty(),
            date = date,
            amount = formatAmount(amount),
            amountValue = amount,
            typeKey = if (isPayment) "debt_payment" else "debt_added",
            isPayment = isPayment,
            orderId = orderId,
            createdAtMs = PaymentPhotoAlertStore.parseCreatedAtMs(createdAt) ?: 0L,
        )
    }

    private fun formatAmount(value: Double): String {
        val symbols = DecimalFormatSymbols(Locale.US).apply {
            groupingSeparator = ','
            decimalSeparator = '.'
        }
        return DecimalFormat("#,##0", symbols).format(value)
    }

    private fun monthShortLabel(point: DebtMonthlyPointDto): String {
        val names = listOf("Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek")
        val idx = (point.month - 1).coerceIn(0, 11)
        return names[idx]
    }
}
