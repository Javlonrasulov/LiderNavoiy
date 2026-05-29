import { useState, useEffect } from 'react';
import { X, Save, Trash2, ChevronDown, Search, Check, ChevronRight } from 'lucide-react';

/* ═══════════ Types ═══════════ */
type ModalTab = 'asosiy' | 'boglanish' | 'ontrade' | 'opsiya';

export interface UserFormRow {
  id: number;
  code: string;
  name: string;
  tg: string;
  lastAct: string;
  role: string;
  status: 'open' | 'closed';
  org: string;
  emp: string;
  onTrade: string;
  dirs: string;
  acceptPay: boolean;
  consig: boolean;
  gps: boolean;
}

interface FormData {
  code: string;
  uid: string;
  status: string;
  xodim: string;
  fio: string;
  role: string;
  telegramId: string;
  org: string;
  ombor: string;
  grafik: string;
  directions: string[];
  kassalar: string[];
  omborlar: string[];
  tashkilotlar: string[];
  perms: Record<string, string>;
}

interface Props {
  D: boolean;
  user: UserFormRow | null; // null = new user
  onClose: () => void;
  onSave: (data: FormData) => void;
  onDelete?: (id: number) => void;
}

/* ═══════════ Constants ═══════════ */
const ROLES = [
  'Savdo agenti', 'Dostavkachi/Shofyor', 'Ofis xodimi', 'Menedjer',
];
const STATUS_LIST = ['Kirish ochiq', 'Kirish yopiq'];
const GRAFIK_LIST = ['Hudud', "Yo'nalish", 'Hisoblanmaydi'];
const ORG_LIST    = ['OOO "BORAN LEADERS"', 'LEADERS BARAKA'];
const OMBOR_LIST  = ['Ombor SHERIN', 'Ombor SOF IN', 'Brak'];
const XODIM_LIST  = [
  'Abduxakimov Diyorbek', 'Amriddinov Sardor', 'Baxodirov Utkir',
  'Buronov Feruz', 'Juraboev Fayzillo', 'Zaripov Begzod',
  'Irgashev Azizjon', 'Ismatov Asadbek', 'Patipov Umrzok',
];

const DIRECTIONS   = ['SHERIN', 'SOF IN'];
const KASSALAR_LST = ['Asosiy kassa', 'Kassa SOF IN', 'Klik', 'Kassa SHERIN'];
const OMBORLAR_LST = ['Ombor SHERIN', 'Ombor SOF IN', 'Brak'];
const TASHKILOT_LST= ['OOO "BORAN LEADERS"', 'LEADERS BARAKA'];

const PERMISSIONS = [
  { key: 'yangiMijoz',       label: "Yangi mijoz qo'shish",        opts: ['Bevosita', 'Tasdiqlash']           },
  { key: 'konsignatsiya',    label: 'Konsignatsiya',               opts: ['Ruxsat', 'Taqiqlangan']            },
  { key: 'arizaQabul',       label: 'Ariza qabul',                 opts: ['Ruxsat', 'Taqiqlangan']            },
  { key: 'tovarYetkazish',   label: 'Tovar yetkazish',             opts: ['Ruxsat', 'Taqiqlangan']            },
  { key: 'tolovQabul',       label: "To'lov qabul",                opts: ['Ruxsat', 'Taqiqlangan']            },
  { key: 'fotoHisobot',      label: 'Ariza foto-hisobot',          opts: ['Talab qilinadi', 'Talab qilinmaydi']},
  { key: 'treking',          label: "Treker ko'rish",              opts: ['Ruxsat', 'Taqiqlangan']            },
  { key: 'yetkazishReys',    label: "Yetkazish reysini ko'rish",   opts: ['Ruxsat', 'Taqiqlangan']            },
  { key: 'aktSverki',        label: "Akt sverki ko'rish",          opts: ['Ruxsat', 'Taqiqlangan']            },
  { key: 'reysYuklash',      label: 'Reys yuklash',                opts: ['Ruxsat', 'Taqiqlangan']            },
  { key: 'grafikMijozlar',   label: "Grafik bo'yicha mijozlar",    opts: ['Ruxsat', 'Taqiqlangan']            },
  { key: 'grafikTashqari',   label: 'Grafik tashqari mijozlar',    opts: ['Ruxsat', 'Taqiqlangan']            },
  { key: 'reklamaMijozlar',  label: "Reklama bo'yicha mijozlar",   opts: ['Ruxsat', 'Taqiqlangan']            },
  { key: 'gpsMijozlar',      label: "GPS bo'yicha mijozlar",       opts: ['Ruxsat', 'Taqiqlangan']            },
  { key: 'qrMijozlar',       label: "QR kod bo'yicha mijozlar",    opts: ['Ruxsat', 'Taqiqlangan']            },
];

