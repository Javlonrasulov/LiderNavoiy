import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Check, AlertTriangle, Layers } from 'lucide-react';
import { api, type BackendDepartment } from '../../../api/client';

interface Props {
  D: boolean;
  t: Record<string, string>;
}

export function AdminDepartmentsTab({ D, t }: Props) {
  const [rows, setRows] = useState<BackendDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<BackendDepartment | null>(null);
  const [editDraft, setEditDraft] = useState<BackendDepartment | null>(null);
  const [deleteRow, setDeleteRow] = useState<BackendDepartment | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
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
      const list = await api.getDepartments();
      setRows(list);
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

  const T = {
    title: t.deptTitle || 'Подразделения',
    code: t.deptCode || 'Код',
    name: t.deptName || 'Наименование',
    add: t.deptAdd || "Qo'shish",
    addTitle: t.deptAddTitle || "Yangi bo'linma",
    editTitle: t.deptEditTitle || "Bo'linmani tahrirlash",
    deleteTitle: t.deptDeleteTitle || "O'chirishni tasdiqlaysizmi?",
    deleteConfirm: t.deptDeleteConfirm || "bo'linmasi o'chiriladi.",
    deleteBtn: t.deptDelete || "O'chirish",
    cancel: t.deptCancel || 'Bekor',
    empty: t.deptEmpty || "Hali bo'linmalar qo'shilmagan",
    hint: t.deptHint || "Qatorni bosing — tahrirlash va o'chirish tugmalari paydo bo'ladi",
    count: t.deptCount || 'ta',
    namePlaceholder: t.deptNamePlaceholder || "Bo'linma nomi",
    save: t.save || 'Saqlash',
    nameLbl: t.deptNameLabel || 'Nom',
    edit: t.editLabel || "O'zgartirish",
  };

  const saveAdd = async () => {
    if (!addName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.createDepartment({ name: addName.trim() });
      setAddName('');
      setShowAdd(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editDraft || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateDepartment(editDraft.id, {
        name: editDraft.name.trim(),
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
    const id = deleteRow.id;
    setSaving(true);
    setError(null);
    try {
      await api.deleteDepartment(id);
      setRows(prev => prev.filter(r => r.id !== id));
      if (selected === id) setSelected(null);
      setDeleteRow(null);
      void refresh();
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

  const FormModal = ({
    title, nameVal, onName, onSave, onClose,
  }: {
    title: string; nameVal: string;
    onName: (v: string) => void;
    onSave: () => void; onClose: () => void;
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
          width: '100%', maxWidth: 380, margin: 16, padding: 24,
          boxShadow: D ? '0 24px 64px rgba(0,0,0,0.7)' : '0 24px 64px rgba(0,0,0,0.14)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11, background: `${indigo}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Layers size={16} color={indigo} />
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

        <div>
          <label style={lblSt}>{T.nameLbl}</label>
          <input
            style={inputSt}
            value={nameVal}
            onChange={e => onName(e.target.value)}
            placeholder={T.namePlaceholder}
            onKeyDown={e => e.key === 'Enter' && onSave()}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 11,
            border: `1px solid ${border}`, background: 'transparent',
            color: muted, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {T.cancel}
          </button>
          <button onClick={onSave} disabled={saving} style={{
            flex: 2, padding: '10px', borderRadius: 11, border: 'none',
            background: indigo, color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            opacity: saving ? 0.7 : 1,
          }}>
            <Check size={14} /> {saving ? '...' : T.save}
          </button>
        </div>
      </div>
    </div>
  );

  const sorted = [...rows].sort((a, b) => a.code - b.code);

  return (
    <>
      {showAdd && (
        <FormModal
          title={T.addTitle}
          nameVal={addName}
          onName={setAddName}
          onSave={() => { void saveAdd(); }}
          onClose={() => { setShowAdd(false); setAddName(''); }}
        />
      )}

      {editRow && editDraft && (
        <FormModal
          title={T.editTitle}
          nameVal={editDraft.name}
          onName={v => setEditDraft(d => d ? { ...d, name: v } : d)}
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
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px',
              background: `${red}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={22} color={red} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: txt, marginBottom: 8 }}>{T.deleteTitle}</div>
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
              <button onClick={() => { void confirmDelete(); }} disabled={saving} style={{
                flex: 1, padding: '10px', borderRadius: 11, border: 'none',
                background: red, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
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

        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 18, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                background: D ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.022)',
                borderBottom: `1px solid ${border}`,
              }}>
                <th style={{
                  padding: '11px 14px 11px 16px', textAlign: 'left',
                  fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', width: 80,
                }}>
                  {T.code}
                </th>
                <th style={{
                  padding: '11px 14px', textAlign: 'left',
                  fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase',
                }}>
                  {T.name}
                </th>
                {!isMobile && <th style={{ width: 200, padding: '11px 14px' }} />}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={isMobile ? 2 : 3} style={{ padding: '40px', textAlign: 'center', color: muted, fontSize: 13 }}>
                    {t.loading || 'Yuklanmoqda...'}
                  </td>
                </tr>
              )}
              {!loading && sorted.map((dept, i) => {
                const isSel = selected === dept.id;
                return (
                  <tr
                    key={dept.id}
                    onClick={() => setSelected(isSel ? null : dept.id)}
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
                        {dept.code}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontSize: 13.5, fontWeight: isSel ? 700 : 500,
                        color: isSel ? indigo : txt, display: 'block',
                      }}>
                        {dept.name}
                      </span>
                      {isMobile && isSel && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button
                            onClick={e => { e.stopPropagation(); setEditRow(dept); setEditDraft({ ...dept }); }}
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
                            onClick={e => { e.stopPropagation(); setDeleteRow(dept); }}
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
                        <div style={{
                          display: 'flex', gap: 6, justifyContent: 'flex-end',
                          opacity: isSel ? 1 : 0, transition: 'opacity 0.15s',
                        }}>
                          <button
                            onClick={e => { e.stopPropagation(); setEditRow(dept); setEditDraft({ ...dept }); }}
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
                            onClick={e => { e.stopPropagation(); setDeleteRow(dept); }}
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
                  <td colSpan={isMobile ? 2 : 3} style={{ padding: '52px 20px', textAlign: 'center', fontSize: 13, color: muted }}>
                    {T.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isMobile && (
          <div style={{ fontSize: 11.5, color: muted, textAlign: 'center' }}>{T.hint}</div>
        )}
      </div>
    </>
  );
}
