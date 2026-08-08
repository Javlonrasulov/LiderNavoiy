import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Search, Edit2, Trash2, X, Check, AlertTriangle, Plus, Phone, UserCircle2, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { type SotrudnikRow } from '../../../data/adminData';
import { COMPANIES } from '../../AdminAuthContext';
import {
  api,
  type AppUserRecord,
  type BackendDepartment,
  type BackendStaffPosition,
  type Distributor,
} from '../../../api/client';
import {
  appUserToSotrudnikRow,
  sotrudnikDeptLabel,
  sotrudnikPosLabel,
  translateApiError,
} from '../../../utils/appUserCreds';
import { formatUzPhoneInput, UZ_PHONE_DEFAULT } from '../../../utils/phoneFormat';
import {
  appAccessToBackendRole,
  appAccessToPosKey,
  positionPayloadForAccess,
} from '../../../utils/positionsStore';

interface Props {
  D: boolean;
  card: string;
  divider: string;
  cardHover: string;
  sub: string;
  t: Record<string, string>;
  activeAgents: any[];
  selectedCompanyIds: Set<string>;
  showBalances: boolean;
  openModal: (type: 'agent' | 'category' | 'terminal' | 'product') => void;
  setSelectedAgent: (a: any) => void;
}

function hasApiToken(): boolean {
  return typeof localStorage !== 'undefined' && !!localStorage.getItem('api_access_token');
}

