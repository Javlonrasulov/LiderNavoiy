package uz.lider.client.presentation.components

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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.lider.client.presentation.navigation.ClientBottomNavHeight
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme

private val topBarBorder = LiquidGlass.GlassDarkBorder

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientTabScaffold(
    title: String? = null,
    titleContent: (@Composable () -> Unit)? = null,
    bottomPadding: Boolean = true,
    actions: @Composable () -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        containerColor = Color.Transparent,
        topBar = {
            TopAppBar(
                modifier = Modifier.drawBehind {
                    drawLine(
                        color = topBarBorder,
                        start = Offset(0f, size.height),
                        end = Offset(size.width, size.height),
                        strokeWidth = 1f,
                    )
                },
                title = {
                    when {
                        titleContent != null -> titleContent()
                        title != null -> Text(
                            title,
                            fontWeight = FontWeight.Bold,
                            color = LiquidTheme.text,
                        )
                    }
                },
                actions = { actions() },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = LiquidTheme.bgMid.copy(alpha = 0.55f),
                    titleContentColor = LiquidTheme.text,
                    actionIconContentColor = LiquidTheme.textMuted,
                    navigationIconContentColor = LiquidTheme.textMuted,
                ),
            )
        },
        bottomBar = {
            if (bottomPadding) Spacer(Modifier.height(ClientBottomNavHeight))
        },
    ) { padding -> content(padding) }
}

@Composable
fun ClientStackScaffold(
    title: String,
    onBack: () -> Unit,
    actions: @Composable () -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        containerColor = Color.Transparent,
        topBar = {
            Column(
                Modifier
                    .fillMaxWidth()
                    .drawBehind {
                        drawLine(
                            color = topBarBorder.copy(alpha = 0.35f),
                            start = Offset(0f, size.height),
                            end = Offset(size.width, size.height),
                            strokeWidth = 1f,
                        )
                    }
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            ) {
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    ClientBackButton(onBack = onBack)
                    Text(
                        title,
                        color = LiquidTheme.text,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        lineHeight = 22.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    actions()
                }
            }
        },
    ) { padding -> content(padding) }
}

@Composable
fun ClientScreenBox(padding: PaddingValues, content: @Composable () -> Unit) {
    Box(
        Modifier
            .fillMaxSize()
            .padding(padding),
    ) {
        content()
    }
}
