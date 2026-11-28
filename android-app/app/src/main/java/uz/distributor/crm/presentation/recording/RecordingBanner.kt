package uz.distributor.crm.presentation.recording

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.distributor.crm.localization.AppStrings
import uz.distributor.crm.localization.LocalAppLanguage
import uz.distributor.crm.recording.VisitRecordingPhase
import uz.distributor.crm.recording.VisitRecordingUiState

private val DotRed = Color(0xFFEF4444)
private val StatusText = Color.White
private val SoftScrim = Color.Black.copy(alpha = 0.18f)

/**
 * Header ichidagi ixcham yozuv statusi (overlay emas).
 * Chapda pulsatsiyalanuvchi nuqta, oq matn, monospaced taymer.
 */
@Composable
fun RecordingStatusRow(
    state: VisitRecordingUiState,
    modifier: Modifier = Modifier,
    /** true — ko‘k-binafsha header ustida oq matn; false — ochiq fon uchun to‘q matn */
    onDarkHeader: Boolean = true,
) {
    val lang = LocalAppLanguage.current
    val preferStatic = android.provider.Settings.Global.getFloat(
        LocalContext.current.contentResolver,
        android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,
        1f,
    ) == 0f

    val visible = state.showBanner &&
        (state.phase == VisitRecordingPhase.Recording || state.phase == VisitRecordingPhase.Interrupted)
    val textColor = if (onDarkHeader) StatusText else Color(0xFF1F2937)
    val scrim = if (onDarkHeader) SoftScrim else Color(0xFFF3F4F6)

    AnimatedVisibility(
        visible = visible,
        enter = if (preferStatic) fadeIn(tween(0)) else fadeIn(tween(180)),
        exit = if (preferStatic) fadeOut(tween(0)) else fadeOut(tween(140)),
        modifier = modifier.fillMaxWidth(),
    ) {
        val interrupted = state.phase == VisitRecordingPhase.Interrupted
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 32.dp, max = 36.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(scrim)
                .padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            RecordingPulseDot(active = !interrupted && !preferStatic)
            Text(
                text = if (interrupted) {
                    AppStrings.recordingInterrupted(lang)
                } else {
                    AppStrings.recordingInProgress(lang)
                },
                color = textColor,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            // Taymer kengligi barqaror — matn siljimasin
            Text(
                text = formatTimer(state.elapsedSeconds),
                color = textColor,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                fontFamily = FontFamily.Monospace,
                maxLines = 1,
                modifier = Modifier.width(48.dp),
            )
        }
    }
}

/** Eski importlar uchun alias — overlay ishlatilmasin. */
@Deprecated("Use RecordingStatusRow inside visit header", ReplaceWith("RecordingStatusRow(state, modifier)"))
@Composable
fun RecordingBanner(
    state: VisitRecordingUiState,
    modifier: Modifier = Modifier,
) {
    RecordingStatusRow(state = state, modifier = modifier)
}

@Composable
private fun RecordingPulseDot(active: Boolean) {
    val alpha = if (!active) {
        1f
    } else {
        val t = rememberInfiniteTransition(label = "recDot")
        val a by t.animateFloat(
            initialValue = 0.4f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(900, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse,
            ),
            label = "recDotA",
        )
        a
    }
    Box(
        Modifier
            .size(8.dp)
            .clip(CircleShape)
            .background(DotRed.copy(alpha = alpha)),
    )
}

fun formatTimer(totalSeconds: Int): String {
    val s = totalSeconds.coerceAtLeast(0)
    val m = s / 60
    val rem = s % 60
    return "%02d:%02d".format(m, rem)
}
