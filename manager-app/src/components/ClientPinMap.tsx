import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { switchTileLayer } from './MapLayerSwitcher'

const NAVOIY: [number, number] = [40.0843, 65.3791]

interface Props {
  lat: number | null
  lng: number | null
  radiusMeters: number
  dark: boolean
  height?: number | string
  borderRadius?: number
  onPick: (lat: number, lng: number) => void
}

function makePinIcon() {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    html: `<div style="width:28px;height:28px;background:#6366f1;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.35);"></div>`,
  })
}

export default function ClientPinMap({
  lat,
  lng,
  radiusMeters,
  dark,
  height = 220,
  borderRadius = 16,
  onPick,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const onPickRef = useRef(onPick)
  const posRef = useRef<{ lat: number; lng: number } | null>(null)
  onPickRef.current = onPick

  const redrawCircle = (map: L.Map, center: L.LatLngExpression, meters: number) => {
    if (circleRef.current) {
      map.removeLayer(circleRef.current)
      circleRef.current = null
    }
    circleRef.current = L.circle(center, {
      radius: Math.max(10, meters),
      color: '#6366f1',
      fillColor: '#6366f1',
      fillOpacity: 0.18,
      weight: 2,
      interactive: false,
      // SVG renderer — Canvas ba'zan radius o'zgartirishda buziladi
      renderer: L.svg({ padding: 0.5 }),
    }).addTo(map)
  }

  useEffect(() => {
    if (!divRef.current || mapRef.current) return
    const map = L.map(divRef.current, {
      center: lat != null && lng != null ? [lat, lng] : NAVOIY,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false,
    })
    switchTileLayer(map, tileRef, 'standard', false)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    map.on('click', (e: L.LeafletMouseEvent) => {
      onPickRef.current(e.latlng.lat, e.latlng.lng)
    })
    mapRef.current = map
    const t = window.setTimeout(() => map.invalidateSize(), 80)
    return () => {
      window.clearTimeout(t)
      map.remove()
      mapRef.current = null
      tileRef.current = null
      markerRef.current = null
      circleRef.current = null
      posRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const t = window.setTimeout(() => {
      map.invalidateSize()
      if (posRef.current) {
        redrawCircle(map, [posRef.current.lat, posRef.current.lng], radiusMeters)
      }
    }, 80)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height])

  // Marker + position (faqat lat/lng o'zgaganda pan)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (lat == null || lng == null) {
      markerRef.current?.remove()
      markerRef.current = null
      if (circleRef.current) {
        map.removeLayer(circleRef.current)
        circleRef.current = null
      }
      posRef.current = null
      return
    }

    const prev = posRef.current
    const moved = !prev || prev.lat !== lat || prev.lng !== lng
    posRef.current = { lat, lng }

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], {
        icon: makePinIcon(),
        draggable: true,
      }).addTo(map)
      markerRef.current.on('dragend', () => {
        const p = markerRef.current?.getLatLng()
        if (p) onPickRef.current(p.lat, p.lng)
      })
    } else if (moved) {
      markerRef.current.setLatLng([lat, lng])
    }

    redrawCircle(map, [lat, lng], radiusMeters)

    if (moved) {
      map.setView([lat, lng], map.getZoom(), { animate: false })
    }
    // radiusMeters intentionally included so first paint has correct radius
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  // Faqat radius — pan qilmasdan, doirani qayta chizish
  useEffect(() => {
    const map = mapRef.current
    const pos = posRef.current
    if (!map || !pos) return
    redrawCircle(map, [pos.lat, pos.lng], radiusMeters)
  }, [radiusMeters])

  return (
    <div
      ref={divRef}
      style={{
        width: '100%',
        height,
        borderRadius,
        overflow: 'hidden',
        border: borderRadius ? `1px solid ${dark ? '#2a2a3e' : '#e5e7eb'}` : 'none',
        background: dark ? '#111118' : '#f3f4f6',
      }}
    />
  )
}
