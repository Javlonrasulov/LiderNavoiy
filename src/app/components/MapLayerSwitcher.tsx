import { useState } from 'react';
import L from 'leaflet';
import { Layers } from 'lucide-react';

export type LayerId = 'standard' | 'satellite' | 'terrain' | 'cycle';

interface LayerDef {
  id: LayerId;
  label: string;
  url: string;
  options: Record<string, unknown>;
  thumb: string;
}

// Navoiy city tile coords at zoom 12 → x=2793, y=1550
export const MAP_LAYERS: LayerDef[] = [
  {
    id: 'standard',
    label: 'Standart',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 19, subdomains: ['a', 'b', 'c'] },
    thumb: 'https://a.tile.openstreetmap.org/12/2793/1550.png',
  },
  {
    id: 'satellite',
    label: 'Спутник',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 19 },
    thumb: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1550/2793',
  },
  {
    id: 'terrain',
    label: 'Рельеф',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 17, subdomains: ['a', 'b', 'c'] },
    thumb: 'https://a.tile.opentopomap.org/12/2793/1550.png',
  },
  {
    id: 'cycle',
    label: 'Велосипед',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    options: { maxZoom: 20, subdomains: ['a', 'b', 'c'] },
    thumb: 'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/12/2793/1550.png',
  },
];

interface MapLayerSwitcherProps {
  activeLayer: LayerId;
  onChange: (id: LayerId) => void;
  /** position from bottom of map container */
  bottom?: number;
  /** position from left */
  left?: number;
}

export function MapLayerSwitcher({
  activeLayer,
  onChange,
  bottom = 16,
  left = 12,
}: MapLayerSwitcherProps) {
  const [open, setOpen] = useState(false);

  const active = MAP_LAYERS.find(l => l.id === activeLayer) ?? MAP_LAYERS[0];
  // Show active first, then others
  const ordered = [active, ...MAP_LAYERS.filter(l => l.id !== activeLayer)];

  return (
    <div
      style={{
        position: 'absolute',
        bottom,
        left,
        zIndex: 1000,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Expanded panel — Google Maps style */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            display: 'flex',
            gap: 6,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
            borderRadius: 16,
            padding: '10px 12px 12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            border: '1px solid rgba(0,0,0,0.08)',
            alignItems: 'flex-end',
          }}
        >
          {ordered.map((layer, i) => {
            const isActive = layer.id === activeLayer;
            return (
              <button
                key={layer.id}
                onClick={() => { onChange(layer.id); setOpen(false); }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: i === 0 ? 72 : 58,
                    height: i === 0 ? 72 : 58,
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: isActive
                      ? '3px solid #4285f4'
                      : '2.5px solid rgba(0,0,0,0.12)',
                    boxShadow: isActive
                      ? '0 0 0 2px rgba(66,133,244,0.25)'
                      : '0 2px 6px rgba(0,0,0,0.15)',
                    transition: 'all .15s',
                    flexShrink: 0,
                    background: '#e5e7eb',
                  }}
                >
                  <img
                    src={layer.thumb}
                    alt={layer.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: i === 0 ? 12 : 11,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#1a73e8' : '#3c4043',
                    whiteSpace: 'nowrap',
                    maxWidth: 72,
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {layer.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          border: '2px solid rgba(0,0,0,0.15)',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          display: open ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          overflow: 'hidden',
          position: 'relative',
        }}
        title="Xarita turi"
      >
        <img
          src={active.thumb}
          alt={active.label}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Layers size={18} color="#fff" />
        </div>
      </button>
    </div>
  );
}

/** Switch tile layer on a Leaflet map */
export function switchTileLayer(
  map: L.Map,
  tileLayerRef: React.MutableRefObject<L.TileLayer | null>,
  layerId: LayerId,
  darkFilter?: boolean,
) {
  if (tileLayerRef.current) {
    map.removeLayer(tileLayerRef.current);
  }
  const def = MAP_LAYERS.find(l => l.id === layerId) ?? MAP_LAYERS[0];
  const newTile = L.tileLayer(def.url, def.options as L.TileLayerOptions).addTo(map);
  tileLayerRef.current = newTile;

  // Reapply dark filter if needed
  if (darkFilter !== undefined) {
    setTimeout(() => {
      const tilePane = map.getPane('tilePane');
      if (tilePane) {
        tilePane.style.filter = darkFilter
          ? 'invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.7)'
          : 'none';
      }
    }, 50);
  }
}
