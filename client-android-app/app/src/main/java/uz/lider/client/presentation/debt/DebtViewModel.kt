package uz.lider.client.presentation.debt

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import uz.lider.client.data.repository.AppSettingsRepository
import uz.lider.client.data.repository.DebtRepository
import uz.lider.client.data.repository.PaymentPhotoAlertStore
import uz.lider.client.data.repository.PaymentProofRepository
import uz.lider.client.data.repository.ProfileRepository
import uz.lider.client.localization.AppLanguage
import uz.lider.client.presentation.components.formatCompactMoney
import uz.lider.client.presentation.dashboard.DashboardDateFilter
import uz.lider.client.presentation.dashboard.DashboardDateRange
import uz.lider.client.presentation.dashboard.PaymentPhotoSectionUi
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

data class DebtPayment(
    val id: String = "",
    val date: String,
    val amount: String,
    val amountValue: Double = 0.0,
    val typeKey: String,
    val isPayment: Boolean,
    val orderId: String? = null,
    val photoUrl: String? = null,
    val createdAtMs: Long = 0L,
) {
    fun localDate(): LocalDate? = try {
        LocalDate.parse(date, debtDateFormatter)
    } catch (_: Exception) {
        null
    }

    companion object {
        private val debtDateFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }
}

data class DebtUiState(
    val loading: Boolean = true,
    val currentDebt: Double = 0.0,
    val creditLimit: Double? = null,
    val allPayments: List<DebtPayment> = emptyList(),
    val dateRange: DashboardDateRange = DashboardDateFilter.lastMonthRange(),
    val filteredPayments: List<DebtPayment> = emptyList(),
    val totalPaid: Double = 0.0,
    val chartValues: List<Float> = emptyList(),
    val chartLabels: List<String> = emptyList(),
    val chartValueLabels: List<String> = emptyList(),
    /** Kalendarda kun ostidagi qarz summasi (faqat qarz qo'shilgan kunlar). */
    val dayDebtAmounts: Map<LocalDate, Double> = emptyMap(),
)

