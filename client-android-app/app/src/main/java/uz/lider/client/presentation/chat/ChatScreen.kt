package uz.lider.client.presentation.chat

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.components.rememberClientPalette

private data class ChatMessage(val text: String, val fromMe: Boolean, val time: String)

@Composable
fun ChatScreen(onBack: () -> Unit) {
    val lang = LocalAppLanguage.current
    val palette = rememberClientPalette()
    val messages = remember { mutableStateListOf<ChatMessage>() }
    var input by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val quickReplies = quickReplies(lang)

    LaunchedEffect(Unit) {
        messages.add(ChatMessage(greeting(lang), false, "10:00"))
    }

    ClientStackScaffold(title = localized("chat_personal_manager"), onBack = onBack) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(palette.surface2)
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                AsyncImage(
                    model = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
                    contentDescription = null,
                    modifier = Modifier.size(40.dp).clip(RoundedCornerShape(14.dp)),
                )
                Column {
                    Text("Anora Yusupova", color = palette.text, fontWeight = FontWeight.SemiBold)
                    Text(localized("chat_online"), color = palette.success, fontSize = 12.sp)
                }
            }
            LazyColumn(
                modifier = Modifier.weight(1f),
                state = listState,
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(messages) { msg ->
                    MessageBubble(msg, palette)
                }
            }
            LaunchedEffect(messages.size) {
                if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
            }
            Row(
                Modifier
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                quickReplies.forEach { reply ->
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(palette.primary.copy(alpha = 0.12f))
                            .clickableNoRipple {
                                messages.add(ChatMessage(reply, true, "10:05"))
                                messages.add(ChatMessage(autoReply(lang), false, "10:05"))
                            }
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                    ) {
                        Text(reply, color = palette.primary, fontSize = 12.sp)
                    }
                }
            }
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                BasicTextField(
                    value = input,
                    onValueChange = { input = it },
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .background(palette.surface2)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    textStyle = androidx.compose.ui.text.TextStyle(color = palette.text, fontSize = 14.sp),
                    decorationBox = { inner ->
                        if (input.isEmpty()) Text(localized("chat_placeholder"), color = palette.textMuted, fontSize = 14.sp)
                        inner()
                    },
                )
                Box(
                    Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(palette.primary)
                        .clickableNoRipple {
                            if (input.isBlank()) return@clickableNoRipple
                            val text = input.trim()
                            input = ""
                            messages.add(ChatMessage(text, true, "10:06"))
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.AutoMirrored.Filled.Send, null, tint = Color.White)
                }
            }
        }
    }
}

@Composable
private fun MessageBubble(msg: ChatMessage, palette: uz.lider.client.presentation.components.ClientPalette) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (msg.fromMe) Arrangement.End else Arrangement.Start) {
        Column(
            Modifier
                .clip(RoundedCornerShape(16.dp))
                .background(if (msg.fromMe) palette.primary else palette.surface2)
                .padding(horizontal = 14.dp, vertical = 10.dp)
                .fillMaxWidth(0.75f),
        ) {
            Text(msg.text, color = if (msg.fromMe) Color.White else palette.text, fontSize = 14.sp)
            Text(msg.time, color = if (msg.fromMe) Color.White.copy(alpha = 0.7f) else palette.textMuted, fontSize = 10.sp)
        }
    }
}

private fun greeting(lang: AppLanguage) = when (lang) {
    AppLanguage.RU -> "Здравствуйте! Чем могу помочь?"
    AppLanguage.EN -> "Hello! How can I help?"
    else -> "Assalomu alaykum! Qanday yordam bera olaman?"
}

private fun autoReply(lang: AppLanguage) = when (lang) {
    AppLanguage.RU -> "Спасибо! Менеджер скоро ответит."
    AppLanguage.EN -> "Thanks! Your manager will reply soon."
    else -> "Rahmat! Menejer tez orada javob beradi."
}

private fun quickReplies(lang: AppLanguage) = when (lang) {
    AppLanguage.RU -> listOf("Статус заказа", "Акции", "Оплата")
    AppLanguage.EN -> listOf("Order status", "Promotions", "Payment")
    else -> listOf("Buyurtma holati", "Aksiyalar", "To'lov")
}

private fun Modifier.clickableNoRipple(onClick: () -> Unit) =
    then(Modifier.clickable(onClick = onClick))
