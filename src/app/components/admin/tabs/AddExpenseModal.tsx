import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  X, ChevronDown, Check, Save, Maximize2, Minimize2,
  AlertCircle, ArrowRightLeft,
} from 'lucide-react';
import { demo } from '../../../data/demoLimit';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  D: boolean;
  t: Record<string, string>;
  onClose: () => void;
  onSave?: (data: ExpenseForm) => void;
}
export interface ExpenseForm {
  number: string; date: string; author: string;
  organization: string; kassa: string; operationType: string;
  zatrat: string; subkonto1: string; subkonto2: string; subkonto3: string;
  amount: string; currency1: string;
  koef1: string; koef2: string;
  sumWithKoef: string; currency2: string;
  comment: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const AUTHORS = demo([
  { name: 'Ulugbek Holmatov',  role: 'Direktor'      },
  { name: 'Alisher Karimov',   role: 'Bosh hisobchi' },
  { name: 'Jasur Yusupov',     role: 'Kassa mudiri'  },
  { name: 'Sherzod Nazarov',   role: 'Moliyachi'     },
  { name: 'Bobur Toshmatov',   role: 'Menejer'       },
  { name: 'Davron Mirzayev',   role: 'Muhasib'       },
  { name: 'Dilnoza Yusupova',  role: 'HR menejer'    },
]);
const OP_TYPES = demo([
  'Инкассация','Затрат организации','Аванс','Зарплата - Сотрудник',
  'Зарплата - Ведомость','Оплата поставщику','Доп расходы по поступ. товаров',
  'Расход к физ.лицам','Филиал','Дивидент','Обмен валюты','Другая касса',
  'Оплата прочим контрагентам','Оплата клиенту','Увеличение себ ОС',
  'Покупка материалов','Покупка осн.средств','Под отчет','Прочие',
]);
const ORGS     = demo(['OOO "BORAN LEADERS"','OOO "ZARAFSHON"','OOO "TOSHKENT FILIAL"']);
const KASSALAR = demo(['Касса SHERIN','Касса BORAN','Касса ZARAFSHON','Касса XORAZM']);
const CURRENCIES = demo(['UZS','USD','EUR','RUB']);
const ZATRAT_LST = demo([
  "Ijara xarajatlari","Kommunal to'lovlar","Ish haqi",
  "Transport xarajatlari","Qurilish materiallari",
  "Ta'mirlash ishlari","Reklama xarajatlari","Ofis jihozlari","Boshqa xarajatlar",
]);
const SUB1 = demo(['ДОСТАВКА (ПОСТАВЩИК)','ОФИС','ТРАНСПОРТ','СКЛАД','СТРОИТЕЛЬСТВО']);
const SUB2 = demo(["Jahongir Zubayda - XORAZM","Alisher Karimov - TOSHKENT","Sherzod Umarov - SAMARQAND","Dilnoza Yusupova - FARG'ONA"]);
const SUB3 = demo(['Йул кира','Командировка','Доставка','Хизмат','Ta\'mirlash']);

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmtNum = (v: string) => {
  const raw = v.replace(/[^0-9.]/g, '');
  const [i, ...d] = raw.split('.');
  return d.length ? `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${d[0]}` : i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};
const toNum = (v: string) => parseFloat(v.replace(/\s/g, '')) || 0;
const calcSum = (a: string, k1: string, k2: string) => {
  const n = toNum(a), kk2 = parseFloat(k2) || 1;
  if (!n || !kk2) return '';
  return ((n * (parseFloat(k1) || 1)) / kk2).toFixed(2);
};
const initials = (n: string) => n.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2);
const AV_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];

