import { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { UserCog, Check, Pencil, Trash2, Plus, AlertCircle, Eye, EyeOff, ChevronDown, AlertTriangle } from 'lucide-react';
import { api, type SystemUserRecord } from '../../../api/client';
import {
  PAGE_PERMISSIONS,
  getAllPositions,
  getCustomRoles,
  saveCustomRoles,
  permissionLabels,
} from '../../../utils/pagePermissions';

interface Props {
  D: boolean;
  t: Record<string, string>;
  card: string;
  sub: string;
}

interface FormState {
  fullName: string;
  username: string;
  password: string;
  position: string;
  permissions: Set<string>;
}

const EMPTY_FORM: FormState = {
  fullName: '',
  username: '',
  password: '',
  position: 'Operator',
  permissions: new Set(['dashboard']),
};

function PositionSelect({
  value, onChange, options, placeholder, D, border, txt, muted, inputBg,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  D: boolean;
  border: string;
  txt: string;
  muted: string;
  inputBg: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 220, openUp: false });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const indigo = '#6366f1';

  const reposition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const itemH = 40;
    const listH = Math.min(options.length * itemH + 8, 240);
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
        background: D ? '#1a1a1a' : '#fff',
        border: `1px solid ${D ? '#333' : border}`,
        borderRadius: 12,
        boxShadow: D ? '0 12px 40px rgba(0,0,0,0.65)' : '0 8px 28px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxHeight: pos.maxHeight, overflowY: 'auto' }}>
        {options.map(opt => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
                background: selected
                  ? (D ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.08)')
                  : 'transparent',
                color: selected ? (D ? '#a5b4fc' : indigo) : txt,
                fontSize: 13, fontWeight: selected ? 600 : 400,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => {
                if (!selected) (e.currentTarget as HTMLButtonElement).style.background = D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
              }}
              onMouseLeave={e => {
                if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              {selected
                ? <Check size={13} color={indigo} style={{ flexShrink: 0 }} />
                : <span style={{ width: 13, flexShrink: 0 }} />}
              {opt}
            </button>
          );
        })}
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
          padding: '10px 14px', borderRadius: 10,
          border: `1px solid ${open ? indigo : border}`,
          background: inputBg,
          color: value ? txt : muted,
          fontSize: 13, cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box',
          boxShadow: open ? (D ? '0 0 0 3px rgba(99,102,241,0.18)' : '0 0 0 3px rgba(99,102,241,0.12)') : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder || '—'}
        </span>
        <ChevronDown
          size={15}
          style={{
            flexShrink: 0, marginLeft: 8, color: muted,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </button>
      {dropdown}
    </div>
  );
}

