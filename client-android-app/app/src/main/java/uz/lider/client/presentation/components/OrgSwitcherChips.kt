package uz.lider.client.presentation.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import uz.lider.client.domain.model.ClientOrganization
import uz.lider.client.presentation.theme.GlassFilterChip

@Composable
fun OrgSwitcherChips(
    organizations: List<ClientOrganization>,
    selectedCompanyId: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (organizations.size < 2) return
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        organizations.forEach { org ->
            GlassFilterChip(
                label = org.shortName.ifBlank { org.name },
                selected = org.companyId == selectedCompanyId,
                onClick = { onSelect(org.companyId) },
            )
        }
    }
}
