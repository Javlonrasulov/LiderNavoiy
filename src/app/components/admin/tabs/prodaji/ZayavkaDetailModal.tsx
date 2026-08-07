import { useState, useRef, useMemo } from 'react';
import { X, Package, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import type { BackendOrderItem, BackendOrderAudit, BackendOrderItemChange } from '../../../api/client';
import { formatDisplayDate, formatDisplayDateTime } from '../../../../utils/dateFormat';

/* ─── Types ─────────────────────────────────────────────── */
export interface ZayavkaInfo {
  id: string | number;
  num: number;
  orderDate: string;
  shipDate: string;
  client: string;
  org: string;
  agent: string;
  liniya: string;
  direction: string;
  fort: string;
  vs: string;
  source: string;
  amount: number;
  klass: string;
  otgr: string;
  status: 'pri' | 'otr' | 'cancelled';
  note: string;
  code: string;
  konsDate: string;
  items?: BackendOrderItem[];
  audit?: BackendOrderAudit[];
}

interface ZProduct {
  id: number; n: number;
  brand: string; group: string; tovar: string;
  ostatok: number; kolvo: number;
  tsenaPreys: number; pctSkid: number;
  tsenaProd: number; summa: number;
}

/* ─── Mock product sets ──────────────────────────────────── */
const SET_A: ZProduct[] = [
  { id:1, n:1, brand:'SHERIN', group:'Шерин (Склад)',  tovar:'п/к Шавская в/у Тим шт',        ostatok:2800,  kolvo:50,  tsenaPreys:45000,  pctSkid:5,  tsenaProd:42750,  summa:2137500  },
  { id:2, n:2, brand:'TIM',    group:'Тим (Склад)',    tovar:'Колбаса варёная Шодлик 1кг',     ostatok:18500, kolvo:120, tsenaPreys:85000,  pctSkid:8,  tsenaProd:78200,  summa:9384000  },
  { id:3, n:3, brand:'TIM',    group:'Тим (Склад)',    tovar:'Сосиски Молочные Тим 0.4кг',     ostatok:9800,  kolvo:200, tsenaPreys:42000,  pctSkid:10, tsenaProd:37800,  summa:7560000  },
  { id:4, n:4, brand:'SHERIN', group:'Шерин (Склад)',  tovar:'п/к Ø50 Шерин 1кг',             ostatok:5200,  kolvo:150, tsenaPreys:75000,  pctSkid:8,  tsenaProd:69000,  summa:10350000 },
  { id:5, n:5, brand:'TIM',    group:'Тим (Склад)',    tovar:'п/к Жоржо Премиум 1.5кг',        ostatok:12300, kolvo:80,  tsenaPreys:245000, pctSkid:8,  tsenaProd:225400, summa:18032000 },
  { id:6, n:6, brand:'СЫР',   group:'Сыр (Склад)',    tovar:'Сыр Голландский 45% 1кг',        ostatok:4200,  kolvo:40,  tsenaPreys:58000,  pctSkid:0,  tsenaProd:58000,  summa:2320000  },
];

const SET_B: ZProduct[] = [
  { id:1, n:1, brand:'SHERIN', group:'Шерин (Склад)',  tovar:'п/к Ø65 Sherin',               ostatok:4660,  kolvo:100, tsenaPreys:90200,  pctSkid:8,  tsenaProd:82984,  summa:8298400  },
  { id:2, n:2, brand:'TIM',    group:'Тим (Склад)',    tovar:'Для Завтрака Шодлик',            ostatok:32800, kolvo:200, tsenaPreys:32800,  pctSkid:8,  tsenaProd:30176,  summa:6035200  },
  { id:3, n:3, brand:'TIM',    group:'Тим (Склад)',    tovar:'п/к Покон Шодлик в/у 1.6',      ostatok:48000, kolvo:150, tsenaPreys:153600, pctSkid:8,  tsenaProd:141312, summa:21196800 },
  { id:4, n:4, brand:'TIM',    group:'Тим (Склад)',    tovar:'п/к Барская Шодлик 0.5 в/у',    ostatok:24700, kolvo:100, tsenaPreys:109800, pctSkid:8,  tsenaProd:101016, summa:10101600 },
  { id:5, n:5, brand:'TIM',    group:'Тим (Склад)',    tovar:'Сосиски Радуга Шодлик пачк.',    ostatok:18300, kolvo:80,  tsenaPreys:109800, pctSkid:20, tsenaProd:87840,  summa:7027200  },
  { id:6, n:6, brand:'TIM',    group:'Тим (Склад)',    tovar:'п/к Жоржо-2',                   ostatok:47800, kolvo:120, tsenaPreys:210320, pctSkid:8,  tsenaProd:193494, summa:23219280 },
  { id:7, n:7, brand:'TIM',    group:'Тим (Склад)',    tovar:'п/к Салями мини Тим',            ostatok:56700, kolvo:90,  tsenaPreys:356643, pctSkid:8,  tsenaProd:328111, summa:29529990 },
  { id:8, n:8, brand:'СЫР',   group:'Сыр (Склад)',    tovar:'Сыр Янтар (0.5 ву)',             ostatok:30700, kolvo:60,  tsenaPreys:30700,  pctSkid:0,  tsenaProd:30700,  summa:1842000  },
  { id:9, n:9, brand:'TIM',    group:'Тим (Склад)',    tovar:'п/к Сервилат Австрийский Ø55',   ostatok:62000, kolvo:70,  tsenaPreys:176080, pctSkid:8,  tsenaProd:161994, summa:11339580 },
];

const SET_C: ZProduct[] = [
  { id:1, n:1, brand:'BOLG',   group:'Болгори (Склад)', tovar:'Хлеб белый нарезной 500г',     ostatok:12000, kolvo:300, tsenaPreys:8500,   pctSkid:0,  tsenaProd:8500,   summa:2550000  },
  { id:2, n:2, brand:'BOLG',   group:'Болгори (Склад)', tovar:'Батон нарезной 400г',           ostatok:8500,  kolvo:250, tsenaPreys:7200,   pctSkid:0,  tsenaProd:7200,   summa:1800000  },
  { id:3, n:3, brand:'TIM',    group:'Тим (Склад)',    tovar:'Сосиски Радуга 0.5кг',           ostatok:6200,  kolvo:100, tsenaPreys:35000,  pctSkid:5,  tsenaProd:33250,  summa:3325000  },
  { id:4, n:4, brand:'SHERIN', group:'Шерин (Склад)',  tovar:'Балык Шерин 250г',               ostatok:3400,  kolvo:80,  tsenaPreys:95000,  pctSkid:8,  tsenaProd:87400,  summa:6992000  },
  { id:5, n:5, brand:'TIM',    group:'Тим (Склад)',    tovar:'п/к Жоржо-2 500г',               ostatok:47800, kolvo:60,  tsenaPreys:110320, pctSkid:8,  tsenaProd:101494, summa:6089640  },
  { id:6, n:6, brand:'СЫР',   group:'Сыр (Склад)',    tovar:'Брынза мягкая 200г',              ostatok:7800,  kolvo:90,  tsenaPreys:28000,  pctSkid:0,  tsenaProd:28000,  summa:2520000  },
  { id:7, n:7, brand:'TIM',    group:'Тим (Склад)',    tovar:'п/к Покон Шодлик Мини 0.5кг',    ostatok:15200, kolvo:120, tsenaPreys:72000,  pctSkid:8,  tsenaProd:66240,  summa:7948800  },
];

function getProducts(id: string | number): ZProduct[] {
  const numId = typeof id === 'number' ? id : parseInt(String(id).replace(/-/g, '').slice(0, 8), 16);
  const sets = [SET_A, SET_B, SET_C];
  return sets[Math.abs(numId) % 3];
}

function itemsToProducts(items: BackendOrderItem[]): ZProduct[] {
  return items.map((item, i) => ({
    id: i + 1,
    n: i + 1,
    brand: item.productCode || '—',
    group: item.unit || '—',
    tovar: item.productName,
    ostatok: 0,
    kolvo: item.quantity,
    tsenaPreys: item.price,
    pctSkid: 0,
    tsenaProd: item.price,
    summa: item.quantity * item.price,
  }));
}
function fmtN(n: number) { return n.toLocaleString('ru-RU'); }
function fmtS(n: number) { return n ? n.toLocaleString('ru-RU') : '—'; }

function formatItemChange(ch: BackendOrderItemChange): string {
  const name = ch.productName || ch.productCode || '—';
  if (ch.change === 'added') {
    return `+ ${name} × ${Math.round(Number(ch.afterQty) || 0)}`;
  }
  if (ch.change === 'removed') {
    return `− ${name} × ${Math.round(Number(ch.beforeQty) || 0)}`;
  }
  return `${name}: ${Math.round(Number(ch.beforeQty) || 0)} → ${Math.round(Number(ch.afterQty) || 0)}`;
}

/* ─── Props ─────────────────────────────────────────────── */
interface Props {
  zayavka: ZayavkaInfo;
  D: boolean;
  t: Record<string, string>;
  onClose: () => void;
}

/* ══════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════ */
export function ZayavkaDetailModal({ zayavka, D, t, onClose }: Props) {
  const products = useMemo(
    () => (zayavka.items?.length ? itemsToProducts(zayavka.items) : getProducts(zayavka.id)),
    [zayavka.items, zayavka.id],
  );
  const tableRef = useRef<HTMLDivElement>(null);

  const [expanded,    setExpanded]    = useState<number | null>(null);
  const [activeTab,   setActiveTab]   = useState<'tovar' | 'brand' | 'group'>('tovar');
  const [modalFs,     setModalFs]     = useState(false);

  /* ── theme (same tokens as VozvratSozdat) ── */
  const bg  = D ? '#0d0d0d' : '#f5f5f7';
  const bg2 = D ? '#161618' : '#ffffff';
  const bdr = D ? '#2a2a2e' : '#e5e7eb';
  const txt = D ? '#f2f2f7' : '#111827';
  const sub = D ? '#6b7280' : '#9ca3af';
  const hdr = D ? '#111113' : '#f9fafb';
  const acc = '#6366f1';
  const rowH = D ? '#222226' : '#f5f5f7';

  /* icon button style (mirrors VozvratSozdat) */
  const iconBtn = (): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, borderRadius: 8,
    border: `1px solid ${bdr}`,
    background: D ? '#1c1c1e' : '#fff',
    color: txt, cursor: 'pointer',
    transition: 'background 0.12s',
  });

  /* ── totals ── */
  const totalKolvo = products.reduce((s, p) => s + p.kolvo, 0);
  const totalSumma = products.reduce((s, p) => s + p.summa, 0);

  /* ── status ── */
  const statusColor = zayavka.status === 'pri' ? '#3b82f6'
                    : zayavka.status === 'cancelled' ? '#ef4444'
                    : '#f97316';
  const statusLabel = zayavka.status === 'pri'
    ? (t.zPri ?? 'Qabul qilingan')
    : zayavka.status === 'cancelled'
    ? (t.zBekor ?? 'Bekor')
    : (t.zOtr ?? 'Yuklangan');

  /* ── info fields (right panel) ── */
  const INFO = [
    { key: 'orderDate', label: t.zOrderDate ?? 'Дата заказа', val: formatDisplayDate(zayavka.orderDate) },
    { key: 'shipDate',  label: t.zShipDate  ?? 'Дат. отгр.',  val: formatDisplayDate(zayavka.shipDate)  },
    { key: 'code',      label: t.zCode      ?? 'Код',         val: zayavka.code      },
    { key: 'agent',     label: t.zAgent     ?? 'Агент',       val: zayavka.agent     },
    { key: 'org',       label: t.zOrg       ?? 'Орг.',        val: zayavka.org       },
    { key: 'liniya',    label: t.zLine      ?? 'Линия',       val: zayavka.liniya    },
    { key: 'direction', label: t.zDirection ?? 'Напр.',       val: zayavka.direction },
    { key: 'fort',      label: t.zFort      ?? 'Форт.',       val: zayavka.fort      },
    { key: 'vs',        label: t.zVS        ?? 'VS',          val: zayavka.vs        },
    { key: 'otgr',      label: t.zShipCol   ?? 'Отгр.',       val: zayavka.otgr || '—' },
    { key: 'status',    label: t.zStatus    ?? 'Статус',      val: statusLabel       },
    { key: 'note',      label: t.zNote      ?? 'Примеч.',     val: zayavka.note || '—' },
  ];

  /* ── table columns ── */
  const COLS = [
    { key: 'n',          label: '№',                      w: 32,  right: false },
    { key: 'brand',      label: t.zdBrand ?? 'Бренд',     w: 72,  right: false },
    { key: 'group',      label: t.zdGroup ?? 'Группа',    w: 128, right: false },
    { key: 'tovar',      label: t.zdTovar ?? 'Товар',     w: 200, right: false },
    { key: 'ostatok',    label: t.zdOst   ?? 'Остаток',   w: 76,  right: true  },
    { key: 'kolvo',      label: t.zdKolvo ?? 'Кол-во',    w: 66,  right: true  },
    { key: 'tsenaPreys', label: t.zdPreys ?? 'Цена прейс', w: 110, right: true  },
    { key: 'pctSkid',    label: t.zdSkid  ?? '% скид.',   w: 62,  right: true  },
    { key: 'tsenaProd',  label: t.zdProd  ?? 'Цена прод.', w: 110, right: true  },
    { key: 'summa',      label: t.zdSumma ?? 'Сумма',     w: 120, right: true  },
  ];

  const cellVal = (p: ZProduct, key: string) => {
    switch (key) {
      case 'n':          return String(p.n);
      case 'brand':      return p.brand;
      case 'group':      return p.group;
      case 'tovar':      return p.tovar;
      case 'ostatok':    return fmtN(p.ostatok);
      case 'kolvo':      return fmtN(p.kolvo);
      case 'tsenaPreys': return fmtN(p.tsenaPreys);
      case 'pctSkid':    return p.pctSkid ? `${p.pctSkid}%` : '—';
      case 'tsenaProd':  return fmtN(p.tsenaProd);
      case 'summa':      return fmtS(p.summa);
      default:           return '—';
    }
  };

  /* ── Table content (shared desktop) ── */
  const TableContent = () => (
    <div
      ref={tableRef}
      style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', background: bg2 }}
    >
      <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 880 }}>
        <thead>
          <tr style={{ background: hdr, borderBottom: `2px solid ${bdr}`, position: 'sticky', top: 0, zIndex: 2 }}>
            {COLS.map(c => (
              <th key={c.key} style={{
                padding: '7px 8px', textAlign: c.right ? 'right' : 'left',
                color: sub, fontWeight: 600, fontSize: 10,
                textTransform: 'uppercase', whiteSpace: 'nowrap',
                width: c.w, minWidth: c.w, borderRight: `1px solid ${bdr}`,
              }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => (
            <tr
              key={p.id}
              style={{
                borderBottom: `1px solid ${bdr}`, cursor: 'default',
                background: idx % 2 === 0 ? 'transparent' : (D ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)'),
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = rowH)}
              onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : (D ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)'))}
            >
              {COLS.map(c => (
                <td key={c.key} style={{
                  padding: '6px 8px',
                  textAlign: c.right ? 'right' : 'left',
                  color: c.key === 'summa'      ? '#10b981'
                       : c.key === 'n'          ? sub
                       : c.key === 'tsenaPreys' ? (D ? '#a78bfa' : '#7c3aed')
                       : c.key === 'pctSkid' && (p.pctSkid > 0) ? '#f59e0b'
                       : txt,
                  whiteSpace: 'nowrap', borderRight: `1px solid ${bdr}`, fontSize: 12,
                  fontWeight: c.key === 'summa' ? 600 : 400,
                  maxWidth: c.key === 'tovar' ? 200 : undefined,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {cellVal(p, c.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: hdr, borderTop: `2px solid ${bdr}`, position: 'sticky', bottom: 0, zIndex: 2 }}>
            {COLS.map((c, ci) => (
              <td key={c.key} style={{
                padding: '7px 8px', textAlign: c.right ? 'right' : 'left',
                color: c.key === 'summa' ? '#10b981' : c.key === 'kolvo' ? txt : sub,
                fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                borderRight: `1px solid ${bdr}`,
              }}>
                {ci === 0
                  ? (t.zdTotal ?? 'Итого')
                  : c.key === 'kolvo' ? fmtN(totalKolvo)
                  : c.key === 'summa' ? fmtS(totalSumma)
                  : ''}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <>
      <style>{`
        .zdm-backdrop {
          position: fixed; inset: 0; z-index: 9800;
          display: flex; align-items: center; justify-content: center;
          animation: zdmBdIn 0.18s ease;
        }
        .zdm-backdrop-dim {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
        }
        .zdm-dialog {
          position: relative; z-index: 1;
          display: flex; flex-direction: column;
          overflow: hidden;
          transition: border-radius 0.18s ease, width 0.18s ease, height 0.18s ease;
        }
        @keyframes zdmBdIn {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        .zdm-tbl-wrap { overflow-x: auto; overflow-y: auto; flex: 1; }
        .zdm-tbl-wrap::-webkit-scrollbar { height: 5px; width: 5px; }
        .zdm-tbl-wrap::-webkit-scrollbar-track { background: transparent; }
        .zdm-tbl-wrap::-webkit-scrollbar-thumb { background: #3a3a3e; border-radius: 99px; }
        .zdm-desktop-content { display: flex; flex-direction: column; }
        .zdm-mobile-content  { display: none;  flex-direction: column; }
        @media (max-width: 639px) {
          .zdm-desktop-content { display: none   !important; }
          .zdm-mobile-content  { display: flex   !important; }
          .zdm-scroll-btns     { display: none   !important; }
          .zdm-info-grid       { grid-template-columns: repeat(2, 1fr) !important; }
        }
        .zdm-info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 5px 8px;
        }
        @media (max-width: 767px) {
          .zdm-info-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .zdm-info-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>

      {/* ══ BACKDROP ══ */}
      <div
        className="zdm-backdrop"
        style={{ padding: modalFs ? 0 : '16px 12px' }}
      >
        {/* Dim click-outside to close */}
        {!modalFs && (
          <div className="zdm-backdrop-dim" onClick={onClose} />
        )}

        {/* ── Dialog ── */}
        <div
          className="zdm-dialog"
          style={{
            background: bg,
            width:        modalFs ? '100vw'                      : 'min(calc(100vw - 24px), 1320px)',
            height:       modalFs ? '100dvh'                     : 'min(calc(100dvh - 100px), 740px)',
            borderRadius: modalFs ? 0                            : 14,
            boxShadow:    modalFs ? 'none'                       : (D ? '0 28px 72px #00000099' : '0 28px 72px #0000003a'),
          }}
        >

          {/* ── TOP BAR ── */}
          <div style={{
            background: bg2,
            borderBottom: `1px solid ${bdr}`,
            borderRadius: modalFs ? 0 : '14px 14px 0 0',
            padding: '0 12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 8,
            minHeight: 50,
          }}>
            {/* Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, color: txt, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {t.zNum ?? '№'}{zayavka.num}
                </span>
                <span style={{ fontSize: 12, color: sub, whiteSpace: 'nowrap' }}>
                  {formatDisplayDate(zayavka.orderDate)}
                </span>
                <span style={{
                  display: 'inline-block', padding: '2px 9px', borderRadius: 5,
                  fontSize: 11, background: statusColor, color: '#fff', fontWeight: 600,
                }}>
                  {statusLabel}
                </span>
              </div>
              <div style={{
                fontSize: 12, color: acc, fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                marginTop: 1,
              }}>
                {zayavka.client}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
              <button
                onClick={() => setModalFs(f => !f)}
                style={{ ...iconBtn(), width: 30, height: 30 }}
                title={modalFs ? 'Kichraytirish' : "To'liq ekran"}
              >
                {modalFs ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button onClick={onClose} style={{ ...iconBtn(), width: 30, height: 30 }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* ── INFO SECTION ── */}
          <div style={{
            background: bg2, borderBottom: `1px solid ${bdr}`,
            padding: '8px 12px', flexShrink: 0,
          }}>
            {/* Client name row */}
            <div style={{ fontSize: 13, color: txt, fontWeight: 600, marginBottom: 6 }}>
              {zayavka.client}
            </div>
            {/* Info grid */}
            <div className="zdm-info-grid">
              {INFO.map(f => (
                <div key={f.key} style={{
                  background: D ? '#1c1c1e' : '#f3f4f6',
                  borderRadius: 7, padding: '5px 8px',
                  border: `1px solid ${bdr}`,
                }}>
                  <div style={{ fontSize: 9, color: sub, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 }}>
                    {f.label}
                  </div>
                  <div style={{
                    fontSize: 12, color: f.key === 'status' ? statusColor : txt,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontWeight: f.key === 'status' ? 600 : 400,
                  }}>
                    {f.val || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── AUDIT / KIMDAN KELGANI ── */}
          {Array.isArray(zayavka.audit) && zayavka.audit.length > 0 && (
            <div style={{
              background: bg2, borderBottom: `1px solid ${bdr}`,
              padding: '10px 12px', flexShrink: 0, maxHeight: 220, overflowY: 'auto',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: sub, textTransform: 'uppercase',
                letterSpacing: 0.4, marginBottom: 8,
              }}>
                {t.zAudit ?? 'Kim qilgani / o‘zgarishlar'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {zayavka.audit.map((ev) => (
                  <div key={ev.id} style={{
                    background: D ? '#1c1c1e' : '#f3f4f6',
                    border: `1px solid ${bdr}`,
                    borderRadius: 10,
                    padding: '8px 10px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: txt, lineHeight: 1.35 }}>
                        {ev.summary || `${ev.actorName} · ${ev.action}`}
                      </span>
                      <span style={{ fontSize: 10, color: sub, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {formatDisplayDateTime(ev.createdAt)}
                      </span>
                    </div>
                    {Array.isArray(ev.itemChanges) && ev.itemChanges.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                        {ev.itemChanges.map((ch, i) => (
                          <div key={`${ev.id}-ch-${i}`} style={{
                            fontSize: 11,
                            color: ch.change === 'added' ? '#10b981'
                              : ch.change === 'removed' ? '#ef4444'
                              : sub,
                            fontWeight: 600,
                          }}>
                            {formatItemChange(ch)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TABS + SCROLL BTNS ── */}
          <div style={{
            display: 'flex', alignItems: 'center',
            background: bg2, borderBottom: `1px solid ${bdr}`,
            padding: '0 10px', flexShrink: 0, gap: 4,
          }}>
            <div style={{ display: 'flex', flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {([
                { id: 'tovar', label: `${t.zdTabTovar ?? 'Товары'} (${products.length})` },
                { id: 'brand', label: t.zdTabBrand ?? 'Бренды' },
                { id: 'group', label: t.zdTabGroup ?? 'Группы' },
              ] as { id: 'tovar' | 'brand' | 'group'; label: string }[]).map(tb => (
                <button
                  key={tb.id}
                  onClick={() => setActiveTab(tb.id)}
                  style={{
                    padding: '10px 13px', background: 'none', border: 'none',
                    borderBottom: activeTab === tb.id ? `2px solid ${acc}` : '2px solid transparent',
                    color: activeTab === tb.id ? acc : sub,
                    cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                >
                  {tb.label}
                </button>
              ))}
            </div>
            {/* Scroll arrows (desktop only) */}
            <div className="zdm-scroll-btns" style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => tableRef.current?.scrollBy({ left: -280, behavior: 'smooth' })}
                style={iconBtn()}
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => tableRef.current?.scrollBy({ left: 280, behavior: 'smooth' })}
                style={iconBtn()}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* ── CONTENT AREA ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {activeTab === 'tovar' ? (
              <>
                {/* DESKTOP TABLE */}
                <div
                  className="zdm-desktop-content zdm-tbl-wrap"
                  style={{ flex: 1 }}
                >
                  <TableContent />
                </div>

                {/* MOBILE CARDS */}
                <div
                  className="zdm-mobile-content"
                  style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', gap: 6 }}
                >
                  {products.map(p => {
                    const open = expanded === p.id;
                    return (
                      <div key={p.id} style={{
                        background: bg2, borderRadius: 10,
                        border: `1px solid ${bdr}`, overflow: 'hidden',
                      }}>
                        <button
                          onClick={() => setExpanded(open ? null : p.id)}
                          style={{ width: '100%', background: 'none', border: 'none', padding: '9px 11px', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: 4, marginBottom: 3, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 10, color: '#fff', background: acc, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                                  {p.brand}
                                </span>
                                <span style={{ fontSize: 10, color: sub, background: D ? '#2a2a2e' : '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>
                                  {p.group}
                                </span>
                              </div>
                              <div style={{
                                fontSize: 12, color: txt, lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical' as const,
                                overflow: 'hidden',
                                wordBreak: 'break-word',
                              }}>
                                {p.n}. {p.tovar}
                              </div>
                            </div>
                            <div style={{ flexShrink: 0, textAlign: 'right' }}>
                              <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>{fmtS(p.summa)}</div>
                              <div style={{ fontSize: 11, color: sub }}>{fmtN(p.kolvo)} {t.zdUnit ?? 'шт'}</div>
                            </div>
                            <div style={{ color: sub, alignSelf: 'center', flexShrink: 0 }}>
                              {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </div>
                          </div>
                        </button>

                        {open && (
                          <div style={{
                            borderTop: `1px solid ${bdr}`, padding: '8px 10px',
                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 6px',
                            background: D ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
                          }}>
                            {[
                              { label: t.zdOst    ?? 'Остаток',    val: fmtN(p.ostatok), color: txt         },
                              { label: t.zdKolvo  ?? 'Кол-во',     val: fmtN(p.kolvo),   color: txt         },
                              { label: t.zdPreys  ?? 'Цена прейс', val: fmtN(p.tsenaPreys), color: D ? '#a78bfa' : '#7c3aed' },
                              { label: t.zdSkid   ?? '% скид.',    val: p.pctSkid ? `${p.pctSkid}%` : '—', color: p.pctSkid > 0 ? '#f59e0b' : sub },
                              { label: t.zdProd   ?? 'Цена прод.', val: fmtN(p.tsenaProd), color: txt       },
                              { label: t.zdSumma  ?? 'Сумма',      val: fmtS(p.summa),   color: '#10b981'   },
                            ].map(item => (
                              <div key={item.label} style={{
                                background: bg2, borderRadius: 7, padding: '5px 8px', border: `1px solid ${bdr}`,
                              }}>
                                <div style={{ fontSize: 9, color: sub, textTransform: 'uppercase', marginBottom: 1 }}>{item.label}</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.val}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 10, color: sub,
              }}>
                <Package size={36} strokeWidth={1} />
                <span style={{ fontSize: 13 }}>
                  {activeTab === 'brand' ? (t.zdTabBrand ?? 'Бренды') : (t.zdTabGroup ?? 'Группы')}
                </span>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div style={{
            background: bg2, borderTop: `1px solid ${bdr}`,
            padding: '7px 14px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderRadius: modalFs ? 0 : '0 0 14px 14px',
          }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: sub }}>
                {t.zdPos ?? 'Позиций'}:{' '}
                <span style={{ color: txt, fontWeight: 600 }}>{products.length}</span>
              </span>
              <span style={{ fontSize: 12, color: sub }}>
                {t.zdKolvo ?? 'Тот кол'}:{' '}
                <span style={{ color: txt, fontWeight: 600 }}>{fmtN(totalKolvo)}</span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: sub }}>{t.zdSumma ?? 'Сумма'}:</span>
              <span style={{ fontSize: 15, color: '#10b981', fontWeight: 700 }}>
                {fmtS(totalSumma)} {t.zdCurrency ?? 'сум'}
              </span>
            </div>
          </div>

        </div>{/* /dialog */}
      </div>{/* /backdrop */}
    </>
  );
}