const DEFAULT_PERMS: Record<string, string> = {
  yangiMijoz: 'Tasdiqlash', konsignatsiya: 'Taqiqlangan',
  arizaQabul: 'Ruxsat', tovarYetkazish: 'Ruxsat', tolovQabul: 'Ruxsat',
  fotoHisobot: 'Talab qilinmaydi', treking: 'Ruxsat', yetkazishReys: 'Ruxsat',
  aktSverki: 'Ruxsat', reysYuklash: 'Ruxsat', grafikMijozlar: 'Ruxsat',
  grafikTashqari: 'Ruxsat', reklamaMijozlar: 'Ruxsat', gpsMijozlar: 'Ruxsat', qrMijozlar: 'Ruxsat',
};

/* ═══════════ Dropdown helper ═══════════ */
function SelectField({
  label, value, onChange, options, D, border, txt, muted, surface,
  clearable,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; D: boolean; border: string; txt: string;
  muted: string; surface: string; clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}`, padding: '9px 0', position: 'relative' }}>
      <span style={{ flexShrink: 0, minWidth: 110, fontSize: 12.5, color: muted, fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 10px', borderRadius: 7, border: `1px solid ${border}`,
            background: D ? 'rgba(255,255,255,0.04)' : '#fff',
            color: value ? txt : muted, fontSize: 12.5, cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
            {value || `— tanlang —`}
          </span>
          <ChevronDown size={13} style={{ flexShrink: 0, marginLeft: 4, opacity: 0.6 }} />
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
            background: D ? '#1e1e1e' : '#fff', border: `1px solid ${border}`,
            borderRadius: 8, marginTop: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            overflow: 'hidden',
          }}>
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none',
                  background: value === opt ? (D ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)') : 'transparent',
                  color: value === opt ? '#6366f1' : txt,
                  fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {value === opt && <Check size={11} />}
                {value !== opt && <span style={{ width: 11 }} />}
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
      {clearable && value && (
        <button
          onClick={() => onChange('')}
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: muted, display: 'flex' }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

/* ═══════════ Text field ═══════════ */
function TextField({
  label, value, onChange, placeholder, D, border, txt, muted, readOnly,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; D: boolean; border: string;
  txt: string; muted: string; readOnly?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}`, padding: '9px 0' }}>
      <span style={{ flexShrink: 0, minWidth: 110, fontSize: 12.5, color: muted, fontWeight: 500 }}>{label}</span>
      <input
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder || ''}
        readOnly={readOnly}
        style={{
          flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: 7,
          border: `1px solid ${border}`,
          background: readOnly
            ? (D ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)')
            : (D ? 'rgba(255,255,255,0.04)' : '#fff'),
          color: readOnly ? muted : txt, fontSize: 12.5, outline: 'none',
          boxSizing: 'border-box' as const,
        }}
      />
    </div>
  );
}