function PortalSelect({
  value, onChange, options, placeholder, D, border, txt, muted,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  D: boolean;
  border: string;
  txt: string;
  muted: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 220, openUp: false });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  const reposition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const itemH = 36;
    const listH = Math.min(options.length * itemH + 8, 220);
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const spaceAbove = r.top - 8;
    const openUp = spaceBelow < listH && spaceAbove > spaceBelow;
    const maxHeight = Math.min(listH, openUp ? spaceAbove : spaceBelow);
    setPos({
      top: openUp ? r.top - 4 : r.bottom + 4,
      left: r.left,
      width: r.width,
      maxHeight: Math.max(maxHeight, 80),
      openUp,
    });
  }, [options.length]);

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
        zIndex: 10050,
        transform: pos.openUp ? 'translateY(-100%)' : undefined,
        background: D ? '#1e1e1e' : '#fff',
        border: `1px solid ${border}`,
        borderRadius: 10,
        boxShadow: D ? '0 12px 40px rgba(0,0,0,0.7)' : '0 12px 40px rgba(0,0,0,0.13)',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxHeight: pos.maxHeight, overflowY: 'auto' }}>
        {options.map(opt => (
          <button
            key={opt.value || '__empty'}
            type="button"
            onClick={() => { onChange(opt.value); setOpen(false); }}
            style={{
              width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none',
              background: value === opt.value ? (D ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)') : 'transparent',
              color: value === opt.value ? '#6366f1' : txt,
              fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {value === opt.value ? <Check size={11} color="#6366f1" /> : <span style={{ width: 11 }} />}
            {opt.label}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', borderRadius: 10, border: `1px solid ${border}`,
          background: D ? 'rgba(255,255,255,0.04)' : '#f9fafb',
          color: selected?.label ? txt : muted, fontSize: 13, cursor: 'pointer',
          textAlign: 'left', boxSizing: 'border-box',
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label || placeholder || '—'}
        </span>
        <ChevronDown size={13} style={{ flexShrink: 0, marginLeft: 6, opacity: 0.5 }} />
      </button>
      {dropdown}
    </div>
  );
}

export function AdminAgentsTab({ D, t, selectedCompanyIds }: Props) {
  const [isMobile, setIsMobile]   = useState(false);
  const [search, setSearch]       = useState('');
  const [apiUsers, setApiUsers]   = useState<AppUserRecord[]>([]);
  const [apiDistributors, setApiDistributors] = useState<Distributor[]>([]);
  const [backendReady, setBackendReady] = useState(hasApiToken());
  const [loadingRows, setLoadingRows] = useState(true);
  const [editRow, setEditRow]     = useState<SotrudnikRow | null>(null);
  const [editDraft, setEditDraft] = useState<SotrudnikRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<SotrudnikRow | null>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [addDraft, setAddDraft]   = useState<SotrudnikRow>({
    tabel: 0, name: '', department: '', position: '', phone: UZ_PHONE_DEFAULT, orgId: '',
    deptKey: '', posKey: 'salesAgent',
  });
  const [addLogin, setAddLogin]   = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deptOptions, setDeptOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [posList, setPosList] = useState<BackendStaffPosition[]>([]);
  const [departments, setDepartments] = useState<BackendDepartment[]>([]);

  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      setIsSmall(window.innerWidth < 450);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const refreshCatalog = useCallback(async () => {
    if (!hasApiToken()) {
      setDeptOptions([{ value: '', label: t.empDeptNone || '— tanlanmagan —' }]);
      setPosList([]);
      setDepartments([]);
      return;
    }
    try {
      const [depts, positions] = await Promise.all([
        api.getDepartments(),
        api.getPositions(),
      ]);
      setDepartments(depts);
      setPosList(positions);
      setDeptOptions([
        { value: '', label: t.empDeptNone || '— tanlanmagan —' },
        ...depts.map(d => ({ value: d.id, label: d.name })),
      ]);
    } catch {
      setDeptOptions([{ value: '', label: t.empDeptNone || '— tanlanmagan —' }]);
      setPosList([]);
      setDepartments([]);
    }
  }, [t.empDeptNone]);

  useEffect(() => { void refreshCatalog(); }, [refreshCatalog]);

  const posOptions = useMemo(
    () => posList.map(p => ({ value: p.id, label: p.name })),
    [posList],
  );

  const findPositionById = useCallback(
    (id?: string) => posList.find(p => p.id === id),
    [posList],
  );

  const findPositionByName = useCallback(
    (name?: string) => {
      const n = (name || '').trim().toLowerCase();
      if (!n) return undefined;
      return posList.find(p => p.name.trim().toLowerCase() === n);
    },
    [posList],
  );

  const findDepartmentById = useCallback(
    (id?: string) => departments.find(d => d.id === id),
    [departments],
  );

  const refreshEmployees = useCallback(async () => {
    if (!hasApiToken()) {
      setApiUsers([]);
      setApiDistributors([]);
      setBackendReady(false);
      setLoadingRows(false);
      return;
    }
    setLoadingRows(true);
    try {
      const [users, distributors] = await Promise.all([
        api.listAppUsers(),
        api.getDistributors(),
      ]);
      setApiUsers(users);
      setApiDistributors(distributors);
      setBackendReady(true);
    } catch {
      setApiUsers([]);
      setApiDistributors([]);
      setBackendReady(false);
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => { refreshEmployees(); }, [refreshEmployees]);

  useEffect(() => {
    if (!backendReady) return;
    const timer = setInterval(() => { refreshEmployees(); }, 30_000);
    return () => clearInterval(timer);
  }, [backendReady, refreshEmployees]);

  const rows = useMemo(() => {
    const distByUserId = new Map(apiDistributors.map(d => [d.userId, d]));
    const companyIds = selectedCompanyIds;
    return apiUsers
      .filter(u => {
        if (companyIds.size === 0) return true;
        const userCompanyIds = [
          ...(u.companyIds ?? []),
          u.companyId,
          distByUserId.get(u.id)?.companyId,
        ]
          .map(id => id?.trim())
          .filter((id): id is string => !!id);
        if (userCompanyIds.length === 0) return false;
        return userCompanyIds.some(id => companyIds.has(id));
      })
      .map((u, i) => {
        const row = appUserToSotrudnikRow(u, distByUserId.get(u.id), i + 1, t);
        if (u.department) row.department = u.department;
        if (u.departmentId) {
          row.deptKey = u.departmentId;
          row.department = findDepartmentById(u.departmentId)?.name || u.department || '';
        }
        const matched =
          (u.positionId && findPositionById(u.positionId)) ||
          findPositionByName(row.position);
        if (matched) {
          row.positionId = matched.id;
          row.posKey = appAccessToPosKey(matched.appAccess);
          row.position = matched.name;
        }
        return row;
      });
  }, [apiUsers, apiDistributors, selectedCompanyIds, t, findDepartmentById, findPositionById, findPositionByName]);

  const listEmptyMessage = !backendReady
    ? (t.userErrAdminLoginRequired || "Backend bilan bog'lanish uchun admin login qiling")
    : loadingRows
      ? (t.loading || 'Yuklanmoqda...')
      : (t.notFound || "Ma'lumot topilmadi");

  // ── colors ──────────────────────────────────────────────────────────────
  const txt      = D ? '#f9fafb' : '#111827';
  const muted    = D ? '#6b7280' : '#9ca3af';
  const border   = D ? '#2a2a2a' : '#e5e7eb';
  const bg       = D ? '#161616' : '#ffffff';
  const surface  = D ? '#1a1a1a' : '#f9fafb';
  const surface2 = D ? '#1f1f1f' : '#f3f4f6';
  const rowAlt   = D ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.016)';
  const rowHov   = D ? 'rgba(99,102,241,0.09)'   : 'rgba(99,102,241,0.05)';
  const indigo   = '#6366f1';
  const red      = '#ef4444';

  // ── filtered list ────────────────────────────────────────────────────────
  const selectedIds = Array.from(selectedCompanyIds);
  const employees = rows.filter(e => {
    const orgMatch = selectedIds.length === 0 || selectedIds.includes(e.orgId);
    const q = search.trim().toLowerCase();
    const dept = sotrudnikDeptLabel(e, t).toLowerCase();
    const pos = sotrudnikPosLabel(e, t).toLowerCase();
    return orgMatch && (!q ||
      e.name.toLowerCase().includes(q) ||
      pos.includes(q) ||
      dept.includes(q)
    );
  });

  // ── actions ──────────────────────────────────────────────────────────────
  const resolvePositionMeta = (draft: SotrudnikRow) => {
    const byId = findPositionById(draft.positionId);
    if (byId) return byId;
    const byName = findPositionByName(draft.position);
    if (byName) return byName;
    const access =
      draft.posKey === 'manager' || draft.posKey === 'director' ? 'manager' as const
        : draft.posKey === 'delivery' ? 'delivery' as const
          : 'agent' as const;
    return {
      id: '',
      code: 0,
      name: draft.position || sotrudnikPosLabel(draft, t) || 'Savdo agenti',
      appAccess: access,
      isActive: true,
    };
  };

  const resolveDepartmentMeta = (draft: SotrudnikRow) => {
    const byId = findDepartmentById(draft.deptKey);
    if (byId) return byId;
    const byName = departments.find(
      d => d.name.trim().toLowerCase() === (draft.department || '').trim().toLowerCase(),
    );
    return byName;
  };

  const saveEdit = async () => {
    if (!editDraft?.backendUserId || !editDraft.name.trim()) return;
    const nextLogin = (editDraft.username || '').trim();
    if (!nextLogin) {
      setSaveError(t.userErrPasswordRequired || 'Login kiriting');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const phone = editDraft.phone.trim() || undefined;
      const meta = resolvePositionMeta(editDraft);
      const dept = resolveDepartmentMeta(editDraft);
      const role = appAccessToBackendRole(meta.appAccess);
      const position = positionPayloadForAccess(meta.name, meta.appAccess);
      const newPassword = editPassword.trim();
      await api.updateAppUser(editDraft.backendUserId, {
        username: nextLogin,
        ...(newPassword ? { password: newPassword } : {}),
        fullName: editDraft.name.trim(),
        role,
        phone,
        position,
        positionId: meta.id || undefined,
        department: dept?.name || editDraft.department || undefined,
        departmentId: dept?.id || editDraft.deptKey || undefined,
      });
      const distributorId = editDraft.distributorId
        ?? apiDistributors.find(d => d.userId === editDraft.backendUserId)?.id;
      if (distributorId) {
        await api.updateDistributor(distributorId, {
          phone: phone ?? '',
          position,
        });
      }
      await refreshEmployees();
      setEditRow(null);
      setEditDraft(null);
      setEditPassword('');
      setShowEditPassword(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setSaveError(translateApiError(msg, t));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow?.backendUserId) return;
    const id = deleteRow.backendUserId;
    try {
      await api.deactivateAppUser(id);
      setApiUsers(prev => prev.filter(u => u.id !== id));
      await refreshEmployees();
    } catch {
      /* keep list unchanged */
    }
    setDeleteRow(null);
  };

  const saveAdd = async () => {
    if (!addDraft.name.trim() || !addLogin.trim() || !addPassword.trim()) {
      setSaveError(t.userErrPasswordRequired || 'Login va parol kiriting');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const orgId = selectedIds[0] || 'boran';
      const meta = resolvePositionMeta(addDraft);
      const dept = resolveDepartmentMeta(addDraft);
      const role = appAccessToBackendRole(meta.appAccess);
      const position = positionPayloadForAccess(meta.name, meta.appAccess);
      await api.createAppUser({
        username: addLogin.trim(),
        password: addPassword.trim(),
        fullName: addDraft.name.trim(),
        role,
        companyId: orgId,
        phone: addDraft.phone.trim() || undefined,
        position,
        positionId: meta.id || undefined,
        department: dept?.name || addDraft.department || undefined,
        departmentId: dept?.id || addDraft.deptKey || undefined,
      });
      await refreshEmployees();
      setShowAdd(false);
      setAddLogin('');
      setAddPassword('');
      setShowAddPassword(false);
      setAddDraft({
        tabel: 0, name: '', department: '', position: '', phone: UZ_PHONE_DEFAULT, orgId: '',
        deptKey: '', posKey: 'salesAgent', positionId: '',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setSaveError(translateApiError(msg, t));
    } finally {
      setSaving(false);
    }
  };

  // ── shared input style ────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: `1px solid ${border}`, background: surface,
    color: txt, fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: muted, marginBottom: 5, display: 'block' };

  // ── overlay modal ─────────────────────────────────────────────────────────
  const renderModal = (
    title: string,
    draft: SotrudnikRow,
    onChangeDraft: (d: SotrudnikRow) => void,
    onSave: () => void,
    onClose: () => void,
    isAdd = false,
  ) => (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: bg, borderRadius: 20,
        border: `1px solid ${border}`,
        width: '100%', maxWidth: 420, margin: '16px',
        padding: '24px',
        boxShadow: D ? '0 24px 64px rgba(0,0,0,0.7)' : '0 24px 64px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11,
              background: `${indigo}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserCircle2 size={17} color={indigo} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: txt }}>{title}</span>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: 'none',
            background: D ? 'rgba(255,255,255,0.07)' : '#f3f4f6',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} color={muted} />
          </button>
        </div>

        {saveError && (
          <div style={{
            marginBottom: 14, padding: '10px 12px', borderRadius: 10,
            background: D ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${D ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.2)'}`,
            color: '#ef4444', fontSize: 12,
          }}>
            {saveError}
          </div>
        )}

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>{t.empNameCol || 'Xodim ismi'}</label>
            <input
              style={inputStyle}
              value={draft.name}
              onChange={e => onChangeDraft({ ...draft, name: e.target.value })}
              placeholder={t.empNamePh || 'F.I.Sh.'}
            />
          </div>

          {isAdd ? (
            <>
              <div>
                <label style={labelStyle}>{t.empAppLoginCol || 'Ilova login'}</label>
                <input
                  style={inputStyle}
                  value={addLogin}
                  onChange={e => setAddLogin(e.target.value)}
                  placeholder={t.empAppLoginPh || 'login'}
                  autoComplete="off"
                />
              </div>
              <div>
                <label style={labelStyle}>{t.empAppPasswordCol || 'Parol'}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...inputStyle, paddingRight: 40 }}
                    type={showAddPassword ? 'text' : 'password'}
                    value={addPassword}
                    onChange={e => setAddPassword(e.target.value)}
                    placeholder={t.empAppPasswordPh || 'parol123'}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(v => !v)}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      color: muted, display: 'flex', alignItems: 'center',
                    }}
                    aria-label={showAddPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                    title={showAddPassword ? 'Yashirish' : 'Ko‘rsatish'}
                  >
                    {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={labelStyle}>{t.empAppLoginCol || 'Ilova login'}</label>
                <input
                  style={inputStyle}
                  value={draft.username || ''}
                  onChange={e => onChangeDraft({ ...draft, username: e.target.value })}
                  placeholder={t.empAppLoginPh || 'login'}
                  autoComplete="off"
                />
              </div>
              <div>
                <label style={labelStyle}>{t.empAppPasswordCol || 'Parol'}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...inputStyle, paddingRight: 40 }}
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    placeholder={t.empAppPasswordKeepPh || "Bo'sh qoldiring — o'zgarmaydi"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(v => !v)}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      color: muted, display: 'flex', alignItems: 'center',
                    }}
                    aria-label={showEditPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                    title={showEditPassword ? 'Yashirish' : 'Ko‘rsatish'}
                  >
                    {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>{t.empPhoneCol || 'Telefon'}</label>
            <input
              type="tel"
              style={inputStyle}
              value={draft.phone}
              onChange={e => onChangeDraft({ ...draft, phone: formatUzPhoneInput(e.target.value) })}
              placeholder="+998 99 999 99 99"
            />
          </div>

          <div>
            <label style={labelStyle}>{t.empDeptCol || "Bo'linma"}</label>
            <PortalSelect
              value={draft.deptKey || ''}
              onChange={v => {
                const dept = findDepartmentById(v);
                onChangeDraft({
                  ...draft,
                  deptKey: v,
                  department: dept?.name || '',
                });
              }}
              options={deptOptions}
              placeholder={t.empDeptNone || '— tanlanmagan —'}
              D={D} border={border} txt={txt} muted={muted}
            />
          </div>

          <div>
            <label style={labelStyle}>{t.empPositionCol || 'Lavozim'}</label>
            <PortalSelect
              value={
                draft.positionId
                || (findPositionByName(draft.position)?.id ?? '')
              }
              onChange={v => {
                const pos = findPositionById(v);
                onChangeDraft({
                  ...draft,
                  positionId: v,
                  position: pos?.name || '',
                  posKey: pos ? appAccessToPosKey(pos.appAccess) : 'salesAgent',
                });
              }}
              options={posOptions}
              placeholder={t.empPosNone || '— lavozim tanlang —'}
              D={D} border={border} txt={txt} muted={muted}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 11, border: `1px solid ${border}`,
            background: 'transparent', color: muted, fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}>
            {t.cancelBtn || 'Bekor'}
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              flex: 2, padding: '10px', borderRadius: 11, border: 'none',
              background: saving ? (D ? '#374151' : '#d1d5db') : indigo,
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
            }}
          >
            <Check size={14} />
            {saving ? (t.loading || 'Yuklanmoqda...') : (t.empSaveBtn || 'Saqlash')}
          </button>
        </div>
      </div>
    </div>
  );

  // ── delete confirm modal ──────────────────────────────────────────────────
  const renderDeleteModal = () => deleteRow && (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }} onClick={() => setDeleteRow(null)}>
      <div style={{
        background: bg, borderRadius: 20, border: `1px solid ${border}`,
        width: '100%', maxWidth: 360, margin: '16px', padding: '28px 24px',
        boxShadow: D ? '0 24px 64px rgba(0,0,0,0.7)' : '0 24px 64px rgba(0,0,0,0.15)',
        textAlign: 'center',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: 52, height: 52, borderRadius: 16, margin: '0 auto 16px',
          background: `${red}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={22} color={red} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: txt, marginBottom: 8 }}>
          {t.empDeleteTitle || "O'chirishni tasdiqlaysizmi?"}
        </div>
        <div style={{ fontSize: 13, color: muted, marginBottom: 24, lineHeight: 1.5 }}>
          <strong style={{ color: txt }}>{deleteRow.name}</strong> — {t.empDeleteWarn || "bu amalni ortga qaytarib bo'lmaydi."}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setDeleteRow(null)} style={{
            flex: 1, padding: '10px', borderRadius: 11, border: `1px solid ${border}`,
            background: 'transparent', color: muted, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {t.cancelBtn || 'Bekor'}
          </button>
          <button onClick={confirmDelete} style={{
            flex: 1, padding: '10px', borderRadius: 11, border: 'none',
            background: red, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
          }}>
            {t.deleteBtn || "O'chirish"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── MOBILE ────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {editRow && editDraft && renderModal(
          t.editEmpTitle || 'Xodimni tahrirlash', editDraft,
          setEditDraft, () => { void saveEdit(); },
          () => {
            setEditRow(null); setEditDraft(null); setSaveError(null);
            setEditPassword(''); setShowEditPassword(false);
          },
        )}
        {deleteRow && renderDeleteModal()}
        {showAdd && renderModal(
          t.empAddTitle || "Yangi xodim qo'shish", addDraft,
          setAddDraft, () => { void saveAdd(); },
          () => { setShowAdd(false); setSaveError(null); setAddLogin(''); setAddPassword(''); setShowAddPassword(false); },
          true,
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', minWidth: 0, overflowX: 'hidden' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              background: surface, border: `1px solid ${border}`,
              borderRadius: 12, padding: '8px 12px',
            }}>
              <Search size={13} color={muted} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t.empSearchPh || 'Qidirish...'}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: txt, outline: 'none' }}
              />
            </div>
            <button
              onClick={() => {
                setSaveError(null);
                setAddDraft({
                  tabel: 0, name: '', department: '', position: '', phone: UZ_PHONE_DEFAULT, orgId: '',
                  deptKey: '', posKey: 'salesAgent', positionId: '',
                });
                setShowAdd(true);
              }}
              disabled={!backendReady}
              style={{
                padding: '8px 14px', borderRadius: 12, border: 'none',
                background: backendReady ? indigo : (D ? '#374151' : '#d1d5db'),
                color: '#fff', cursor: backendReady ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 13,
                boxShadow: backendReady ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
              }}
            >
              <Plus size={14} />
            </button>
          </div>

          <div style={{ fontSize: 11.5, color: muted }}>
            {employees.length} {t.empUnit || 'xodim'}
          </div>

          {employees.map((emp, i) => (
            <div key={`${emp.orgId}-${emp.tabel}-${i}`} style={{
              background: bg, border: `1px solid ${border}`,
              borderRadius: 14, padding: isSmall ? '12px' : '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: D ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: indigo,
                }}>
                  {emp.name.slice(0, 2).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>#{emp.tabel}</span>
                    <span style={{ fontSize: isSmall ? 12 : 13, fontWeight: 700, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {emp.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {sotrudnikDeptLabel(emp, t) && (
                      <span style={{
                        fontSize: 9.5, padding: '2px 6px', borderRadius: 5,
                        background: D ? 'rgba(255,255,255,0.07)' : '#f3f4f6', color: muted, fontWeight: 500,
                      }}>{sotrudnikDeptLabel(emp, t)}</span>
                    )}
                    <span style={{
                      fontSize: 9.5, padding: '2px 6px', borderRadius: 5,
                      background: `${indigo}15`, color: indigo, fontWeight: 600,
                    }}>{sotrudnikPosLabel(emp, t)}</span>
                  </div>
                </div>
              </div>

              {/* Phone */}
              {emp.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <Phone size={10} color={muted} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.phone}</span>
                </div>
              )}

              {/* Action buttons */}
              <div style={{
                display: 'flex', gap: 6,
                paddingTop: 8, borderTop: `1px solid ${D ? 'rgba(255,255,255,0.06)' : '#f3f4f6'}`,
              }}>
                <button
                  onClick={() => {
                    const matched = findPositionByName(emp.position);
                    const deptMatched =
                      (emp.deptKey && findDepartmentById(emp.deptKey)) ||
                      departments.find(
                        d => d.name.trim().toLowerCase() === (emp.department || '').trim().toLowerCase(),
                      );
                    setEditRow(emp);
                    setEditPassword('');
                    setShowEditPassword(false);
                    setEditDraft({
                      ...emp,
                      phone: formatUzPhoneInput(emp.phone || ''),
                      positionId: matched?.id || emp.positionId,
                      posKey: matched ? appAccessToPosKey(matched.appAccess) : emp.posKey,
                      deptKey: deptMatched?.id || emp.deptKey || '',
                      department: deptMatched?.name || emp.department,
                    });
                  }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: isSmall ? '7px 6px' : '8px', borderRadius: 9, border: `1px solid ${border}`,
                    background: D ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)',
                    color: indigo, fontSize: isSmall ? 11 : 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Edit2 size={11} />
                  {t.empEditBtn || "O'zgartirish"}
                </button>
                <button
                  onClick={() => setDeleteRow(emp)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: isSmall ? '7px 6px' : '8px', borderRadius: 9, border: `1px solid ${D ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'}`,
                    background: D ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
                    color: red, fontSize: isSmall ? 11 : 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Trash2 size={11} />
                  {t.empDeleteBtn || "O'chirish"}
                </button>
              </div>
            </div>
          ))}

          {employees.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: muted, fontSize: 13 }}>
              {listEmptyMessage}
            </div>
          )}
        </div>
      </>
    );
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <>
      {editRow && editDraft && renderModal(
        t.editEmpTitle || 'Xodimni tahrirlash', editDraft,
          setEditDraft, () => { void saveEdit(); },
          () => {
            setEditRow(null); setEditDraft(null); setSaveError(null);
            setEditPassword(''); setShowEditPassword(false);
          },
        )}
      {deleteRow && renderDeleteModal()}
      {showAdd && renderModal(
        t.empAddTitle || "Yangi xodim qo'shish", addDraft,
        setAddDraft, () => { void saveAdd(); },
        () => { setShowAdd(false); setSaveError(null); setAddLogin(''); setAddPassword(''); setShowAddPassword(false); },
        true,
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <span style={{ fontSize: 17, fontWeight: 700, color: txt }}>
              {t.navSotrudniki || "Xodimlar ro'yxati"}
            </span>
            <span style={{ fontSize: 12, color: muted, fontWeight: 400, marginLeft: 10 }}>
              {employees.length} {t.empUnit || 'xodim'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: surface, border: `1px solid ${border}`,
              borderRadius: 11, padding: '7px 13px', minWidth: 220,
            }}>
              <Search size={13} color={muted} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t.empSearchPh || 'Qidirish...'}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: txt, outline: 'none' }}
              />
            </div>

            {/* Add button */}
            <button
              onClick={() => {
                setSaveError(null);
                setAddDraft({
                  tabel: 0, name: '', department: '', position: '', phone: UZ_PHONE_DEFAULT, orgId: '',
                  deptKey: '', posKey: 'salesAgent', positionId: '',
                });
                setShowAdd(true);
              }}
              disabled={!backendReady}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 11, border: 'none',
                background: backendReady ? indigo : (D ? '#374151' : '#d1d5db'),
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: backendReady ? 'pointer' : 'not-allowed',
                boxShadow: backendReady ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
              }}
            >
              <Plus size={14} />
              {t.empAddBtn || "Qo'shish"}
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{
          background: bg, border: `1px solid ${border}`,
          borderRadius: 18, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                background: D ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.022)',
                borderBottom: `1px solid ${border}`,
              }}>
                {[
                  { label: t.empTabelCol || 'Tabel №', w: 80 },
                  { label: t.empNameCol || 'Xodim ismi', w: undefined },
                  { label: t.empDeptCol || "Bo'linma", w: 160 },
                  { label: t.empPositionCol || 'Lavozim', w: 160 },
                  { label: t.empPhoneCol || 'Telefon', w: 150 },
                  ...(selectedCompanyIds.size > 1 ? [{ label: t.empOrgCol || 'Tashkilot', w: 110 }] : []),
                  { label: t.empActionsCol || 'Amallar', w: 160 },
                ].map((col, i) => (
                  <th key={i} style={{
                    padding: '11px 14px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: muted,
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    width: col.w, whiteSpace: 'nowrap',
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => {
                const orgInfo = COMPANIES.find(c => c.id === emp.orgId);
                return (
                  <tr
                    key={emp.backendUserId || `${emp.orgId}-${emp.tabel}-${i}`}
                    style={{
                      background: i % 2 === 0 ? bg : rowAlt,
                      borderBottom: i < employees.length - 1
                        ? `1px solid ${D ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.045)'}`
                        : 'none',
                      transition: 'background 0.13s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = rowHov)}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? bg : rowAlt)}
                  >
                    {/* Tabel № */}
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: D ? '#4b5563' : '#9ca3af',
                        background: D ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                        padding: '2px 8px', borderRadius: 7,
                      }}>
                        {emp.tabel}
                      </span>
                    </td>

                    {/* Name */}
                    <td style={{ padding: '9px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                          background: D ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: indigo,
                        }}>
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: txt }}>
                          {emp.name}
                        </span>
                      </div>
                    </td>

                    {/* Department */}
                    <td style={{ padding: '9px 14px' }}>
                      {sotrudnikDeptLabel(emp, t) && (
                        <span style={{
                          fontSize: 11.5, padding: '3px 9px', borderRadius: 7,
                          background: D ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                          color: muted, fontWeight: 500,
                        }}>
                          {sotrudnikDeptLabel(emp, t)}
                        </span>
                      )}
                    </td>

                    {/* Position */}
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{
                        fontSize: 11.5, padding: '3px 9px', borderRadius: 7,
                        background: `${indigo}14`, color: indigo, fontWeight: 600,
                      }}>
                        {sotrudnikPosLabel(emp, t)}
                      </span>
                    </td>

                    {/* Phone */}
                    <td style={{ padding: '9px 14px' }}>
                      {emp.phone ? (
                        <span style={{ fontSize: 12.5, color: muted, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Phone size={11} color={muted} />
                          {emp.phone}
                        </span>
                      ) : (
                        <span style={{ color: D ? '#333' : '#e5e7eb', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Org */}
                    {selectedCompanyIds.size > 1 && (
                      <td style={{ padding: '9px 14px' }}>
                        {orgInfo && (
                          <span style={{
                            fontSize: 11, padding: '3px 8px', borderRadius: 7,
                            background: D ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                            color: muted, fontWeight: 500,
                          }}>
                            {orgInfo.icon} {orgInfo.shortName}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Actions */}
                    <td style={{ padding: '9px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {/* Edit */}
                        <button
                          onClick={() => {
                    const matched = findPositionByName(emp.position);
                    const deptMatched =
                      (emp.deptKey && findDepartmentById(emp.deptKey)) ||
                      departments.find(
                        d => d.name.trim().toLowerCase() === (emp.department || '').trim().toLowerCase(),
                      );
                    setEditRow(emp);
                    setEditPassword('');
                    setShowEditPassword(false);
                    setEditDraft({
                      ...emp,
                      phone: formatUzPhoneInput(emp.phone || ''),
                      positionId: matched?.id || emp.positionId,
                      posKey: matched ? appAccessToPosKey(matched.appAccess) : emp.posKey,
                      deptKey: deptMatched?.id || emp.deptKey || '',
                      department: deptMatched?.name || emp.department,
                    });
                  }}
                          title={t.empEditBtn || "O'zgartirish"}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 11px', borderRadius: 8,
                            border: `1px solid ${D ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)'}`,
                            background: D ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)',
                            color: indigo, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = D ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.14)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = D ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)';
                          }}
                        >
                          <Edit2 size={12} />
                          {t.empEditBtn || "O'zgartirish"}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteRow(emp)}
                          title={t.empDeleteBtn || "O'chirish"}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 11px', borderRadius: 8,
                            border: `1px solid ${D ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.18)'}`,
                            background: D ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)',
                            color: red, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = D ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.13)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = D ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)';
                          }}
                        >
                          <Trash2 size={12} />
                          {t.empDeleteBtn || "O'chirish"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {employees.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '52px 20px', textAlign: 'center', fontSize: 13, color: muted }}>
                    {listEmptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}