export function AdminSystemUsersTab({ D, t, card, sub }: Props) {
  const [users, setUsers] = useState<SystemUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, permissions: new Set(EMPTY_FORM.permissions) });
  const [positions, setPositions] = useState(getAllPositions());
  const [newRole, setNewRole] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SystemUserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const txt     = D ? '#f9fafb' : '#111827';
  const muted   = D ? '#9ca3af' : '#6b7280';
  const border  = D ? '#2a2a2a' : '#e5e7eb';
  const surface = D ? '#161616' : '#ffffff';
  const indigo  = '#6366f1';
  const red     = '#ef4444';
  const inputBg = D ? 'rgba(255,255,255,0.04)' : '#fff';
  const modalBg = D ? '#161616' : '#ffffff';

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await api.listSystemUsers();
      setUsers(list.filter(u => u.isActive));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.sysUserErrLoad || 'Yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [t.sysUserErrLoad]);

  useEffect(() => { refresh(); }, [refresh]);

  const resetForm = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, permissions: new Set(EMPTY_FORM.permissions) });
    setShowPass(false);
    setError('');
  };

  const startEdit = (u: SystemUserRecord) => {
    setEditId(u.id);
    setForm({
      fullName: u.fullName,
      username: u.username,
      password: '',
      position: u.position || 'Operator',
      permissions: new Set(u.role === 'admin' ? PAGE_PERMISSIONS.map(p => p.id) : u.permissions),
    });
    setError('');
    setShowPass(false);
  };

  const togglePerm = (id: string) => {
    setForm(prev => {
      const next = new Set(prev.permissions);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, permissions: next };
    });
  };

  const allPermIds = PAGE_PERMISSIONS.map(p => p.id);
  const allPermsSelected = allPermIds.every(id => form.permissions.has(id));

  const toggleAllPerms = () => {
    setForm(prev => ({
      ...prev,
      permissions: allPermsSelected
        ? new Set<string>()
        : new Set(allPermIds),
    }));
  };

  const addCustomRole = () => {
    const name = newRole.trim();
    if (!name) return;
    const custom = getCustomRoles();
    if (!custom.includes(name) && !positions.includes(name)) {
      const updated = [...custom, name];
      saveCustomRoles(updated);
      setPositions(getAllPositions());
    }
    setForm(prev => ({ ...prev, position: name }));
    setNewRole('');
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim() || !form.username.trim()) {
      setError(t.sysUserErrRequired || "F.I.Sh. va login kiriting");
      return;
    }
    if (!editId && !form.password.trim()) {
      setError(t.sysUserErrPassword || 'Parol kiriting');
      return;
    }
    if (form.password.trim() && form.password.trim().length < 6) {
      setError(t.sysUserErrPasswordShort || 'Parol kamida 6 belgi');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const perms = Array.from(form.permissions);
      const isAdminPos = form.position.toLowerCase() === 'admin';
      const body = {
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        position: form.position,
        permissions: perms,
        role: isAdminPos ? 'admin' as const : 'manager' as const,
        ...(form.password.trim() ? { password: form.password.trim() } : {}),
      };

      if (editId) {
        await api.updateSystemUser(editId, body);
      } else {
        await api.createSystemUser({ ...body, password: form.password.trim() });
      }
      resetForm();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.sysUserErrSave || 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteTarget.isProtected) return;
    setDeleting(true);
    setError('');
    try {
      await api.deactivateSystemUser(deleteTarget.id);
      if (editId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.sysUserErrDelete || "O'chirishda xatolik");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1px solid ${border}`, background: inputBg,
    color: txt, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 500, color: muted, marginBottom: 6,
  };

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: D ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserCog size={18} color={indigo} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: txt, margin: 0, letterSpacing: '-0.3px' }}>
            {t.navSystemUsers || 'Tizim foydalanuvchilari'}
          </h2>
        </div>
        <p style={{ fontSize: 13, color: muted, margin: '0 0 0 46px' }}>
          {t.sysUserSubtitle || 'Login qiladigan xodimlar va ularning huquqlari'}
        </p>
      </div>

      {/* Two columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 20,
        alignItems: 'start',
      }}
      className="sys-users-grid"
      >
        {/* LEFT — Form */}
        <div className={`rounded-2xl border p-5 ${card}`} style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: txt, margin: '0 0 16px' }}>
            {editId ? (t.sysUserEditTitle || 'Tahrirlash') : (t.sysUserNewTitle || 'Yangi foydalanuvchi')}
          </h3>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              borderRadius: 10, marginBottom: 14,
              background: D ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${D ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.20)'}`,
              color: '#ef4444', fontSize: 12,
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>{t.sysUserFio || 'F.I.Sh.'}</label>
              <input
                value={form.fullName}
                onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                placeholder={t.sysUserFioPh || 'To\'liq ism'}
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t.sysUserLogin || 'Login yoki telefon'}</label>
              <input
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                placeholder={t.sysUserLoginPh || '+998901234567'}
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                {t.sysUserPassword || 'Parol'}
                {editId && <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 11 }}>({t.sysUserPasswordHint || 'bo\'sh qoldiring — o\'zgarmaydi'})</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  style={{ ...fieldStyle, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  title={showPass ? (t.sysUserHidePass || 'Yashirish') : (t.sysUserShowPass || "Ko'rish")}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    display: 'flex', alignItems: 'center', color: muted,
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Position */}
            <div>
              <label style={labelStyle}>{t.sysUserPosition || 'Lavozim'}</label>
              <PositionSelect
                value={form.position}
                onChange={v => setForm(p => ({ ...p, position: v }))}
                options={positions}
                placeholder={t.sysUserPosition || 'Lavozim'}
                D={D}
                border={border}
                txt={txt}
                muted={muted}
                inputBg={inputBg}
              />
              <p style={{ fontSize: 11, color: muted, margin: '6px 0 0', lineHeight: 1.5 }}>
                {t.sysUserPositionHint || "Admin, Direktor kabi tizim rollari o'chirib bo'lmaydi."}
              </p>
            </div>

            {/* Custom role */}
            <div>
              <label style={labelStyle}>{t.sysUserCustomRole || "Qo'shimcha lavozim"}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  placeholder={t.sysUserCustomRolePh || 'Yangi lavozim nomi'}
                  style={{ ...fieldStyle, flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && addCustomRole()}
                />
                <button
                  onClick={addCustomRole}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                    padding: '0 14px', borderRadius: 10, border: `1px solid ${border}`,
                    background: inputBg, color: indigo, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> {t.sysUserAdd || "Qo'shish"}
                </button>
              </div>
            </div>

            {/* Permissions grid */}
            <div>
              <label style={{ ...labelStyle, marginBottom: 10 }}>
                {t.sysUserPermsTitle || 'Sahifa va funksiyalarga ruxsat'}
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 8,
                maxHeight: 220,
                overflowY: 'auto',
                padding: 4,
              }}>
                <button
                  type="button"
                  onClick={toggleAllPerms}
                  style={{
                    gridColumn: '1 / -1',
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${allPermsSelected ? indigo : border}`,
                    background: allPermsSelected
                      ? (D ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.10)')
                      : (D ? 'rgba(255,255,255,0.04)' : '#f3f4f6'),
                    color: allPermsSelected ? (D ? '#a5b4fc' : indigo) : txt,
                    fontSize: 12, fontWeight: 700,
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: `1.5px solid ${allPermsSelected ? indigo : border}`,
                    background: allPermsSelected ? indigo : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {allPermsSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                  </span>
                  {t.sysUserPermAll || 'Barchasi'}
                </button>
                {PAGE_PERMISSIONS.map(p => {
                  const checked = form.permissions.has(p.id);
                  const label = t[p.labelKey] ?? p.fallback;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePerm(p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${checked ? indigo : border}`,
                        background: checked
                          ? (D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)')
                          : (D ? 'rgba(255,255,255,0.03)' : '#f9fafb'),
                        color: checked ? (D ? '#a5b4fc' : indigo) : muted,
                        fontSize: 12, fontWeight: checked ? 600 : 400,
                        textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      <span style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: `1.5px solid ${checked ? indigo : border}`,
                        background: checked ? indigo : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {checked && <Check size={10} color="#fff" strokeWidth={3} />}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              {editId && (
                <button
                  onClick={resetForm}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${border}`,
                    background: 'transparent', color: muted, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {t.cancel || 'Bekor qilish'}
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  flex: editId ? 1 : undefined,
                  width: editId ? undefined : '100%',
                  padding: '12px', borderRadius: 12, border: 'none',
                  background: saving ? (D ? '#374151' : '#d1d5db') : indigo,
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {saving
                  ? (t.loading || 'Yuklanmoqda...')
                  : editId
                    ? (t.save || 'Saqlash')
                    : (t.sysUserAddBtn || "Qo'shish")}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — User list */}
        <div className={`rounded-2xl border p-5 ${card}`} style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: txt, margin: '0 0 16px' }}>
            {t.sysUserListTitle || 'Foydalanuvchilar'}
            <span style={{
              marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 20,
              background: D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.10)',
              color: indigo, fontWeight: 600,
            }}>
              {users.length}
            </span>
          </h3>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: muted, fontSize: 13 }}>
              {t.loading || 'Yuklanmoqda...'}
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: muted, fontSize: 13 }}>
              {t.sysUserEmpty || "Hali foydalanuvchi yo'q"}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {users.map(u => {
                const permsText = u.role === 'admin'
                  ? (t.sysUserAllPerms || 'Barcha sahifalar')
                  : permissionLabels(u.permissions, t);
                const isEditing = editId === u.id;
                return (
                  <div
                    key={u.id}
                    style={{
                      padding: '14px 16px', borderRadius: 12,
                      border: `1px solid ${isEditing ? indigo : border}`,
                      background: isEditing
                        ? (D ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.05)')
                        : surface,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: txt, marginBottom: 3 }}>
                          {u.fullName}
                        </div>
                        <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>
                          {u.username} · <span style={{ color: indigo, fontWeight: 600 }}>{u.position || u.role}</span>
                        </div>
                        {permsText && (
                          <div style={{ fontSize: 11, color: muted, lineHeight: 1.5, wordBreak: 'break-word' }}>
                            {permsText}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => startEdit(u)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '6px 10px', borderRadius: 8,
                            border: `1px solid ${border}`, background: inputBg,
                            color: txt, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                          }}
                        >
                          <Pencil size={12} /> {t.editLabel || 'Tahrirlash'}
                        </button>
                        {!u.isProtected && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '6px 10px', borderRadius: 8,
                              border: `1px solid ${D ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.25)'}`,
                              background: D ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
                              color: '#ef4444', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={12} /> {t.deleteBtn || "O'chirish"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .sys-users-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {deleteTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            style={{
              background: modalBg, borderRadius: 20, border: `1px solid ${border}`,
              width: '100%', maxWidth: 360, margin: 16, padding: '28px 24px',
              boxShadow: D ? '0 24px 64px rgba(0,0,0,0.7)' : '0 24px 64px rgba(0,0,0,0.14)',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px',
              background: `${red}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={22} color={red} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: txt, marginBottom: 8 }}>
              {t.sysUserDeleteTitle || t.empDeleteTitle || "O'chirishni tasdiqlaysizmi?"}
            </div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 22, lineHeight: 1.6 }}>
              <strong style={{ color: txt }}>{deleteTarget.fullName}</strong>
              {' '}
              {t.sysUserDeleteWarn || t.empDeleteWarn || "o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi."}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 11,
                  border: `1px solid ${border}`, background: 'transparent',
                  color: muted, fontSize: 13, fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {t.cancelBtn || t.cancel || 'Bekor qilish'}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
                style={{
                  flex: 1, padding: '10px', borderRadius: 11, border: 'none',
                  background: deleting ? (D ? '#7f1d1d' : '#fca5a5') : red,
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  boxShadow: deleting ? 'none' : '0 4px 14px rgba(239,68,68,0.35)',
                }}
              >
                {deleting ? (t.loading || 'Yuklanmoqda...') : (t.deleteBtn || "O'chirish")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
