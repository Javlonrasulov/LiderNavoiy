import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, X, Check, AlertTriangle, Plus, Phone, UserCircle2 } from 'lucide-react';
import { SOTRUDNIKI_LIST, type SotrudnikRow } from '../../../data/adminData';
import { COMPANIES } from '../../AdminAuthContext';

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

const DEPARTMENTS = ['', 'Продавцы', 'Доставка', 'Отдел продаж', 'АУП', 'Касса', 'Склад', 'Бухгалтерия'];
const POSITIONS   = ['Директор', 'Торговый агент', 'Доставщик', 'Нач отдел', 'Повар', 'Кассир', 'Кладовщик', 'Оператор', 'Бухгалтер', 'Рекламист'];

export function AdminAgentsTab({ D, t, selectedCompanyIds }: Props) {
  const [isMobile, setIsMobile]   = useState(false);
  const [search, setSearch]       = useState('');
  const [rows, setRows]           = useState<SotrudnikRow[]>(() => [...SOTRUDNIKI_LIST]);
  const [editRow, setEditRow]     = useState<SotrudnikRow | null>(null);
  const [editDraft, setEditDraft] = useState<SotrudnikRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<SotrudnikRow | null>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [addDraft, setAddDraft]   = useState<SotrudnikRow>({ tabel: 0, name: '', department: '', position: '', phone: '', orgId: '' });

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
    return orgMatch && (!q ||
      e.name.toLowerCase().includes(q) ||
      e.position.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  });

  // ── actions ──────────────────────────────────────────────────────────────
  const saveEdit = () => {
    if (!editDraft) return;
    setRows(r => r.map(e => (e === editRow ? editDraft : e)));
    setEditRow(null); setEditDraft(null);
  };
  const confirmDelete = () => {
    setRows(r => r.filter(e => e !== deleteRow));
    setDeleteRow(null);
  };
  const saveAdd = () => {
    if (!addDraft.name.trim()) return;
    const orgId = selectedIds[0] || 'boran';
    setRows(r => [...r, { ...addDraft, orgId }]);
    setShowAdd(false);
    setAddDraft({ tabel: 0, name: '', department: '', position: '', phone: '', orgId: '' });
  };

  // ── shared input style ────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: `1px solid ${border}`, background: surface,
    color: txt, fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: muted, marginBottom: 5, display: 'block' };

  // ── overlay modal ─────────────────────────────────────────────────────────
  const renderModal = (
    title: string,
    draft: SotrudnikRow,
    onChangeDraft: (d: SotrudnikRow) => void,
    onSave: () => void,
    onClose: () => void,
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

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Tabel №</label>
              <input
                style={inputStyle}
                type="number"
                value={draft.tabel || ''}
                onChange={e => onChangeDraft({ ...draft, tabel: +e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label style={labelStyle}>Telefon</label>
              <input
                style={inputStyle}
                value={draft.phone}
                onChange={e => onChangeDraft({ ...draft, phone: e.target.value })}
                placeholder="(99) 000-00-00"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Xodim ismi</label>
            <input
              style={inputStyle}
              value={draft.name}
              onChange={e => onChangeDraft({ ...draft, name: e.target.value })}
              placeholder="F.I.Sh."
            />
          </div>

          <div>
            <label style={labelStyle}>Bo'linma</label>
            <select
              style={selectStyle}
              value={draft.department}
              onChange={e => onChangeDraft({ ...draft, department: e.target.value })}
            >
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d || '— tanlanmagan —'}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Lavozim</label>
            <select
              style={selectStyle}
              value={draft.position}
              onChange={e => onChangeDraft({ ...draft, position: e.target.value })}
            >
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 11, border: `1px solid ${border}`,
            background: 'transparent', color: muted, fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}>
            Bekor
          </button>
          <button onClick={onSave} style={{
            flex: 2, padding: '10px', borderRadius: 11, border: 'none',
            background: indigo, color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}>
            <Check size={14} />
            Saqlash
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
          O'chirishni tasdiqlaysizmi?
        </div>
        <div style={{ fontSize: 13, color: muted, marginBottom: 24, lineHeight: 1.5 }}>
          <strong style={{ color: txt }}>{deleteRow.name}</strong> — bu amalni ortga qaytarib bo'lmaydi.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setDeleteRow(null)} style={{
            flex: 1, padding: '10px', borderRadius: 11, border: `1px solid ${border}`,
            background: 'transparent', color: muted, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Bekor
          </button>
          <button onClick={confirmDelete} style={{
            flex: 1, padding: '10px', borderRadius: 11, border: 'none',
            background: red, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
          }}>
            O'chirish
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
          "Xodimni tahrirlash", editDraft,
          setEditDraft, saveEdit, () => { setEditRow(null); setEditDraft(null); }
        )}
        {deleteRow && renderDeleteModal()}
        {showAdd && renderModal(
          "Yangi xodim qo'shish", addDraft,
          setAddDraft, saveAdd, () => setShowAdd(false)
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
                placeholder="Qidirish..."
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: txt, outline: 'none' }}
              />
            </div>
            <button onClick={() => setShowAdd(true)} style={{
              padding: '8px 14px', borderRadius: 12, border: 'none',
              background: indigo, color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 13,
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
            }}>
              <Plus size={14} />
            </button>
          </div>

          <div style={{ fontSize: 11.5, color: muted }}>
            {employees.length} xodim
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
                    {emp.department && (
                      <span style={{
                        fontSize: 9.5, padding: '2px 6px', borderRadius: 5,
                        background: D ? 'rgba(255,255,255,0.07)' : '#f3f4f6', color: muted, fontWeight: 500,
                      }}>{emp.department}</span>
                    )}
                    <span style={{
                      fontSize: 9.5, padding: '2px 6px', borderRadius: 5,
                      background: `${indigo}15`, color: indigo, fontWeight: 600,
                    }}>{emp.position}</span>
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
                  onClick={() => { setEditRow(emp); setEditDraft({ ...emp }); }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: isSmall ? '7px 6px' : '8px', borderRadius: 9, border: `1px solid ${border}`,
                    background: D ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)',
                    color: indigo, fontSize: isSmall ? 11 : 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Edit2 size={11} />
                  O'zgartirish
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
                  O'chirish
                </button>
              </div>
            </div>
          ))}

          {employees.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: muted, fontSize: 13 }}>
              Ma'lumot topilmadi
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
        "Xodimni tahrirlash", editDraft,
        setEditDraft, saveEdit, () => { setEditRow(null); setEditDraft(null); }
      )}
      {deleteRow && renderDeleteModal()}
      {showAdd && renderModal(
        "Yangi xodim qo'shish", addDraft,
        setAddDraft, saveAdd, () => setShowAdd(false)
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <span style={{ fontSize: 17, fontWeight: 700, color: txt }}>
              {t.navSotrudniki || "Xodimlar ro'yxati"}
            </span>
            <span style={{ fontSize: 12, color: muted, fontWeight: 400, marginLeft: 10 }}>
              {employees.length} xodim
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
                placeholder="Qidirish..."
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: txt, outline: 'none' }}
              />
            </div>

            {/* Add button */}
            <button onClick={() => setShowAdd(true)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 11, border: 'none',
              background: indigo, color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}>
              <Plus size={14} />
              Qo'shish
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
                  { label: 'Tabel №', w: 80 },
                  { label: 'Xodim ismi', w: undefined },
                  { label: "Bo'linma", w: 160 },
                  { label: 'Lavozim', w: 160 },
                  { label: 'Telefon', w: 150 },
                  ...(selectedCompanyIds.size > 1 ? [{ label: 'Tashkilot', w: 110 }] : []),
                  { label: '', w: 160 },
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
                    key={`${emp.orgId}-${emp.tabel}-${i}`}
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
                      {emp.department && (
                        <span style={{
                          fontSize: 11.5, padding: '3px 9px', borderRadius: 7,
                          background: D ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                          color: muted, fontWeight: 500,
                        }}>
                          {emp.department}
                        </span>
                      )}
                    </td>

                    {/* Position */}
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{
                        fontSize: 11.5, padding: '3px 9px', borderRadius: 7,
                        background: `${indigo}14`, color: indigo, fontWeight: 600,
                      }}>
                        {emp.position}
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
                          onClick={() => { setEditRow(emp); setEditDraft({ ...emp }); }}
                          title="O'zgartirish"
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
                          O'zgartirish
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteRow(emp)}
                          title="O'chirish"
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
                          O'chirish
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {employees.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '52px 20px', textAlign: 'center', fontSize: 13, color: muted }}>
                    Ma'lumot topilmadi
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