@HiltViewModel
class DebtViewModel @Inject constructor(
    private val debtRepository: DebtRepository,
    private val profileRepository: ProfileRepository,
    private val appSettingsRepository: AppSettingsRepository,
    private val paymentPhotoAlertStore: PaymentPhotoAlertStore,
    private val paymentProofRepository: PaymentProofRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DebtUiState())
    val uiState: StateFlow<DebtUiState> = _uiState.asStateFlow()

    private var language: AppLanguage = AppLanguage.DEFAULT

    private val _photoUploading = MutableStateFlow(false)
    private val _photoError = MutableStateFlow<String?>(null)
    private val _photoPreview = MutableStateFlow<String?>(null)

    /**
     * Asosiyda X bosilsa ham — To‘lovlar tarixida 30 daqiqa qoladi.
     * Muddat tugagach clearIfExpired bilan o‘zi yo‘qoladi.
     */
    val paymentPhotoSection: StateFlow<PaymentPhotoSectionUi> = combine(
        paymentPhotoAlertStore.state,
        _photoUploading,
        _photoError,
        _photoPreview,
    ) { alert, uploading, error, preview ->
        PaymentPhotoSectionUi(
            visible = alert.isActive || uploading || !preview.isNullOrBlank(),
            orderId = alert.orderId,
            paymentId = alert.paymentId,
            amount = alert.amount,
            collectedAtMs = alert.collectedAtMs,
            uploading = uploading,
            error = error,
            previewUrl = preview,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), PaymentPhotoSectionUi())

    init {
        viewModelScope.launch {
            appSettingsRepository.language.collect { language = it }
        }
        viewModelScope.launch {
            while (isActive) {
                paymentPhotoAlertStore.clearIfExpired()
                delay(15_000)
            }
        }
        load()
    }

    fun uploadPaymentProof(uri: Uri) {
        viewModelScope.launch {
            _photoUploading.value = true
            _photoError.value = null
            val orderId = paymentPhotoSection.value.orderId
            val paymentId = paymentPhotoSection.value.paymentId
            val result = paymentProofRepository.captureAndAttach(uri, orderId, paymentId)
            _photoUploading.value = false
            result.fold(
                onSuccess = { url ->
                    _photoPreview.value = url
                    _photoError.value = null
                    reloadQuiet()
                    delay(1800)
                    _photoPreview.value = null
                },
                onFailure = { err ->
                    _photoError.value = uz.lider.client.data.remote.ApiErrorMapper.detailMessage(err)
                },
            )
        }
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true) }
            reloadQuiet()
            _uiState.update { it.copy(loading = false) }
        }
    }

    suspend fun refresh() {
        paymentPhotoAlertStore.clearIfExpired()
        reloadQuiet()
    }

    private suspend fun reloadQuiet() {
        val range = _uiState.value.dateRange
        // To'liq tarix — kalendar markerlari + lokal filtr uchun
        val debt = debtRepository.getDebt()

        if (debt != null) {
            val dayAmounts = buildDayDebtAmounts(debt.history)
            val filtered = filterPayments(debt.history, range)
            val chart = buildDailyChart(filtered, range)
            _uiState.update { state ->
                state.copy(
                    currentDebt = debt.currentDebt,
                    creditLimit = debt.creditLimit,
                    allPayments = debt.history,
                    filteredPayments = filtered,
                    totalPaid = filtered.filter { it.isPayment }.sumOf { it.amountValue },
                    chartValues = chart.values,
                    chartLabels = chart.labels,
                    chartValueLabels = chart.valueLabels,
                    dayDebtAmounts = dayAmounts,
                )
            }
            return
        }

        val profile = profileRepository.getProfile()
        val currentDebt = profile?.debt?.takeIf { it > 0 }
            ?: profile?.balance?.let { bal -> if (bal < 0) kotlin.math.abs(bal) else 0.0 }
            ?: 0.0
        _uiState.update { state ->
            state.copy(
                currentDebt = currentDebt,
                creditLimit = null,
                allPayments = emptyList(),
                filteredPayments = emptyList(),
                totalPaid = 0.0,
                chartValues = listOf(currentDebt.toFloat(), currentDebt.toFloat()),
                chartLabels = emptyList(),
                chartValueLabels = listOf(
                    formatCompactMoney(currentDebt, language),
                    formatCompactMoney(currentDebt, language),
                ),
                dayDebtAmounts = emptyMap(),
            )
        }
    }

    fun setDateRange(startMillis: Long, endMillis: Long) {
        val start = DashboardDateFilter.fromMillis(startMillis)
        val end = DashboardDateFilter.fromMillis(endMillis)
        applyRange(
            DashboardDateRange(
                start = minOf(start, end),
                end = maxOf(start, end),
                isCustom = true,
            ),
        )
    }

    fun resetToLastMonth() {
        applyRange(DashboardDateFilter.lastMonthRange())
    }

    fun selectAll() {
        val all = _uiState.value.allPayments
        val dates = all.mapNotNull { it.localDate() }
        val range = if (dates.isEmpty()) {
            DashboardDateFilter.lastMonthRange()
        } else {
            DashboardDateRange(
                start = dates.minOrNull()!!,
                end = dates.maxOrNull()!!.coerceAtMost(LocalDate.now()),
                isCustom = true,
            )
        }
        applyRange(range)
    }

    private fun applyRange(range: DashboardDateRange) {
        val all = _uiState.value.allPayments
        if (all.isNotEmpty()) {
            val filtered = filterPayments(all, range)
            val chart = buildDailyChart(filtered, range)
            _uiState.update { state ->
                state.copy(
                    dateRange = range,
                    filteredPayments = filtered,
                    totalPaid = filtered.filter { it.isPayment }.sumOf { it.amountValue },
                    chartValues = chart.values,
                    chartLabels = chart.labels,
                    chartValueLabels = chart.valueLabels,
                )
            }
        } else {
            _uiState.update { it.copy(dateRange = range, loading = true) }
            viewModelScope.launch {
                reloadQuiet()
                _uiState.update { it.copy(loading = false) }
            }
        }
    }

    private fun filterPayments(payments: List<DebtPayment>, range: DashboardDateRange): List<DebtPayment> =
        payments.filter { payment ->
            val date = payment.localDate() ?: return@filter false
            !date.isBefore(range.start) && !date.isAfter(range.end)
        }

    private fun buildDayDebtAmounts(payments: List<DebtPayment>): Map<LocalDate, Double> {
        val map = mutableMapOf<LocalDate, Double>()
        for (payment in payments) {
            if (payment.isPayment) continue
            val date = payment.localDate() ?: continue
            map[date] = (map[date] ?: 0.0) + payment.amountValue
        }
        return map
    }

    private data class ChartSeries(
        val values: List<Float>,
        val labels: List<String>,
        val valueLabels: List<String>,
    )

    /** Tanlangan davrdagi kunlik qarz (qo'shilgan) dinamikasi. */
    private fun buildDailyChart(payments: List<DebtPayment>, range: DashboardDateRange): ChartSeries {
        val dayFmt = DateTimeFormatter.ofPattern("dd.MM")
        val totalDays = ChronoUnit.DAYS.between(range.start, range.end).toInt() + 1
        val debtByDay = payments
            .filter { !it.isPayment }
            .groupBy { it.localDate() }
            .mapNotNull { (d, list) -> d?.let { it to list.sumOf { p -> p.amountValue } } }
            .toMap()

        if (totalDays <= 1) {
            val amount = debtByDay[range.start] ?: 0.0
            val label = range.start.format(dayFmt)
            val compact = formatCompactMoney(amount, language)
            return ChartSeries(
                values = listOf(amount.toFloat(), amount.toFloat()),
                labels = listOf(label, label),
                valueLabels = listOf(compact, compact),
            )
        }

        // Ko'p kun bo'lsa — 6–8 nuqtaga guruhlash
        val pointCount = when {
            totalDays <= 7 -> totalDays
            totalDays <= 31 -> minOf(totalDays, 7)
            else -> 6
        }

        val values = mutableListOf<Float>()
        val labels = mutableListOf<String>()
        val valueLabels = mutableListOf<String>()

        for (i in 0 until pointCount) {
            val bucketStart = range.start.plusDays((i.toLong() * totalDays) / pointCount)
            val bucketEnd = if (i == pointCount - 1) {
                range.end
            } else {
                range.start.plusDays(((i + 1).toLong() * totalDays) / pointCount - 1)
            }
            var sum = 0.0
            var d = bucketStart
            while (!d.isAfter(bucketEnd)) {
                sum += debtByDay[d] ?: 0.0
                d = d.plusDays(1)
            }
            values += sum.toFloat()
            labels += if (bucketStart == bucketEnd) {
                bucketStart.format(dayFmt)
            } else {
                bucketStart.format(dayFmt)
            }
            valueLabels += formatCompactMoney(sum, language)
        }

        return if (values.size == 1) {
            ChartSeries(
                values = listOf(values[0], values[0]),
                labels = listOf(labels[0], labels[0]),
                valueLabels = listOf(valueLabels[0], valueLabels[0]),
            )
        } else {
            ChartSeries(values, labels, valueLabels)
        }
    }
}
