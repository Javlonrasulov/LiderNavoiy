package uz.distributor.crm.presentation.components

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.luminance

@Composable
fun MainScaffold(
    currentTab: NavTab?,
    onTabSelected: (NavTab) -> Unit,
    content: @Composable (PaddingValues) -> Unit,
) {
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    Scaffold(
        bottomBar = { BottomNavBar(selected = currentTab, onTabSelected = onTabSelected, isDark = isDark) },
        content = content,
    )
}
