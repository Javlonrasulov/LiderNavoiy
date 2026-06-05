package uz.distributor.crm.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Message
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.activity.ComponentActivity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import uz.distributor.crm.data.repository.MessagesRealtimeCoordinator
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.theme.SherinColors
import javax.inject.Inject

@HiltViewModel
class NavUnreadViewModel @Inject constructor(
    realtime: MessagesRealtimeCoordinator,
) : ViewModel() {
    val messagesUnread: StateFlow<Int> = realtime.totalUnread

    init {
        realtime.start()
    }
}

enum class NavTab { HOME, DELIVERY, LOCATION, PLAN, MESSAGES }

val NavTab.route: String
    get() = when (this) {
        NavTab.HOME -> "main"
        NavTab.DELIVERY -> "clients"
        NavTab.LOCATION -> "location"
        NavTab.PLAN -> "plan"
        NavTab.MESSAGES -> "messages"
    }

@Composable
fun BottomNavBar(
    selected: NavTab?,
    onTabSelected: (NavTab) -> Unit,
    isDark: Boolean,
    modifier: Modifier = Modifier,
    unreadViewModel: NavUnreadViewModel = hiltViewModel(LocalContext.current as ComponentActivity),
) {
    val lang = LocalAppLanguage.current
    val messagesUnread by unreadViewModel.messagesUnread.collectAsState()
    val tabs = listOf(
        Triple(NavTab.HOME, Icons.Default.Home, AppStrings.navLabel(NavTab.HOME, lang)),
        Triple(NavTab.DELIVERY, Icons.Default.LocalShipping, AppStrings.navLabel(NavTab.DELIVERY, lang)),
        Triple(NavTab.LOCATION, Icons.Default.Map, AppStrings.navLabel(NavTab.LOCATION, lang)),
        Triple(NavTab.PLAN, Icons.Default.BarChart, AppStrings.navLabel(NavTab.PLAN, lang)),
        Triple(NavTab.MESSAGES, Icons.AutoMirrored.Filled.Message, AppStrings.navLabel(NavTab.MESSAGES, lang)),
    )

    Surface(
        modifier = modifier.fillMaxWidth(),
        color = if (isDark) SherinColors.NavBgDark else Color.White,
        shadowElevation = 12.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 2.dp, bottom = 14.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            tabs.forEach { (tab, icon, label) ->
                val active = selected != null && selected == tab
                val activeColor = SherinColors.Primary
                val inactiveColor = if (isDark) SherinColors.NavInactiveDark else SherinColors.NavInactiveLight

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .weight(1f)
                        .clickable(onClick = { onTabSelected(tab) })
                        .padding(vertical = 8.dp),
                ) {
                    Box(contentAlignment = Alignment.TopCenter) {
                        if (active) {
                            Box(
                                modifier = Modifier
                                    .offset(y = (-6).dp)
                                    .width(28.dp)
                                    .height(3.dp)
                                    .background(activeColor, shape = androidx.compose.foundation.shape.RoundedCornerShape(2.dp)),
                            )
                        }
                        Box(
                            modifier = Modifier.padding(top = 6.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (active) {
                                Box(
                                    modifier = Modifier
                                        .size(width = 40.dp, height = 32.dp)
                                        .background(
                                            SherinColors.Primary.copy(alpha = 0.10f),
                                            shape = androidx.compose.foundation.shape.RoundedCornerShape(10.dp),
                                        ),
                                )
                            }
                            Icon(
                                icon,
                                contentDescription = label,
                                tint = if (active) activeColor else inactiveColor,
                                modifier = Modifier.size(21.dp),
                            )
                            if (tab == NavTab.MESSAGES && messagesUnread > 0) {
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.TopEnd)
                                        .offset(x = 10.dp, y = (-6).dp)
                                        .defaultMinSize(minWidth = 18.dp, minHeight = 18.dp)
                                        .background(Color(0xFFEF4444), CircleShape)
                                        .padding(horizontal = 5.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        text = if (messagesUnread > 99) "99+" else messagesUnread.toString(),
                                        color = Color.White,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                    )
                                }
                            }
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        label,
                        fontSize = 10.sp,
                        color = if (active) activeColor else inactiveColor,
                        fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                    )
                }
            }
        }
    }
}
