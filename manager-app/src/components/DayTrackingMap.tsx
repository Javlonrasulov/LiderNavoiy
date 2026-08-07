import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapLayerSwitcher, switchTileLayer, type LayerId } from './MapLayerSwitcher'
import type { PointStatus } from '../api/types'
import type { TrackPoint } from '../utils/dayTrack'
import type { Translations } from '../i18n'

const NAVOIY: [number, number] = [40.0843, 65.3791]

function isVisitedOnSite(status: PointStatus): boolean {
  return status === 'ordered' || status === 'visited'
}

function statusColor(status: PointStatus): string {
  if (status === 'ordered') return '#10b981'
  if (status === 'visited') return '#f59e0b'
  if (status === 'client_ordered') return '#0ea5e9'
  if (status === 'remote_ordered') return '#6366f1'
  return '#9ca3af'
}

function toNumCoord(lat: number, lng: number): [number, number] | null {
  const la = Number(lat)
  const ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null
  if (la === 0 && ln === 0) return null
  return [la, ln]
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function makeVisitedIcon(p: TrackPoint, visitOrder: number, dark: boolean): L.DivIcon {
  const markerColor = statusColor(p.status)
  const borderColor = dark ? '#1a1a1a' : '#ffffff'
  const shortName = escapeHtml(p.name.length > 14 ? `${p.name.slice(0, 13)}…` : p.name)
  return L.divIcon({
    className: '',
    iconSize: [36, 52],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
        <div style="width:34px;height:34px;border-radius:50%;background:${markerColor};border:3px solid ${borderColor};
          box-shadow:0 3px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
          <span style="font-size:13px;font-weight:800;color:#fff;line-height:1;">${visitOrder}</span>
        </div>
        <div style="max-width:88px;padding:2px 6px;border-radius:6px;background:${dark ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.95)'};
          border:1px solid ${markerColor}55;box-shadow:0 1px 4px rgba(0,0,0,0.15);">
          <span style="font-size:9px;font-weight:600;color:${dark ? '#f9fafb' : '#111827'};
            display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">${shortName}</span>
        </div>
      </div>`,
  })
}

function makeRemoteIcon(dark: boolean): L.DivIcon {
  const borderColor = dark ? '#1a1a1a' : '#ffffff'
  return L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#6366f1;border:2px solid ${borderColor};
      box-shadow:0 2px 6px rgba(0,0,0,0.3);opacity:0.9;"></div>`,
  })
}

function makeClientIcon(dark: boolean): L.DivIcon {
  const borderColor = dark ? '#1a1a1a' : '#ffffff'
  return L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#0ea5e9;border:2px solid ${borderColor};
      box-shadow:0 2px 6px rgba(0,0,0,0.3);opacity:0.9;"></div>`,
  })
}

interface Props {
  points: TrackPoint[]
  gpsTrail?: { lat: number; lng: number }[]
  empLocation?: { lat: number; lng: number; online: boolean } | null
  dark: boolean
  tr: Translations
  height?: number
}

export default function DayTrackingMap({
  points,
  gpsTrail = [],
  empLocation,
  dark,
  tr,
  height = 260,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const [activeLayer, setActiveLayer] = useState<LayerId>('standard')

  useEffect(() => {
    if (!divRef.current || mapRef.current) return
    const map = L.map(divRef.current, {
      center: NAVOIY,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      zoomAnimation: false,
      maxBounds: [[36.5, 54.5], [46.2, 74.0]],
      maxBoundsViscosity: 0.8,
    })
    switchTileLayer(map, tileRef, activeLayer, false)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    const t1 = window.setTimeout(() => map.invalidateSize(true), 100)
    const t2 = window.setTimeout(() => map.invalidateSize(true), 400)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      map.remove()
      mapRef.current = null
      layerRef.current = null
      tileRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    switchTileLayer(map, tileRef, activeLayer, false)
  }, [activeLayer])

  useEffect(() => {
    const map = mapRef.current
    const group = layerRef.current
    if (!map || !group) return
    group.clearLayers()

    const bounds: L.LatLngExpression[] = []
    const onSite = points.filter(p => isVisitedOnSite(p.status) && p.hasCoords)
    let visitOrder = 0

    if (gpsTrail.length >= 2) {
      const latlngs = gpsTrail.map(p => [p.lat, p.lng] as [number, number])
      L.polyline(latlngs, {
        color: '#6366f1',
        weight: 3,
        opacity: 0.55,
        dashArray: '6 8',
      }).addTo(group)
      latlngs.forEach(ll => bounds.push(ll))
    }

    if (onSite.length >= 2) {
      const path = onSite
        .map(p => toNumCoord(p.lat, p.lng))
        .filter((c): c is [number, number] => !!c)
      if (path.length >= 2) {
        L.polyline(path, { color: '#10b981', weight: 3, opacity: 0.75 }).addTo(group)
      }
    }

    for (const p of points) {
      if (!p.hasCoords) continue
      const coord = toNumCoord(p.lat, p.lng)
      if (!coord) continue
      bounds.push(coord)

      let icon: L.DivIcon
      if (isVisitedOnSite(p.status)) {
        visitOrder += 1
        icon = makeVisitedIcon(p, visitOrder, dark)
      } else if (p.status === 'remote_ordered') {
        icon = makeRemoteIcon(dark)
      } else if (p.status === 'client_ordered') {
        icon = makeClientIcon(dark)
      } else {
        continue
      }

      L.marker(coord, { icon })
        .bindPopup(
          `<strong>${escapeHtml(p.name)}</strong><br/>${escapeHtml(p.time ?? '—')}<br/>${escapeHtml(p.address)}`,
        )
        .addTo(group)
    }

    if (empLocation) {
      const c = toNumCoord(empLocation.lat, empLocation.lng)
      if (c) {
        bounds.push(c)
        const color = empLocation.online ? '#22c55e' : '#9ca3af'
        L.circleMarker(c, {
          radius: 8,
          color: '#fff',
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
        })
          .bindPopup(empLocation.online ? tr.online : tr.offline)
          .addTo(group)
      }
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [36, 36], maxZoom: 15 })
    } else {
      map.setView(NAVOIY, 13)
    }
    window.setTimeout(() => map.invalidateSize(true), 80)
  }, [points, gpsTrail, empLocation, dark, tr.online, tr.offline])

  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      <div ref={divRef} style={{ width: '100%', height: '100%', borderRadius: 0 }} />
      <MapLayerSwitcher
        activeLayer={activeLayer}
        onChange={setActiveLayer}
        dark={dark}
        labels={{ standard: tr.mapLayerOsm, satellite: tr.mapLayerSat }}
        bottom={10}
        left={8}
      />
    </div>
  )
}
