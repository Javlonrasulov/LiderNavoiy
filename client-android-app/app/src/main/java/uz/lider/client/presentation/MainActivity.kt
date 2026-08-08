package uz.lider.client.presentation

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import uz.lider.client.data.repository.AppSettingsRepository
import uz.lider.client.data.repository.AuthRepository
import uz.lider.client.data.repository.PaymentPhotoAlertStore
import uz.lider.client.data.repository.PushRepository
import uz.lider.client.data.repository.ThemeMode
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.navigation.ClientNavHost
import uz.lider.client.presentation.theme.ClientTheme
import uz.lider.client.presentation.theme.LocalTextTone
import uz.lider.client.presentation.theme.TextTone
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var appSettingsRepository: AppSettingsRepository

    @Inject
    lateinit var authRepository: AuthRepository

    @Inject
    lateinit var pushRepository: PushRepository

    @Inject
    lateinit var paymentPhotoAlertStore: PaymentPhotoAlertStore

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) registerFcmIfLoggedIn()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        requestNotificationPermission()
        handlePushIntent(intent)
        // Ilova ochiq turganda tokenni oldindan yangilab turish (JWT ~4 soat)
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                while (true) {
                    runCatching {
                        withTimeout(20_000) {
                            val outcome = authRepository.ensureFreshAccessToken()
                            Log.d(TAG, "ensureFresh=$outcome")
                        }
                    }
                    // Access muddatidan ancha oldin — 4 soatlik JWT uchun ~1 soatda bir
                    kotlinx.coroutines.delay(50L * 60L * 1000L)
                }
            }
        }
        setContent {
            val themeMode by appSettingsRepository.themeMode.collectAsState(initial = ThemeMode.DARK)
            val language  by appSettingsRepository.language.collectAsState(initial = AppLanguage.DEFAULT)
            val textTone by appSettingsRepository.textTone.collectAsState(initial = TextTone.DEFAULT)
            val isSystemDark = isSystemInDarkTheme()
            val isDark = appSettingsRepository.resolvedDark(themeMode, isSystemDark)

            ClientTheme(darkTheme = isDark) {
                CompositionLocalProvider(
                    LocalAppLanguage provides language,
                    LocalTextTone provides textTone,
                ) {
                    ClientNavHost()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handlePushIntent(intent)
    }

    private fun handlePushIntent(intent: Intent?) {
        if (intent == null) return
        val extras = intent.extras
        val type = firstExtra(
            extras,
            PaymentPhotoAlertStore.EXTRA_TYPE,
            "type",
            "gcm.notification.type",
        )
        val orderId = firstExtra(
            extras,
            PaymentPhotoAlertStore.EXTRA_ORDER_ID,
            "orderId",
            "order_id",
        )
        val paymentId = firstExtra(
            extras,
            PaymentPhotoAlertStore.EXTRA_PAYMENT_ID,
            "paymentId",
            "payment_id",
        )
        val title = firstExtra(extras, "title", "gcm.notification.title").orEmpty()
        val body = firstExtra(extras, "body", "gcm.notification.body").orEmpty()
        val amount = PaymentPhotoAlertStore.parseAmount(
            firstExtra(extras, PaymentPhotoAlertStore.EXTRA_AMOUNT, "amount"),
        )
        val collectedAtRaw = firstExtra(
            extras,
            PaymentPhotoAlertStore.EXTRA_COLLECTED_AT,
            "collectedAt",
            "collected_at",
        )
        val collectedAtMs = PaymentPhotoAlertStore.parseCreatedAtMs(collectedAtRaw)
            ?: collectedAtRaw?.toLongOrNull()?.takeIf { it > 1_000_000_000_000L }
            ?: System.currentTimeMillis()

        val isPayment = PaymentPhotoAlertStore.isPaymentPushExtras(
            type, title, body, orderId, paymentId,
        )
        Log.d(
            TAG,
            "pushIntent action=${intent.action} type=$type orderId=$orderId " +
                "paymentId=$paymentId isPayment=$isPayment title=$title amount=$amount",
        )

        if (isPayment) {
            lifecycleScope.launch {
                paymentPhotoAlertStore.recordPaymentReceived(
                    orderId = orderId,
                    paymentId = paymentId,
                    amount = amount,
                    collectedAtMs = collectedAtMs,
                )
            }
        }
    }

    private fun firstExtra(extras: Bundle?, vararg keys: String): String? {
        if (extras == null) return null
        for (key in keys) {
            val v = extras.getString(key)?.trim()
            if (!v.isNullOrBlank()) return v
        }
        for (key in keys) {
            val v = extras.get(key)?.toString()?.trim()
            if (!v.isNullOrBlank() && v != "null") return v
        }
        return null
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            registerFcmIfLoggedIn()
            return
        }
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED -> registerFcmIfLoggedIn()
            else -> notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun registerFcmIfLoggedIn() {
        lifecycleScope.launch {
            val ok = runCatching {
                withTimeout(8_000) { authRepository.restoreSession() }
            }.getOrDefault(false)
            if (ok) {
                runCatching { pushRepository.registerCurrentToken() }
            }
        }
    }

    companion object {
        private const val TAG = "PayPhotoPush"
    }
}
