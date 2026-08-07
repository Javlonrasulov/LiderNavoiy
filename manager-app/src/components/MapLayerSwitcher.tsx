import type { MutableRefObject } from 'react'
import L from 'leaflet'

export type LayerId = 'standard' | 'satellite' | 'humanitarian' | 'topographic'

type LayerDef = {
  id: LayerId
  label: string
  url: string
  options: L.TileLayerOptions
  darkInvert?: boolean
}

const LAYERS: LayerDef[] = [
  {
    id: 'standard',
    label: 'OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 19, subdomains: ['a', 'b', 'c'], attribution: '&copy; OpenStreetMap' },
    darkInvert: true,
  },
  {
    id: 'humanitarian',
    label: 'HOT',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    options: { maxZoom: 20, subdomains: ['a', 'b', 'c'], attribution: '&copy; HOT & OSM' },
  },
  {
    id: 'topographic',
    label: 'Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 17, subdomains: ['a', 'b', 'c'], attribution: '&copy; OpenTopoMap' },
  },
  {
    id: 'satellite',
    label: 'Sat',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 19, attribution: '&copy; Esri' },
  },
]

export function switchTileLayer(
  map: L.Map,
  tileLayerRef: MutableRefObject<L.TileLayer | null>,
  layerId: LayerId,
  darkFilter?: boolean,
) {
  if (tileLayerRef.current) map.removeLayer(tileLayerRef.current)
  const def = LAYERS.find(l => l.id === layerId) ?? LAYERS[0]
  tileLayerRef.current = L.tileLayer(def.url, def.options).addTo(map)
  const pane = map.getPane('tilePane')
  if (pane) {
    pane.style.filter = darkFilter && def.darkInvert
      ? 'invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.7)'
      : 'none'
  }
}

interface Props {
  activeLayer: LayerId
  onChange: (id: LayerId) => void
  dark: boolean
  bottom?: number
  left?: number
}

export function MapLayerSwitcher({ activeLayer, onChange, dark, bottom = 12, left = 8 }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom,
        left,
        zIndex: 500,
        display: 'flex',
        gap: 4,
        padding: 4,
        borderRadius: 10,
        background: dark ? 'rgba(17,24,39,0.88)' : 'rgba(255,255,255,0.92)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        border: dark ? '1px solid #374151' : '1px solid #e5e7eb',
      }}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
    >
      {LAYERS.map(l => {
        const active = l.id === activeLayer
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => onChange(l.id)}
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '5px 8px',
              borderRadius: 7,
              fontSize: 10,
              fontWeight: 700,
              background: active ? '#6366f1' : 'transparent',
              color: active ? '#fff' : dark ? '#d1d5db' : '#4b5563',
            }}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
