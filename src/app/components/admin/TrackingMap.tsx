import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Maximize2, Minimize2, Pause, Play, RotateCcw, Scan, Navigation, MapPin, Route } from 'lucide-react';
import { MapLayerSwitcher, switchTileLayer, type LayerId } from '../MapLayerSwitcher';
import type { GpsTrailPoint, TrackingVisit } from '../../api/agentTrackingTypes';
import type { TrackingOrder } from '../../api/agentTrackingTypes';
import type { TrackPoint } from '../../utils/agentTracking';
import { fmtClock } from '../../utils/agentTracking';
import { replayPosition, splitGpsTrack, visitMovements } from '../../utils/trackingMapData';
import './TrackingMap.css';

interface TrackingMapProps {
  points: TrackPoint[]; D: boolean; height?: number; startCity?: string; endCity?: string;
  empLocation?: { lat: number; lng: number; online: boolean; lastSeen?: string };
  gpsTrail?: GpsTrailPoint[]; visits?: TrackingVisit[]; filter?: string | null;
  clientOrders?: TrackingOrder[];
  onFilterChange?: (filter: string | null) => void; t?: Record<string, string>;
}
const EMPTY_TRAIL: GpsTrailPoint[] = [];
const EMPTY_VISITS: TrackingVisit[] = [];
const COLORS: Record<string, string> = { ordered: '#10b981', visited: '#f59e0b', remote_ordered: '#8b5cf6', missed: '#94a3b8' };
const LABELS: Record<string, string> = { ordered: 'Borildi, zakaz olindi', visited: 'Borildi, zakaz olinmadi', remote_ordered: 'Bormay, zakaz olindi', missed: 'Borilmadi, zakaz olinmadi' };
function escape(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
function popup(p: TrackPoint) {
  return `<div class="tracking-shop-popup"><strong>${escape(p.name)}</strong><p>${escape(p.address || 'Manzil kiritilmagan')} · ${escape(p.lineName)}</p>
    <div style="color:${COLORS[p.status]}">${escape(LABELS[p.status])}</div>
    ${p.visits.length ? `<p>Tashriflar: ${p.visits.map(v => `#${v.sequence} · ${escape(fmtClock(v.arrivedAt))}`).join(' / ')}</p>` : '<p>Tasdiqlangan tashrif yo‘q</p>'}
    ${p.orders.length ? `<div class="tracking-popup-orders">${p.orders.map(o => `<div><b>${o.source === 'client' ? 'Mijoz ilovasi' : o.source === 'agent' ? 'Agent' : 'Avtosavdo'} · #${escape(o.id.slice(0, 8))}</b><br/>${escape(fmtClock(o.createdAt))} · ${escape(o.status)} · ${escape(o.netAmount.toLocaleString())} so‘m${o.returnedAmount > 0 ? `<br/>Qaytarilgan: ${escape(o.returnedAmount.toLocaleString())} so‘m` : ''}</div>`).join('')}</div>` : '<p>Buyurtma yo‘q</p>'}
    ${p.visitUnverified ? '<small>GPS tashrifni tasdiqlash uchun yetarli emas</small>' : ''}</div>`;
}

export function TrackingMap({ points, D, height = 560, empLocation, gpsTrail = EMPTY_TRAIL, visits = EMPTY_VISITS, clientOrders = [], filter, onFilterChange }: TrackingMapProps) {
  const root = useRef<HTMLDivElement>(null), container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null), tileRef = useRef<L.TileLayer | null>(null);
  const markers = useRef<L.LayerGroup | null>(null), replayMarker = useRef<L.Marker | null>(null);
  const [layer, setLayer] = useState<LayerId>('standard');
  const [fullscreen, setFullscreen] = useState(false), [visitedOnly, setVisitedOnly] = useState(false);
  const [playing, setPlaying] = useState(false), [progress, setProgress] = useState(0), [speed, setSpeed] = useState(60);
  const [tilesError, setTilesError] = useState(false);
  const progressRef = useRef(0);
  const fitRef = useRef<() => void>(() => {});
  const visible = useMemo(() => points.filter(p => p.hasCoords && (!visitedOnly || p.visits.length > 0)
    && (!filter || (filter === 'client_ordered' ? p.orders.some(o => o.source === 'client') : filter === 'no_gps' ? false : p.status === filter))), [points, filter, visitedOnly]);
  const movements = useMemo(() => visitMovements(visits, points, gpsTrail), [visits, points, gpsTrail]);
  const position = useMemo(() => replayPosition(gpsTrail, progress), [gpsTrail, progress]);
  const fit = () => {
    const map = mapRef.current;
    if (!map) return;
    const coords: [number, number][] = [...visible.map(p => [p.lat, p.lng] as [number, number]), ...gpsTrail.map(p => [p.lat, p.lng] as [number, number])];
    if (empLocation) coords.push([empLocation.lat, empLocation.lng]);
    if (coords.length) map.fitBounds(L.latLngBounds(coords), { padding: [56, 80], maxZoom: 17, animate: false });
    else map.setView([40.0843, 65.3791], 12);
  };
  fitRef.current = fit;

  useEffect(() => {
    if (!container.current) return;
    // Leaflet 1.9 leaves a zoom-transition timer alive after remove(); quick day/agent switches
    // can then touch a destroyed pane. Keep camera changes synchronous; route playback stays animated.
    const map = L.map(container.current, { center: [40.0843, 65.3791], zoom: 12, zoomControl: false, zoomAnimation: false, attributionControl: true, preferCanvas: false });
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapRef.current = map;
    markers.current = L.layerGroup().addTo(map);
    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => fitRef.current());
    });
    observer.observe(container.current);
    return () => { observer.disconnect(); cancelAnimationFrame(resizeFrame); map.remove(); mapRef.current = null; tileRef.current = null; markers.current = null; replayMarker.current = null; };
  }, []);
  useEffect(() => {
    if (!mapRef.current) return;
    setTilesError(false);
    switchTileLayer(mapRef.current, tileRef, layer, D);
    const tile = tileRef.current;
    const onError = () => setTilesError(true);
    tile?.on('tileerror', onError);
    return () => { tile?.off('tileerror', onError); };
  }, [layer, D]);
  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  const toggleFullscreen = async () => {
    if (fullscreen) {
      if (document.fullscreenElement === root.current) await document.exitFullscreen();
      setFullscreen(false);
    } else {
      setFullscreen(true);
      try { await root.current?.requestFullscreen(); } catch { /* CSS fullscreen supports browsers without the native API. */ }
    }
  };
  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escapeKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', escapeKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', escapeKey); };
  }, [fullscreen]);
  useEffect(() => { const frame = requestAnimationFrame(fit); return () => cancelAnimationFrame(frame); }, [gpsTrail, points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const group = L.layerGroup().addTo(map);
    for (const segment of splitGpsTrack(gpsTrail)) {
      L.polyline(segment.coords, { color: segment.gap ? '#94a3b8' : '#64748b', weight: segment.gap ? 2 : 3, opacity: segment.gap ? .6 : .45,
        dashArray: segment.gap ? '3 8' : undefined, lineCap: 'round', interactive: false }).addTo(group);
    }
    for (const s of movements) {
      L.polyline(s.coords, { color: s.gap ? '#a78bfa' : '#7c3aed', weight: s.gap ? 2.5 : 5, opacity: s.gap ? .7 : .85,
        dashArray: s.gap ? '4 9' : undefined, lineCap: 'round', lineJoin: 'round', smoothFactor: .6, interactive: false,
        className: s.gap ? '' : 'tracking-route-stroke' }).addTo(group);
    }
    // Arrow orientation is recalculated in screen space after map zooms.
    const arrows = L.layerGroup().addTo(group);
    const redrawArrows = () => {
      arrows.clearLayers();
      const candidates = movements.length ? movements : splitGpsTrack(gpsTrail).filter(s => !s.gap);
      const segments = candidates.filter(s => s.coords.length > 1);
      const stride = Math.max(1, Math.ceil(segments.length / 24));
      segments.forEach((s, i) => {
        if (i % stride) return;
        const n = Math.max(1, Math.floor(s.coords.length / 2)), a = s.coords[n - 1], b = s.coords[n];
        const pa = map.latLngToLayerPoint(a), pb = map.latLngToLayerPoint(b);
        if (pa.distanceTo(pb) < 2) return;
        const angle = Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180 / Math.PI;
        L.marker([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], { interactive: false, icon: L.divIcon({ className: 'tracking-arrow', iconSize: [20, 20], iconAnchor: [10, 10],
          html: `<span style="transform:rotate(${angle}deg);color:${s.gap ? '#a78bfa' : '#7c3aed'}">➜</span>` }) }).addTo(arrows);
      });
    };
    redrawArrows(); map.on('zoomend', redrawArrows);
    return () => { map.off('zoomend', redrawArrows); group.remove(); };
  }, [gpsTrail, movements]);

  useEffect(() => {
    const map = mapRef.current, group = markers.current;
    if (!map || !group) return;
    const draw = () => {
      group.clearLayers();
      // Screen-space aggregation also handles identical coordinates at maximum zoom.
      const clusters: { center: L.Point; shops: TrackPoint[] }[] = [];
      const buckets = new Map<string, number[]>();
      for (const p of visible) {
        const pixel = map.latLngToLayerPoint([p.lat, p.lng]);
        const x = Math.floor(pixel.x / 54), y = Math.floor(pixel.y / 54);
        let cluster: number | undefined;
        for (let dx = -1; dx <= 1 && cluster === undefined; dx++) for (let dy = -1; dy <= 1; dy++) {
          cluster = buckets.get(`${x + dx}:${y + dy}`)?.find(i => clusters[i].center.distanceTo(pixel) < 54);
          if (cluster !== undefined) break;
        }
        if (cluster !== undefined) clusters[cluster].shops.push(p);
        else { const i = clusters.push({ center: pixel, shops: [p] }) - 1; const key = `${x}:${y}`; buckets.set(key, [...(buckets.get(key) ?? []), i]); }
      }
      for (const c of clusters) {
        const p = c.shops[0];
        if (c.shops.length > 1) {
          const ordered = c.shops.some(s => s.visits.length > 0);
          const marker = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: 'tracking-cluster', iconSize: [42, 42], iconAnchor: [21, 21],
            html: `<span style="--marker-color:${ordered ? '#7c3aed' : '#64748b'}">${c.shops.length}</span>` }) }).addTo(group);
          marker.bindTooltip(`${c.shops.length} magazin · ochish uchun bosing`);
          marker.on('click', () => {
            if (map.getZoom() < 18) map.fitBounds(L.latLngBounds(c.shops.map(s => [s.lat, s.lng])), { maxZoom: Math.min(18, map.getZoom() + 2), padding: [80, 80] });
            else marker.bindPopup(`<div class="tracking-cluster-list">${c.shops.map(popup).join('')}</div>`, { maxWidth: 330, maxHeight: 360, className: D ? 'tracking-popup dark' : 'tracking-popup' }).openPopup();
          });
        } else {
          const sequence = p.visits.map(v => v.sequence).join(' · ');
          const color = COLORS[p.status];
          const icon = L.divIcon({ className: 'tracking-shop-marker', iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -20],
            html: `<span class="${p.visits.length ? 'is-visited' : 'is-planned'}" style="--marker-color:${color}">${sequence ? escape(sequence.length > 5 ? `${p.visits[0].sequence}+` : sequence) : '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h18l-2-6H5l-2 6ZM5 10v10h14V10M9 20v-7h6v7"/></svg>'}</span>` });
          L.marker([p.lat, p.lng], { icon, zIndexOffset: p.visits.length ? 100 : 0 }).bindTooltip(escape(p.name), { direction: 'top', offset: [0, -20] })
            .bindPopup(popup(p), { maxWidth: 330, maxHeight: 360, className: D ? 'tracking-popup dark' : 'tracking-popup' }).addTo(group);
        }
      }
    };
    draw(); map.on('zoomend moveend', draw);
    return () => { map.off('zoomend moveend', draw); group.clearLayers(); };
  }, [visible, D]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !empLocation) return;
    const color = empLocation.online ? '#10b981' : '#64748b';
    const marker = L.marker([empLocation.lat, empLocation.lng], { zIndexOffset: 500, icon: L.divIcon({ className: 'tracking-agent', iconSize: [34, 34], iconAnchor: [17, 17],
      html: `<span style="background:${color}"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="8" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/></svg></span>` }) }).addTo(map);
    marker.bindTooltip(empLocation.online ? 'Agent · hozir online' : `Agent · ${empLocation.lastSeen || 'oxirgi GPS'}`);
    return () => { marker.remove(); };
  }, [empLocation]);
  useEffect(() => {
    setPlaying(false); setProgress(0); progressRef.current = 0;
  }, [gpsTrail]);
  useEffect(() => {
    if (!playing || gpsTrail.length < 2) return;
    let frame = 0, previous = performance.now(), lastRender = previous;
    const duration = Math.max(1000, +new Date(gpsTrail[gpsTrail.length - 1].recordedAt) - +new Date(gpsTrail[0].recordedAt));
    const animate = (now: number) => {
      progressRef.current = Math.min(1, progressRef.current + (now - previous) * speed / duration);
      previous = now;
      const pos = replayPosition(gpsTrail, progressRef.current);
      if (pos) replayMarker.current?.setLatLng([pos.lat, pos.lng]);
      if (now - lastRender >= 100 || progressRef.current === 1) { setProgress(progressRef.current); lastRender = now; }
      if (progressRef.current === 1) { setPlaying(false); return; }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, gpsTrail]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;
    if (!replayMarker.current) replayMarker.current = L.marker([position.lat, position.lng], { zIndexOffset: 1000, interactive: false,
      icon: L.divIcon({ className: 'tracking-replay-marker', iconSize: [22, 22], iconAnchor: [11, 11], html: '<span></span>' }) }).addTo(map);
    replayMarker.current.setLatLng([position.lat, position.lng]);
  }, [position]);
  const seek = (value: number) => { progressRef.current = value; setProgress(value); };
  return (
    <div ref={root} className={`tracking-map ${D ? 'dark' : ''} ${fullscreen ? 'is-fullscreen' : ''}`} style={{ height: fullscreen ? '100dvh' : height }}>
      <div ref={container} className="tracking-map-canvas" />
      <div className="tracking-map-toolbar">
        <div className="tracking-segmented">
          <button type="button" className={!visitedOnly ? 'active' : ''} onClick={() => setVisitedOnly(false)}><MapPin size={13}/> Barcha magazinlar</button>
          <button type="button" className={visitedOnly ? 'active' : ''} onClick={() => setVisitedOnly(true)}><Route size={13}/> Tashriflar</button>
        </div>
        <span className="tracking-map-count">{visible.length} magazin</span>
      </div>
      <div className="tracking-map-actions">
        <button type="button" title="Barcha nuqtalarni ko‘rsatish" aria-label="Barcha nuqtalarni ko‘rsatish" onClick={fit}><Scan size={17}/></button>
        <button type="button" title={fullscreen ? 'Kichraytirish' : 'To‘liq ekran'} aria-label={fullscreen ? 'Kichraytirish' : 'To‘liq ekran'} aria-pressed={fullscreen} onClick={toggleFullscreen}>{fullscreen ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}</button>
      </div>
      {fullscreen && onFilterChange && <div className="tracking-fullscreen-filters">
        <button type="button" className={!filter ? 'active' : ''} onClick={() => onFilterChange(null)}>Hammasi</button>
        {Object.entries(LABELS).map(([key, label]) => <button type="button" key={key} className={filter === key ? 'active' : ''} onClick={() => onFilterChange(key)}><i style={{ background: COLORS[key] }}/>{label} · {points.filter(p => p.status === key).length}</button>)}
        <button type="button" className={filter === 'client_ordered' ? 'active' : ''} onClick={() => onFilterChange('client_ordered')}>Mijoz ilovasi · {clientOrders.length}</button>
        <button type="button" className={filter === 'no_gps' ? 'active' : ''} onClick={() => onFilterChange('no_gps')}>GPSsiz mijozlar · {points.filter(p => !p.hasCoords).length}</button>
      </div>}
      {fullscreen && (filter === 'client_ordered' || filter === 'no_gps') && <div className="tracking-fullscreen-list">
        <strong>{filter === 'no_gps' ? 'GPSsiz mijozlar' : 'Mijoz ilovasi buyurtmalari'}</strong>
        {filter === 'no_gps' ? points.filter(p => !p.hasCoords).map(p => <div key={p.clientId}><b>{p.name}</b><span>{p.lineName} · {p.address || 'Manzil kiritilmagan'}</span></div>)
          : clientOrders.map(o => <div key={o.id}><b>{o.clientName || points.find(p => p.clientId === o.clientId)?.name || `Mijoz #${o.clientId.slice(0, 8)}`}</b><span>#{o.id.slice(0, 8)} · {fmtClock(o.createdAt)} · {o.status} · {o.netAmount.toLocaleString()} so‘m</span></div>)}
      </div>}
      {tilesError && <div className="tracking-map-notice" role="alert">Xarita qatlamini yuklab bo‘lmadi. Boshqa qatlamni tanlang.</div>}
      {!visible.length && !gpsTrail.length && !empLocation && <div className="tracking-map-empty"><MapPin size={28}/><strong>Xarita uchun GPS ma’lumoti yo‘q</strong><span>GPSsiz mijozlar quyidagi ro‘yxatda saqlanadi.</span></div>}
      <MapLayerSwitcher activeLayer={layer} onChange={setLayer} bottom={118} left={16}/>
      <div className="tracking-map-legend"><span><i style={{ background: '#7c3aed' }}/>Haqiqiy GPS trek</span><span><i className="dashed"/>GPSsiz oraliq / nuqtalar bog‘lanishi</span></div>
      <div className="tracking-replay">
        <button type="button" aria-label={playing ? 'Pauza' : 'Marshrutni ijro etish'} disabled={gpsTrail.length < 2} className="tracking-play" onClick={() => { if (progress >= 1) seek(0); setPlaying(v => !v); }}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button>
        <button type="button" aria-label="Qayta boshlash" disabled={!gpsTrail.length} onClick={() => { setPlaying(false); seek(0); }}><RotateCcw size={15}/></button>
        <div className="tracking-replay-range"><div><span><Navigation size={11}/> {position ? fmtClock(position.recordedAt) : 'GPS trek yo‘q'}{position?.gap ? ' · GPS uzilishi' : ''}</span><span>{Math.round(progress * 100)}%</span></div>
          <input aria-label="Marshrut vaqti" type="range" min="0" max="1" step="0.001" value={progress} disabled={gpsTrail.length < 2} onChange={e => seek(Number(e.target.value))}/></div>
        <select aria-label="Ijro tezligi" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={30}>30×</option><option value={60}>60×</option><option value={120}>120×</option><option value={300}>300×</option></select>
      </div>
    </div>
  );
}
