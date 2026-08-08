import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Check, AlertTriangle, Briefcase } from 'lucide-react';
import {
  api,
  type BackendStaffPosition,
  type PositionAppAccess,
} from '../../../api/client';

interface Props {
  D: boolean;
  t: Record<string, string>;
}

const ACCESS_OPTIONS: PositionAppAccess[] = ['agent', 'delivery', 'manager'];

export function AdminPositionsTab({ D, t }: Props) {
  const [rows, setRows] = useState<BackendStaffPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<BackendStaffPosition | null>(null);
  const [editDraft, setEditDraft] = useState<BackendStaffPosition | null>(null);
  const [deleteRow, setDeleteRow] = useState<BackendStaffPosition | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addAccess, setAddAccess] = useState<PositionAppAccess>('agent');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await api.getPositions());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklab bo\'lmadi');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const txt = D ? '#f9fafb' : '#111827';
  const muted = D ? '#6b7280' : '#9ca3af';
  const border = D ? '#2a2a2a' : '#e5e7eb';
  const bg = D ? '#161616' : '#ffffff';
  const surface = D ? '#1a1a1a' : '#f9fafb';
  const rowAlt = D ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.016)';
  const rowHov = D ? 'rgba(99,102,241,0.09)' : 'rgba(99,102,241,0.05)';
  const selBg = D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)';
  const indigo = '#6366f1';
  const red = '#ef4444';

  const accessLabel = (a: PositionAppAccess) => {
    if (a === 'delivery') return t.posAccessDelivery || 'Agent ilova · dostavchik';
    if (a === 'manager') return t.posAccessManager || 'Manager ilova';
    return t.posAccessAgent || 'Agent ilova · agent';
  };

  const T = {
    title: t.posTitle || 'Lavozimlar',
    code: t.deptCode || 'Kod',
    name: t.empPositionCol || 'Lavozim',
    app: t.posAppCol || 'Ilova',
    add: t.deptAdd || "Qo'shish",
    addTitle: t.posAddTitle || "Yangi lavozim",
    editTitle: t.posEditTitle || 'Lavozimni tahrirlash',
    deleteTitle: t.posDeleteTitle || "O'chirishni tasdiqlaysizmi?",
    deleteConfirm: t.posDeleteConfirm || "lavozimi o'chiriladi.",
    deleteBtn: t.deptDelete || "O'chirish",
    cancel: t.deptCancel || 'Bekor',
    empty: t.posEmpty || "Hali lavozimlar qo'shilmagan",
    hint: t.deptHint || "Qatorni bosing — tahrirlash va o'chirish tugmalari paydo bo'ladi",
    count: t.deptCount || 'ta',
    namePlaceholder: t.posNamePlaceholder || 'Lavozim nomi',
    save: t.save || 'Saqlash',
    nameLbl: t.deptNameLabel || 'Nom',
    appLbl: t.posAppLabel || 'Qaysi ilova',
    edit: t.editLabel || "O'zgartirish",
  };

  const saveAdd = async () => {
    if (!addName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.createPosition({
        name: addName.trim(),
        appAccess: addAccess,
      });
      setAddName('');
      setAddAccess('agent');
      setShowAdd(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editDraft?.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.updatePosition(editDraft.id, {
        name: editDraft.name.trim(),
        appAccess: editDraft.appAccess,
      });
      setEditRow(null);
      setEditDraft(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.deletePosition(deleteRow.id);
      if (selected === deleteRow.id) setSelected(null);
      setDeleteRow(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "O'chirishda xatolik");
    } finally {
      setSaving(false);
    }
  };

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: `1px solid ${border}`, background: surface,
    color: txt, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  const lblSt: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: muted,
    marginBottom: 5, display: 'block', letterSpacing: '0.04em', textTransform: 'uppercase',
  };

  const AccessPicker = ({
    value, onChange,
  }: { value: PositionAppAccess; onChange: (v: PositionAppAccess) => void }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ACCESS_OPTIONS.map(opt => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, textAlign: 'left',
              border: `1.5px solid ${active ? indigo : border}`,
              background: active
                ? (D ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.08)')
                : (D ? 'rgba(255,255,255,0.03)' : '#fff'),
              color: active ? (D ? '#c7d2fe' : '#4338ca') : txt,
              fontSize: 12.5, fontWeight: active ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            <span style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${active ? indigo : (D ? '#4b5563' : '#d1d5db')}`,
              background: active ? indigo : 'transparent',
              boxShadow: active ? 'inset 0 0 0 3px ' + (D ? '#161616' : '#fff') : 'none',
            }} />
            {accessLabel(opt)}
          </button>
        );
      })}
    </div>
  );

  const FormModal = ({
    title, nameVal, access, onName, onAccess, onSave, onClose,
  }: {
    title: string;
    nameVal: string;
    access: PositionAppAccess;
    onName: (v: string) => void;
    onAccess: (v: PositionAppAccess) => void;
    onSave: () => void;
    onClose: () => void;
  }) => (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: bg, borderRadius: 20, border: `1px solid ${border}`,
          width: '100%', maxWidth: 400, margin: 16, padding: 24,
          boxShadow: D ? '0 24px 64px rgba(0,0,0,0.7)' : '0 24px 64px rgba(0,0,0,0.14)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11, background: `${indigo}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Briefcase size={16} color={indigo} />
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lblSt}>{T.nameLbl}</label>
            <input
              style={inputSt}
              value={nameVal} onChange={e => onName(e.target.value)}
              placeholder={T.namePlaceholder}
              onKeyDown={e => e.key === 'Enter' && onSave()}
              autoFocus
            />
          </div>
          <div>
            <label style={lblSt}>{T.appLbl}</label>
            <AccessPicker value={access} onChange={onAccess} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 11,
            border: `1px solid ${border}`, background: 'transparent',
            color: muted, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {T.cancel}
          </button>
          <button onClick={onSave} style={{
            flex: 2, padding: '10px', borderRadius: 11, border: 'none',
            background: indigo, color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}>
            <Check size={14} /> {T.save}
          </button>
        </div>
      </div>
    </div>
  );

  const sorted = [...rows].sort((a, b) => a.code - b.code);
  const colSpan = isMobile ? 2 : 4;

  return (
    <>
      {showAdd && (
        <FormModal
          title={T.addTitle}
          nameVal={addName} access={addAccess}
          onName={setAddName} onAccess={setAddAccess}
          onSave={() => { void saveAdd(); }}
          onClose={() => {
            setShowAdd(false); setAddName(''); setAddAccess('agent');
          }}
        />
      )}

      {editRow && editDraft && (
        <FormModal
          title={T.editTitle}
          nameVal={editDraft.name}
          access={editDraft.appAccess}
          onName={v => setEditDraft(d => d ? { ...d, name: v } : d)}
          onAccess={v => setEditDraft(d => d ? { ...d, appAccess: v } : d)}
          onSave={() => { void saveEdit(); }}
          onClose={() => { setEditRow(null); setEditDraft(null); }}
        />
      )}

      {deleteRow && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setDeleteRow(null)}
        >
          <div
            style={{
              background: bg, borderRadius: 20, border: `1px solid ${border}`,
              width: '100%', maxWidth: 340, margin: 16, padding: '28px 24px',
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
              {T.deleteTitle}
            </div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 22, lineHeight: 1.6 }}>
              <strong style={{ color: txt }}>«{deleteRow.name}»</strong> {T.deleteConfirm}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteRow(null)} style={{
                flex: 1, padding: '10px', borderRadius: 11,
                border: `1px solid ${border}`, background: 'transparent',
                color: muted, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                {T.cancel}
              </button>
              <button onClick={() => { void confirmDelete(); }} style={{
                flex: 1, padding: '10px', borderRadius: 11, border: 'none',
                background: red, color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}>
                {T.deleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 17, fontWeight: 700, color: txt }}>{T.title}</span>
            <span style={{ fontSize: 12, color: muted, fontWeight: 400, marginLeft: 10 }}>
              {rows.length} {T.count}
            </span>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 11, border: 'none',
              background: indigo, color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}
          >
            <Plus size={14} />
            {T.add}
          </button>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: red, padding: '8px 12px', borderRadius: 10, background: `${red}14` }}>
            {error}
          </div>
        )}

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
                <th style={{
                  padding: '11px 14px 11px 16px', textAlign: 'left',
                  fontSize: 11, fontWeight: 700, color: muted,
                  letterSpacing: '0.04em', textTransform: 'uppercase', width: 70,
                }}>
                  {T.code}
                </th>
                <th style={{
                  padding: '11px 14px', textAlign: 'left',
                  fontSize: 11, fontWeight: 700, color: muted,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  {T.name}
                </th>
                {!isMobile && (
                  <th style={{
                    padding: '11px 14px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: muted,
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}>
                    {T.app}
                  </th>
                )}
                {!isMobile && <th style={{ width: 180, padding: '11px 14px' }} />}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={colSpan} style={{ padding: '40px', textAlign: 'center', fontSize: 13, color: muted }}>
                    {t.loading || 'Yuklanmoqda...'}
                  </td>
                </tr>
              )}
              {!loading && sorted.map((pos, i) => {
                const isSel = selected === pos.id;
                return (
                  <tr
                    key={pos.id}
                    onClick={() => setSelected(isSel ? null : pos.id)}
                    style={{
                      background: isSel ? selBg : i % 2 === 0 ? bg : rowAlt,
                      borderBottom: i < sorted.length - 1
                        ? `1px solid ${D ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.045)'}`
                        : 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = rowHov; }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isSel ? selBg : i % 2 === 0 ? bg : rowAlt;
                    }}
                  >
                    <td style={{ padding: '10px 14px 10px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 28, height: 28, borderRadius: 8,
                        background: isSel ? `${indigo}22` : D ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                        fontSize: 13, fontWeight: 700,
                        color: isSel ? indigo : D ? '#9ca3af' : '#6b7280',
                      }}>
                        {pos.code}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontSize: 13.5, fontWeight: isSel ? 700 : 500,
                        color: isSel ? indigo : txt, display: 'block',
                      }}>
                        {pos.name}
                      </span>
                      {isMobile && (
                        <span style={{ fontSize: 11, color: muted, marginTop: 3, display: 'block' }}>
                          {accessLabel(pos.appAccess)}
                        </span>
                      )}
                      {isMobile && isSel && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button
                            onClick={e => { e.stopPropagation(); setEditRow(pos); setEditDraft({ ...pos }); }}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                              padding: '7px 10px', borderRadius: 8, border: 'none',
                              background: D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)',
                              color: indigo, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={12} />{T.edit}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteRow(pos); }}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                              padding: '7px 10px', borderRadius: 8, border: 'none',
                              background: D ? 'rgba(239,68,68,0.13)' : 'rgba(239,68,68,0.08)',
                              color: red, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={12} />{T.deleteBtn}
                          </button>
                        </div>
                      )}
                    </td>
                    {!isMobile && (
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: 12, color: muted, fontWeight: 500,
                          padding: '4px 8px', borderRadius: 8,
                          background: D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        }}>
                          {accessLabel(pos.appAccess)}
                        </span>
                      </td>
                    )}
                    {!isMobile && (
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{
                          display: 'flex', gap: 6, justifyContent: 'flex-end',
                          opacity: isSel ? 1 : 0, transition: 'opacity 0.15s',
                        }}>
                          <button
                            onClick={e => { e.stopPropagation(); setEditRow(pos); setEditDraft({ ...pos }); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '5px 11px', borderRadius: 8, border: 'none',
                              background: D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)',
                              color: indigo, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={12} />{T.edit}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteRow(pos); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '5px 11px', borderRadius: 8, border: 'none',
                              background: D ? 'rgba(239,68,68,0.13)' : 'rgba(239,68,68,0.08)',
                              color: red, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={12} />{T.deleteBtn}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {!loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={colSpan} style={{ padding: '52px 20px', textAlign: 'center', fontSize: 13, color: muted }}>
                    {T.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isMobile && (
          <div style={{ fontSize: 11.5, color: muted, textAlign: 'center' }}>
            {T.hint}
          </div>
        )}
      </div>
    </>
  );
}
