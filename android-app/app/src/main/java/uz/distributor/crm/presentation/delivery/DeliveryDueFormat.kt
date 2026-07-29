package uz.distributor.crm.presentation.delivery

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

internal fun formatDueAtDisplay(iso: String): String? {
    return runCatching {
        val instant = Instant.parse(iso)
        DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")
            .withZone(ZoneId.systemDefault())
            .format(instant)
    }.recoverCatching {
        val normalized = if (iso.endsWith("Z") || iso.contains("+")) iso else "${iso}Z"
        val instant = Instant.parse(normalized.replace(" ", "T"))
        DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")
            .withZone(ZoneId.systemDefault())
            .format(instant)
    }.getOrNull()
}