/* ═══════════ Checkbox table ═══════════ */
function CheckTable({
  title, items, selected, onToggle, D, border, txt, muted, surface,
}: {
  title: string; items: string[]; selected: string[];
  onToggle: (item: string) => void;
  D: boolean; border: string; txt: string; muted: string; surface: string;
}) {
  const indigo = '#6366f1';
  return (
    <div style={{
      border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '28px 24px 1fr',
        background: D ? '#1e1e1e' : '#f3f4f6',
        borderBottom: `1px solid ${border}`,
        padding: '5px 8px',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase' }}>№</span>
        <span />
        <span style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase' }}>{title}</span>
      </div>
      {/* rows */}
      {items.map((item, idx) => {
        const isChecked = selected.includes(item);
        return (
          <div
            key={item}
            onClick={() => onToggle(item)}
            style={{
              display: 'grid', gridTemplateColumns: '28px 24px 1fr',
              padding: '7px 8px', cursor: 'pointer',
              background: isChecked
                ? (D ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.07)')
                : (idx % 2 === 0
                    ? 'transparent'
                    : (D ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.012)')),
              borderBottom: idx < items.length - 1 ? `1px solid ${border}` : 'none',
              transition: 'background 0.12s',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 11, color: muted, fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</span>
            <div style={{
              width: 15, height: 15, borderRadius: 4,
              border: `1.5px solid ${isChecked ? indigo : (D ? '#4b5563' : '#d1d5db')}`,
              background: isChecked ? indigo : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.12s',
            }}>
              {isChecked && <Check size={9} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{
              fontSize: 12, color: isChecked ? (D ? '#c7d2fe' : '#4338ca') : txt,
              fontWeight: isChecked ? 600 : 400,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {item}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export function AdminUserFormModal({ D, user, onClose, onSave, onDelete }: Props) {
  const [tab, setTab] = useState<ModalTab>('asosiy');
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  /* ── form state ── */
  const [form, setForm] = useState<FormData>(() => {
    if (user) {
      return {
        code: user.code,
        uid: String(user.id),
        status: user.status === 'open' ? 'Kirish ochiq' : 'Kirish yopiq',
        xodim: user.emp,
        fio: user.name,
        role: user.role,
        telegramId: user.tg || '',
        org: user.org,
        ombor: '',
        grafik: 'Hudud',
        directions: user.dirs ? user.dirs.split(', ') : [],
        kassalar: [],
        omborlar: [],
        tashkilotlar: user.org ? [user.org.replace('...', '')] : [],
        perms: { ...DEFAULT_PERMS, ...(user.acceptPay ? { tolovQabul: 'Ruxsat' } : {}) },
      };
    }
    return {
      code: '', uid: '', status: 'Kirish ochiq', xodim: '', fio: '',
      role: '', telegramId: '', org: '', ombor: '', grafik: 'Hudud',
      directions: [], kassalar: [], omborlar: [], tashkilotlar: [],
      perms: { ...DEFAULT_PERMS },
    };
  });

  const upd = (key: keyof FormData, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const toggleList = (key: 'directions' | 'kassalar' | 'omborlar' | 'tashkilotlar', item: string) =>
    setForm(f => {
      const arr = f[key] as string[];
      return { ...f, [key]: arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item] };
    });

  const togglePerm = (key: string) =>
    setForm(f => {
      const perm = PERMISSIONS.find(p => p.key === key)!;
      const current = f.perms[key];
      const next = perm.opts.find(o => o !== current) || perm.opts[0];
      return { ...f, perms: { ...f.perms, [key]: next } };
    });

  /* ── design tokens ── */
  const txt     = D ? '#f0f0f0' : '#111827';
  const muted   = D ? '#6b7280' : '#9ca3af';
  const border  = D ? '#2a2a2a' : '#e5e7eb';
  const surface = D ? '#1a1a1a' : '#f9fafb';
  const bg      = D ? '#141414' : '#ffffff';
  const indigo  = '#6366f1';
  const green   = D ? '#22c55e' : '#16a34a';

  const title = user ? `${user.name} (Foydalanuvchi)` : "Yangi foydalanuvchi";

  const TABS: { id: ModalTab; label: string }[] = [
    { id: 'asosiy',   label: 'Asosiy'        },
    { id: 'boglanish',label: "Bog'lanishlar"  },
    { id: 'ontrade',  label: 'Ilova'          },
    { id: 'opsiya',   label: 'Opsiyalar'      },
  ];

  /* ─── Tab content renderers ─── */
  const renderAsosiy = () => (
    <div style={{ padding: isMobile ? '0 14px' : '0 20px' }}>
      {/* Row 1: Kod + ID + Status */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        borderBottom: `1px solid ${border}`, padding: '10px 0',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}>
        {/* Kod */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12.5, color: muted, fontWeight: 500, whiteSpace: 'nowrap' }}>Kod:</span>
          <input
            value={form.code}
            onChange={e => upd('code', e.target.value)}
            style={{
              width: 60, padding: '5px 8px', borderRadius: 7,
              border: `1px solid ${border}`,
              background: D ? 'rgba(255,255,255,0.04)' : '#fff',
              color: txt, fontSize: 12.5, outline: 'none',
              fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' as const,
            }}
          />
        </div>
        {/* ID */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12.5, color: muted, fontWeight: 500 }}>ID:</span>
          <input
            value={form.uid}
            onChange={e => upd('uid', e.target.value)}
            style={{
              width: 54, padding: '5px 8px', borderRadius: 7,
              border: `1px solid ${border}`,
              background: D ? 'rgba(255,255,255,0.04)' : '#fff',
              color: txt, fontSize: 12.5, outline: 'none',
              fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' as const,
            }}
          />
        </div>
        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12.5, color: muted, fontWeight: 500, whiteSpace: 'nowrap' }}>Holat:</span>
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <StatusToggle
              value={form.status}
              onChange={v => upd('status', v)}
              D={D} txt={txt} muted={muted} border={border} green={green}
            />
          </div>
        </div>
      </div>

      {/* Xodim row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}`, padding: '9px 0' }}>
        <span style={{ flexShrink: 0, minWidth: 110, fontSize: 12.5, color: muted, fontWeight: 500 }}>Xodim:</span>
        <input
          value={form.xodim}
          onChange={e => upd('xodim', e.target.value)}
          placeholder="Xodimni tanlang"
          style={{
            flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: 7,
            border: `1px solid ${border}`,
            background: D ? 'rgba(255,255,255,0.04)' : '#fff',
            color: txt, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' as const,
          }}
        />
        <LookupBtn D={D} border={border} muted={muted} />
        <ClearBtn show={!!form.xodim} onClear={() => upd('xodim', '')} muted={muted} />
      </div>

      {/* FIO */}
      <TextField label="F.I.O:" value={form.fio} onChange={v => upd('fio', v)}
        D={D} border={border} txt={txt} muted={muted} />

      {/* Rol */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}`, padding: '9px 0' }}>
        <span style={{ flexShrink: 0, minWidth: 110, fontSize: 12.5, color: muted, fontWeight: 500 }}>Rol:</span>
        <RoleSelect value={form.role} onChange={v => upd('role', v)}
          D={D} border={border} txt={txt} muted={muted} />
        <LookupBtn D={D} border={border} muted={muted} />
      </div>

      {/* Telegram ID */}
      <TextField label="Telegram ID:" value={form.telegramId} onChange={v => upd('telegramId', v)}
        placeholder="@username"
        D={D} border={border} txt={txt} muted={muted} />

      {/* Tashkilot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}`, padding: '9px 0' }}>
        <span style={{ flexShrink: 0, minWidth: 110, fontSize: 12.5, color: muted, fontWeight: 500 }}>Tashkilot:</span>
        <SelectInline value={form.org} onChange={v => upd('org', v)}
          options={ORG_LIST} D={D} border={border} txt={txt} muted={muted} />
        <LookupBtn D={D} border={border} muted={muted} />
        <ClearBtn show={!!form.org} onClear={() => upd('org', '')} muted={muted} />
      </div>

      {/* Ombor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}`, padding: '9px 0' }}>
        <span style={{ flexShrink: 0, minWidth: 110, fontSize: 12.5, color: muted, fontWeight: 500 }}>Ombor:</span>
        <SelectInline value={form.ombor} onChange={v => upd('ombor', v)}
          options={OMBOR_LIST} D={D} border={border} txt={txt} muted={muted} />
        <LookupBtn D={D} border={border} muted={muted} />
        <ClearBtn show={!!form.ombor} onClear={() => upd('ombor', '')} muted={muted} />
      </div>

      {/* Grafik turi */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}`, padding: '9px 0' }}>
        <span style={{ flexShrink: 0, minWidth: 110, fontSize: 12.5, color: muted, fontWeight: 500 }}>Grafik turi:</span>
        <SelectInline value={form.grafik} onChange={v => upd('grafik', v)}
          options={GRAFIK_LIST} D={D} border={border} txt={txt} muted={muted} />
        <LookupBtn D={D} border={border} muted={muted} />
      </div>
    </div>
  );

  const renderBoglanish = () => (
    <div style={{
      padding: isMobile ? '12px 14px' : '12px 20px',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: 12,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <CheckTable title="Yo'nalishlar" items={DIRECTIONS} selected={form.directions}
          onToggle={i => toggleList('directions', i)}
          D={D} border={border} txt={txt} muted={muted} surface={surface} />
        <CheckTable title="Omborlar" items={OMBORLAR_LST} selected={form.omborlar}
          onToggle={i => toggleList('omborlar', i)}
          D={D} border={border} txt={txt} muted={muted} surface={surface} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <CheckTable title="Kassalar" items={KASSALAR_LST} selected={form.kassalar}
          onToggle={i => toggleList('kassalar', i)}
          D={D} border={border} txt={txt} muted={muted} surface={surface} />
        <CheckTable title="Tashkilotlar" items={TASHKILOT_LST} selected={form.tashkilotlar}
          onToggle={i => toggleList('tashkilotlar', i)}
          D={D} border={border} txt={txt} muted={muted} surface={surface} />
      </div>
    </div>
  );

  const renderOntrade = () => (
    <div style={{ padding: isMobile ? '16px 14px' : '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* OnTrade login */}
      <div style={{
        padding: '14px 16px', borderRadius: 12,
        background: D ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
        border: `1px solid ${D ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)'}`,
      }}>
        <div style={{ fontSize: 11, color: indigo, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Ontrade Mobile Login
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 80, fontSize: 12.5, color: muted }}>Login:</span>
            <input
              placeholder="ontrade_login"
              style={{
                flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8,
                border: `1px solid ${border}`, background: D ? '#1a1a1a' : '#fff',
                color: txt, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' as const,
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 80, fontSize: 12.5, color: muted }}>Parol:</span>
            <input
              type="password" placeholder="••••••••"
              style={{
                flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8,
                border: `1px solid ${border}`, background: D ? '#1a1a1a' : '#fff',
                color: txt, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' as const,
              }}
            />
          </div>
        </div>
      </div>
      {/* Mobile settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
        {[
          { label: "To'lov qabul qilish", val: true },
          { label: 'GPS tracking', val: false },
          { label: 'Konsignatsiya', val: false },
          { label: "Offline rejim", val: true },
        ].map((item, i) => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: i < 3 ? `1px solid ${border}` : 'none',
            background: i % 2 === 0 ? 'transparent' : (D ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.012)'),
          }}>
            <span style={{ fontSize: 12.5, color: txt }}>{item.label}</span>
            <ToggleSwitch D={D} value={item.val} />
          </div>
        ))}
      </div>
    </div>
  );

  const renderOpsiya = () => (
    <div style={{ padding: 0 }}>
      <div style={{ border: `1px solid ${border}`, borderRadius: 0, overflow: 'hidden' }}>
        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 110px 130px',
          padding: isMobile ? '6px 12px' : '6px 20px',
          background: D ? '#1e1e1e' : '#f3f4f6',
          borderBottom: `1px solid ${border}`,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sozlama</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>1-variant</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>2-variant</span>
        </div>
        {PERMISSIONS.map((perm, i) => {
          const current = form.perms[perm.key];
          return (
            <div
              key={perm.key}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 110px 130px',
                padding: isMobile ? '8px 12px' : '7px 20px',
                borderBottom: i < PERMISSIONS.length - 1 ? `1px solid ${border}` : 'none',
                background: i % 2 === 0 ? 'transparent' : (D ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.012)'),
                alignItems: 'center',
                gap: isMobile ? 6 : 0,
              }}
            >
              <span style={{ fontSize: 12.5, color: txt, fontWeight: 500 }}>{perm.label}:</span>
              {isMobile ? (
                /* mobile: horizontal option buttons */
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {perm.opts.map(opt => (
                    <PermBtn key={opt} label={opt} active={current === opt}
                      onClick={() => togglePerm(perm.key)}
                      D={D} border={border} txt={txt} muted={muted} />
                  ))}
                </div>
              ) : (
                <>
                  {perm.opts.map(opt => (
                    <div key={opt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PermBtn label={opt} active={current === opt}
                        onClick={() => setForm(f => ({ ...f, perms: { ...f.perms, [perm.key]: opt } }))}
                        D={D} border={border} txt={txt} muted={muted} />
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    /* ── Overlay ── */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        padding: isMobile ? '0' : '20px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 660,
          background: bg,
          borderRadius: isMobile ? 0 : 18,
          border: `1px solid ${border}`,
          boxShadow: D ? '0 32px 80px rgba(0,0,0,0.8)' : '0 32px 80px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
          maxHeight: isMobile ? '100dvh' : 'calc(100vh - 40px)',
          boxSizing: 'border-box',
          overflow: 'hidden',
          ...(isMobile ? { minHeight: '100dvh' } : {}),
        }}
      >
        {/* ══ MODAL HEADER ══ */}
        <div style={{
          padding: isMobile ? '14px 14px 0' : '16px 20px 0',
          background: D ? '#1a1a1a' : '#f9fafb',
          borderBottom: `1px solid ${border}`,
          flexShrink: 0,
        }}>
          {/* Title row */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: 10, marginBottom: 12,
            minWidth: 0,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                margin: 0, fontSize: isMobile ? 15 : 17, fontWeight: 800,
                color: txt, letterSpacing: '-0.4px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {title}
              </h2>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* Save & Close */}
              <button
                onClick={() => { onSave(form); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: isMobile ? '7px 12px' : '7px 14px',
                  borderRadius: 9, border: 'none',
                  background: indigo, color: '#fff',
                  fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                  flexShrink: 0,
                }}
              >
                <Save size={12} />
                {!isMobile && <span>Saqlash</span>}
              </button>

              {/* Delete */}
              {user && onDelete && (
                <button
                  onClick={() => { onDelete(user.id); onClose(); }}
                  style={{
                    width: 32, height: 32, borderRadius: 9, border: `1px solid ${D ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'}`,
                    background: D ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)',
                    color: '#ef4444', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}

              {/* Actions dropdown */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={() => setShowActions(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 10px', borderRadius: 9,
                    border: `1px solid ${border}`,
                    background: 'transparent', color: muted,
                    fontSize: 11, cursor: 'pointer',
                  }}
                >
                  {!isMobile && <span>Amallar</span>}
                  <ChevronDown size={12} />
                </button>
                {showActions && (
                  <div style={{
                    position: 'absolute', top: '110%', right: 0, zIndex: 600,
                    background: D ? '#1e1e1e' : '#fff',
                    border: `1px solid ${border}`, borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    minWidth: 160, overflow: 'hidden',
                  }}>
                    {["Nusxa ko'chirish", "Parolni tiklash", "Huquqlarni nusxalash", "Faollashtirish"].map(action => (
                      <button key={action} onClick={() => setShowActions(false)} style={{
                        width: '100%', textAlign: 'left', padding: '9px 14px',
                        border: 'none', background: 'transparent', color: txt,
                        fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <ChevronRight size={11} color={muted} />
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 9,
                  border: `1px solid ${border}`,
                  background: D ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                  color: muted, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{
            display: 'flex', gap: 0, overflowX: 'auto',
            scrollbarWidth: 'none',
          }}>
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: isMobile ? '8px 12px' : '9px 16px',
                    border: 'none', borderBottom: active ? `2px solid ${indigo}` : '2px solid transparent',
                    background: 'transparent',
                    color: active ? indigo : muted,
                    fontSize: isMobile ? 11.5 : 12.5,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.15s', flexShrink: 0,
                    marginBottom: -1,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ══ TAB CONTENT ══ */}
        <div style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          background: bg,
          paddingTop: tab === 'boglanish' || tab === 'opsiya' ? 0 : 4,
        }}>
          {tab === 'asosiy'    && renderAsosiy()}
          {tab === 'boglanish' && renderBoglanish()}
          {tab === 'ontrade'   && renderOntrade()}
          {tab === 'opsiya'    && renderOpsiya()}
        </div>

        {/* ══ FOOTER ══ */}
        {tab === 'asosiy' && (
          <div style={{
            padding: isMobile ? '10px 14px' : '10px 20px',
            borderTop: `1px solid ${border}`,
            background: D ? '#1a1a1a' : '#f9fafb',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
            gap: 8,
          }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
              {/* Permission badges summary */}
              {[
                { label: "To'lov", active: form.perms.tolovQabul === 'Ruxsat', color: green },
                { label: 'Konsig', active: form.perms.konsignatsiya === 'Ruxsat', color: '#f59e0b' },
                { label: 'GPS', active: form.perms.gpsMijozlar === 'Ruxsat', color: '#3b82f6' },
              ].map(b => (
                <span key={b.label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 10, padding: '3px 8px', borderRadius: 20,
                  background: b.active ? `${b.color}18` : (D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                  color: b.active ? b.color : muted,
                  border: `1px solid ${b.active ? `${b.color}44` : border}`,
                  fontWeight: b.active ? 600 : 400,
                }}>
                  {b.active && <Check size={8} />}
                  {b.label}
                </span>
              ))}
            </div>
            <button
              onClick={() => { onSave(form); onClose(); }}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 10, border: 'none',
                background: indigo, color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
              }}
            >
              <Save size={13} /> Saqlash va yopish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══ Small helpers ══ */

function LookupBtn({ D, border, muted }: { D: boolean; border: string; muted: string }) {
  return (
    <button style={{
      flexShrink: 0, padding: '5px 8px', borderRadius: 7,
      border: `1px solid ${border}`,
      background: D ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
      color: muted, cursor: 'pointer', fontSize: 10, fontWeight: 700,
    }}>
      ...
    </button>
  );
}

function ClearBtn({ show, onClear, muted }: { show: boolean; onClear: () => void; muted: string }) {
  if (!show) return null;
  return (
    <button onClick={onClear} style={{
      flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
      padding: 3, color: muted, display: 'flex',
    }}>
      <X size={13} />
    </button>
  );
}

function StatusToggle({ value, onChange, D, txt, muted, border, green }: {
  value: string; onChange: (v: string) => void;
  D: boolean; txt: string; muted: string; border: string; green: string;
}) {
  const isOpen = value === 'Kirish ochiq';
  return (
    <button
      onClick={() => onChange(isOpen ? 'Kirish yopiq' : 'Kirish ochiq')}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '5px 11px', borderRadius: 20,
        border: `1px solid ${isOpen ? (D ? 'rgba(34,197,94,0.3)' : 'rgba(22,163,74,0.25)') : (D ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.25)')}`,
        background: isOpen ? (D ? 'rgba(34,197,94,0.12)' : 'rgba(22,163,74,0.07)') : (D ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.07)'),
        color: isOpen ? green : '#ef4444',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        boxSizing: 'border-box' as const,
      }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: isOpen ? green : '#ef4444',
        display: 'inline-block', flexShrink: 0,
        boxShadow: `0 0 6px ${isOpen ? green : '#ef4444'}`,
      }} />
      {value}
    </button>
  );
}

function SelectInline({ value, onChange, options, D, border, txt, muted }: {
  value: string; onChange: (v: string) => void; options: string[];
  D: boolean; border: string; txt: string; muted: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px', borderRadius: 7, border: `1px solid ${border}`,
          background: D ? 'rgba(255,255,255,0.04)' : '#fff',
          color: value ? txt : muted, fontSize: 12.5, cursor: 'pointer',
          textAlign: 'left', boxSizing: 'border-box' as const,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || '— tanlang —'}
        </span>
        <ChevronDown size={12} style={{ flexShrink: 0, marginLeft: 4, opacity: 0.5 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 400,
          background: D ? '#1e1e1e' : '#fff', border: `1px solid ${border}`,
          borderRadius: 8, marginTop: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none',
                background: value === opt ? (D ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)') : 'transparent',
                color: value === opt ? '#6366f1' : txt,
                fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {value === opt ? <Check size={11} color="#6366f1" /> : <span style={{ width: 11 }} />}
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleSelect({ value, onChange, D, border, txt, muted }: {
  value: string; onChange: (v: string) => void;
  D: boolean; border: string; txt: string; muted: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px', borderRadius: 7, border: `1px solid ${border}`,
          background: D ? 'rgba(255,255,255,0.04)' : '#fff',
          color: value ? txt : muted, fontSize: 12.5, cursor: 'pointer',
          textAlign: 'left', boxSizing: 'border-box' as const,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || '— tanlang —'}
        </span>
        <ChevronDown size={12} style={{ flexShrink: 0, marginLeft: 4, opacity: 0.5 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 400,
          background: D ? '#1e1e1e' : '#fff', border: `1px solid ${border}`,
          borderRadius: 8, marginTop: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}>
          {ROLES.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none',
                background: value === opt ? (D ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)') : 'transparent',
                color: value === opt ? '#6366f1' : txt,
                fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {value === opt ? <Check size={11} color="#6366f1" /> : <span style={{ width: 11 }} />}
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PermBtn({ label, active, onClick, D, border, txt, muted }: {
  label: string; active: boolean; onClick: () => void;
  D: boolean; border: string; txt: string; muted: string;
}) {
  const isPositive = label === 'Ruxsat' || label === 'Bevosita' || label === 'Talab qilinadi';
  const activeColor = isPositive ? '#22c55e' : '#ef4444';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 7, border: 'none',
        background: active
          ? (D ? `${activeColor}22` : `${activeColor}14`)
          : (D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
        color: active ? activeColor : muted,
        fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
        outline: active ? `1.5px solid ${activeColor}44` : 'none',
        transition: 'all 0.12s',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: active ? activeColor : (D ? '#374151' : '#d1d5db'),
        display: 'inline-block', flexShrink: 0,
        boxShadow: active ? `0 0 5px ${activeColor}` : 'none',
      }} />
      {label}
    </button>
  );
}

function ToggleSwitch({ D, value }: { D: boolean; value: boolean }) {
  const [on, setOn] = useState(value);
  return (
    <div
      onClick={() => setOn(o => !o)}
      style={{
        width: 38, height: 20, borderRadius: 20,
        background: on ? '#6366f1' : (D ? '#374151' : '#d1d5db'),
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        left: on ? 20 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}