import { useState, useEffect, useRef } from 'react';
import {
  Search, Check, Plus, X,
  MapPin, Building2, CreditCard, Package, Navigation,
} from 'lucide-react';
import { AdminUserFormModal, type UserFormRow, type UserFormData } from './AdminUserFormModal';
import { translateUserRole, userStatusOpenLabel } from '../../../data/adminData';
import { demo } from '../../../data/demoLimit';

interface Props {
  D: boolean;
  t: Record<string, string>;
  card: string;
  divider: string;
  sub: string;
}

interface UserRow {
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

const INITIAL_USERS: UserRow[] = demo([
  { id: 1,  code: '0051', name: 'Abduxakimov Diyorbek',        tg: '', lastAct: '', role: 'Dostavkachi/Shofyor', status: 'open', org: 'OOO "BORAN L..."', emp: 'Abduxakimov D...',  onTrade: '',             dirs: 'SHERIN',          acceptPay: true,  consig: false, gps: false },
  { id: 2,  code: '0035', name: 'Amriddinov Sardor',           tg: '', lastAct: '', role: 'Savdo agenti',        status: 'open', org: 'LEADERS BAR...',  emp: 'Amriddinov S...',   onTrade: '',             dirs: 'SOF IN',          acceptPay: true,  consig: false, gps: false },
  { id: 3,  code: '0043', name: 'Baxodirov Utkir',             tg: '', lastAct: '', role: 'Dostavkachi/Shofyor', status: 'open', org: 'LEADERS BAR...',  emp: 'Baxodirov Utk...',  onTrade: '',             dirs: 'SOF IN',          acceptPay: true,  consig: false, gps: false },
  { id: 4,  code: '0053', name: 'Buronov Feruz',               tg: '', lastAct: '', role: 'Dostavkachi/Shofyor', status: 'open', org: 'OOO "BORAN L..."', emp: 'Buronov Feruz',     onTrade: '',             dirs: 'SHERIN',          acceptPay: true,  consig: false, gps: false },
  { id: 5,  code: '0020', name: 'Buxgalter',                   tg: '', lastAct: '', role: 'Ofis xodimi',         status: 'open', org: 'OOO "BORAN L..."', emp: 'Buxgalter Akb...',  onTrade: '',             dirs: 'SHERIN, SOF IN', acceptPay: false, consig: false, gps: false },
  { id: 6,  code: '0046', name: 'Juraboev Fayzillo',           tg: '', lastAct: '', role: 'Dostavkachi/Shofyor', status: 'open', org: 'OOO "BORAN L..."', emp: 'Juraboev Fa...',    onTrade: '',             dirs: 'SHERIN',          acceptPay: true,  consig: false, gps: false },
  { id: 7,  code: '0017', name: 'Tarozi2',                     tg: '', lastAct: '', role: 'Ofis xodimi',         status: 'open', org: 'OOO "BORAN L..."', emp: 'Zaripov Begzod',    onTrade: '',             dirs: 'SHERIN',          acceptPay: false, consig: false, gps: false },
  { id: 8,  code: '0018', name: 'Zaripov Begzod',              tg: '', lastAct: '', role: 'Ofis xodimi',         status: 'open', org: 'OOO "BORAN L..."', emp: 'Zaripov Begzod',    onTrade: 'begzod.bld',   dirs: 'SHERIN',          acceptPay: false, consig: false, gps: false },
  { id: 9,  code: '0005', name: 'Zaripov Mirjon',              tg: '', lastAct: '', role: 'Ofis xodimi',         status: 'open', org: 'OOO "BORAN L..."', emp: 'Zaripov Mirj...',   onTrade: '',             dirs: 'SHERIN, SOF IN', acceptPay: false, consig: false, gps: false },
  { id: 10, code: '0004', name: 'Zaripov Shaxzod',             tg: '', lastAct: '', role: 'Savdo agenti',        status: 'open', org: 'OOO "BORAN L..."', emp: 'Zaripov Shaxzod',   onTrade: 'direktor.bld', dirs: 'SHERIN, SOF IN', acceptPay: false, consig: false, gps: true  },
  { id: 11, code: '0047', name: 'Ibragimov Sherzod aka',       tg: '', lastAct: '', role: 'Dostavkachi/Shofyor', status: 'open', org: 'OOO "BORAN L..."', emp: 'Ibragimov She...',  onTrade: '',             dirs: 'SHERIN',          acceptPay: true,  consig: false, gps: false },
  { id: 12, code: '0015', name: 'Irgashev Azizjon Ilxomovich', tg: '', lastAct: '', role: 'Savdo agenti',        status: 'open', org: 'OOO "BORAN L..."', emp: 'Irgashev Aziz...',  onTrade: 'azizjon.bld',  dirs: 'SHERIN',          acceptPay: false, consig: false, gps: false },
  { id: 13, code: '0026', name: 'Ismatov Asadbek',             tg: '', lastAct: '', role: 'Savdo agenti',        status: 'open', org: 'LEADERS BAR...',  emp: 'Ismatov Asadb...',  onTrade: '',             dirs: 'SOF IN',          acceptPay: false, consig: false, gps: false },
  { id: 14, code: '0050', name: 'Ismatullaev Quvonchbek',      tg: '', lastAct: '', role: 'Ofis xodimi',         status: 'open', org: 'OOO "BORAN L..."', emp: 'Ismatullaev K...',  onTrade: '',             dirs: 'SHERIN',          acceptPay: false, consig: false, gps: false },
  { id: 15, code: '0032', name: 'Patipov Umrzok',              tg: '', lastAct: '', role: 'Savdo agenti',        status: 'open', org: 'OOO "BORAN L..."', emp: 'Patipov Umrzok',    onTrade: '',             dirs: 'SHERIN',          acceptPay: true,  consig: false, gps: false },
  { id: 16, code: '0002', name: 'Menedjer',                    tg: '', lastAct: '', role: 'Menedjer',            status: 'open', org: 'OOO "BORAN L..."', emp: 'Menedjer',          onTrade: '',             dirs: 'SHERIN, SOF IN', acceptPay: false, consig: false, gps: true  },
]);

function formToUserRow(data: UserFormData, t: Record<string, string>, id: number): UserRow {
  const org = data.org.length > 14 ? `${data.org.slice(0, 13)}...` : data.org;
  const emp = data.xodim.length > 14 ? `${data.xodim.slice(0, 13)}...` : data.xodim;
  return {
    id,
    code: data.code.trim(),
    name: data.fio.trim() || data.xodim.trim(),
    tg: data.telegramId.trim(),
    lastAct: '',
    role: data.role,
    status: data.status === userStatusOpenLabel(t) ? 'open' : 'closed',
    org,
    emp,
    onTrade: '',
    dirs: data.directions.join(', '),
    acceptPay: data.perms.tolovQabul === 'Ruxsat',
    consig: data.perms.konsignatsiya === 'Ruxsat',
    gps: data.perms.gpsMijozlar === 'Ruxsat',
  };
}

function roleColor(role: string) {
  if (role.includes('Savdo'))                                  return { bg: 'rgba(99,102,241,0.13)',  text: '#818cf8' };
  if (role.includes('Dostavka') || role.includes('Shofyor'))  return { bg: 'rgba(245,158,11,0.13)',  text: '#f59e0b' };
  if (role.includes('Ofis'))                                   return { bg: 'rgba(59,130,246,0.13)',  text: '#60a5fa' };
  if (role.includes('Menedjer'))                               return { bg: 'rgba(168,85,247,0.13)',  text: '#c084fc' };
  return                                                              { bg: 'rgba(107,114,128,0.13)', text: '#9ca3af' };
}

/* ═══════════════════════ MOBILE CARD ═══════════════════════ */
function MobileUserCard({ u, D, isSelected, onSelect, t }: {
  u: UserRow; D: boolean; isSelected: boolean; onSelect: () => void; t: Record<string, string>;
}) {
  const txt   = D ? '#f0f0f0' : '#111827';
  const muted = D ? '#6b7280' : '#9ca3af';
  const sub   = D ? '#4b5563' : '#d1d5db';
  const green = D ? '#22c55e' : '#16a34a';
  const rc    = roleColor(u.role);

  const cardBg     = isSelected ? (D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)') : (D ? '#1c1c1c' : '#ffffff');
  const cardBorder = isSelected ? '#6366f1' : (D ? '#2a2a2a' : '#e5e7eb');
  const initials   = u.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div
      onClick={onSelect}
      style={{
        background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14,
        padding: '12px', cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: isSelected ? '0 0 0 2px rgba(99,102,241,0.35)' : (D ? 'none' : '0 1px 4px rgba(0,0,0,0.06)'),
        display: 'flex', flexDirection: 'column', gap: 9,
        width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden', minWidth: 0,
      }}
    >
      {/* row 1: avatar + name + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: isSelected ? '#6366f1' : rc.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#fff' : rc.text, letterSpacing: '-0.5px' }}>
            {initials}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {u.name}
          </span>
          <span style={{ fontSize: 10, color: muted, fontVariantNumeric: 'tabular-nums', display: 'block' }}>
            #{u.code}
          </span>
        </div>
        <span style={{
          fontSize: 10, padding: '3px 7px', borderRadius: 20, flexShrink: 0,
          background: u.status === 'open' ? (D ? 'rgba(34,197,94,0.15)' : 'rgba(22,163,74,0.10)') : (D ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.10)'),
          color: u.status === 'open' ? green : '#ef4444', fontWeight: 600, display: 'inline-block',
        }}>
          {u.status === 'open' ? (t.userOpen || 'Ochiq') : (t.userClosed || 'Yopiq')}
        </span>
      </div>

      {/* row 2: role badge */}
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <span style={{
          fontSize: 10, padding: '3px 9px', borderRadius: 7,
          background: rc.bg, color: rc.text, fontWeight: 600,
          display: 'inline-block', maxWidth: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {translateUserRole(u.role, t)}
        </span>
      </div>

      {/* row 3: org + dirs */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px', padding: '9px',
        background: D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        borderRadius: 9, minWidth: 0, overflow: 'hidden', boxSizing: 'border-box', width: '100%',
      }}>
        {[
          { Icon: Building2, label: t.userOrg  || 'Tashkilot', val: u.org  },
          { Icon: MapPin,    label: t.userDirs  || "Bo'linma",  val: u.dirs },
        ].map(({ Icon, label, val }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, overflow: 'hidden' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Icon size={8} style={{ flexShrink: 0 }} /> {label}
            </span>
            <span style={{ fontSize: 11, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100%' }}>
              {val || '—'}
            </span>
          </div>
        ))}
      </div>

      {/* row 4: flags */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', minWidth: 0 }}>
        {[
          { Icon: CreditCard, label: t.userAcceptPay || "To'lov", val: u.acceptPay, activeColor: green },
          { Icon: Package,    label: t.userConsig    || 'Konsig',  val: u.consig,    activeColor: '#f59e0b' },
          { Icon: Navigation, label: t.userGPS       || 'GPS',     val: u.gps,       activeColor: '#3b82f6' },
        ].map(({ Icon, label, val, activeColor }) => (
          <span key={label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, padding: '3px 8px', borderRadius: 7,
            background: val ? (D ? `${activeColor}22` : `${activeColor}18`) : (D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
            color: val ? activeColor : muted, fontWeight: val ? 600 : 400,
            border: `1px solid ${val ? `${activeColor}44` : sub}`, flexShrink: 0,
          }}>
            <Icon size={9} />
            {label}
            {val && <Check size={9} />}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════ MAIN ═══════════════════════ */
export function AdminUsersTab({ D, t, card, divider, sub }: Props) {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [users, setUsers] = useState<UserRow[]>(() => [...INITIAL_USERS]);
  const [search,   setSearch]  = useState('');
  const [selected, setSelected] = useState<number | null>(15);
  const tableRef = useRef<HTMLDivElement>(null);

  const [modalUser, setModalUser] = useState<UserFormRow | null | 'new'>(null);
  const openNew    = () => setModalUser('new');
  const openEdit   = (u: UserRow) => setModalUser(u as unknown as UserFormRow);
  const closeModal = () => setModalUser(null);

  const handleSave = (data: UserFormData) => {
    if (modalUser === 'new') {
      const nextId = users.reduce((max, u) => Math.max(max, u.id), 0) + 1;
      const nextCode = data.code.trim() || String(nextId).padStart(4, '0');
      const row = formToUserRow({ ...data, code: nextCode }, t, nextId);
      if (!row.name) return;
      setUsers(prev => [...prev, row]);
      setSelected(row.id);
    } else if (modalUser) {
      const row = formToUserRow(data, t, modalUser.id);
      if (!row.name) return;
      setUsers(prev => prev.map(u => (u.id === modalUser.id ? row : u)));
      setSelected(row.id);
    }
  };

  const handleDelete = (id: number) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    setSelected(prev => (prev === id ? null : prev));
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const txt    = D ? '#f9fafb' : '#111827';
  const muted  = D ? '#6b7280' : '#9ca3af';
  const border = D ? '#2a2a2a' : '#e5e7eb';
  const bg     = D ? '#111111' : '#f4f4f5';
  const surface= D ? '#1a1a1a' : '#f9fafb';
  const thBg   = D ? '#181818' : '#f3f4f6';
  const rowHov = D ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)';
  const selBg  = D ? 'rgba(99,102,241,0.20)' : 'rgba(99,102,241,0.10)';
  const indigo = '#6366f1';
  const green  = D ? '#22c55e' : '#16a34a';

  const filtered = users.filter(u => {
    const q = search.trim().toLowerCase();
    return !q
      || u.name.toLowerCase().includes(q)
      || u.code.includes(q)
      || u.role.toLowerCase().includes(q)
      || u.dirs.toLowerCase().includes(q);
  });

  const cols: { key: string; label: string; w: number; center?: boolean }[] = [
    { key: 'code',      label: t.userCode      || 'Kod',          w: 54  },
    { key: 'name',      label: t.userName      || 'Ism (FIO)',     w: 190 },
    { key: 'lastAct',   label: t.userLastAct   || 'Oxirgi faol.', w: 100 },
    { key: 'role',      label: t.userRole      || 'Rol',          w: 150 },
    { key: 'status',    label: t.userStatus    || 'Status',       w: 80  },
    { key: 'org',       label: t.userOrg       || 'Tashkilot',    w: 140 },
    { key: 'emp',       label: t.userEmployee  || 'Xodim',        w: 140 },
    { key: 'onTrade',   label: t.userOnTrade   || 'Ilova login',  w: 100 },
    { key: 'dirs',      label: t.userDirs      || "Bo'linmalar",  w: 120 },
    { key: 'acceptPay', label: t.userAcceptPay || "To'lov",       w: 68, center: true },
  ];

  const modalEl = modalUser !== null ? (
    <AdminUserFormModal
      D={D}
      t={t}
      user={modalUser === 'new' ? null : modalUser}
      onClose={closeModal}
      onSave={handleSave}
      onDelete={handleDelete}
    />
  ) : null;

  /* ══════════ MOBILE ══════════ */
  if (isMobile) {
    return (
      <>
        {modalEl}
        <div style={{
          display: 'flex', flexDirection: 'column',
          width: '100%', maxWidth: '100%', boxSizing: 'border-box',
          overflow: 'hidden', background: bg, borderRadius: 14,
          border: `1px solid ${border}`,
          boxShadow: D ? '0 0 0 1px rgba(255,255,255,0.04)' : '0 1px 6px rgba(0,0,0,0.06)',
        }}>
          {/* HEADER */}
          <div style={{ background: surface, borderBottom: `1px solid ${border}`, width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 14px 8px', minWidth: 0 }}>
              <span style={{
                flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: txt,
                letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {t.navUsers || 'Foydalanuvchilar'}
              </span>
              <span style={{
                flexShrink: 0, fontSize: 11, padding: '2px 8px', borderRadius: 20,
                background: D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.10)',
                color: indigo, fontWeight: 700,
              }}>
                {filtered.length}
              </span>
              <button onClick={openNew} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 8,
                background: D ? 'rgba(34,197,94,0.14)' : 'rgba(22,163,74,0.08)',
                border: `1px solid ${D ? 'rgba(34,197,94,0.3)' : 'rgba(22,163,74,0.2)'}`,
                color: green, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>
                <Plus size={11} />
                <span>{t.deptAdd || "Qo'shish"}</span>
              </button>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, margin: '0 14px 12px',
              padding: '8px 11px', borderRadius: 10, border: `1px solid ${border}`,
              background: D ? '#0f0f0f' : '#fff', boxSizing: 'border-box',
            }}>
              <Search size={13} color={muted} style={{ flexShrink: 0 }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t.searchLabel || "Qidirish..."}
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: txt }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: muted, flexShrink: 0 }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* CARDS */}
          <div style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: 9,
            width: '100%', maxWidth: '100%', boxSizing: 'border-box', minWidth: 0,
          }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: muted, fontSize: 13 }}>
                {t.notFound || "Ma'lumot topilmadi"}
              </div>
            ) : filtered.map(u => (
              <div key={u.id} onClick={() => openEdit(u)} style={{ cursor: 'pointer' }}>
                <MobileUserCard
                  u={u} D={D}
                  isSelected={selected === u.id}
                  onSelect={() => setSelected(u.id === selected ? null : u.id)}
                  t={t}
                />
              </div>
            ))}
          </div>

          {/* FOOTER */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 14px', borderTop: `1px solid ${border}`, background: surface,
            fontSize: 11, color: muted, flexWrap: 'wrap', gap: 5, flexShrink: 0,
            width: '100%', boxSizing: 'border-box', minWidth: 0,
          }}>
            <span>{t.totalEmpLabel || 'Jami'}: <b style={{ color: txt }}>{filtered.length}</b> {t.userTotalUnit || 'ta'}</span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
              {[
                { label: t.userAcceptPay || "To'lov", count: filtered.filter(u => u.acceptPay).length, color: green },
                { label: t.userGPS       || 'GPS',    count: filtered.filter(u => u.gps).length,       color: '#3b82f6' },
              ].map(s => (
                <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                  {s.label}: <b style={{ color: s.color, marginLeft: 2 }}>{s.count}</b>
                </span>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ══════════ DESKTOP ══════════ */
  return (
    <>
      {modalEl}
      <div style={{
        display: 'flex', flexDirection: 'column',
        background: D ? '#111111' : '#ffffff',
        borderRadius: 14, border: `1px solid ${border}`,
        overflow: 'hidden', height: '100%', minHeight: 0,
        width: '100%', boxSizing: 'border-box',
        boxShadow: D ? '0 0 0 1px rgba(255,255,255,0.04)' : '0 1px 6px rgba(0,0,0,0.06)',
      }}>

        {/* DESKTOP HEADER */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', borderBottom: `1px solid ${border}`,
          background: surface, gap: 12, flexWrap: 'wrap', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: txt, letterSpacing: '-0.3px' }}>
              {t.navUsers || 'Foydalanuvchilar'}
            </span>
            <span style={{
              fontSize: 11, padding: '2px 9px', borderRadius: 20,
              background: D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.10)',
              color: indigo, fontWeight: 600,
            }}>
              {filtered.length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 12px', borderRadius: 9,
              border: `1px solid ${border}`,
              background: D ? '#0f0f0f' : '#fff', minWidth: 220,
            }}>
              <Search size={13} color={muted} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t.searchLabel || "Qidirish..."}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: txt }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: muted }}>
                  <X size={12} />
                </button>
              )}
            </div>
            <button onClick={openNew} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 9,
              background: D ? 'rgba(34,197,94,0.14)' : 'rgba(22,163,74,0.08)',
              border: `1px solid ${D ? 'rgba(34,197,94,0.3)' : 'rgba(22,163,74,0.2)'}`,
              color: green, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}>
              <Plus size={13} /> {t.deptAdd || "Qo'shish"}
            </button>
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div ref={tableRef} style={{ flex: 1, overflow: 'auto' }}>
          <table style={{
            borderCollapse: 'collapse', tableLayout: 'fixed',
            width: `${cols.reduce((s, c) => s + c.w, 0)}px`, minWidth: '100%',
          }}>
            <colgroup>
              {cols.map(c => <col key={c.key} style={{ width: c.w }} />)}
            </colgroup>
            <thead>
              <tr>
                {cols.map((c, ci) => (
                  <th key={c.key} style={{
                    position: 'sticky', top: 0, zIndex: ci < 2 ? 30 : 20,
                    ...(ci === 0 ? { left: 0, zIndex: 31 } : {}),
                    background: thBg, padding: '7px 8px',
                    fontSize: 10, fontWeight: 700, color: muted,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    textAlign: c.center ? 'center' : 'left',
                    borderBottom: `2px solid ${border}`,
                    borderRight: ci < cols.length - 1 ? `1px solid ${border}` : 'none',
                    whiteSpace: 'nowrap', userSelect: 'none',
                  }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={cols.length} style={{ textAlign: 'center', color: muted, fontSize: 13, padding: 32 }}>
                    {t.notFound || "Ma'lumot topilmadi"}
                  </td>
                </tr>
              )}
              {filtered.map((u, i) => {
                const isSel     = selected === u.id;
                const isAlt     = i % 2 !== 0;
                const rowBg     = isSel ? selBg : isAlt ? (D ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.012)') : (D ? '#111111' : '#ffffff');
                const cellTxt   = isSel ? (D ? '#c7d2fe' : '#4338ca') : txt;
                const cellMuted = isSel ? (D ? '#a5b4fc' : '#6366f1') : muted;

                const TD = ({ children, bold }: { children: React.ReactNode; bold?: boolean }) => (
                  <td style={{
                    background: rowBg, padding: '4px 8px', fontSize: 12,
                    color: cellTxt, fontWeight: bold ? 600 : 400,
                    borderBottom: `1px solid ${border}`,
                    borderRight: `1px solid ${D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: 0, transition: 'background 0.12s',
                  }}>
                    {children}
                  </td>
                );

                const BoolCell = ({ val }: { val: boolean }) => (
                  <td style={{
                    padding: '4px 8px', textAlign: 'center', fontSize: 12,
                    color: val ? green : cellMuted, fontWeight: val ? 700 : 400,
                    background: rowBg, borderBottom: `1px solid ${border}`,
                    borderRight: `1px solid ${D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                    whiteSpace: 'nowrap', transition: 'background 0.12s',
                  }}>
                    {val ? <Check size={13} color={green} style={{ display: 'inline' }} /> : <span style={{ opacity: 0.45 }}>{t.userNo || "Yo'q"}</span>}
                  </td>
                );

                return (
                  <tr
                    key={u.id}
                    onClick={() => openEdit(u as unknown as UserFormRow)}
                    style={{ cursor: 'pointer', borderLeft: isSel ? `3px solid ${indigo}` : '3px solid transparent' }}
                    onMouseEnter={e => {
                      if (!isSel) Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach(
                        (c: HTMLTableCellElement) => (c.style.background = rowHov)
                      );
                    }}
                    onMouseLeave={e => {
                      if (!isSel) Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach(
                        (c: HTMLTableCellElement) => (c.style.background = rowBg)
                      );
                    }}
                  >
                    <td style={{
                      position: 'sticky', left: 0, zIndex: 5, background: rowBg,
                      padding: '4px 8px', fontSize: 11,
                      color: isSel ? indigo : muted, fontWeight: isSel ? 700 : 500,
                      fontVariantNumeric: 'tabular-nums', borderBottom: `1px solid ${border}`,
                      borderRight: `1px solid ${D ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                      whiteSpace: 'nowrap', transition: 'background 0.12s',
                    }}>
                      {u.code}
                    </td>
                    <TD bold>{u.name}</TD>
                    <TD><span style={{ color: cellMuted }}>{u.lastAct || '—'}</span></TD>
                    <td style={{
                      padding: '4px 8px', background: rowBg, borderBottom: `1px solid ${border}`,
                      borderRight: `1px solid ${D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                      whiteSpace: 'nowrap', transition: 'background 0.12s',
                    }}>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 5,
                        background: D ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.08)',
                        color: isSel ? '#818cf8' : '#6366f1', fontWeight: 600,
                      }}>
                        {translateUserRole(u.role, t)}
                      </span>
                    </td>
                    <td style={{
                      padding: '4px 8px', background: rowBg, borderBottom: `1px solid ${border}`,
                      borderRight: `1px solid ${D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                      whiteSpace: 'nowrap', transition: 'background 0.12s',
                    }}>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 5,
                        background: u.status === 'open'
                          ? (D ? 'rgba(34,197,94,0.13)' : 'rgba(22,163,74,0.08)')
                          : (D ? 'rgba(239,68,68,0.13)'  : 'rgba(239,68,68,0.08)'),
                        color: u.status === 'open' ? green : '#ef4444', fontWeight: 600,
                      }}>
                        {u.status === 'open' ? (t.userOpen || 'Ochiq') : (t.userClosed || 'Yopiq')}
                      </span>
                    </td>
                    <TD>{u.org}</TD>
                    <TD>{u.emp}</TD>
                    <TD><span style={{ color: u.onTrade ? '#f59e0b' : cellMuted }}>{u.onTrade || '—'}</span></TD>
                    <TD>{u.dirs}</TD>
                    <BoolCell val={u.acceptPay} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* DESKTOP FOOTER */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 16px', borderTop: `1px solid ${border}`,
          background: surface, fontSize: 11, color: muted,
          flexWrap: 'wrap', gap: 6, flexShrink: 0,
        }}>
          <span>{t.totalEmpLabel || 'Jami'}: <b style={{ color: txt }}>{filtered.length}</b> {t.userTotalUnit || 'ta'}</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
            {[
              { label: t.userAcceptPay || "To'lov", count: filtered.filter(u => u.acceptPay).length, color: green },
              { label: t.userGPS       || 'GPS',    count: filtered.filter(u => u.gps).length,       color: '#3b82f6' },
            ].map(s => (
              <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                {s.label}: <b style={{ color: s.color, marginLeft: 2 }}>{s.count}</b>
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}