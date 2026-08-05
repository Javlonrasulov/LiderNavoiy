package uz.distributor.crm.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import java.io.ByteArrayInputStream
import java.io.File

/** Kamera/galereya JPEG EXIF orientatsiyasini piksellarga qo‘llash. */
object JpegOrientation {
    fun fromUri(context: Context, uri: Uri): Int = try {
        context.contentResolver.openInputStream(uri)?.use { input ->
            ExifInterface(input).getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL,
            )
        } ?: ExifInterface.ORIENTATION_NORMAL
    } catch (_: Exception) {
        ExifInterface.ORIENTATION_NORMAL
    }

    fun fromFile(file: File): Int = try {
        ExifInterface(file.absolutePath).getAttributeInt(
            ExifInterface.TAG_ORIENTATION,
            ExifInterface.ORIENTATION_NORMAL,
        )
    } catch (_: Exception) {
        ExifInterface.ORIENTATION_NORMAL
    }

    fun fromBytes(bytes: ByteArray): Int = try {
        ExifInterface(ByteArrayInputStream(bytes)).getAttributeInt(
            ExifInterface.TAG_ORIENTATION,
            ExifInterface.ORIENTATION_NORMAL,
        )
    } catch (_: Exception) {
        ExifInterface.ORIENTATION_NORMAL
    }

    fun needsTransform(orientation: Int): Boolean =
        orientation != ExifInterface.ORIENTATION_UNDEFINED &&
            orientation != ExifInterface.ORIENTATION_NORMAL

    /**
     * @return yangi bitmap (transform kerak bo‘lsa) yoki manba (o‘zgarmagan)
     */
    fun apply(bitmap: Bitmap, orientation: Int): Bitmap {
        if (!needsTransform(orientation)) return bitmap
        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.setScale(-1f, 1f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.setRotate(180f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> {
                matrix.setRotate(180f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_TRANSPOSE -> {
                matrix.setRotate(90f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.setRotate(90f)
            ExifInterface.ORIENTATION_TRANSVERSE -> {
                matrix.setRotate(-90f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.setRotate(-90f)
            else -> return bitmap
        }
        return try {
            val out = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
            if (out !== bitmap) bitmap.recycle()
            out
        } catch (_: Exception) {
            bitmap
        }
    }
}
