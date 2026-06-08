package uz.lider.client.presentation.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import uz.lider.client.presentation.components.ClientTabScaffold
import uz.lider.client.presentation.components.clientCard
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.rememberClientPalette
import uz.lider.client.presentation.navigation.ClientRoutes

@Composable
fun ProfileScreen(
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val palette = rememberClientPalette()
    val scope = rememberCoroutineScope()
    val profile = state.profile
    val branches = listOf(
        BranchInfo("Asosiy filial", "Toshkent, Yunusobod, Amir Temur 108", "+998 71 123-45-67"),
        BranchInfo("Qo'shimcha filial", "Toshkent, Chilonzor, Bunyodkor 44", "+998 71 234-56-78"),
    )

    ClientTabScaffold(title = localized("prof_title"), bottomPadding = true) { padding ->
        if (state.loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = palette.primary)
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    Column(
                        Modifier
                            .clientCard(palette)
                            .padding(20.dp),
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            AsyncImage(
                                model = "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&h=120&fit=crop",
                                contentDescription = null,
                                modifier = Modifier.size(64.dp).clip(RoundedCornerShape(16.dp)),
                            )
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(profile?.fullName ?: profile?.name ?: "—", color = palette.text, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                    Box(Modifier.clip(RoundedCornerShape(12.dp)).background(palette.warning.copy(alpha = 0.15f)).padding(horizontal = 8.dp, vertical = 2.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.Star, null, tint = palette.warning, modifier = Modifier.size(12.dp))
                                            Text(" VIP Gold", color = palette.warning, fontSize = 11.sp)
                                        }
                                    }
                                }
                                Text(profile?.name ?: "", color = palette.textMuted, fontSize = 14.sp)
                            }
                        }
                        Spacer(Modifier.size(16.dp))
                        Row(Modifier.clip(RoundedCornerShape(16.dp)).background(palette.surface2).padding(12.dp)) {
                            StatCell("${profile?.orderCount ?: 0}", localized("nav_orders"), Modifier.weight(1f))
                            StatCell("4,850", "Bonus", Modifier.weight(1f))
                            StatCell("12%", localized("promo_discount_label"), Modifier.weight(1f))
                        }
                    }
                }
                item {
                    Column(Modifier.clientCard(palette).padding(16.dp)) {
                        Text(localized("prof_company"), color = palette.textMuted, fontSize = 12.sp)
                        InfoRow(Icons.Default.Business, localized("prof_company"), profile?.name ?: "—", palette.primary)
                        InfoRow(Icons.Default.Shield, localized("prof_tin"), profile?.code ?: "—", palette.secondary)
                        InfoRow(Icons.Default.Phone, localized("prof_phone"), profile?.phone ?: "+998 90 123-45-67", palette.accent)
                        InfoRow(Icons.Default.LocationOn, localized("prof_address"), "Toshkent, Yunusobod", palette.success)
                    }
                }
                item {
                    Column(Modifier.clientCard(palette).padding(16.dp)) {
                        Text(localized("prof_manager"), color = palette.textMuted, fontSize = 12.sp)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            AsyncImage(
                                model = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
                                contentDescription = null,
                                modifier = Modifier.size(48.dp).clip(RoundedCornerShape(16.dp)),
                            )
                            Column(Modifier.weight(1f)) {
                                Text(profile?.agentName ?: "Anora Yusupova", color = palette.text, fontWeight = FontWeight.SemiBold)
                                Text(localized("prof_sales_manager"), color = palette.textMuted, fontSize = 12.sp)
                            }
                            Icon(Icons.Default.Phone, null, tint = palette.secondary, modifier = Modifier.size(20.dp))
                            Icon(Icons.Default.Chat, null, tint = palette.primary, modifier = Modifier.size(20.dp).clickable { onNavigate(ClientRoutes.CHAT) })
                        }
                    }
                }
                item {
                    Column(Modifier.clientCard(palette).padding(16.dp)) {
                        Text(localized("prof_branches"), color = palette.textMuted, fontSize = 12.sp)
                        branches.forEach { branch ->
                            Column(Modifier.padding(vertical = 8.dp)) {
                                Text(branch.name, color = palette.text, fontWeight = FontWeight.SemiBold)
                                Text(branch.address, color = palette.textMuted, fontSize = 13.sp)
                                Text(branch.phone, color = palette.secondary, fontSize = 13.sp)
                            }
                        }
                    }
                }
                item {
                    MenuLink(Icons.Default.Notifications, localized("prof_notif_settings"), palette.warning) { onNavigate(ClientRoutes.NOTIFICATIONS) }
                    MenuLink(Icons.Default.Settings, localized("prof_app_settings"), palette.primary) { onNavigate(ClientRoutes.SETTINGS) }
                    MenuLink(Icons.Default.Help, localized("prof_help"), palette.secondary) { }
                }
                item {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(palette.danger.copy(alpha = 0.1f))
                            .clickable {
                                scope.launch {
                                    viewModel.logout()
                                    onLogout()
                                }
                            }
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Default.Logout, null, tint = palette.danger)
                        Text(" ${localized("prof_logout")}", color = palette.danger, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatCell(value: String, label: String, modifier: Modifier = Modifier) {
    val palette = rememberClientPalette()
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, color = palette.text, fontWeight = FontWeight.Bold)
        Text(label, color = palette.textMuted, fontSize = 11.sp)
    }
}

@Composable
private fun InfoRow(icon: ImageVector, label: String, value: String, color: Color) {
    val palette = rememberClientPalette()
    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(32.dp).clip(RoundedCornerShape(12.dp)).background(color.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = color, modifier = Modifier.size(16.dp))
        }
        Column {
            Text(label, color = palette.textMuted, fontSize = 11.sp)
            Text(value, color = palette.text, fontSize = 14.sp)
        }
    }
}

@Composable
private fun MenuLink(icon: ImageVector, label: String, color: Color, onClick: () -> Unit) {
    val palette = rememberClientPalette()
    Row(
        Modifier
            .fillMaxWidth()
            .clientCard(palette)
            .clickable(onClick = onClick)
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = color)
            Text(label, color = palette.text)
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = palette.textMuted)
    }
}
