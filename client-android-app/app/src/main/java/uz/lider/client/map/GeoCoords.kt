package uz.lider.client.map

import uz.lider.client.data.repository.RoadRouteService
import kotlin.math.abs

/**
 * Local delivery geo guards — emulator (US) GPS ~8000 km masofani bloklaydi.
 */
object GeoCoords {
    /** Max courier↔client distance for live map / OSRM. */
    const val MAX_LIVE_DISTANCE_KM = 120.0

    fun isValid(lat: Double?, lng: Double?): Boolean =
        lat != null && lng != null &&
            lat in -90.0..90.0 && lng in -180.0..180.0 &&
            !(lat == 0.0 && lng == 0.0)

    /** O‘zbekiston (+ biroz chegara). */
    fun isInServiceArea(lat: Double, lng: Double): Boolean =
        lat in 37.0..45.8 && lng in 55.0..73.5

    fun isUsableCourier(
        courierLat: Double?,
        courierLng: Double?,
        deliveryLat: Double?,
        deliveryLng: Double?,
    ): Boolean {
        if (!isValid(courierLat, courierLng)) return false
        if (!isInServiceArea(courierLat!!, courierLng!!)) return false
        if (isValid(deliveryLat, deliveryLng) && isInServiceArea(deliveryLat!!, deliveryLng!!)) {
            val km = RoadRouteService.haversineM(
                courierLat, courierLng, deliveryLat, deliveryLng,
            ) / 1000.0
            return km <= MAX_LIVE_DISTANCE_KM
        }
        return true
    }

    fun isPlausibleRouteDistanceKm(km: Double): Boolean =
        km.isFinite() && km >= 0.0 && km <= MAX_LIVE_DISTANCE_KM

    fun samePoint(aLat: Double, aLng: Double, bLat: Double, bLng: Double, eps: Double = 1e-4): Boolean =
        abs(aLat - bLat) < eps && abs(aLng - bLng) < eps
}
