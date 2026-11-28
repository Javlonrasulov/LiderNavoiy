package uz.distributor.crm.recording

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * AAC/MPEG-4 (.m4a) MediaRecorder — nutq sifatida, do‘kon shovqiniga mos.
 */
@Singleton
class VisitAudioRecorder @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null

    val currentFile: File? get() = outputFile
    val isRecording: Boolean get() = recorder != null

    fun start(recordingId: String): File {
        stopInternal(discard = false)
        val dir = File(context.cacheDir, "visit_recordings").apply { mkdirs() }
        val file = File(dir, "$recordingId.m4a")
        if (file.exists()) file.delete()

        val mr = createRecorder()
        mr.setAudioSource(MediaRecorder.AudioSource.MIC)
        mr.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        mr.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        mr.setAudioEncodingBitRate(48_000)
        mr.setAudioSamplingRate(16_000)
        mr.setAudioChannels(1)
        mr.setOutputFile(file.absolutePath)
        mr.prepare()
        mr.start()
        recorder = mr
        outputFile = file
        return file
    }

    /** 0..1 amplitude sample (MediaRecorder.maxAmplitude). */
    fun amplitudeNorm(): Float {
        val amp = runCatching { recorder?.maxAmplitude ?: 0 }.getOrDefault(0)
        if (amp <= 0) return 0f
        return (amp / 32767f).coerceIn(0f, 1f)
    }

    fun stop(): File? {
        return stopInternal(discard = false)
    }

    fun cancel() {
        stopInternal(discard = true)
    }

    private fun stopInternal(discard: Boolean): File? {
        val file = outputFile
        val mr = recorder
        recorder = null
        outputFile = null
        if (mr != null) {
            runCatching {
                mr.stop()
            }
            runCatching { mr.reset() }
            runCatching { mr.release() }
        }
        if (discard) {
            file?.delete()
            return null
        }
        return file?.takeIf { it.exists() && it.length() > 0 }
    }

    private fun createRecorder(): MediaRecorder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }
}
