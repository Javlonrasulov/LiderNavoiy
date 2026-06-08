package uz.lider.client.presentation.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.components.ClientStackScaffold
import uz.lider.client.presentation.components.localized
import uz.lider.client.presentation.theme.LiquidBackground
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme
import uz.lider.client.presentation.theme.liquidGlassThemed

private data class ChatMessage(val text: String, val fromMe: Boolean, val time: String)

@Composable
fun ChatScreen(onBack: () -> Unit) {
    val lang = LocalAppLanguage.current
    val messages = remember { mutableStateListOf<ChatMessage>() }
    var input by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val quickReplies = quickReplies(lang)
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted

    LaunchedEffect(Unit) {
        messages.add(ChatMessage(greeting(lang), false, "10:00"))
    }

    ClientStackScaffold(title = localized("chat_personal_manager"), onBack = onBack) { padding ->
        LiquidBackground(modifier = Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize().padding(padding)) {
                // ── Manager header bar ────────────────────────────────────────
                Row(
                    Modifier
                        .fillMaxWidth()
                        .liquidGlassThemed(radius = 0.dp)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(
                        Modifier
                            .size(46.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    listOf(LiquidGlass.Violet, LiquidGlass.Pink),
                                )
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        AsyncImage(
                            model = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
                            contentDescription = null,
                            modifier = Modifier.size(42.dp).clip(CircleShape),
                        )
                    }
                    Column(Modifier.weight(1f)) {
                        Text(
                            "Anora Yusupova",
                            color = text,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(5.dp),
                        ) {
                            Box(
                                Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(LiquidGlass.Emerald),
                            )
                            Text(
                                localized("chat_online"),
                                color = LiquidGlass.Emerald,
                                fontSize = 12.sp,
                            )
                        }
                    }
                }

                // ── Message list ──────────────────────────────────────────────
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    state = listState,
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(messages) { msg ->
                        MessageBubble(msg)
                    }
                }

                LaunchedEffect(messages.size) {
                    if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
                }

                // ── Quick reply chips ─────────────────────────────────────────
                Row(
                    Modifier
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    quickReplies.forEach { reply ->
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(50.dp))
                                .background(Color.White.copy(alpha = 0.12f))
                                .border(
                                    1.dp,
                                    Brush.linearGradient(
                                        listOf(
                                            Color.White.copy(alpha = 0.35f),
                                            Color.White.copy(alpha = 0.10f),
                                        )
                                    ),
                                    RoundedCornerShape(50.dp),
                                )
                                .clickableNoRipple {
                                    messages.add(ChatMessage(reply, true, "10:05"))
                                    messages.add(ChatMessage(autoReply(lang), false, "10:05"))
                                }
                                .padding(horizontal = 14.dp, vertical = 7.dp),
                        ) {
                            Text(reply, color = text, fontSize = 12.sp)
                        }
                    }
                }

                // ── Input bar (glass pill) ────────────────────────────────────
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .liquidGlassThemed(radius = 50.dp)
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    BasicTextField(
                        value = input,
                        onValueChange = { input = it },
                        modifier = Modifier.weight(1f),
                        textStyle = TextStyle(
                            color = text,
                            fontSize = 14.sp,
                        ),
                        decorationBox = { inner ->
                            if (input.isEmpty()) {
                                Text(
                                    localized("chat_placeholder"),
                                    color = textMuted,
                                    fontSize = 14.sp,
                                )
                            }
                            inner()
                        },
                    )
                    Box(
                        Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    listOf(LiquidGlass.Indigo, LiquidGlass.Violet),
                                )
                            )
                            .clickableNoRipple {
                                if (input.isBlank()) return@clickableNoRipple
                                val textVal = input.trim()
                                input = ""
                                messages.add(ChatMessage(textVal, true, "10:06"))
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.Send,
                            null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MessageBubble(msg: ChatMessage) {
    val text = LiquidTheme.text
    val textMuted = LiquidTheme.textMuted
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = if (msg.fromMe) Arrangement.End else Arrangement.Start,
    ) {
        if (msg.fromMe) {
            Box(
                Modifier
                    .fillMaxWidth(0.75f)
                    .clip(
                        RoundedCornerShape(
                            topStart = 18.dp,
                            topEnd = 18.dp,
                            bottomStart = 18.dp,
                            bottomEnd = 4.dp,
                        )
                    )
                    .background(
                        Brush.linearGradient(
                            listOf(LiquidGlass.Indigo, LiquidGlass.Violet),
                        )
                    )
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Column {
                    Text(msg.text, color = Color.White, fontSize = 14.sp)
                    Text(
                        msg.time,
                        color = Color.White.copy(alpha = 0.65f),
                        fontSize = 10.sp,
                    )
                }
            }
        } else {
            Box(
                Modifier
                    .fillMaxWidth(0.75f)
                    .liquidGlassThemed()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Column {
                    Text(msg.text, color = text, fontSize = 14.sp)
                    Text(
                        msg.time,
                        color = textMuted,
                        fontSize = 10.sp,
                    )
                }
            }
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
