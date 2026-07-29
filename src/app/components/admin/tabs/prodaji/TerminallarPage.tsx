import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { api, type Distributor } from '../../../api/client';

interface Terminal {
  id: string;
  name: string;
  code: string | null;
  companyId: string | null;
  assignedDistributorId: string | null;
  assignedName?: string | null;
  isActive: boolean;
}

interface Props {
  D: boolean;
  t: Record<string, string>;
  selectedCompanyIds?: Set<string>;
}

export function TerminallarPage({ D, t, selectedCompanyIds }: Props) {
  const card = D ? '#1c1c1e' : '#ffffff';
  const brd = D ? '#2a2a2e' : '#e5e7eb';
  const muted = D ? '#6b7280' : '#9ca3af';
  const txt = D ? '#f2f2f7' : '#111827';
  const hdr = D ? '#111113' : '#f9fafb';

  const companyId = useMemo(() => {
    if (!selectedCompanyIds || selectedCompanyIds.size === 0) return undefined;
    return [...selectedCompanyIds][0];
  }, [selectedCompanyIds]);

  const [rows, setRows] = useState<Terminal[]>([]);
  const [drivers, setDrivers] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [assignedId, setAssignedId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [terminals, dists] = await Promise.all([
        api.getTerminals(companyId),
        api.getDistributors(companyId),
      ]);
      setRows(terminals);
      setDrivers(dists);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createTerminal({
        name: name.trim(),
        code: code.trim() || null,
        companyId: companyId ?? null,
        assignedDistributorId: assignedId || null,
        isActive: true,
      });
      setName('');
      setCode('');
      setAssignedId('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const assign = async (id: string, distributorId: string) => {
    try {
      await api.updateTerminal(id, {
        assignedDistributorId: distributorId || null,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const deactivate = async (id: string) => {
    try {
      await api.deleteTerminal(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
      <div
        style={{
          background: card,
          border: `1px solid ${brd}`,
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'flex-end',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160, flex: 1 }}>
          <span style={{ fontSize: 12, color: muted }}>{t.termName ?? 'Terminal nomi'}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="POS-01"
            style={{
              height: 36,
              borderRadius: 8,
              border: `1px solid ${brd}`,
              background: D ? '#111113' : '#fff',
              color: txt,
              padding: '0 10px',
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
          <span style={{ fontSize: 12, color: muted }}>{t.termCode ?? 'Kod'}</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              height: 36,
              borderRadius: 8,
              border: `1px solid ${brd}`,
              background: D ? '#111113' : '#fff',
              color: txt,
              padding: '0 10px',
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180, flex: 1 }}>
          <span style={{ fontSize: 12, color: muted }}>{t.termEmployee ?? 'Xodim'}</span>
          <select
            value={assignedId}
            onChange={(e) => setAssignedId(e.target.value)}
            style={{
              height: 36,
              borderRadius: 8,
              border: `1px solid ${brd}`,
              background: D ? '#111113' : '#fff',
              color: txt,
              padding: '0 8px',
            }}
          >
            <option value="">—</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.user?.fullName ?? d.user?.username ?? d.id}
                {d.position ? ` (${d.position})` : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void create()}
          disabled={saving || !name.trim()}
          style={{
            height: 36,
            borderRadius: 8,
            border: 'none',
            background: '#6366f1',
            color: '#fff',
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            opacity: saving || !name.trim() ? 0.6 : 1,
          }}
        >
          <Plus size={16} />
          {t.termCreate ?? 'Yaratish'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#ef4444', fontSize: 13, padding: '0 4px' }}>{error}</div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          background: card,
          border: `1px solid ${brd}`,
          borderRadius: 16,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: hdr, borderBottom: `1px solid ${brd}`, position: 'sticky', top: 0 }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: muted, fontWeight: 600 }}>
                {t.termName ?? 'Nomi'}
              </th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: muted, fontWeight: 600 }}>
                {t.termCode ?? 'Kod'}
              </th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: muted, fontWeight: 600 }}>
                {t.termEmployee ?? 'Xodim'}
              </th>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: muted, fontWeight: 600 }}>
                {t.termStatus ?? 'Holat'}
              </th>
              <th style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} style={{ padding: 24, color: muted, textAlign: 'center' }}>
                  …
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 24, color: muted, textAlign: 'center' }}>
                  <CreditCard size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <div>{t.termEmpty ?? 'Terminal yo\'q'}</div>
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${brd}` }}>
                <td style={{ padding: '10px 12px', color: txt, fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: '10px 12px', color: muted }}>{r.code || '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <select
                    value={r.assignedDistributorId ?? ''}
                    onChange={(e) => void assign(r.id, e.target.value)}
                    style={{
                      height: 32,
                      borderRadius: 8,
                      border: `1px solid ${brd}`,
                      background: D ? '#111113' : '#fff',
                      color: txt,
                      maxWidth: 220,
                    }}
                  >
                    <option value="">—</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user?.fullName ?? d.user?.username ?? d.id}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '10px 12px', color: r.isActive ? '#22c55e' : muted }}>
                  {r.isActive ? (t.termActive ?? 'Aktiv') : (t.termInactive ?? 'O\'chirilgan')}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {r.isActive && (
                    <button
                      type="button"
                      title="Deactivate"
                      onClick={() => void deactivate(r.id)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: muted,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
