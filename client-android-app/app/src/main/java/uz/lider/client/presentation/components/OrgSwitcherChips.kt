package uz.lider.client.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.lider.client.domain.model.ClientOrganization
import uz.lider.client.presentation.theme.GlassFilterChip
import uz.lider.client.presentation.theme.LiquidGlass
import uz.lider.client.presentation.theme.LiquidGlassDropdownItem
import uz.lider.client.presentation.theme.LiquidGlassDropdownMenu

@Composable
fun OrgSwitcherDropdown(
    organizations: List<ClientOrganization>,
    selectedCompanyId: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (organizations.size < 2) return
    val selected = organizations.find { it.companyId == selectedCompanyId }
        ?: organizations.first()
    val label = selected.shortName.ifBlank { selected.name }
    GlassDropdownChip(
        label = label,
        selected = true,
        modifier = modifier,
    ) { dismiss ->
        organizations.forEach { org ->
            val name = org.shortName.ifBlank { org.name }
            LiquidGlassDropdownItem(
                text = name,
                selected = org.companyId == selected.companyId,
                onClick = {
                    onSelect(org.companyId)
                    dismiss()
                },
            )
        }
    }
}

/** Барчаси / Севимлилар / kategoriya — bitta dropdown */
@Composable
fun CatalogFilterDropdown(
    options: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (options.isEmpty()) return
    val index = selectedIndex.coerceIn(0, options.lastIndex)
    GlassDropdownChip(
        label = options[index],
        selected = true,
        modifier = modifier,
    ) { dismiss ->
        options.forEachIndexed { i, label ->
            LiquidGlassDropdownItem(
                text = label,
                selected = i == index,
                onClick = {
                    onSelect(i)
                    dismiss()
                },
            )
        }
    }
}

@Composable
private fun GlassDropdownChip(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    menuContent: @Composable (dismiss: () -> Unit) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(LiquidGlass.RadiusChip)
    Box(modifier = modifier) {
        Row(
            modifier = Modifier
                .clip(shape)
                .then(
                    if (selected) {
                        Modifier.background(LiquidGlass.GradientPrimary)
                    } else {
                        Modifier.background(Color.White.copy(alpha = 0.9f))
                    },
                )
                .clickable { expanded = true }
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                label,
                color = if (selected) Color.White else LiquidGlass.TextDark,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Icon(
                Icons.Default.KeyboardArrowDown,
                contentDescription = null,
                tint = if (selected) Color.White else LiquidGlass.TextDark,
                modifier = Modifier.size(18.dp),
            )
        }
        LiquidGlassDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            menuContent { expanded = false }
        }
    }
}

@Composable
fun OrgSwitcherChips(
    organizations: List<ClientOrganization>,
    selectedCompanyId: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    /** null = «Барчаси» chip yo‘q (katalog/buyurtmalar). */
    allLabel: String? = null,
    onSelectAll: (() -> Unit)? = null,
    /** True — binafsha/gradient fon ustida (Жами харидлар). */
    onDark: Boolean = false,
    /** Title yonida — kichikroq chip, o‘ngga. */
    compact: Boolean = false,
) {
    if (organizations.isEmpty() && allLabel == null) return
    if (organizations.size < 2 && allLabel == null) return
    Row(
        modifier = modifier
            .then(if (compact) Modifier else Modifier.fillMaxWidth())
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = if (compact) {
            Arrangement.spacedBy(6.dp, Alignment.End)
        } else {
            Arrangement.spacedBy(8.dp)
        },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (allLabel != null && onSelectAll != null) {
            OrgChip(
                label = allLabel,
                selected = selectedCompanyId == null,
                onClick = onSelectAll,
                onDark = onDark,
                compact = compact,
            )
        }
        organizations.forEach { org ->
            OrgChip(
                label = org.shortName.ifBlank { org.name },
                selected = org.companyId == selectedCompanyId,
                onClick = { onSelect(org.companyId) },
                onDark = onDark,
                compact = compact,
            )
        }
    }
}

@Composable
private fun OrgChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    onDark: Boolean,
    compact: Boolean = false,
) {
    if (!onDark) {
        GlassFilterChip(label = label, selected = selected, onClick = onClick)
        return
    }
    val shape = RoundedCornerShape(LiquidGlass.RadiusChip)
    val interactionSource = remember { MutableInteractionSource() }
    Box(
        modifier = Modifier
            .clip(shape)
            .then(
                if (selected) {
                    Modifier.background(Color.White)
                } else {
                    Modifier
                        .background(Color.White.copy(alpha = 0.14f))
                        .border(1.dp, Color.White.copy(alpha = 0.45f), shape)
                },
            )
            .clickable(
                indication = null,
                interactionSource = interactionSource,
                onClick = onClick,
            )
            .padding(
                horizontal = if (compact) 10.dp else 14.dp,
                vertical = if (compact) 5.dp else 8.dp,
            ),
    ) {
        Text(
            label,
            color = if (selected) LiquidGlass.Indigo else Color.White,
            fontSize = if (compact) 11.sp else 13.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
            maxLines = 1,
        )
    }
}
