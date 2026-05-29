package uz.distributor.crm.presentation.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun MainScaffold(
    currentTab: NavTab,
    onTabSelected: (NavTab) -> Unit,
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        bottomBar = { BottomNavBar(selected = currentTab, onTabSelected = onTabSelected) },
        content = content,
    )
}
