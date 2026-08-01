package uz.lider.client.presentation.tracking

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.lider.client.localization.AppLanguage
import uz.lider.client.localization.AppStrings
import uz.lider.client.localization.LocalAppLanguage
import uz.lider.client.presentation.theme.LiquidGlass

/** Bitta org — magazin bubble dagi manzillar. */
data class OrgStopCount(
    val name: String,
    val count: Int,
    val stopsBeforeYou: Int = 0,
    val companyId: String? = null,
)

/** Payload on store Marker.relatedObject */
data class StoreCallout(
    val name: String,
    val orderId: String? = null,
    /** Ko‘p org — har biri alohida qatorda. */
    val orgStops: List<OrgStopCount> = emptyList(),
) {
    val organizations: List<String>
        get() = orgStops.map { it.name }
}

private fun orgStopLine(lang: AppLanguage, org: OrgStopCount): String {
    val before = org.stopsBeforeYou.coerceAtLeast(0)
    return if (before > 0) {
        AppStrings.t(lang, "track_org_stops_before")
            .replace("%s", org.name)
            .replace("%d", before.toString())
    } else {
        AppStrings.t(lang, "track_org_stops_next")
            .replace("%s", org.name)
    }
}

/**
 * Liquid glass name chip — shown when store marker is tapped.
 * (osmdroid InfoWindow disabled — it crashed / showed empty grey bubble)
 */
@Composable
fun GlassStoreNameBubble(
    name: String,
    modifier: Modifier = Modifier,
    orgStops: List<OrgStopCount> = emptyList(),
    organizations: List<String> = emptyList(),
    onDismiss: (() -> Unit)? = null,
) {
    val lang = LocalAppLanguage.current
    val shape = RoundedCornerShape(16.dp)
    val orgLines = when {
        orgStops.isNotEmpty() -> orgStops.map { orgStopLine(lang, it) }
        organizations.isNotEmpty() -> organizations
        else -> emptyList()
    }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .shadow(
                elevation = 16.dp,
                shape = shape,
                ambientColor = Color.Black.copy(alpha = 0.18f),
                spotColor = Color.Black.copy(alpha = 0.22f),
            )
            .clip(shape)
            .background(Color.White.copy(alpha = 0.90f))
            .border(
                width = 1.dp,
                brush = Brush.linearGradient(
                    listOf(
                        Color.White.copy(alpha = 0.95f),
                        LiquidGlass.Indigo.copy(alpha = 0.28f),
                    ),
                ),
                shape = shape,
            )
            .padding(start = 12.dp, end = 6.dp, top = 10.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            imageVector = Icons.Default.Storefront,
            contentDescription = null,
            tint = LiquidGlass.Indigo,
            modifier = Modifier.size(18.dp),
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = name.ifBlank { "Magazin" },
                color = Color(0xFF0F172A),
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            orgLines.forEachIndexed { index, line ->
                Text(
                    text = line,
                    color = Color(0xFF64748B),
                    fontWeight = FontWeight.Medium,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = if (index == 0) 2.dp else 1.dp),
                )
            }
        }
        if (onDismiss != null) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = null,
                tint = Color(0xFF64748B),
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onDismiss)
                    .padding(5.dp),
            )
        }
    }
}
