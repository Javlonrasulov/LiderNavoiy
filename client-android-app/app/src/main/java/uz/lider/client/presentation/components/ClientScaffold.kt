package uz.lider.client.presentation.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import uz.lider.client.presentation.navigation.ClientBottomNavHeight

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientTabScaffold(
    title: String,
    bottomPadding: Boolean = false,
    actions: @Composable () -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) {
    val palette = rememberClientPalette()
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(title, fontWeight = FontWeight.Bold, color = palette.text)
                },
                actions = { actions() },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = palette.navBg,
                    titleContentColor = palette.text,
                ),
            )
        },
        bottomBar = {
            if (bottomPadding) Spacer(Modifier.height(ClientBottomNavHeight))
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
    val palette = rememberClientPalette()
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(title, fontWeight = FontWeight.Bold, color = palette.text)
                },
                navigationIcon = { ClientBackButton(onBack = onBack) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = palette.navBg,
                    titleContentColor = palette.text,
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