// ─── Inline Select Dropdown ───────────────────────────────────────────────────
function InlineSelect({
  value, options, onChange, placeholder,
  D, txt, border, muted, surface, bg,
  searchable, clearable, renderOption,
}: {
  value: string; options: string[]; onChange: (v: string) => void;
  placeholder?: string; D: boolean; txt: string; border: string;
  muted: string; surface: string; bg: string;
  searchable?: boolean; clearable?: boolean;
  renderOption?: (opt: string, selected: boolean) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState('');
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 0 });
  const btnRef          = useRef<HTMLButtonElement>(null);
  const dropRef         = useRef<HTMLDivElement>(null);
  const filtered        = searchable ? options.filter(o => o.toLowerCase().includes(q.toLowerCase())) : options;

  useEffect(() => { if (!open) setQ(''); }, [open]);

  const reposition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const dropdown = open ? ReactDOM.createPortal(
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
        background: D ? '#1e1e1e' : '#fff',
        border: `1px solid ${border}`,
        borderRadius: 10,
        boxShadow: D ? '0 12px 40px rgba(0,0,0,0.7)' : '0 12px 40px rgba(0,0,0,0.13)',
        overflow: 'hidden',
        animation: 'expDropIn 0.13s ease-out',
      }}
    >
      {searchable && (
        <div style={{ padding: '7px 8px', borderBottom: `1px solid ${border}` }}>
          <input
            autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Qidirish..."
            style={{
              width: '100%', background: D ? 'rgba(255,255,255,0.06)' : '#f4f4f8',
              border: 'none', outline: 'none', borderRadius: 6,
              padding: '6px 10px', fontSize: 12, color: txt, boxSizing: 'border-box',
            }}
          />
        </div>
      )}
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {filtered.map(opt => (
          <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: opt === value ? (D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.07)') : 'transparent',
              transition: 'background 0.08s',
            }}
            onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={e => { if (opt !== value) e.currentTarget.style.background = 'transparent'; }}
          >
            {renderOption ? renderOption(opt, opt === value) : (
              <>
                <div style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${opt === value ? '#6366f1' : (D ? '#444' : '#d1d5db')}`,
                  background: opt === value ? '#6366f1' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {opt === value && <Check size={8} color="#fff" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 12.5, color: opt === value ? '#6366f1' : txt, flex: 1 }}>{opt}</span>
              </>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '14px 12px', textAlign: 'center', fontSize: 12, color: muted }}>Topilmadi</div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px', borderRadius: 7,
          border: `1px solid ${open ? '#6366f1' : border}`,
          background: D ? 'rgba(255,255,255,0.04)' : '#fff',
          color: value ? txt : muted, fontSize: 12.5, cursor: 'pointer',
          boxSizing: 'border-box', transition: 'border-color 0.15s', gap: 4,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
          {value || (placeholder ?? '— tanlang —')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {clearable && value && (
            <span
              onClick={e => { e.stopPropagation(); onChange(''); }}
              style={{ color: muted, display: 'flex', lineHeight: 1, cursor: 'pointer' }}
            ><X size={11} /></span>
          )}
          <ChevronDown size={12} color={muted}
            style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </div>
      </button>
      {dropdown}
    </div>
  );
}

// ─── Row wrapper (label + content) ────────────────────────────────────────────
function Row({ label, labelColor, muted, border, children, noBorder }: {
  label: string; labelColor?: string; muted: string; border: string;
  children: React.ReactNode; noBorder?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      borderBottom: noBorder ? 'none' : `1px solid ${border}`,
      padding: '9px 0',
    }}>
      <span style={{
        flexShrink: 0, minWidth: 130, fontSize: 12.5,
        color: labelColor || muted, fontWeight: labelColor ? 700 : 500,
      }}>{label}</span>
      {children}
    </div>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ label, muted }: { label: string; muted: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 800, color: muted,
      textTransform: 'uppercase', letterSpacing: '0.07em',
      padding: '14px 0 4px',
    }}>{label}</div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────
export function AddExpenseModal({ D, t, onClose, onSave }: Props) {
  const [form, setForm] = useState<ExpenseForm>({
    number: '1',
    date: new Date().toLocaleDateString('ru-RU'),
    author: '',
    organization: 'OOO "BORAN LEADERS"',
    kassa: 'Касса SHERIN',
    operationType: 'Затрат организации',
    zatrat: '', subkonto1: '', subkonto2: '', subkonto3: '',
    amount: '', currency1: 'UZS',
    koef1: '1.000', koef2: '12200.000',
    sumWithKoef: '', currency2: 'USD',
    comment: '',
  });
  const [errors,     setErrors]     = useState<Record<string, boolean>>({});
  const [saving,     setSaving]     = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [visible,    setVisible]    = useState(false);
  const [w,          setW]          = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') doClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);
  useEffect(() => {
    setForm(f => ({ ...f, sumWithKoef: f.amount ? calcSum(f.amount, f.koef1, f.koef2) : '' }));
  }, [form.amount, form.koef1, form.koef2]);

  const doClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  const set = useCallback(<K extends keyof ExpenseForm>(k: K, v: ExpenseForm[K]) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: false }));
  }, []);

  const handleSave = () => {
    const errs: Record<string, boolean> = {};
    if (!form.author)        errs.author = true;
    if (!form.operationType) errs.operationType = true;
    if (!form.amount)        errs.amount = true;
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    setTimeout(() => { onSave?.(form); doClose(); }, 600);
  };

  // ── Design tokens — exact match with AdminUserFormModal ──
  const txt     = D ? '#f0f0f0' : '#111827';
  const muted   = D ? '#6b7280' : '#9ca3af';
  const border  = D ? '#2a2a2a' : '#e5e7eb';
  const surface = D ? '#111111' : '#f8f8f8';
  const bg      = D ? '#141414' : '#ffffff';

  const isMobile = w < 640;
  const twoCol   = !isMobile && (fullscreen || w >= 900);

  const authorIdx   = AUTHORS.findIndex(a => a.name === form.author);
  const authorColor = authorIdx >= 0 ? AV_COLORS[authorIdx % AV_COLORS.length] : '#6366f1';

  // ── Input style (shared) ──
  const inp = {
    flex: 1 as const, minWidth: 0, padding: '6px 10px', borderRadius: 7,
    border: `1px solid ${border}`,
    background: D ? 'rgba(255,255,255,0.04)' : '#fff',
    color: txt, fontSize: 12.5 as const, outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <>
      <style>{`
        @keyframes expDropIn {
          from { opacity:0; transform:translateY(-4px) scale(0.98); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        @keyframes expIn {
          from { opacity:0; transform:scale(0.975); }
          to   { opacity:1; transform:scale(1);     }
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        .exp-scroll::-webkit-scrollbar { width:3px; }
        .exp-scroll::-webkit-scrollbar-thumb { background:${D?'#333':'#e0e0e0'}; border-radius:99px; }
        .exp-scroll::-webkit-scrollbar-track { background:transparent; }
      `}</style>

      {/* Backdrop */}
      <div onClick={doClose} style={{
        position:'fixed', inset:0, zIndex:2000,
        background:'rgba(0,0,0,0.55)',
        backdropFilter:'blur(5px)', WebkitBackdropFilter:'blur(5px)',
        opacity: visible ? 1 : 0, transition:'opacity 0.2s',
      }}/>

      {/* Modal wrapper */}
      <div style={{
        position:'fixed', inset:0, zIndex:2001,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding: fullscreen ? 0 : (isMobile ? '0' : '16px'),
        pointerEvents:'none',
      }}>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width:'100%',
            maxWidth: fullscreen ? '100%' : 920,
            height: fullscreen || isMobile ? (isMobile ? '92dvh' : '100%') : 'auto',
            maxHeight: fullscreen ? '100dvh' : (isMobile ? '92dvh' : '90dvh'),
            background: bg,
            borderRadius: fullscreen ? 0 : (isMobile ? '20px 20px 0 0' : 18),
            display:'flex', flexDirection:'column',
            pointerEvents:'all',
            opacity: visible ? 1 : 0,
            transform: visible ? 'scale(1)' : 'scale(0.975)',
            transition:'opacity 0.2s, transform 0.2s cubic-bezier(0.34,1.3,0.64,1), border-radius 0.2s',
            boxShadow: D ? '0 32px 80px rgba(0,0,0,0.8)' : '0 32px 80px rgba(0,0,0,0.18)',
            border: `1px solid ${border}`,
            overflow:'hidden',
            alignSelf: isMobile ? 'flex-end' : 'center',
          }}
        >

          {/* ══ HEADER ══ */}
          <div style={{
            background: surface,
            borderBottom:`1px solid ${border}`,
            padding:'14px 20px',
            flexShrink:0,
          }}>
            {/* Title + controls */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:11, color:muted, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>
                  {t.zatDetCompany || 'MChJ "BORAN LEADERS"'}
                </div>
                <div style={{ fontSize:16, fontWeight:800, color:txt, letterSpacing:'-0.3px' }}>
                  {t.zatAdd || "Xarajat qo'shish"}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <button
                  onClick={() => setFullscreen(f => !f)}
                  style={{
                    width:32, height:32, borderRadius:8, border:'none',
                    background: D ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                    color:muted, transition:'all 0.15s',
                  }}
                  title={fullscreen ? 'Kichraytirish' : 'To\'liq ekran'}
                >
                  {fullscreen ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
                </button>
                <button
                  onClick={doClose}
                  style={{
                    width:32, height:32, borderRadius:8, border:'none',
                    background: D ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                    color:muted, transition:'all 0.15s',
                  }}
                >
                  <X size={15}/>
                </button>
              </div>
            </div>

            {/* Meta row: № | Sana | Muallif */}
            <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr', gap:10 }}>
              {/* Raqam */}
              <div>
                <div style={{ fontSize:10, color:muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>
                  {t.zatDocNum || 'Raqam'}
                </div>
                <div style={{
                  padding:'6px 10px', borderRadius:7,
                  border:`1px solid ${border}`,
                  background: D ? 'rgba(255,255,255,0.04)' : '#fff',
                  fontSize:12.5, fontWeight:700, color:muted, textAlign:'center',
                }}>
                  {form.number}
                </div>
              </div>

              {/* Sana */}
              <div>
                <div style={{ fontSize:10, color:muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>
                  {t.zatDocDate || 'Sana'}
                </div>
                <input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  onChange={e => set('date', e.target.value)}
                  style={{
                    ...inp, padding:'6px 10px', width:'100%',
                    colorScheme: D ? 'dark' : 'light',
                  }}
                />
              </div>

              {/* Muallif */}
              <div>
                <div style={{ fontSize:10, color: errors.author ? '#ef4444' : muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5, display:'flex', alignItems:'center', gap:4 }}>
                  {t.zatDocAuthor || 'Muallif'}
                  {errors.author && <AlertCircle size={9} color="#ef4444"/>}
                </div>
                <InlineSelect
                  value={form.author} options={AUTHORS.map(a => a.name)}
                  onChange={v => set('author', v)}
                  placeholder={t.zatSelectAuthor || 'Tanlang...'}
                  D={D} txt={txt} border={errors.author ? '#ef4444' : border} muted={muted} surface={surface} bg={bg}
                  renderOption={(opt, sel) => {
                    const idx = AUTHORS.findIndex(a => a.name === opt);
                    const col = AV_COLORS[idx % AV_COLORS.length];
                    const info = AUTHORS[idx];
                    return (
                      <div style={{ display:'flex', alignItems:'center', gap:8, width:'100%' }}>
                        <div style={{
                          width:26, height:26, borderRadius:7, flexShrink:0,
                          background: sel ? col : (col + '22'),
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:9, fontWeight:800, color: sel ? '#fff' : col,
                        }}>
                          {initials(opt)}
                        </div>
                        <div style={{ flex:1, textAlign:'left' }}>
                          <div style={{ fontSize:12.5, fontWeight: sel ? 700 : 400, color: sel ? '#6366f1' : txt }}>{opt}</div>
                          <div style={{ fontSize:10, color:muted }}>{info?.role}</div>
                        </div>
                        {sel && <Check size={12} color="#6366f1"/>}
                      </div>
                    );
                  }}
                />
              </div>
            </div>
          </div>

          {/* ══ BODY ══ */}
          <div
            className="exp-scroll"
            style={{ flex:1, overflowY:'auto', padding: isMobile ? '0 14px 8px' : '0 20px 8px' }}
          >
            <div style={{
              display: twoCol ? 'grid' : 'flex',
              gridTemplateColumns: twoCol ? '1fr 1fr' : undefined,
              flexDirection: 'column',
              gap: twoCol ? '0 32px' : 0,
            }}>

              {/* ── LEFT COLUMN ── */}
              <div>
                <SectionLabel label={t.zatSectionMain || "Asosiy ma'lumotlar"} muted={muted}/>

                {/* Tashkilot */}
                <Row label={t.zatOrg || 'Tashkilot'} muted={muted} border={border}>
                  <InlineSelect
                    value={form.organization} options={ORGS}
                    onChange={v => set('organization', v)}
                    D={D} txt={txt} border={border} muted={muted} surface={surface} bg={bg} searchable
                  />
                </Row>

                {/* Kassa */}
                <Row label={t.zatKassa || 'Kassa'} muted={muted} border={border}>
                  <InlineSelect
                    value={form.kassa} options={KASSALAR}
                    onChange={v => set('kassa', v)}
                    D={D} txt={txt} border={border} muted={muted} surface={surface} bg={bg}
                  />
                </Row>

                {/* Operatsiya turi */}
                <Row
                  label={t.zatOpType || 'Operatsiya turi'}
                  labelColor={errors.operationType ? '#ef4444' : '#ef4444'}
                  muted={muted} border={border}
                >
                  <InlineSelect
                    value={form.operationType} options={OP_TYPES}
                    onChange={v => set('operationType', v)}
                    placeholder={t.zatSelect || 'Tanlang...'}
                    D={D} txt={txt} border={errors.operationType ? '#ef4444' : border} muted={muted} surface={surface} bg={bg}
                    searchable
                  />
                  {form.operationType && (
                    <div style={{
                      flexShrink:0, display:'flex', alignItems:'center', gap:5,
                      padding:'4px 8px', borderRadius:6,
                      background:'rgba(239,68,68,0.1)',
                    }}>
                      <span style={{ fontSize:10, fontWeight:800, color:'#ef4444', letterSpacing:'0.05em' }}>РАСХОД</span>
                      <span style={{ fontSize:13, fontWeight:900, color:'#ef4444' }}>027</span>
                    </div>
                  )}
                </Row>

                <SectionLabel label={t.zatSectionDetail || 'Tafsilotlar'} muted={muted}/>

                {/* Затрат */}
                <Row label={t.zatZatrat || 'Затрат'} muted={muted} border={border}>
                  <InlineSelect
                    value={form.zatrat} options={ZATRAT_LST}
                    onChange={v => set('zatrat', v)}
                    placeholder={t.zatSelect || 'Tanlang...'}
                    D={D} txt={txt} border={border} muted={muted} surface={surface} bg={bg}
                  />
                </Row>

                {/* Субконто 1 */}
                <Row label={t.zatSubkonto1 || 'Субконто 1'} muted={muted} border={border}>
                  <InlineSelect
                    value={form.subkonto1} options={SUB1}
                    onChange={v => set('subkonto1', v)}
                    placeholder={t.zatSelect || 'Tanlang...'}
                    D={D} txt={txt} border={border} muted={muted} surface={surface} bg={bg} clearable
                  />
                </Row>

                {/* Субконто 2 */}
                <Row label={t.zatSubkonto2 || 'Субконто 2'} muted={muted} border={border}>
                  <InlineSelect
                    value={form.subkonto2} options={SUB2}
                    onChange={v => set('subkonto2', v)}
                    placeholder={t.zatSelect || 'Tanlang...'}
                    D={D} txt={txt} border={border} muted={muted} surface={surface} bg={bg} clearable
                  />
                </Row>

                {/* Субконто 3 */}
                <Row label={t.zatSubkonto3 || 'Субконто 3'} muted={muted} border={border} noBorder={twoCol}>
                  <InlineSelect
                    value={form.subkonto3} options={SUB3}
                    onChange={v => set('subkonto3', v)}
                    placeholder={t.zatSelect || 'Tanlang...'}
                    D={D} txt={txt} border={border} muted={muted} surface={surface} bg={bg} clearable
                  />
                </Row>
              </div>

              {/* ── RIGHT COLUMN ── */}
              <div>
                <SectionLabel label={t.zatSectionAmount || 'Summa'} muted={muted}/>

                {/* Kassadan chiqim */}
                <div style={{
                  borderBottom:`1px solid ${border}`, padding:'9px 0',
                  display:'flex', alignItems:'center', gap:8,
                }}>
                  <span style={{
                    flexShrink:0, minWidth:130, fontSize:12.5,
                    color: errors.amount ? '#ef4444' : muted, fontWeight:500,
                    display:'flex', alignItems:'center', gap:3,
                  }}>
                    {t.zatRashodKassa || 'Kassadan chiqim'}
                    {errors.amount && <AlertCircle size={10} color="#ef4444"/>}
                  </span>
                  <input
                    value={form.amount}
                    onChange={e => set('amount', fmtNum(e.target.value))}
                    placeholder="0.00"
                    style={{
                      ...inp, flex:1,
                      fontSize:13, fontWeight:600,
                      border:`1px solid ${errors.amount ? '#ef4444' : border}`,
                    }}
                  />
                  <InlineSelect
                    value={form.currency1} options={CURRENCIES}
                    onChange={v => set('currency1', v)}
                    D={D} txt={txt} border={border} muted={muted} surface={surface} bg={bg}
                  />
                </div>

                {/* Коэф1 */}
                <Row label={t.zatKoef1 || 'Коэф1 (*)'} muted={muted} border={border}>
                  <input
                    type="number" value={form.koef1}
                    onChange={e => set('koef1', e.target.value)}
                    style={inp}
                  />
                </Row>

                {/* Коэф2 */}
                <Row label={t.zatKoef2 || 'Коэф2 (/)'} muted={muted} border={border}>
                  <input
                    type="number" value={form.koef2}
                    onChange={e => set('koef2', e.target.value)}
                    style={inp}
                  />
                </Row>

                {/* Summa (koef bilan) */}
                <div style={{
                  borderBottom:`1px solid ${border}`, padding:'9px 0',
                  display:'flex', alignItems:'center', gap:8,
                }}>
                  <span style={{ flexShrink:0, minWidth:130, fontSize:12.5, color:muted, fontWeight:500 }}>
                    {t.zatSumKoef || 'Summa (koef bilan)'}
                  </span>
                  <div style={{
                    flex:1, padding:'6px 10px', borderRadius:7,
                    border:`1px solid ${form.sumWithKoef ? '#6366f1' : border}`,
                    background: form.sumWithKoef
                      ? (D ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)')
                      : (D ? 'rgba(255,255,255,0.04)' : '#fff'),
                    fontSize:13, fontWeight:700,
                    color: form.sumWithKoef ? '#6366f1' : muted,
                    fontVariantNumeric:'tabular-nums',
                    transition:'all 0.2s',
                  }}>
                    {form.sumWithKoef || '0.00'}
                  </div>
                  <InlineSelect
                    value={form.currency2} options={CURRENCIES}
                    onChange={v => set('currency2', v)}
                    D={D} txt={txt} border={border} muted={muted} surface={surface} bg={bg}
                  />
                </div>

                {/* Conversion hint */}
                {form.amount && form.sumWithKoef && (
                  <div style={{
                    display:'flex', alignItems:'center', gap:6,
                    padding:'8px 10px', borderRadius:8, marginTop:8,
                    background: D ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.06)',
                    border:`1px solid ${D ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.15)'}`,
                  }}>
                    <ArrowRightLeft size={11} color="#22c55e"/>
                    <span style={{ fontSize:12, color:'#22c55e', fontWeight:600 }}>
                      {toNum(form.amount).toLocaleString()} {form.currency1}
                      {' → '}
                      {parseFloat(form.sumWithKoef).toLocaleString()} {form.currency2}
                    </span>
                  </div>
                )}

                {/* Izoh */}
                <SectionLabel label={t.zatComment || 'Izoh'} muted={muted}/>
                <textarea
                  value={form.comment}
                  onChange={e => set('comment', e.target.value)}
                  placeholder={t.zatCommentPlaceholder || "Qo'shimcha ma'lumot..."}
                  rows={3}
                  style={{
                    width:'100%', background: D ? 'rgba(255,255,255,0.04)' : '#fff',
                    border:`1px solid ${border}`, borderRadius:8,
                    padding:'8px 10px', fontSize:12.5, color:txt,
                    resize:'vertical', outline:'none', boxSizing:'border-box',
                    fontFamily:'inherit', minHeight:72, transition:'border-color 0.15s',
                    marginBottom:8,
                  }}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e  => (e.target.style.borderColor = border)}
                />
              </div>
            </div>
          </div>

          {/* ══ FOOTER ══ */}
          <div style={{
            padding:'12px 20px 16px',
            borderTop:`1px solid ${border}`,
            background: surface,
            display:'flex', alignItems:'center', gap:10, flexShrink:0,
          }}>
            {/* Validation hint */}
            {Object.values(errors).some(Boolean) ? (
              <div style={{
                flex:1, display:'flex', alignItems:'center', gap:6,
                padding:'8px 12px', borderRadius:8,
                background:'rgba(239,68,68,0.08)',
                fontSize:12, color:'#ef4444', fontWeight:600,
              }}>
                <AlertCircle size={12}/>
                {t.zatFillRequired || "Majburiy maydonlarni to'ldiring"}
              </div>
            ) : (
              <div style={{ flex:1 }}/>
            )}

            <button
              onClick={doClose}
              style={{
                padding:'10px 22px', borderRadius:8, flexShrink:0,
                border:`1px solid ${border}`, background:'transparent',
                fontSize:13, fontWeight:600, color:muted, cursor:'pointer',
                transition:'all 0.15s',
              }}
            >
              {t.zatDetClose || 'Yopish'}
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding:'10px 28px', borderRadius:8, border:'none', flexShrink:0,
                background: saving ? (D ? '#2a2a2a' : '#e5e7eb') : '#6366f1',
                fontSize:13, fontWeight:700,
                color: saving ? muted : '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', gap:7,
                boxShadow: saving ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
                transition:'all 0.2s',
              }}
            >
              {saving
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation:'spin 0.8s linear infinite', flexShrink:0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                : <Save size={14}/>
              }
              {saving ? (t.zatSaving || 'Saqlanmoqda...') : (t.zatSave || 'Saqlash')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}