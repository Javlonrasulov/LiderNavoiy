import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Check, Plus, X,
  MapPin, Building2, CreditCard, Package, Navigation,
} from 'lucide-react';
import { AdminUserFormModal, type UserFormRow, type UserFormData } from './AdminUserFormModal';
import { translateUserRole, userStatusOpenLabel } from '../../../data/adminData';
import { api } from '../../../api/client';
import {
  appUserToRow,
  mapAdminRoleToBackend,
  mapAdminRoleToPosition,
  removeStoredAppPassword,
  storeAppPassword,
  translateApiError,
  type AppUserListRow,
} from '../../../utils/appUserCreds';

interface Props {
  D: boolean;
  t: Record<string, string>;
  card: string;
  divider: string;
  sub: string;
}

type UserRow = AppUserListRow;

function hasApiToken(): boolean {
  return typeof localStorage !== 'undefined' && !!localStorage.getItem('api_access_token');
}

async function fetchUsersFromBackend(t: Record<string, string>): Promise<UserRow[]> {
  if (!hasApiToken()) return [];
  const appUsers = await api.listAppUsers();
  return appUsers.map((u, i) => appUserToRow(u, i + 1, t));
}

function formToUserRow(
  data: UserFormData,
  t: Record<string, string>,
  id: number,
  backendUserId?: string,
): UserRow {
  const org = data.org.length > 14 ? `${data.org.slice(0, 13)}...` : data.org;
  const emp = data.xodim.length > 14 ? `${data.xodim.slice(0, 13)}...` : data.xodim;
  const appLogin = data.appLogin.trim();
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
    onTrade: appLogin,
    backendUserId: backendUserId || '',
    dirs: data.directions.join(', '),
    acceptPay: data.appAcceptPay ?? data.perms.tolovQabul === 'Ruxsat',
    consig: data.appConsig ?? data.perms.konsignatsiya === 'Ruxsat',
    gps: true,
  };
}

async function syncAppCredentials(
  data: UserFormData,
  t: Record<string, string>,
  existing?: UserRow | null,
): Promise<string | undefined> {
  const username = data.appLogin.trim();
  const password = data.appPassword.trim();
  const fullName = data.fio.trim() || data.xodim.trim();
  const isActive = data.status === userStatusOpenLabel(t);
  const role = mapAdminRoleToBackend(data.role);
  const position = mapAdminRoleToPosition(data.role);
  const companyName = data.org.replace(/\.\.\.$/, '').trim() || undefined;

  if (!username) return existing?.backendUserId;

  const token = typeof localStorage !== 'undefined'
    ? localStorage.getItem('api_access_token')
    : null;
  if (!token) {
    throw new Error(t.userErrAdminLoginRequired || "Avval admin panelga kirish qiling (backend bilan bog'lanish kerak)");
  }

  if (!existing?.backendUserId) {
    if (!password) throw new Error(t.userErrPasswordRequired || 'APK uchun parol kiriting');
    const created = await api.createAppUser({
      username,
      password,
      fullName,
      role,
      companyName,
      isActive,
      position,
    });
    storeAppPassword(username, password);
    return created.id;
  }

  const payload: Parameters<typeof api.updateAppUser>[1] = {
    username,
    fullName,
    role,
    isActive,
    companyName,
    position,
  };
  if (password) payload.password = password;

  const updated = await api.updateAppUser(existing.backendUserId, payload);
  if (password) storeAppPassword(username, password);
  if (existing.onTrade && existing.onTrade !== username) {
    removeStoredAppPassword(existing.onTrade);
  }
  return updated.id;
}

function roleColor(role: string) {
  if (role.includes('Savdo'))                                  return { bg: 'rgba(99,102,241,0.13)',  text: '#818cf8' };
  if (role.includes('Dostav') || role.includes('Shofyor') || role.includes('Yetkaz')) return { bg: 'rgba(245,158,11,0.13)',  text: '#f59e0b' };
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
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search,   setSearch]  = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [backendReady, setBackendReady] = useState(hasApiToken());
  const tableRef = useRef<HTMLDivElement>(null);

  const refreshUsers = useCallback(async (): Promise<UserRow[]> => {
    if (!hasApiToken()) {
      setUsers([]);
      setBackendReady(false);
      setLoadingUsers(false);
      return [];
    }
    setLoadingUsers(true);
    try {
      const rows = await fetchUsersFromBackend(t);
      setUsers(rows);
      setBackendReady(true);
      setSelected(prev => {
        if (prev && rows.some(r => r.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
      return rows;
    } catch {
      setBackendReady(false);
      return [];
    } finally {
      setLoadingUsers(false);
    }
  }, [t]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  useEffect(() => {
    if (!backendReady) return;
    const timer = setInterval(() => { refreshUsers(); }, 30_000);
    return () => clearInterval(timer);
  }, [backendReady, refreshUsers]);

  const [modalUser, setModalUser] = useState<UserFormRow | null | 'new'>(null);
  const openNew    = () => setModalUser('new');
  const openEdit   = (u: UserRow) => setModalUser(u as unknown as UserFormRow);
  const closeModal = () => setModalUser(null);

  const handleSave = async (data: UserFormData): Promise<boolean> => {
    try {
      const existingRow = modalUser && modalUser !== 'new'
        ? users.find(u => u.id === modalUser.id) ?? null
        : null;

      const login = data.appLogin.trim();
      if (!existingRow?.backendUserId && login) {
        const fresh = await fetchUsersFromBackend(t);
        const dup = fresh.find(u => u.onTrade.toLowerCase() === login.toLowerCase());
        if (dup) {
          throw new Error(t.userErrUsernameExists || 'Bu login band');
        }
      }

      await syncAppCredentials(data, t, existingRow);

      const rows = await refreshUsers();
      const saved = rows.find(
        u => u.onTrade.toLowerCase() === login.toLowerCase(),
      );
      if (saved) setSelected(saved.id);

      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const translated = translateApiError(msg, t);
      const isDup =
        msg.toLowerCase().includes('username already exists') ||
        translated === (t.userErrUsernameExists || '');
      if (isDup) await refreshUsers();
      throw new Error(translated);
    }
  };

  const handleDelete = async (id: number) => {
    const row = users.find(u => u.id === id);
    if (!row?.backendUserId) return;
    try {
      await api.deactivateAppUser(row.backendUserId);
      if (row.onTrade) removeStoredAppPassword(row.onTrade);
      await refreshUsers();
    } catch {
      /* keep list unchanged on API error */
    }
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
      || u.onTrade.toLowerCase().includes(q)
      || u.code.includes(q)
      || u.role.toLowerCase().includes(q)
      || u.dirs.toLowerCase().includes(q);
  });

  const listEmptyMessage = !backendReady
    ? (t.userErrAdminLoginRequired || "Backend bilan bog'lanish uchun admin login qiling")
    : loadingUsers
      ? (t.loading || 'Yuklanmoqda...')
      : (t.notFound || "Ma'lumot topilmadi");

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
                {listEmptyMessage}
              </div>
            ) : filtered.map(u => (
              <div key={u.backendUserId || u.id} onClick={() => openEdit(u)} style={{ cursor: 'pointer' }}>
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
                    {listEmptyMessage}
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
                    key={u.backendUserId || u.id}
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
                    <TD>
                      <span style={{
                        color: u.isOnline ? green : cellMuted,
                        fontWeight: u.isOnline ? 600 : 400,
                      }}>
                        {u.lastAct || '—'}
                      </span>
                    </TD>
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