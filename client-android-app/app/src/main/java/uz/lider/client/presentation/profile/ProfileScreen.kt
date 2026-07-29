package uz.lider.client.presentation.profile

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Help
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.launch
import uz.lider.client.domain.model.ContactPerson
import uz.lider.client.presentation.components.ClientPullToRefresh
import uz.lider.client.presentation.components.OrgSwitcherChips
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.navigation.ClientBottomNavHeight
import uz.lider.client.presentation.navigation.ClientRoutes
import uz.lider.client.presentation.theme.FixedHeroBackdrop
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassThemed

private const val HELP_TELEGRAM_URL = "https://t.me/javlon_abdurasulov_dev"
private const val ProfileHeroFadeScrollPx = 280f
private val ProfileHeroHeightFallback = 280.dp

@Composable
fun ProfileScreen(
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val density = LocalDensity.current
    val profile = state.profile
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    var showHelpDialog by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()
    var heroScrollPx by remember { mutableFloatStateOf(0f) }
    var heroHeightPx by remember { mutableFloatStateOf(0f) }
    var rootCoords by remember { mutableStateOf<androidx.compose.ui.layout.LayoutCoordinates?>(null) }
    val heroScrollConnection = remember {
        object : NestedScrollConnection {
            override fun onPostScroll(
                consumed: Offset,
                available: Offset,
                source: NestedScrollSource,
            ): Offset {
                heroScrollPx = (heroScrollPx - consumed.y).coerceAtLeast(0f)
                return Offset.Zero
            }
        }
    }
    LaunchedEffect(listState.firstVisibleItemIndex, listState.firstVisibleItemScrollOffset) {
        if (listState.firstVisibleItemIndex == 0 && listState.firstVisibleItemScrollOffset == 0) {
            heroScrollPx = 0f
        }
    }
    val fadeProgress = (heroScrollPx / ProfileHeroFadeScrollPx).coerceIn(0f, 1f)
    val heroHeight = if (heroHeightPx > 0f) {
        with(density) { heroHeightPx.toDp() }
    } else {
        ProfileHeroHeightFallback
    }

    if (showHelpDialog) {
        AlertDialog(
            onDismissRequest = { showHelpDialog = false },
            title = {
                Text(
                    localized("prof_help"),
                    color = text,
                    fontWeight = FontWeight.SemiBold,
                )
            },
            text = {
                Text(
                    localized("prof_help_modal_msg"),
                    color = textMuted,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showHelpDialog = false
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse(HELP_TELEGRAM_URL)),
                        )
                    },
                ) {
                    Text(
                        localized("prof_help_modal_contact"),
                        color = LiquidGlass.Indigo,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showHelpDialog = false }) {
                    Text(localized("com_cancel"), color = textMuted)
                }
            },
        )
    }

    LiquidBackground(modifier = Modifier.fillMaxSize()) {
        if (state.loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LiquidGlass.Indigo)
            }
            return@LiquidBackground
        }

        Box(
            Modifier
                .fillMaxSize()
                .nestedScroll(heroScrollConnection)
                .onGloballyPositioned { rootCoords = it },
        ) {
            // Same hero as Asosiy — FillWidth + TopCenter (no side pillar crop)
            FixedHeroBackdrop(
                fadeProgress = fadeProgress,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(heroHeight)
                    .align(Alignment.TopCenter),
            )

            ClientPullToRefresh(onRefresh = { viewModel.refresh() }) {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = ClientBottomNavHeight + 16.dp),
                    verticalArrangement = Arrangement.spacedBy(0.dp),
                ) {
                    // ── Hero (Asosiy uslubi) ─────────────────────────────────
                    item {
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .statusBarsPadding()
                                .padding(horizontal = 16.dp)
                                .padding(top = 14.dp, bottom = 20.dp),
                        ) {
                            Text(
                                localized("prof_title"),
                                color = Color.White.copy(alpha = 0.90f),
                                fontSize = 15.sp,
                                lineHeight = 22.sp,
                            )
                            Text(
                                profile?.fullName ?: profile?.name ?: "—",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 28.sp,
                                lineHeight = 34.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                            profile?.name
                                ?.takeIf { it.isNotBlank() && it != profile.fullName }
                                ?.let { company ->
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        company,
                                        color = Color.White.copy(alpha = 0.78f),
                                        fontSize = 14.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            profileCategoryStyle(profile?.category)?.let { categoryStyle ->
                                Spacer(Modifier.height(14.dp))
                                Box(
                                    Modifier
                                        .clip(RoundedCornerShape(50.dp))
                                        .background(categoryStyle.gradient)
                                        .padding(horizontal = 16.dp, vertical = 6.dp),
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(5.dp),
                                    ) {
                                        Icon(
                                            Icons.Default.Star,
                                            null,
                                            tint = Color.White,
                                            modifier = Modifier.size(13.dp),
                                        )
                                        Text(
                                            categoryStyle.label,
                                            color = Color.White,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // ── Stats — hero shu yerdan tugaydi ───────────────────────
                    item {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .onGloballyPositioned { cardCoords ->
                                    val root = rootCoords ?: return@onGloballyPositioned
                                    if (listState.firstVisibleItemIndex != 0 ||
                                        listState.firstVisibleItemScrollOffset > 2
                                    ) {
                                        return@onGloballyPositioned
                                    }
                                    val bottomInRoot = root.localPositionOf(
                                        cardCoords,
                                        Offset(0f, cardCoords.size.height.toFloat()),
                                    ).y
                                    val minPx = with(density) { 220.dp.toPx() }
                                    val next = bottomInRoot.coerceAtLeast(minPx)
                                    if (kotlin.math.abs(next - heroHeightPx) > 2f) {
                                        heroHeightPx = next
                                    }
                                },
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            GlassStatCard(
                                "${profile?.orderCount ?: 0}",
                                localized("nav_orders"),
                                Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Violet)),
                                Modifier.weight(1f),
                            )
                            GlassStatCard(
                                "${profile?.bonusPoints ?: 0}",
                                "Bonus",
                                Brush.linearGradient(listOf(LiquidGlass.Violet, LiquidGlass.Pink)),
                                Modifier.weight(1f),
                            )
                            GlassStatCard(
                                profile?.discountTitle() ?: "Standard",
                                localized("promo_discount_label"),
                                Brush.linearGradient(listOf(LiquidGlass.Cyan, LiquidGlass.Emerald)),
                                Modifier.weight(1f),
                            )
                        }
                    }

                    // ── Company info ──────────────────────────────────────────
                    item {
                        Column(
                            Modifier
                                .padding(horizontal = 16.dp)
                                .padding(top = 16.dp)
                                .fillMaxWidth()
                                .liquidGlassThemed()
                                .padding(16.dp),
                        ) {
                            Text(
                                localized("prof_company").uppercase(),
                                color = textMuted,
                                fontSize = 11.sp,
                                letterSpacing = 1.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(10.dp))
                            GlassInfoRow(
                                Icons.Default.Business,
                                localized("prof_company"),
                                profile?.name ?: "—",
                                Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Violet)),
                            )
                            GlassInfoRow(
                                Icons.Default.Shield,
                                localized("prof_tin"),
                                profile?.code ?: "—",
                                Brush.linearGradient(listOf(LiquidGlass.Violet, LiquidGlass.Cyan)),
                            )
                            GlassInfoRow(
                                Icons.Default.Phone,
                                localized("prof_phone"),
                                profile?.phone?.takeIf { it.isNotBlank() } ?: "—",
                                Brush.linearGradient(listOf(LiquidGlass.Cyan, LiquidGlass.Emerald)),
                            )
                            GlassInfoRow(
                                Icons.Default.LocationOn,
                                localized("prof_address"),
                                profile?.address?.takeIf { it.isNotBlank() } ?: "—",
                                Brush.linearGradient(listOf(LiquidGlass.Emerald, LiquidGlass.Amber)),
                            )
                        }
                    }

                    // ── Tashkilot tanlash (katalog/buyurtmalar kabi) ─────────
                    if (state.organizations.size >= 2) {
                        item {
                            OrgSwitcherChips(
                                organizations = state.organizations,
                                selectedCompanyId = state.selectedCompanyId,
                                onSelect = viewModel::selectOrganization,
                                modifier = Modifier
                                    .padding(horizontal = 16.dp)
                                    .padding(top = 16.dp),
                            )
                        }
                    }

                    // ── Manager card ──────────────────────────────────────────
                    if (!profile?.agentName.isNullOrBlank()) {
                        item {
                            ContactInfoCard(
                                title = localized("prof_manager"),
                                person = ContactPerson(
                                    userId = profile?.agentUserId,
                                    name = profile?.agentName.orEmpty(),
                                    position = profile?.agentPosition,
                                    phone = profile?.agentPhone,
                                ),
                                onCall = { phone ->
                                    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                                },
                                onChat = profile?.agentUserId?.let { userId ->
                                    {
                                        onNavigate(
                                            ClientRoutes.chat(
                                                userId = userId,
                                                name = profile?.agentName.orEmpty(),
                                                position = profile?.agentPosition.orEmpty(),
                                            ),
                                        )
                                    }
                                },
                            )
                        }
                    }

                    // ── Delivery card (only when order is loaded) ─────────────
                    profile?.deliveryPerson?.let { delivery ->
                        item {
                            ContactInfoCard(
                                title = localized("prof_delivery"),
                                person = delivery,
                                onCall = { phone ->
                                    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                                },
                                onChat = delivery.userId?.let { userId ->
                                    {
                                        onNavigate(
                                            ClientRoutes.chat(
                                                userId = userId,
                                                name = delivery.name,
                                                position = delivery.position.orEmpty(),
                                            ),
                                        )
                                    }
                                },
                            )
                        }
                    }

                    // ── Menu links ────────────────────────────────────────────
                    item {
                        Column(
                            Modifier
                                .padding(horizontal = 16.dp)
                                .padding(top = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            GlassMenuLink(
                                Icons.Default.Notifications,
                                localized("prof_notif_settings"),
                                Brush.linearGradient(listOf(LiquidGlass.Amber, LiquidGlass.Rose)),
                            ) { onNavigate(ClientRoutes.NOTIFICATIONS) }
                            GlassMenuLink(
                                Icons.Default.Settings,
                                localized("prof_app_settings"),
                                LiquidGlass.GradientPrimary,
                            ) { onNavigate(ClientRoutes.SETTINGS) }
                            GlassMenuLink(
                                Icons.Default.Help,
                                localized("prof_help"),
                                Brush.linearGradient(listOf(LiquidGlass.Cyan, LiquidGlass.Emerald)),
                            ) { showHelpDialog = true }
                        }
                    }

                    // ── Logout ────────────────────────────────────────────────
                    item {
                        Box(
                            Modifier
                                .padding(horizontal = 16.dp)
                                .padding(top = 12.dp, bottom = 8.dp)
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(LiquidGlass.RadiusCard))
                                .background(
                                    Brush.linearGradient(
                                        listOf(
                                            LiquidGlass.Rose.copy(alpha = 0.28f),
                                            Color(0xFFFB2D48).copy(alpha = 0.18f),
                                        ),
                                    ),
                                )
                                .border(
                                    1.dp,
                                    Brush.linearGradient(
                                        listOf(
                                            LiquidGlass.Rose.copy(alpha = 0.65f),
                                            LiquidGlass.Rose.copy(alpha = 0.20f),
                                        ),
                                    ),
                                    RoundedCornerShape(LiquidGlass.RadiusCard),
                                )
                                .clickable {
                                    scope.launch {
                                        viewModel.logout()
                                        onLogout()
                                    }
                                }
                                .padding(16.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Icon(Icons.Default.Logout, null, tint = LiquidGlass.Rose)
                                Text(
                                    localized("prof_logout"),
                                    color = LiquidGlass.Rose,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private data class ProfileCategoryStyle(
    val label: String,
    val gradient: Brush,
)

private fun profileCategoryStyle(category: String?): ProfileCategoryStyle? {
    val raw = category?.trim().orEmpty()
    if (raw.isEmpty()) return null
    return when (raw.lowercase()) {
        "standard" -> ProfileCategoryStyle(
            "Standard",
            Brush.linearGradient(listOf(Color(0xFF6366F1), Color(0xFF4F46E5))),
        )
        "vip" -> ProfileCategoryStyle(
            "VIP",
            Brush.linearGradient(listOf(Color(0xFF8B5CF6), Color(0xFF7C3AED))),
        )
        "premium" -> ProfileCategoryStyle(
            "Premium",
            Brush.linearGradient(listOf(Color(0xFFA78BFA), Color(0xFF8B5CF6))),
        )
        else -> ProfileCategoryStyle(
            raw,
            Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Violet)),
        )
    }
}

@Composable
private fun ContactInfoCard(
    title: String,
    person: ContactPerson,
    onCall: (String) -> Unit,
    onChat: (() -> Unit)? = null,
) {
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    val phone = person.phone?.takeIf { it.isNotBlank() }

    Column(
        Modifier
            .padding(horizontal = 16.dp)
            .padding(top = 12.dp)
            .fillMaxWidth()
            .liquidGlassThemed()
            .padding(16.dp),
    ) {
        Text(
            title.uppercase(),
            color = textMuted,
            fontSize = 11.sp,
            letterSpacing = 1.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(Modifier.height(12.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(Modifier.weight(1f)) {
                Text(person.name, color = text, fontWeight = FontWeight.SemiBold)
                person.position?.takeIf { it.isNotBlank() }?.let {
                    Text(it, color = textMuted, fontSize = 12.sp)
                }
                Text(
                    phone ?: "—",
                    color = if (phone != null) LiquidGlass.Cyan else textMuted,
                    fontSize = 13.sp,
                    fontWeight = if (phone != null) FontWeight.Medium else FontWeight.Normal,
                )
            }
            if (phone != null) {
                Box(
                    Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(listOf(LiquidGlass.Emerald, LiquidGlass.Cyan)),
                        )
                        .clickable { onCall(phone) },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Phone, null, tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }
            if (onChat != null) {
                Box(
                    Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(listOf(LiquidGlass.Indigo, LiquidGlass.Violet)),
                        )
                        .clickable(onClick = onChat),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Chat, null, tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

@Composable
private fun GlassStatCard(value: String, label: String, gradient: Brush, modifier: Modifier = Modifier) {
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    Column(
        modifier
            .liquidGlassThemed()
            .padding(vertical = 14.dp, horizontal = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            value,
            color = text,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
        )
        Spacer(Modifier.height(2.dp))
        Box(
            Modifier
                .height(2.dp)
                .width(24.dp)
                .clip(RoundedCornerShape(1.dp))
                .background(gradient),
        )
        Spacer(Modifier.height(4.dp))
        Text(label, color = textMuted, fontSize = 11.sp)
    }
}

@Composable
private fun GlassInfoRow(icon: ImageVector, label: String, value: String, gradient: Brush) {
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(34.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(gradient),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = Color.White, modifier = Modifier.size(16.dp))
        }
        Column {
            Text(label, color = textMuted, fontSize = 11.sp)
            Text(value, color = text, fontSize = 14.sp)
        }
    }
}

@Composable
private fun GlassMenuLink(icon: ImageVector, label: String, gradient: Brush, onClick: () -> Unit) {
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    Row(
        Modifier
            .fillMaxWidth()
            .liquidGlassThemed()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(gradient),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, null, tint = Color.White, modifier = Modifier.size(17.dp))
            }
            Text(label, color = text)
        }
        Icon(
            Icons.AutoMirrored.Filled.KeyboardArrowRight,
            null,
            tint = textMuted,
        )
    }
}
