import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import L from 'leaflet';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';

export type LayerId =
  | 'standard'
  | 'cyclosm'
  | 'cyclemap'
  | 'transport'
  | 'topographic'
  | 'humanitarian'
  | 'shortbread'
  | 'maptiler'
  | 'satellite';

interface LayerDef {
  id: LayerId;
  label: string;
  url: string;
  options: L.TileLayerOptions;
  thumb: string;
  /** Faqat oddiy OSM qatlamida dark mode invert qo'llanadi */
  darkInvert?: boolean;
}

const NAVOIY_THUMB = { z: 12, x: 2793, y: 1550 };

function thumb(url: string, { z, x, y } = NAVOIY_THUMB) {
  return url
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{s}', 'a');
}

function envKey(name: string): string | null {
  const key = (import.meta.env[name as keyof ImportMetaEnv] as string | undefined) ?? '';
  if (!key || key.startsWith('your-')) return null;
  return key;
}

/** OSM.org dagi qatlam URL — kalit bo'lsa Tracestrack/Thunderforest, aks holda bepul fallback */
export function resolveLayer(def: LayerDef): LayerDef {
  const ttKey = envKey('VITE_TRACESTRACK_KEY');
  if (def.id === 'topographic' && ttKey) {
    const q = encodeURIComponent(ttKey);
    return {
      ...def,
      url: `https://tile.tracestrack.com/topo__/{z}/{x}/{y}.png?key=${q}`,
      options: { maxZoom: 19, attribution: '&copy; Tracestrack & OpenStreetMap' },
      thumb: thumb(`https://tile.tracestrack.com/topo__/{z}/{x}/{y}.png?key=${q}`),
    };
  }

  const tfKey = envKey('VITE_THUNDERFOREST_KEY');
  if (tfKey) {
    const q = encodeURIComponent(tfKey);
    if (def.id === 'transport') {
      return {
        ...def,
        url: `https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${q}`,
        options: { maxZoom: 22, attribution: '&copy; Thunderforest & OpenStreetMap' },
        thumb: thumb(`https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${q}`),
      };
    }
    if (def.id === 'cyclemap') {
      return {
        ...def,
        url: `https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=${q}`,
        options: { maxZoom: 22, attribution: '&copy; Thunderforest & OpenStreetMap' },
        thumb: thumb(`https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=${q}`),
      };
    }
  }

  return def;
}

export function resolvedLayers(): LayerDef[] {
  return MAP_LAYERS.map(resolveLayer);
}

export const MAP_LAYERS: LayerDef[] = [
  {
    id: 'standard',
    label: 'Стандартный',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 19, subdomains: ['a', 'b', 'c'], attribution: '&copy; OpenStreetMap' },
    thumb: thumb('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
    darkInvert: true,
  },
  {
    id: 'cyclosm',
    label: 'CyclOSM',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    options: { maxZoom: 20, subdomains: ['a', 'b', 'c'], attribution: '&copy; CyclOSM & OpenStreetMap' },
    thumb: thumb('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'),
  },
  {
    id: 'cyclemap',
    label: 'Велосипедная',
    url: 'https://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png',
    options: { maxZoom: 18, subdomains: ['a', 'b', 'c'], attribution: '&copy; OpenCycleMap & OpenStreetMap' },
    thumb: thumb('https://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png'),
  },
  {
    id: 'transport',
    label: 'Транспорт',
    url: 'https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
    options: { maxZoom: 19, subdomains: ['a', 'b', 'c'], attribution: '&copy; OpenRailwayMap & OpenStreetMap' },
    thumb: thumb('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'),
  },
  {
    id: 'topographic',
    label: 'Топографическая',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 17, subdomains: ['a', 'b', 'c'], attribution: '&copy; OpenTopoMap & OpenStreetMap' },
    thumb: thumb('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'),
  },
  {
    id: 'humanitarian',
    label: 'Гуманитарная',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    options: { maxZoom: 20, subdomains: ['a', 'b', 'c'], attribution: '&copy; HOT & OpenStreetMap' },
    thumb: thumb('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'),
  },
  {
    id: 'shortbread',
    label: 'Shortbread',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    options: { maxZoom: 20, subdomains: ['a', 'b', 'c', 'd'], attribution: '&copy; CARTO & OpenStreetMap' },
    thumb: thumb('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'),
  },
  {
    id: 'maptiler',
    label: 'MapTiler OMT',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
    options: { maxZoom: 20, subdomains: ['a', 'b', 'c', 'd'], attribution: '&copy; CARTO & OpenStreetMap' },
    thumb: thumb('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png'),
  },
  {
    id: 'satellite',
    label: 'Спутник',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 19, attribution: '&copy; Esri' },
    thumb: thumb('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'),
  },
];

