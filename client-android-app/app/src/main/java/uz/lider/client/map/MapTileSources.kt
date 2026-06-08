package uz.lider.client.map

import org.osmdroid.tileprovider.tilesource.OnlineTileSourceBase
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.tileprovider.tilesource.XYTileSource
import org.osmdroid.util.MapTileIndex

/** Admin MapLayerSwitcher.tsx va agent APK bilan bir xil qatlamlar */
enum class MapLayerId(val key: String, val label: String) {
    STANDARD("standard", "Стандартный"),
    CYCLOSM("cyclosm", "CyclOSM"),
    CYCLEMAP("cyclemap", "Велосипедная"),
    TRANSPORT("transport", "Транспорт"),
    TOPOGRAPHIC("topographic", "Топографическая"),
    HUMANITARIAN("humanitarian", "Гуманитарная"),
    SHORTBREAD("shortbread", "Shortbread"),
    MAPTILER("maptiler", "MapTiler OMT"),
    SATELLITE("satellite", "Спутник"),
}

object MapTileSources {
    val defaultLayer: MapLayerId = MapLayerId.STANDARD

    fun source(layerId: MapLayerId, dark: Boolean = false): OnlineTileSourceBase = when (layerId) {
        MapLayerId.STANDARD -> if (dark) darkStandard() else TileSourceFactory.MAPNIK
        MapLayerId.CYCLOSM -> hosts(
            "CyclOSM", 20,
            "https://a.tile-cyclosm.openstreetmap.fr/cyclosm/",
            "https://b.tile-cyclosm.openstreetmap.fr/cyclosm/",
            "https://c.tile-cyclosm.openstreetmap.fr/cyclosm/",
        )
        MapLayerId.CYCLEMAP -> hosts(
            "OpenCycleMap", 18,
            "https://a.tile.opencyclemap.org/cycle/",
            "https://b.tile.opencyclemap.org/cycle/",
            "https://c.tile.opencyclemap.org/cycle/",
        )
        MapLayerId.TRANSPORT -> hosts(
            "OpenRailwayMap", 19,
            "https://a.tiles.openrailwaymap.org/standard/",
            "https://b.tiles.openrailwaymap.org/standard/",
            "https://c.tiles.openrailwaymap.org/standard/",
        )
        MapLayerId.TOPOGRAPHIC -> hosts(
            "OpenTopoMap", 17,
            "https://a.tile.opentopomap.org/",
            "https://b.tile.opentopomap.org/",
            "https://c.tile.opentopomap.org/",
        )
        MapLayerId.HUMANITARIAN -> hosts(
            "HOT", 20,
            "https://a.tile.openstreetmap.fr/hot/",
            "https://b.tile.openstreetmap.fr/hot/",
            "https://c.tile.openstreetmap.fr/hot/",
        )
        MapLayerId.SHORTBREAD -> hosts(
            "CartoVoyager", 20,
            "https://a.basemaps.cartocdn.com/rastertiles/voyager/",
            "https://b.basemaps.cartocdn.com/rastertiles/voyager/",
            "https://c.basemaps.cartocdn.com/rastertiles/voyager/",
            "https://d.basemaps.cartocdn.com/rastertiles/voyager/",
        )
        MapLayerId.MAPTILER -> hosts(
            "CartoVoyagerNoLabels", 20,
            "https://a.basemaps.cartocdn.com/rastertiles/voyager_nolabels/",
            "https://b.basemaps.cartocdn.com/rastertiles/voyager_nolabels/",
            "https://c.basemaps.cartocdn.com/rastertiles/voyager_nolabels/",
            "https://d.basemaps.cartocdn.com/rastertiles/voyager_nolabels/",
        )
        MapLayerId.SATELLITE -> esriSatellite()
    }

    private fun darkStandard(): XYTileSource = hosts(
        "CartoDark",
        20,
        "https://a.basemaps.cartocdn.com/dark_all/",
        "https://b.basemaps.cartocdn.com/dark_all/",
        "https://c.basemaps.cartocdn.com/dark_all/",
        "https://d.basemaps.cartocdn.com/dark_all/",
    )

    private fun hosts(name: String, maxZoom: Int, vararg urls: String): XYTileSource =
        XYTileSource(name, 0, maxZoom, 256, ".png", urls, "© OpenStreetMap contributors")

    private fun esriSatellite(): OnlineTileSourceBase = object : OnlineTileSourceBase(
        "EsriWorldImagery",
        0,
        19,
        256,
        "",
        arrayOf("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/"),
        "© Esri",
    ) {
        override fun getTileURLString(pMapTileIndex: Long): String {
            val z = MapTileIndex.getZoom(pMapTileIndex)
            val x = MapTileIndex.getX(pMapTileIndex)
            val y = MapTileIndex.getY(pMapTileIndex)
            return "${baseUrl}$z/$y/$x"
        }
    }
}
