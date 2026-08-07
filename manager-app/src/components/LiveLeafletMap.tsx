import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapLayerSwitcher, switchTileLayer, type LayerId } from './MapLayerSwitcher'
import { isInServiceArea } from '../utils/gpsOnline'
import type { EmployeeLocation } from '../api/types'
import type { Translations } from '../i18n'

const NAVOIY: [number, number] = [40.0843, 65.3791]

function shortName(name: string): string {
  const first = name.trim().split(/\s+/)[0] || name
  return first.length > 10 ? `${first.slice(0, 9)}…` : first
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function makeMarkerIcon(role: 'agent' | 'delivery', online: boolean, name: string) {
  const bg = role === 'agent'
    ? (online ? '#6366f1' : '#6b7280')
    : (online ? '#10b981' : '#6b7280')
  const border = role === 'agent'
    ? (online ? '#a5b4fc' : '#9ca3af')
    : (online ? '#6ee7b7' : '#9ca3af')
  const label = escapeHtml(shortName(name))
  return L.divIcon({
    className: '',
    iconSize: [72, 44],
    iconAnchor: [36, 40],
    popupAnchor: [0, -40],
    html: `<div style="display:flex;flex-direction:column;align-items:center;width:72px;pointer-events:none;">
      <div style="max-width:70px;padding:1px 5px;border-radius:6px;background:rgba(15,15,25,0.82);color:#fff;font-size:9px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;box-shadow:0 1px 4px rgba(0,0,0,.35);">${label}</div>
      <div style="width:28px;height:28px;border-radius:50%;background:${bg};border:2.5px solid ${border};box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;position:relative;">
        ${role === 'delivery' ? '🚚' : '👤'}
        ${online ? '<span style="position:absolute;bottom:0;right:0;width:8px;height:8px;background:#22c55e;border-radius:50%;border:2px solid #fff;"></span>' : ''}
      </div>
    </div>`,
  })
}

interface Props {
  employees: EmployeeLocation[]
  dark: boolean
  tr: Translations
  height?: number | string
  interactive?: boolean
  showLayerSwitcher?: boolean
}

/** Admin InlineEmployeeMap bilan bir xil OSM + marker yangilanishi */
export default function LiveLeafletMap({
  employees,
  dark,
  tr,
  height = 220,
  interactive = true,
  showLayerSwitcher = true,
}: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const divRef = useRef<HTMLDivElement>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const cameraReadyRef = useRef(false)
  const [activeLayer, setActiveLayer] = useState<LayerId>('standard')
  const [onlineOnly, setOnlineOnly] = useState(false)

  useEffect(() => {
    if (!divRef.current || mapRef.current) return
    cameraReadyRef.current = false

    const map = L.map(divRef.current, {
      center: NAVOIY,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: interactive,
      dragging: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      zoomAnimation: false,
      maxBounds: [[36.5, 54.5], [46.2, 74.0]],
      maxBoundsViscosity: 0.8,
    })
    switchTileLayer(map, tileRef, activeLayer, false)
    mapRef.current = map

    const lockCamera = () => { cameraReadyRef.current = true }
    map.on('zoomstart', lockCamera)
    map.on('dragstart', lockCamera)

    const t1 = window.setTimeout(() => map.invalidateSize(true), 100)
    const t2 = window.setTimeout(() => map.invalidateSize(true), 400)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      map.off('zoomstart', lockCamera)
      map.off('dragstart', lockCamera)
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
      cameraReadyRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    // Dark tema xarita tilelariga ta'sir qilmasin
    switchTileLayer(map, tileRef, activeLayer, false)
  }, [activeLayer])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const t = window.setTimeout(() => map.invalidateSize(true), 80)
    return () => window.clearTimeout(t)
  }, [height])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const visible = employees.filter(e =>
      e.lat != null &&
      e.lng != null &&
      isInServiceArea(e.lat, e.lng) &&
      (!onlineOnly || e.online),
    )
    const nextIds = new Set(visible.map(e => e.distributorId))

    markersRef.current.forEach((marker, key) => {
      if (!nextIds.has(key)) {
        marker.remove()
        markersRef.current.delete(key)
      }
    })

    visible.forEach(emp => {
      const key = emp.distributorId
      const lat = emp.lat!
      const lng = emp.lng!
      const roleLabel = emp.role === 'agent' ? tr.agents : tr.delivery
      const statusColor = emp.online ? '#22c55e' : '#ef4444'
      const statusLabel = emp.online ? tr.online : tr.offline
      const popupHtml = `
        <div style="min-width:130px;font-family:sans-serif;">
          <div style="font-weight:700;font-size:12px;margin-bottom:3px;">${emp.name}</div>
          <div style="font-size:10px;color:#6b7280;">${roleLabel}</div>
          <div style="font-size:10px;color:${statusColor};font-weight:600;">${statusLabel}</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:3px;">${emp.lastSeen || '—'}</div>
        </div>`

      const existing = markersRef.current.get(key)
      if (existing) {
        const cur = existing.getLatLng()
        if (Math.abs(cur.lat - lat) > 1e-7 || Math.abs(cur.lng - lng) > 1e-7) {
          existing.setLatLng([lat, lng])
        }
        existing.setIcon(makeMarkerIcon(emp.role, emp.online, emp.name))
        existing.setPopupContent(popupHtml)
        return
      }

      const marker = L.marker([lat, lng], { icon: makeMarkerIcon(emp.role, emp.online, emp.name) })
      marker.bindPopup(popupHtml, { closeButton: false })
      marker.addTo(map)
      markersRef.current.set(key, marker)
    })

    if (!cameraReadyRef.current && visible.length >= 1) {
      try {
        const group = L.featureGroup([...markersRef.current.values()])
        const bounds = group.getBounds()
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.35), { animate: false, maxZoom: 14 })
        }
      } catch {
        map.setView(NAVOIY, 13, { animate: false })
      }
      cameraReadyRef.current = true
    }
  }, [employees, onlineOnly, tr])

  const online = employees.filter(e => e.online && e.lat != null && e.lng != null && isInServiceArea(e.lat, e.lng)).length
  const total = employees.filter(e => e.lat != null && e.lng != null && isInServiceArea(e.lat, e.lng)).length

  return (
    <div style={{ position: 'relative', width: '100%', height, overflow: 'hidden', isolation: 'isolate' }}>
      <div ref={divRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      <div style={{
        position: 'absolute', bottom: 8, right: 8, zIndex: 400,
        display: 'flex', flexDirection: 'column', borderRadius: 6, overflow: 'hidden',
        boxShadow: '0 1px 5px rgba(0,0,0,0.3)',
        border: dark ? '1px solid #374151' : '1px solid #d1d5db',
      }}>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 700, cursor: 'pointer', border: 'none',
            background: dark ? '#1f2937' : '#fff', color: dark ? '#f9fafb' : '#374151',
          }}
        >+</button>
        <div style={{ height: 1, background: dark ? '#374151' : '#e5e7eb' }} />
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 700, cursor: 'pointer', border: 'none',
            background: dark ? '#1f2937' : '#fff', color: dark ? '#f9fafb' : '#374151',
          }}
        >−</button>
      </div>

      <button
        type="button"
        onClick={() => setOnlineOnly(v => !v)}
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 400,
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '5px 9px', borderRadius: 10, border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 700,
          background: onlineOnly ? '#4f46e5' : dark ? 'rgba(31,41,55,0.88)' : 'rgba(255,255,255,0.9)',
          color: onlineOnly ? '#fff' : dark ? '#d1d5db' : '#4b5563',
          boxShadow: '0 1px 5px rgba(0,0,0,0.2)',
        }}
      >
        {online}/{total} {tr.online}
      </button>

      {showLayerSwitcher && (
        <MapLayerSwitcher
          activeLayer={activeLayer}
          onChange={setActiveLayer}
          dark={dark}
          labels={{ standard: tr.mapLayerOsm, satellite: tr.mapLayerSat }}
          bottom={10}
          left={8}
        />
      )}
    </div>
  )
}
