package uz.lider.client.presentation.tracking

import android.graphics.drawable.GradientDrawable
import android.widget.LinearLayout
import android.widget.TextView
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.infowindow.MarkerInfoWindow
import uz.lider.client.R

/**
 * Liquid-glass callout above store marker — shows magazine / client name.
 */
class GlassStoreInfoWindow(
    mapView: MapView,
) : MarkerInfoWindow(R.layout.marker_store_glass_bubble, mapView) {

    override fun onOpen(item: Any?) {
        super.onOpen(item)
        val marker = item as? Marker ?: return
        val titleView = mView.findViewById<TextView>(R.id.bubble_title)
        val name = marker.title?.trim().orEmpty().ifBlank {
            (marker.relatedObject as? StoreCallout)?.name.orEmpty()
        }
        titleView.text = name.ifBlank { "—" }

        val card = mView.findViewById<LinearLayout>(R.id.store_bubble_card)
        val d = card.resources.displayMetrics.density
        card.background = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 16f * d
            setColor(0xE8FFFFFF.toInt())
            setStroke((1.2f * d).toInt().coerceAtLeast(1), 0xB3FFFFFF.toInt())
        }
        card.elevation = 14f * d
    }
}

/** Payload on store Marker.relatedObject */
data class StoreCallout(
    val name: String,
    val orderId: String? = null,
)
