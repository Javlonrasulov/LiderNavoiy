import { useCallback, useEffect, useState } from 'react';
import { GitBranch, Search, Plus, Users, Edit2, Trash2, ChevronLeft, ChevronRight, X, AlertTriangle, Check } from 'lucide-react';
import { LINES } from '../../../data/adminData';
import { api } from '../../../api/client';

interface Props {
  D: boolean;
  card: string;
  divider: string;
  sub: string;
  t: Record<string, string>;
}

type Line = {
  id: string | number;
  code: string;
  name: string;
  kolTT: number;
  agent: string;
  plan: number;
  visits: number;
  sales: number;
};

function hasApiToken(): boolean {
  return !!localStorage.getItem('api_access_token');
}

function apiLineToRow(row: {
  id: string;
  code: string;
  name: string;
  agentName: string | null;
  clientCount: number;
}): Line {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    kolTT: row.clientCount,
    agent: row.agentName ?? '',
    plan: 0,
    visits: 0,
    sales: 0,
  };
}

const demoLines: Line[] = LINES.map(l => ({
  id: l.id,
  code: l.code,
  name: l.name,
  kolTT: l.kolTT,
  agent: l.agent,
  plan: l.plan,
  visits: l.visits,
  sales: l.sales,
}));

export function AdminLiniyaTab({ D, card, divider, sub, t: _t }: Props) {
  const [lines, setLines]       = useState<Line[]>(demoLines);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [editLine, setEditLine] = useState<Line | null>(null);
  const [deleteLine, setDeleteLine] = useState<Line | null>(null);
  const [addMode, setAddMode]   = useState(false);
  const [form, setForm]         = useState<Omit<Line,'id'>>({ code:'', name:'', kolTT:0, agent:'', plan:0, visits:0, sales:0 });
  const [saved, setSaved]       = useState(false);
  const PER_PAGE = 12;

  const refreshLines = useCallback(async () => {
    if (!hasApiToken()) {
      setLines(demoLines);
      return;
    }
    setLoading(true);
    try {
      const rows = await api.getLines();
      setLines(rows.map(apiLineToRow));
    } catch {
      setLines(demoLines);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshLines(); }, [refreshLines]);

  const filtered = lines.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.code.includes(search) ||
    l.agent.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalTT    = lines.reduce((s, l) => s + l.kolTT, 0);
  const totalSales = lines.reduce((s, l) => s + l.sales, 0);
  const avgPlan    = Math.round(lines.reduce((s, l) => s + l.plan, 0) / lines.length);

  const txt    = D ? '#f9fafb' : '#111827';
  const muted  = D ? '#6b7280' : '#9ca3af';
  const border = D ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const inpBg  = D ? '#1a1a1a' : '#f9fafb';
  const indigo = '#6366f1';
  const modalBg = D ? '#1c1c1e' : '#ffffff';
  const overlayBg = 'rgba(0,0,0,0.45)';

  const openEdit = (line: Line) => {
    setForm({ code: line.code, name: line.name, kolTT: line.kolTT, agent: line.agent, plan: line.plan, visits: line.visits, sales: line.sales });
    setEditLine(line);
  };

  const saveEdit = async () => {
    if (hasApiToken() && typeof editLine?.id === 'string') {
      try {
        const updated = await api.updateLine(editLine.id, {
          code: form.code,
          name: form.name,
          agentName: form.agent || null,
        });
        setLines(prev => prev.map(l => l.id === editLine.id ? apiLineToRow(updated) : l));
      } catch {
        return;
      }
    } else {
      setLines(prev => prev.map(l => l.id === editLine!.id ? { ...l, ...form } : l));
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditLine(null); }, 900);
  };

  const confirmDelete = async () => {
    if (hasApiToken() && typeof deleteLine?.id === 'string') {
      try {
        await api.deleteLine(deleteLine.id);
      } catch {
        return;
      }
    }
    setLines(prev => prev.filter(l => l.id !== deleteLine!.id));
    setDeleteLine(null);
    if (page > Math.ceil((filtered.length - 1) / PER_PAGE)) setPage(p => Math.max(1, p - 1));
  };

  const saveAdd = async () => {
    if (hasApiToken()) {
      try {
        const created = await api.createLine({
          code: form.code,
          name: form.name,
          agentName: form.agent || undefined,
        });
        setLines(prev => [...prev, apiLineToRow(created)]);
      } catch {
        return;
      }
    } else {
      const newLine: Line = { id: Date.now(), ...form };
      setLines(prev => [...prev, newLine]);
    }
    setAddMode(false);
    setForm({ code:'', name:'', kolTT:0, agent:'', plan:0, visits:0, sales:0 });
  };

  const InputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    background: inpBg, border: `1.5px solid ${border}`,
    borderRadius: 10, padding: '10px 12px',
    fontSize: 13, color: txt, outline: 'none',
  };

  const modalLine = editLine || (addMode ? { id: 0, ...form } as Line : null);
  const isOpen = !!editLine || addMode;

  return (
    <div style={{ padding: '0 0 32px' }}>

      {/* ── Backdrop / Modal ── */}
      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: overlayBg,
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => { setEditLine(null); setAddMode(false); }}>
          <div style={{
            background: modalBg, borderRadius: 18, padding: 28, width: 400, maxWidth: '92vw',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            border: `1px solid ${border}`,
          }} onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: txt }}>
                {editLine ? 'Liniyani tahrirlash' : 'Yangi liniya'}
              </div>
              <button onClick={() => { setEditLine(null); setAddMode(false); }} style={{
                width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: D ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={14} color={muted} />
              </button>
            </div>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 5, fontWeight: 600 }}>KOD</div>
                  <input style={InputStyle} value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="01" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 5, fontWeight: 600 }}>SAVDO NUQTALARI</div>
                  <input style={InputStyle} type="number" value={form.kolTT}
                    onChange={e => setForm(f => ({ ...f, kolTT: Number(e.target.value) }))} placeholder="0" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: muted, marginBottom: 5, fontWeight: 600 }}>NOMI</div>
                <input style={InputStyle} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Liniya nomi" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: muted, marginBottom: 5, fontWeight: 600 }}>AGENT</div>
                <input style={InputStyle} value={form.agent}
                  onChange={e => setForm(f => ({ ...f, agent: e.target.value }))} placeholder="Agent ismi" />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={() => { setEditLine(null); setAddMode(false); }} style={{
                flex: 1, padding: '11px 0', borderRadius: 10, border: `1px solid ${border}`,
                background: 'transparent', color: txt, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Bekor
              </button>
              <button onClick={editLine ? saveEdit : saveAdd} style={{
                flex: 2, padding: '11px 0', borderRadius: 10, border: 'none',
                background: saved ? '#10b981' : indigo,
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background .2s',
              }}>
                {saved ? <><Check size={14} /> Saqlandi!</> : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteLine && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: overlayBg, backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setDeleteLine(null)}>
          <div style={{
            background: modalBg, borderRadius: 18, padding: 28, width: 360, maxWidth: '92vw',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            border: `1px solid ${border}`, textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'rgba(239,68,68,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: txt, marginBottom: 8 }}>
              Liniyani o'chirish
            </div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 24 }}>
              <b style={{ color: txt }}>{deleteLine.code} — {deleteLine.name}</b><br />
              liniyasini o'chirmoqchimisiz?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteLine(null)} style={{
                flex: 1, padding: '11px 0', borderRadius: 10, border: `1px solid ${border}`,
                background: 'transparent', color: txt, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Bekor
              </button>
              <button onClick={confirmDelete} style={{
                flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
                background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GitBranch size={17} color={indigo} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: txt }}>Liniyalar</div>
            <div style={{ fontSize: 11, color: muted }}>Jami: {lines.length} liniya · {totalTT} savdo nuqtasi</div>
          </div>
        </div>
        <button onClick={() => { setForm({ code:'', name:'', kolTT:0, agent:'', plan:0, visits:0, sales:0 }); setAddMode(true); }} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: indigo, color: '#fff', fontSize: 13, fontWeight: 600,
        }}>
          <Plus size={14} /> Liniya qo'shish
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: GitBranch, label: 'Liniyalar',       value: String(lines.length), clr: indigo },
          { icon: Users,     label: 'Savdo nuqtalari', value: String(totalTT),      clr: '#10b981' },
        ].map(s => (
          <div key={s.label} className={card} style={{
            borderRadius: 12, border: `1px solid ${border}`,
            padding: '14px 16px',
          }}>
            <s.icon size={15} color={s.clr} />
            <div style={{ fontSize: 22, fontWeight: 700, color: txt, marginTop: 6 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} color={muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Liniya yoki agent qidirish..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: inpBg, border: `1.5px solid ${border}`,
            borderRadius: 10, padding: '10px 12px 10px 36px',
            fontSize: 13, color: txt, outline: 'none',
          }}
          onFocus={e => { e.target.style.borderColor = indigo; }}
          onBlur={e => { e.target.style.borderColor = border; }}
        />
      </div>

      {/* ── Table header ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '48px 1fr 80px 120px 60px',
        gap: 8, padding: '8px 12px',
        borderRadius: 8,
        background: D ? 'rgba(255,255,255,0.04)' : '#f3f4f6',
        marginBottom: 6,
      }}>
        {['Kod', 'Nomi', 'Savdo nuqtalari', 'Agent', ''].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {h}
          </span>
        ))}
      </div>

      {/* ── Rows ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {paginated.map(line => (
          <div
            key={line.id}
            style={{
              display: 'grid', gridTemplateColumns: '48px 1fr 80px 120px 60px',
              gap: 8, padding: '10px 12px', borderRadius: 10,
              border: `1px solid transparent`,
              cursor: 'pointer', alignItems: 'center', transition: 'all .12s',
            }}
            className={D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = border; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
          >
            {/* Code */}
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'rgba(99,102,241,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: indigo }}>{line.code}</span>
            </div>

            {/* Name */}
            <div style={{
              fontSize: 13, fontWeight: 500, color: txt,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {line.name}
            </div>

            {/* Savdo nuqtalari */}
            <div style={{ fontSize: 13, color: txt, fontWeight: 600 }}>{line.kolTT}</div>

            {/* Agent */}
            <div style={{
              fontSize: 11, color: muted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {line.agent.split(' ')[0]}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={e => { e.stopPropagation(); openEdit(line); }}
                style={{
                  width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: D ? 'rgba(255,255,255,0.07)' : '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = D ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = D ? 'rgba(255,255,255,0.07)' : '#f3f4f6'; }}
              >
                <Edit2 size={12} color={indigo} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setDeleteLine(line); }}
                style={{
                  width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: 'rgba(239,68,68,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; }}
              >
                <Trash2 size={12} color="#ef4444" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`,
              background: 'transparent', cursor: page === 1 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: page === 1 ? 0.35 : 1, transition: 'all .15s',
            }}
          >
            <ChevronLeft size={14} color={D ? '#f9fafb' : '#374151'} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setPage(n)}
              style={{
                width: 32, height: 32, borderRadius: 8, border: `1px solid ${n === page ? indigo : border}`,
                background: n === page ? indigo : 'transparent',
                color: n === page ? '#fff' : (D ? '#f9fafb' : '#374151'),
                fontSize: 13, fontWeight: n === page ? 700 : 400,
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {n}
            </button>
          ))}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`,
              background: 'transparent', cursor: page === totalPages ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: page === totalPages ? 0.35 : 1, transition: 'all .15s',
            }}
          >
            <ChevronRight size={14} color={D ? '#f9fafb' : '#374151'} />
          </button>
        </div>
      )}
    </div>
  );
}