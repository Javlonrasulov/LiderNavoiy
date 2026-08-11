import { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Save, Trash2, ChevronDown, Check, Eye, EyeOff } from 'lucide-react';
import {
  userStatusOpenLabel,
  userStatusClosedLabel,
} from '../../../data/adminData';
import { getStoredAppPassword, translateApiError } from '../../../utils/appUserCreds';
import { useCompanies } from '../../CompaniesContext';
import { api, type BackendDepartment, type BackendStaffPosition } from '../../../api/client';

/* ═══════════ Types ═══════════ */
type ModalTab = 'asosiy' | 'ontrade';

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
  backendUserId?: string;
  dirs: string;
  acceptPay: boolean;
  consig: boolean;
  canAddClients: boolean;
  gps: boolean;
  companyId?: string | null;
  companyIds?: string[];
  positionId?: string | null;
  departmentId?: string | null;
}

interface FormData {
  code: string;
  uid: string;
  status: string;
  xodim: string;
  fio: string;
  /** Lavozim nomi (ro‘yxatda ko‘rinadi) */
  role: string;
  positionId: string;
  departmentId: string;
  department: string;
  telegramId: string;
  org: string;
  grafik: string;
  companyIds: string[];
  appLogin: string;
  appPassword: string;
  appAcceptPay: boolean;
  appAddClient: boolean;
  /** Agent APK da GPS doim; menejer ilovasida GPS yo‘q */
  appGps: boolean;
}

export type UserFormData = FormData;

interface Props {
  D: boolean;
  t: Record<string, string>;
  user: UserFormRow | null; // null = new user
  onClose: () => void;
  onSave: (data: FormData) => void | boolean | Promise<void | boolean>;
  onDelete?: (id: number) => void;
}

function tr(t: Record<string, string>, key: string, fallback: string) {
  return t[key] || fallback;
}

function grafikList(t: Record<string, string>) {
  return [
    tr(t, 'userGrafikRegion', 'Hudud'),
    tr(t, 'userGrafikDirection', "Yo'nalish"),
    tr(t, 'userGrafikNone', 'Hisoblanmaydi'),
  ];
}

/* ═══════════ Constants ═══════════ */

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
            {value || '— tanlang —'}
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

