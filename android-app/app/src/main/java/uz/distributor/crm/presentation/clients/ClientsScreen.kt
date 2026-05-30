package uz.distributor.crm.presentation.clients

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.presentation.components.BottomNavBar
import uz.distributor.crm.presentation.components.NavTab
import uz.distributor.crm.presentation.theme.SherinColors
import uz.distributor.crm.presentation.theme.SherinGlassIconButton
import uz.distributor.crm.presentation.theme.SherinSubpageHeader
import uz.distributor.crm.presentation.theme.sherinPageBackground
import java.text.DecimalFormat

@Composable
fun ClientsScreen(
    onBack: () -> Unit,
    onClientClick: (String) -> Unit,
    onNavigate: (NavTab) -> Unit = {},
    viewModel: ClientsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val fmt = remember { DecimalFormat("#,##0.00") }
    val lang = LocalAppLanguage.current
    val isDark = MaterialTheme.colorScheme.background.luminance() < 0.5f

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(sherinPageBackground(isDark)),
    ) {
        Column(Modifier.fillMaxSize()) {
            SherinSubpageHeader(
                title = AppStrings.clientsListTitle(lang),
                isDark = isDark,
                onBack = onBack,
                trailing = {
                    SherinGlassIconButton(onClick = {}, icon = Icons.Default.Add, size = 40.dp)
                },
            )

            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = viewModel::onSearchChange,
                placeholder = { Text(AppStrings.search(lang)) },
                leadingIcon = { Icon(Icons.Default.Search, null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = if (isDark) SherinColors.CardRowDark else Color.White,
                    unfocusedContainerColor = if (isDark) SherinColors.CardRowDark else Color.White,
                ),
            )

            if (state.isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SherinColors.Primary)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(state.clients, key = { it.id }) { client ->
                        val balanceColor = if (client.balance < 0) Color(0xFFEF4444) else Color(0xFF10B981)
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onClientClick(client.id) },
                            shape = RoundedCornerShape(16.dp),
                            color = if (isDark) SherinColors.CardRowDark else Color.White,
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(client.code, fontSize = 11.sp, color = Color(0xFF3B82F6), fontWeight = FontWeight.SemiBold)
                                    Text(
                                        client.name,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 14.sp,
                                        color = if (isDark) Color.White else Color(0xFF111827),
                                    )
                                    client.address?.let {
                                        Text(it, fontSize = 12.sp, color = Color(0xFF9CA3AF), maxLines = 1)
                                    }
                                }
                                Text("${fmt.format(client.balance)}", fontWeight = FontWeight.Bold, color = balanceColor, fontSize = 13.sp)
                            }
                        }
                    }
                }
            }
        }

        BottomNavBar(
            selected = NavTab.LOCATION,
            onTabSelected = onNavigate,
            isDark = isDark,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}
