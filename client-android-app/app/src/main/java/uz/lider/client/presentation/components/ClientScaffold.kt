package uz.lider.client.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.unit.dp
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidTheme

// Frosted-glass TopAppBar color tokens
private val topBarBorder = LiquidGlass.GlassDarkBorder

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientTabScaffold(
    title: String? = null,
    titleContent: (@Composable () -> Unit)? = null,
    actions: @Composable () -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        containerColor = LiquidTheme.bg,
        topBar = {
            TopAppBar(
                modifier = Modifier.drawBehind {
                    // Bottom border line for glass separator
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
                    containerColor = LiquidTheme.bgMid.copy(alpha = 0.88f),
                    titleContentColor = LiquidTheme.text,
                    actionIconContentColor = LiquidTheme.textMuted,
                    navigationIconContentColor = LiquidTheme.textMuted,
                ),
            )
        },
    ) { padding -> content(padding) }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientStackScaffold(
    title: String,
    onBack: () -> Unit,
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        containerColor = LiquidTheme.bg,
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
                    Text(
                        title,
                        fontWeight = FontWeight.Bold,
                        color = LiquidTheme.text,
                        modifier = Modifier.padding(start = 8.dp),
                    )
                },
                navigationIcon = { ClientBackButton(onBack = onBack) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = LiquidTheme.bgMid.copy(alpha = 0.88f),
                    titleContentColor = LiquidTheme.text,
                    navigationIconContentColor = LiquidGlass.IndigoLight,
                ),
            )
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