/* ═══════════ MAIN COMPONENT ═══════════ */
export function AdminUserFormModal({ D, t, user, onClose, onSave, onDelete }: Props) {
  const { companies } = useCompanies();
  const [tab, setTab] = useState<ModalTab>('asosiy');
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [positions, setPositions] = useState<BackendStaffPosition[]>([]);
  const [departments, setDepartments] = useState<BackendDepartment[]>([]);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [posRows, deptRows] = await Promise.all([
          api.getPositions(),
          api.getDepartments(),
        ]);
        if (!cancelled) {
          setPositions(posRows);
          setDepartments(deptRows);
        }
      } catch {
        if (!cancelled) {
          setPositions([]);
          setDepartments([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const statusOpen  = userStatusOpenLabel(t);
  const statusClosed = userStatusClosedLabel(t);
  const grafikOptions = grafikList(t);
  const orgNames = companies.map(c => c.name);
  const posNames = positions.map(p => p.name);
  const deptNames = departments.map(d => d.name);
  const orgNameById = (id: string) =>
    companies.find(c => c.id === id)?.name || id;

  const isManagerPosition = (positionId: string, roleName: string) => {
    const byId = positionId ? positions.find(p => p.id === positionId) : undefined;
    if (byId) return byId.appAccess === 'manager';
    const byName = positions.find(p => p.name === roleName);
    return byName?.appAccess === 'manager';
  };

  /* ── form state ── */
  const [form, setForm] = useState<FormData>(() => {
    if (user) {
      const companyIds = [
        ...new Set(
          [
            ...(user.companyIds ?? []),
            user.companyId,
          ]
            .map(id => id?.trim())
            .filter((id): id is string => !!id),
        ),
      ];
      const roleName = user.role;
      // positions hali yuklanmagan — menejer nomidan taxmin; keyin effect aniqlaydi
      const maybeManager = /menejer|manager|директор|direktor/i.test(roleName);
      return {
        code: user.code,
        uid: String(user.id),
        status: user.status === 'open' ? statusOpen : statusClosed,
        xodim: user.emp,
        fio: user.name,
        role: user.role,
        positionId: user.positionId || '',
        departmentId: user.departmentId || '',
        department: user.dirs || '',
        telegramId: user.tg || '',
        org: user.org.replace(/\.\.\.$/, ''),
        grafik: grafikOptions[0],
        companyIds,
        appLogin: user.onTrade || '',
        appPassword: getStoredAppPassword(user.onTrade || ''),
        appAcceptPay: user.acceptPay,
        appAddClient: maybeManager ? true : !!user.canAddClients,
        appGps: !maybeManager,
      };
    }
    return {
      code: '', uid: '', status: statusOpen, xodim: '', fio: '',
      role: '', positionId: '', departmentId: '', department: '',
      telegramId: '', org: '', grafik: grafikOptions[0],
      companyIds: [],
      appLogin: '', appPassword: '',
      appAcceptPay: true, appAddClient: false, appGps: true,
    };
  });

  // Lavozimlar yuklanganda — positionId yoki nom bo‘yicha bog‘lash + manager defaultlar
  useEffect(() => {
    if (positions.length === 0) return;
    setForm(f => {
      let next = { ...f };
      if (f.positionId) {
        const byId = positions.find(p => p.id === f.positionId);
        if (byId && f.role !== byId.name) next = { ...next, role: byId.name };
      } else if (f.role) {
        const byName = positions.find(
          p => p.name.trim().toLowerCase() === f.role.trim().toLowerCase(),
        );
        if (byName) next = { ...next, positionId: byName.id, role: byName.name };
      }
      const manager = isManagerPosition(next.positionId, next.role);
      if (manager) {
        next = {
          ...next,
          appGps: false,
          appAddClient: true,
        };
      } else {
        next = { ...next, appGps: true };
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat positions yuklanganda
  }, [positions]);

  // Bo‘limlar yuklanganda — departmentId yoki nom bo‘yicha bog‘lash
  useEffect(() => {
    if (departments.length === 0) return;
    setForm(f => {
      if (f.departmentId) {
        const byId = departments.find(d => d.id === f.departmentId);
        if (byId && f.department !== byId.name) {
          return { ...f, department: byId.name };
        }
        return f;
      }
      if (!f.department) return f;
      const byName = departments.find(
        d => d.name.trim().toLowerCase() === f.department.trim().toLowerCase(),
      );
      if (byName) return { ...f, departmentId: byName.id, department: byName.name };
      return f;
    });
  }, [departments]);

  const selectPositionByName = (name: string) => {
    const pos = positions.find(p => p.name === name);
    const manager = pos?.appAccess === 'manager';
    setForm(f => ({
      ...f,
      role: name,
      positionId: pos?.id || '',
      appGps: !manager,
      appAddClient: manager ? true : false,
    }));
  };

  const selectDepartmentByName = (name: string) => {
    const dept = departments.find(d => d.name === name);
    setForm(f => ({
      ...f,
      department: name,
      departmentId: dept?.id || '',
    }));
  };

  const submitForm = async (closeAfter: boolean) => {
    setSaveError(null);
    setSaving(true);
    try {
      const result = await onSave(form);
      if (result !== false) {
        if (closeAfter) onClose();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setSaveError(translateApiError(msg, t));
    } finally {
      setSaving(false);
    }
  };

  const upd = (key: keyof FormData, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const setCompanyIds = (ids: string[]) => {
    const unique = [...new Set(ids.filter(Boolean))];
    setForm(f => ({
      ...f,
      companyIds: unique,
      org: unique.map(orgNameById).join(', '),
    }));
  };

  const selectPrimaryOrgByName = (name: string) => {
    const company = companies.find(c => c.name === name);
    if (!company) {
      upd('org', name);
      return;
    }
    setForm(f => {
      const rest = f.companyIds.filter(id => id !== company.id);
      const next = [company.id, ...rest];
      return {
        ...f,
        companyIds: next,
        org: next.map(orgNameById).join(', '),
      };
    });
  };

  /* ── design tokens ── */
  const txt     = D ? '#f0f0f0' : '#111827';
  const muted   = D ? '#6b7280' : '#9ca3af';
  const border  = D ? '#2a2a2a' : '#e5e7eb';
  const surface = D ? '#1a1a1a' : '#f9fafb';
  const bg      = D ? '#141414' : '#ffffff';
  const indigo  = '#6366f1';
  const green   = D ? '#22c55e' : '#16a34a';

  const title = user
    ? `${user.name} ${tr(t, 'userModalSuffix', '(Foydalanuvchi)')}`
    : tr(t, 'userModalNew', 'Yangi foydalanuvchi');

  const TABS: { id: ModalTab; label: string }[] = [
    { id: 'asosiy',  label: tr(t, 'userTabMain', 'Asosiy') },
    { id: 'ontrade', label: tr(t, 'userTabApp', 'Ilova') },
  ];

  /* ─── Tab content renderers ─── */
  const renderAsosiy = () => (
    <div style={{ padding: isMobile ? '0 14px 20px' : '0 20px 24px' }}>
      {/* Row 1: Kod + ID + Status */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        borderBottom: `1px solid ${border}`, padding: '10px 0',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}>
        {/* Kod */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12.5, color: muted, fontWeight: 500, whiteSpace: 'nowrap' }}>{tr(t, 'userFldCode', 'Kod:')}</span>
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
          <span style={{ fontSize: 12.5, color: muted, fontWeight: 500 }}>{tr(t, 'userFldId', 'ID:')}</span>
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
          <span style={{ fontSize: 12.5, color: muted, fontWeight: 500, whiteSpace: 'nowrap' }}>{tr(t, 'userFldStatus', 'Holat:')}</span>
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <StatusToggle
              value={form.status}
              onChange={v => upd('status', v)}
              statusOpen={statusOpen}
              statusClosed={statusClosed}
              D={D} txt={txt} muted={muted} border={border} green={green}
            />
          </div>
        </div>
      </div>

      {/* Xodim row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}`, padding: '9px 0' }}>
        <span style={{ flexShrink: 0, minWidth: 110, fontSize: 12.5, color: muted, fontWeight: 500 }}>{tr(t, 'userFldEmployee', 'Xodim:')}</span>
        <input
          value={form.xodim}
          onChange={e => upd('xodim', e.target.value)}
          placeholder={tr(t, 'userPhEmployee', 'Xodimni tanlang')}
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
      <TextField label={tr(t, 'userFldFio', 'F.I.O:')} value={form.fio} onChange={v => upd('fio', v)}
        D={D} border={border} txt={txt} muted={muted} />

      {/* Lavozim (rol shundan olinadi) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}`, padding: '9px 0' }}>
        <span style={{ flexShrink: 0, minWidth: 110, fontSize: 12.5, color: muted, fontWeight: 500 }}>{tr(t, 'empPositionCol', 'Lavozim:')}</span>
        <SelectInline
          value={form.role}
          onChange={selectPositionByName}
          placeholder={tr(t, 'empPosNone', '— lavozim tanlang —')}
          options={posNames}
          D={D} border={border} txt={txt} muted={muted}
        />
        <LookupBtn D={D} border={border} muted={muted} />
        <ClearBtn
          show={!!form.role || !!form.positionId}
          onClear={() => setForm(f => ({ ...f, role: '', positionId: '' }))}
          muted={muted}
        />
      </div>

      {/* Bo‘lim */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}`, padding: '9px 0' }}>
        <span style={{ flexShrink: 0, minWidth: 110, fontSize: 12.5, color: muted, fontWeight: 500 }}>{tr(t, 'empDeptCol', "Bo'lim:")}</span>
        <SelectInline
          value={form.department}
          onChange={selectDepartmentByName}
          placeholder={tr(t, 'empDeptNone', '— tanlanmagan —')}
          options={deptNames}
          D={D} border={border} txt={txt} muted={muted}
        />
        <ClearBtn
          show={!!form.department || !!form.departmentId}
          onClear={() => setForm(f => ({ ...f, department: '', departmentId: '' }))}
          muted={muted}
        />
      </div>

      {/* Telegram ID */}
      <TextField label={tr(t, 'userFldTelegram', 'Telegram ID:')} value={form.telegramId} onChange={v => upd('telegramId', v)}
        placeholder="@username"
        D={D} border={border} txt={txt} muted={muted} />

      {/* Tashkilot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}`, padding: '9px 0' }}>
        <span style={{ flexShrink: 0, minWidth: 110, fontSize: 12.5, color: muted, fontWeight: 500 }}>{tr(t, 'userFldOrg', 'Tashkilot:')}</span>
        <SelectInline
          value={form.companyIds[0] ? orgNameById(form.companyIds[0]) : form.org}
          onChange={selectPrimaryOrgByName}
          placeholder={tr(t, 'userSelect', '— tanlang —')}
          options={orgNames}
          D={D} border={border} txt={txt} muted={muted}
        />
        <LookupBtn D={D} border={border} muted={muted} />
        <ClearBtn show={form.companyIds.length > 0 || !!form.org} onClear={() => setCompanyIds([])} muted={muted} />
      </div>

      {/* Grafik turi */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${border}`, padding: '9px 0' }}>
        <span style={{ flexShrink: 0, minWidth: 110, fontSize: 12.5, color: muted, fontWeight: 500 }}>{tr(t, 'userFldSchedule', 'Grafik turi:')}</span>
        <SelectInline value={form.grafik} onChange={v => upd('grafik', v)} placeholder={tr(t, 'userSelect', '— tanlang —')}
          options={grafikOptions} D={D} border={border} txt={txt} muted={muted} />
      </div>
    </div>
  );

  const managerLavozim = isManagerPosition(form.positionId, form.role);

  const renderOntrade = () => (
    <div style={{ padding: isMobile ? '16px 14px' : '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Ilova login */}
      <div style={{
        padding: '14px 16px', borderRadius: 12,
        background: D ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
        border: `1px solid ${D ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)'}`,
      }}>
        <div style={{ fontSize: 11, color: indigo, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {tr(t, 'userAppLoginTitle', 'Ilova login')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 80, fontSize: 12.5, color: muted }}>{tr(t, 'userAppLogin', 'Login:')}</span>
            <input
              value={form.appLogin}
              onChange={e => upd('appLogin', e.target.value)}
              placeholder="login"
              autoComplete="username"
              style={{
                flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8,
                border: `1px solid ${border}`, background: D ? '#1a1a1a' : '#fff',
                color: txt, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' as const,
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 80, fontSize: 12.5, color: muted }}>{tr(t, 'userAppPassword', 'Parol:')}</span>
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.appPassword}
                onChange={e => upd('appPassword', e.target.value)}
                placeholder={user ? tr(t, 'empAppPasswordKeepPh', "Bo'sh — o'zgarmaydi") : '••••••••'}
                autoComplete="new-password"
                style={{
                  width: '100%', padding: '7px 36px 7px 10px', borderRadius: 8,
                  border: `1px solid ${border}`, background: D ? '#1a1a1a' : '#fff',
                  color: txt, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' as const,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: muted, display: 'flex', alignItems: 'center',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: muted, lineHeight: 1.4 }}>
            {tr(t, 'userAppHint', 'Login va parolni shu yerda o‘zgartirish mumkin. Mobil ilovaga kirish uchun ishlatiladi.')}
          </div>
        </div>
      </div>
      {/* Mobile settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
        {[
          { key: 'appAcceptPay' as const, label: tr(t, 'userAppAcceptPay', "To'lov qabul qilish"), locked: false },
          {
            key: 'appGps' as const,
            label: tr(t, 'userAppGps', 'GPS tracking'),
            locked: true,
            hint: managerLavozim
              ? tr(t, 'userAppGpsManagerOff', 'Menejer ilovasida GPS yo‘q')
              : tr(t, 'userAppGpsAlwaysOn', 'GPS doim yoqiq'),
          },
          {
            key: 'appAddClient' as const,
            label: tr(t, 'userPermNewClient', "Yangi mijoz qo'shish"),
            locked: managerLavozim,
            hint: managerLavozim
              ? tr(t, 'userAppAddClientManagerOn', 'Menejer mijoz qo‘sha oladi')
              : undefined,
          },
        ].map((item, i, arr) => {
          const val = form[item.key];
          return (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: i < arr.length - 1 ? `1px solid ${border}` : 'none',
            background: i % 2 === 0 ? 'transparent' : (D ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.012)'),
          }}>
            <span style={{ fontSize: 12.5, color: txt }}>
              {item.label}
              {item.locked && item.hint && (
                <span style={{ marginLeft: 6, fontSize: 10, color: muted }}>
                  ({item.hint})
                </span>
              )}
            </span>
            <ToggleSwitch
              D={D}
              value={val}
              disabled={item.locked}
              onChange={item.locked ? undefined : (v) => setForm(f => ({ ...f, [item.key]: v }))}
            />
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
                onClick={() => submitForm(false)}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: isMobile ? '7px 12px' : '7px 14px',
                  borderRadius: 9, border: 'none',
                  background: indigo, color: '#fff',
                  fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                  flexShrink: 0, opacity: saving ? 0.7 : 1,
                }}
              >
                <Save size={12} />
                {!isMobile && <span>{saving ? '...' : tr(t, 'userSave', 'Saqlash')}</span>}
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
          paddingTop: 4,
        }}>
          {tab === 'asosiy'  && renderAsosiy()}
          {tab === 'ontrade' && renderOntrade()}
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
                { label: tr(t, 'userAcceptPay', "To'lov"), active: form.appAcceptPay, color: green },
                { label: tr(t, 'userPermNewClient', "Mijoz qo'shish"), active: form.appAddClient, color: '#8b5cf6' },
                { label: tr(t, 'userGPS', 'GPS'), active: form.appGps, color: '#3b82f6' },
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
              onClick={() => submitForm(true)}
              disabled={saving}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 10, border: 'none',
                background: indigo, color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Save size={13} /> {saving ? '...' : tr(t, 'userSaveClose', 'Saqlash va yopish')}
            </button>
          </div>
        )}
        {saveError && (
          <div style={{
            padding: '8px 20px', borderTop: `1px solid ${border}`,
            background: D ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
            color: '#ef4444', fontSize: 12, flexShrink: 0,
          }}>
            {saveError}
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

function StatusToggle({ value, onChange, statusOpen, statusClosed, D, txt, muted, border, green }: {
  value: string; onChange: (v: string) => void;
  statusOpen: string; statusClosed: string;
  D: boolean; txt: string; muted: string; border: string; green: string;
}) {
  const isOpen = value === statusOpen;
  return (
    <button
      onClick={() => onChange(isOpen ? statusClosed : statusOpen)}
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

function SelectInline({ value, onChange, options, placeholder, D, border, txt, muted }: {
  value: string; onChange: (v: string) => void; options: string[];
  placeholder?: string;
  D: boolean; border: string; txt: string; muted: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 220, openUp: false });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

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
        zIndex: 10000,
        transform: pos.openUp ? 'translateY(-100%)' : undefined,
        background: D ? '#1e1e1e' : '#fff',
        border: `1px solid ${border}`,
        borderRadius: 8,
        boxShadow: D ? '0 12px 40px rgba(0,0,0,0.7)' : '0 12px 40px rgba(0,0,0,0.13)',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxHeight: pos.maxHeight, overflowY: 'auto' }}>
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
    </div>,
    document.body,
  ) : null;

  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <button
        ref={btnRef}
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
          {value || placeholder || '— tanlang —'}
        </span>
        <ChevronDown size={12} style={{ flexShrink: 0, marginLeft: 4, opacity: 0.5 }} />
      </button>
      {dropdown}
    </div>
  );
}

function ToggleSwitch({ D, value, onChange, disabled }: {
  D: boolean; value: boolean; onChange?: (v: boolean) => void; disabled?: boolean;
}) {
  const on = value;
  return (
    <div
      onClick={() => !disabled && onChange?.(!on)}
      style={{
        width: 38, height: 20, borderRadius: 20,
        background: on ? '#6366f1' : (D ? '#374151' : '#d1d5db'),
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.85 : 1,
        transition: 'background 0.2s',
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