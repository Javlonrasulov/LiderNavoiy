package uz.distributor.crm.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast

object NavigationHelper {
    fun openToClient(context: Context, latitude: Double, longitude: Double, label: String? = null) {
        val yandexNavi = Uri.parse(
            "yandexnavi://build_route_on_map?lat_to=$latitude&lon_to=$longitude&rtt=auto",
        )
        val yandexMaps = Uri.parse(
            "yandexmaps://maps.yandex.ru/?rtext=~,$latitude,$longitude&rtt=auto",
        )
        val googleNav = Uri.parse("google.navigation:q=$latitude,$longitude")

        val intents = listOf(
            Intent(Intent.ACTION_VIEW, yandexNavi),
            Intent(Intent.ACTION_VIEW, yandexMaps),
            Intent(Intent.ACTION_VIEW, googleNav),
            Intent(
                Intent.ACTION_VIEW,
                Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$latitude,$longitude"),
            ),
        )

        for (intent in intents) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (intent.resolveActivity(context.packageManager) != null) {
                context.startActivity(intent)
                return
            }
        }
        Toast.makeText(context, "Navigator ilovasi topilmadi", Toast.LENGTH_SHORT).show()
    }
}
