package uz.distributor.crm.presentation.messages

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.activity.ComponentActivity
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavHostController
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uz.distributor.crm.push.IncomingMessageAlert
import uz.distributor.crm.push.IncomingMessageNotifier
import javax.inject.Inject

@HiltViewModel
class IncomingMessageBannerViewModel @Inject constructor(
    notifier: IncomingMessageNotifier,
) : ViewModel() {
    private val _alert = MutableStateFlow<IncomingMessageAlert?>(null)
    val alert: StateFlow<IncomingMessageAlert?> = _alert.asStateFlow()

    init {
        viewModelScope.launch {
            notifier.alerts.collect { incoming ->
                _alert.value = incoming
                delay(5000)
                if (_alert.value?.conversationId == incoming.conversationId) {
                    _alert.value = null
                }
            }
        }
    }

    fun dismiss() {
        _alert.value = null
    }
}

@Composable
fun IncomingMessageBannerOverlay(
    navController: NavHostController,
    modifier: Modifier = Modifier,
) {
    val activity = LocalContext.current as ComponentActivity
    val viewModel: IncomingMessageBannerViewModel = hiltViewModel(activity)
    val alert by viewModel.alert.collectAsState()
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val textPrimary = if (isDark) Color.White else Color.Black
    val textMuted = if (isDark) Color(0xFF708499) else Color(0xFF6B7280)
    val barBg = if (isDark) Color(0xFF1F2937) else Color.White

    // fillMaxSize ISHLATILMAYDI — aks holda butun ekranni yopib, listni "blok" qilib qo'yadi
    AnimatedVisibility(
        visible = alert != null,
        enter = slideInVertically { -it },
        exit = slideOutVertically { -it },
        modifier = modifier
            .fillMaxWidth()
            .wrapContentHeight()
            .statusBarsPadding()
            .padding(top = 8.dp, start = 12.dp, end = 12.dp),
    ) {
        alert?.let { item ->
            val avatarColor = avatarColorForId(item.conversationId)
            Row(
                Modifier
                    .fillMaxWidth()
                    .shadow(12.dp, RoundedCornerShape(16.dp))
                    .clip(RoundedCornerShape(16.dp))
                    .background(barBg)
                    .clickable {
                        viewModel.dismiss()
                        navController.navigate("chat/${item.conversationId}") {
                            launchSingleTop = true
                        }
                    }
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(avatarColor),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        initialsFromName(item.senderName),
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        item.senderName,
                        color = textPrimary,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        item.preview,
                        color = textMuted,
                        fontSize = 14.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                IconButton(onClick = { viewModel.dismiss() }) {
                    Icon(Icons.Default.Close, contentDescription = null, tint = textMuted)
                }
            }
        }
    }
}

