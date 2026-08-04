package uz.distributor.crm.presentation.delivery

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

internal fun formatDueAtDisplay(iso: String): String? {
    return parseInstantFlexible(iso)?.let { instant ->
        DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")
            .withZone(ZoneId.systemDefault())
            .format(instant)
    }
}

internal fun parseInstantFlexible(iso: String): Instant? {
    return runCatching {
        Instant.parse(iso)
    }.recoverCatching {
        val normalized = if (iso.endsWith("Z") || iso.contains("+")) iso else "${iso}Z"
        Instant.parse(normalized.replace(" ", "T"))
    }.getOrNull()
}

/** Muddat o‘tganmi (hozirgi vaqtdan oldin). */
internal fun isDueOverdue(iso: String?): Boolean {
    if (iso.isNullOrBlank()) return false
    val due = parseInstantFlexible(iso) ?: return false
    return due.isBefore(Instant.now())
}