interface MapLayerSwitcherProps {
  activeLayer: LayerId;
  onChange: (id: LayerId) => void;
  bottom?: number;
  left?: number;
  /** O'ng tomonda zoom tugmalari uchun joy (px) */
  rightInset?: number;
}

function stopMapDrag(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function MapLayerSwitcher({
  activeLayer,
  onChange,
  bottom = 16,
  left = 12,
  rightInset = 40,
}: MapLayerSwitcherProps) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const layers = resolvedLayers();
  const active = layers.find(l => l.id === activeLayer) ?? layers[0];

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [open, updateScrollState]);

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const scrollBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.1)',
    background: 'rgba(255,255,255,0.95)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    padding: 0,
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom,
        left: open ? 8 : left,
        right: open ? rightInset : 'auto',
        zIndex: 1000,
        fontFamily: 'system-ui, sans-serif',
        pointerEvents: 'none',
      }}
    >
      {open && (
        <div
          style={{ position: 'relative', pointerEvents: 'auto' }}
          onMouseDown={stopMapDrag}
          onTouchStart={stopMapDrag}
          onDoubleClick={stopMapDrag}
        >
          {canScrollLeft && (
            <button
              type="button"
              aria-label="Chapga"
              onClick={() => scrollBy(-120)}
              style={{ ...scrollBtnStyle, left: 4 }}
            >
              <ChevronLeft size={16} color="#374151" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              aria-label="O'ngga"
              onClick={() => scrollBy(120)}
              style={{ ...scrollBtnStyle, right: 4 }}
            >
              <ChevronRight size={16} color="#374151" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="map-layer-scroll show-sb"
            onWheel={stopMapDrag}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(12px)',
              borderRadius: 16,
              padding: '10px 36px 12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
              border: '1px solid rgba(0,0,0,0.08)',
              width: '100%',
              maxWidth: '100%',
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorX: 'contain',
              scrollSnapType: 'x proximity',
              scrollbarWidth: 'thin',
              touchAction: 'pan-x',
            }}
          >
            {layers.map(layer => {
              const isActive = layer.id === activeLayer;
              const size = 58;
              return (
                <button
                  key={layer.id}
                  type="button"
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
                    flexShrink: 0,
                    scrollSnapAlign: 'start',
                  }}
                >
                  <div style={{
                    width: size,
                    height: size,
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: isActive ? '3px solid #4285f4' : '2.5px solid rgba(0,0,0,0.12)',
                    boxShadow: isActive ? '0 0 0 2px rgba(66,133,244,0.25)' : '0 2px 6px rgba(0,0,0,0.15)',
                    background: '#e5e7eb',
                  }}>
                    <img
                      src={layer.thumb}
                      alt={layer.label}
                      draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#1a73e8' : '#3c4043',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}>
                    {layer.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Xarita qatlamlari"
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            border: '2px solid rgba(0,0,0,0.15)',
            background: 'rgba(255,255,255,0.97)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            overflow: 'hidden',
            position: 'relative',
            pointerEvents: 'auto',
          }}
        >
          <img
            src={active.thumb}
            alt={active.label}
            draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Layers size={18} color="#fff" />
          </div>
        </button>
      )}

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Yopish"
          style={{
            position: 'absolute',
            top: -36,
            left: 0,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,0.1)',
            background: 'rgba(255,255,255,0.95)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            padding: 0,
            fontSize: 18,
            lineHeight: 1,
            color: '#374151',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export function switchTileLayer(
  map: L.Map,
  tileLayerRef: MutableRefObject<L.TileLayer | null>,
  layerId: LayerId,
  darkFilter?: boolean,
) {
  if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
  const base = MAP_LAYERS.find(l => l.id === layerId) ?? MAP_LAYERS[0];
  const def = resolveLayer(base);
  tileLayerRef.current = L.tileLayer(def.url, def.options).addTo(map);
  const pane = map.getPane('tilePane');
  if (pane) {
    const useInvert = Boolean(darkFilter && def.darkInvert);
    pane.style.filter = useInvert
      ? 'invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.7)'
      : 'none';
  }
}

export function applyDarkTileFilter(map: L.Map, dark: boolean, layerId: LayerId = 'standard') {
  const def = MAP_LAYERS.find(l => l.id === layerId) ?? MAP_LAYERS[0];
  const pane = map.getPane('tilePane');
  if (pane) {
    const useInvert = Boolean(dark && def.darkInvert);
    pane.style.filter = useInvert
      ? 'invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.7)'
      : 'none';
  }
}

export function getDefaultTileLayer(dark?: boolean): L.TileLayer {
  const def = MAP_LAYERS[0];
  const layer = L.tileLayer(def.url, def.options);
  if (dark) {
    layer.on('add', () => {
      const pane = layer.getContainer()?.parentElement;
      if (pane) pane.style.filter = 'invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.7)';
    });
  }
  return layer;
}
