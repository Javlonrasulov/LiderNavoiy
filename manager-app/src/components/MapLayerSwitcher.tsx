import type { MutableRefObject } from 'react'
import L from 'leaflet'

export type LayerId = 'standard' | 'satellite'

type LayerDef = {
  id: LayerId
  url: string
  options: L.TileLayerOptions
}

const LAYERS: LayerDef[] = [
  {
    id: 'standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 19, subdomains: ['a', 'b', 'c'], attribution: '&copy; OpenStreetMap' },
  },
  {
    id: 'satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 19, attribution: '&copy; Esri' },
  },
]

export function switchTileLayer(
  map: L.Map,
  tileLayerRef: MutableRefObject<L.TileLayer | null>,
  layerId: LayerId,
  _darkFilter?: boolean,
) {
  if (tileLayerRef.current) map.removeLayer(tileLayerRef.current)
  const def = LAYERS.find(l => l.id === layerId) ?? LAYERS[0]
  tileLayerRef.current = L.tileLayer(def.url, def.options).addTo(map)
  const pane = map.getPane('tilePane')
  if (pane) pane.style.filter = 'none'
}

interface Props {
  activeLayer: LayerId
  onChange: (id: LayerId) => void
  dark: boolean
  labels: { standard: string; satellite: string }
  bottom?: number
  left?: number
}

export function MapLayerSwitcher({
  activeLayer,
  onChange,
  dark,
  labels,
  bottom = 10,
  left = 8,
}: Props) {
  const items: { id: LayerId; label: string }[] = [
    { id: 'standard', label: labels.standard },
    { id: 'satellite', label: labels.satellite },
  ]

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
      {items.map(l => {
        const active = l.id === activeLayer
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => onChange(l.id)}
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '5px 9px',
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
