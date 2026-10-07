import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GitBranch, Search, Plus, Users, Edit2, Trash2, ChevronLeft, ChevronRight, X, AlertTriangle, Check, MapPin, ChevronDown } from 'lucide-react';
import { LINES } from '../../../data/adminData';
import { api, type Client, type Distributor } from '../../../api/client';
import { textMatchesSearch } from '../../../utils/clientApi';
import { useCompanies } from '../../CompaniesContext';
import { CompanyAvatar } from '../../CompanyAvatar';

interface Props {
  D: boolean;
  card: string;
  divider: string;
  sub: string;
  t: Record<string, string>;
  selectedCompanyIds: Set<string>;
}

type Line = {
  id: string | number;
  code: string;
  name: string;
  companyId?: string | null;
  kolTT: number;
  agent: string;
  delivery: string;
  agentVisitDays: number[];
  deliveryVisitDays: number[];
  plan: number;
  visits: number;
  sales: number;
};

type PersonOption = { id: string; name: string };

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

function dayLabel(day: number, t: Record<string, string>): string {
  const map: Record<number, string> = {
    1: t.dayMon ?? 'Du',
    2: t.dayTue ?? 'Se',
    3: t.dayWed ?? 'Chor',
    4: t.dayThu ?? 'Pay',
    5: t.dayFri ?? 'Ju',
    6: t.daySat ?? 'Sha',
    7: t.daySun ?? 'Yak',
  };
  return map[day] ?? String(day);
}

function formatVisitDays(days: number[], t: Record<string, string>): string {
  if (!days?.length) return '—';
  return [...days].sort((a, b) => a - b).map(d => dayLabel(d, t)).join(', ');
}

function hasApiToken(): boolean {
  return !!localStorage.getItem('api_access_token');
}

function isDeliveryPerson(d: Distributor): boolean {
  const p = (d.position ?? '').toLowerCase();
  const u = (d.user?.username ?? '').toLowerCase();
  return p.includes('delivery') || p.includes('yetkaz') || p.includes('kuryer')
    || p.includes('dostav') || p.includes('haydov')
    || u.includes('dostav');
}

function distributorName(d: Distributor): string {
  return d.user?.fullName?.trim() || d.user?.username || d.id;
}

function apiLineToRow(row: {
  id: string;
  code: string;
  name: string;
  agentName: string | null;
  deliveryName?: string | null;
  agentVisitDays?: number[] | null;
  deliveryVisitDays?: number[] | null;
  visitDays?: number[] | null;
  clientCount: number;
  companyId?: string | null;
}): Line {
  const agentDays = Array.isArray(row.agentVisitDays) && row.agentVisitDays.length
    ? row.agentVisitDays
    : (Array.isArray(row.visitDays) ? row.visitDays : []);
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    companyId: row.companyId ?? null,
    kolTT: row.clientCount,
    agent: row.agentName ?? '',
    delivery: row.deliveryName ?? '',
    agentVisitDays: agentDays,
    deliveryVisitDays: Array.isArray(row.deliveryVisitDays) ? row.deliveryVisitDays : [],
    plan: 0,
    visits: 0,
    sales: 0,
  };
}

const emptyForm = (): Omit<Line, 'id'> => ({
  code: '', name: '', kolTT: 0, agent: '', delivery: '',
  agentVisitDays: [], deliveryVisitDays: [], plan: 0, visits: 0, sales: 0,
});

/** Keyingi raqamli kod: 01, 02, 03… (nom emas) */
function nextNumericLineCode(existing: { code: string }[]): string {
  let max = 0;
  for (const row of existing) {
    const code = row.code?.trim() ?? '';
    if (!/^\d+$/.test(code)) continue;
    const n = parseInt(code, 10);
    if (n > max) max = n;
  }
  return String(max + 1).padStart(2, '0');
}

/** Raqamli kodni saqlaydi; aks holda yangi avto-kod beradi */
function resolveLineCode(code: string, existing: { code: string }[]): string {
  const trimmed = code.trim();
  if (/^\d+$/.test(trimmed)) {
    return trimmed.padStart(2, '0');
  }
  return nextNumericLineCode(existing);
}

const demoLines: Line[] = LINES.map(l => ({
  id: l.id,
  code: l.code,
  name: l.name,
  kolTT: l.kolTT,
  agent: l.agent,
  delivery: '',
  agentVisitDays: [],
  deliveryVisitDays: [],
  plan: l.plan,
  visits: l.visits,
  sales: l.sales,
}));

function SearchClearButton({ onClick, D, muted }: { onClick: () => void; D: boolean; muted: string }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={e => e.preventDefault()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Tozalash"
      style={{
        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        width: 22, height: 22, borderRadius: 6, border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        background: hover ? (D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : 'transparent',
      }}
    >
      <X size={14} color={muted} />
    </button>
  );
}

function DayChips({
  days,
  onChange,
  t,
  txt,
  muted,
  border,
  indigo,
}: {
  days: number[];
  onChange: (days: number[]) => void;
  t: Record<string, string>;
  txt: string;
  muted: string;
  border: string;
  indigo: string;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {WEEK_DAYS.map(day => {
        const on = days.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => onChange(
              on
                ? days.filter(d => d !== day)
                : [...days, day].sort((a, b) => a - b),
            )}
            style={{
              minWidth: 42, padding: '7px 8px', borderRadius: 8,
              border: `1.5px solid ${on ? indigo : border}`,
              background: on ? 'rgba(99,102,241,0.14)' : 'transparent',
              color: on ? indigo : txt,
              fontSize: 12, fontWeight: on ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {dayLabel(day, t)}
          </button>
        );
      })}
    </div>
  );
}

function LineSelect({
  value,
  options,
  placeholder,
  onChange,
  D,
  txt,
  muted,
  border,
  inpBg,
  indigo,
}: {
  value: string;
  options: PersonOption[];
  placeholder: string;
  onChange: (v: string) => void;
  D: boolean;
  txt: string;
  muted: string;
  border: string;
  inpBg: string;
  indigo: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const label = value || placeholder;

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          background: inpBg, border: `1.5px solid ${open ? indigo : border}`,
          borderRadius: 10, padding: '10px 12px',
          fontSize: 13, color: value ? txt : muted,
          cursor: 'pointer', textAlign: 'left', outline: 'none',
        }}
      >
        <span style={{
          flex: 1, minWidth: 0, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
        <ChevronDown
          size={14}
          color={muted}
          style={{ flexShrink: 0, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 40,
          background: D ? '#1e1e1e' : '#fff',
          border: `1px solid ${border}`,
          borderRadius: 10,
          boxShadow: D ? '0 12px 32px rgba(0,0,0,0.55)' : '0 12px 32px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          maxHeight: 220,
          overflowY: 'auto',
        }}>
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            style={{
              width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none',
              background: !value ? (D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)') : 'transparent',
              color: !value ? indigo : muted,
              fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => {
              if (value) e.currentTarget.style.background = D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = !value
                ? (D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)')
                : 'transparent';
            }}
          >
            {!value ? <Check size={12} color={indigo} /> : <span style={{ width: 12 }} />}
            {placeholder}
          </button>
          {options.map(opt => {
            const selected = value === opt.name;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onChange(opt.name); setOpen(false); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none',
                  background: selected ? (D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)') : 'transparent',
                  color: selected ? indigo : txt,
                  fontSize: 13, fontWeight: selected ? 600 : 400, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => {
                  if (!selected) e.currentTarget.style.background = D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = selected
                    ? (D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)')
                    : 'transparent';
                }}
              >
                {selected ? <Check size={12} color={indigo} /> : <span style={{ width: 12 }} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminLiniyaTab({ D, card, divider, sub, t, selectedCompanyIds }: Props) {
  const companyParam = [...selectedCompanyIds].sort().join(',') || undefined;
  const singleCompanyId = selectedCompanyIds.size === 1 ? [...selectedCompanyIds][0] : undefined;
  const showCompany = selectedCompanyIds.size > 1;
  const { companies } = useCompanies();
  const companyById = useMemo(() => new Map(companies.map(c => [c.id, c])), [companies]);
  const [lines, setLines]       = useState<Line[]>(demoLines);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [editLine, setEditLine] = useState<Line | null>(null);
  const [deleteLine, setDeleteLine] = useState<Line | null>(null);
  const [addMode, setAddMode]   = useState(false);
  const [form, setForm]         = useState<Omit<Line, 'id'>>(emptyForm());
  const [saved, setSaved]       = useState(false);
  const [agents, setAgents]     = useState<PersonOption[]>([]);
  const [deliveries, setDeliveries] = useState<PersonOption[]>([]);
  const [ttLine, setTtLine]     = useState<Line | null>(null);
  const [ttClients, setTtClients] = useState<Client[]>([]);
  const [ttLoading, setTtLoading] = useState(false);
  const [ttSearch, setTtSearch] = useState('');
  const [modalCompanyId, setModalCompanyId] = useState<string | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);
  const peopleRequestRef = useRef(0);
  const PER_PAGE = 12;

  const refreshLines = useCallback(async () => {
    if (!hasApiToken()) {
      setLines(demoLines);
      return;
    }
    setLoading(true);
    try {
      const rows = await api.getLines(companyParam);
      setLines(rows.map(apiLineToRow));
      setPage(1);
    } catch {
      setLines(demoLines);
    } finally {
      setLoading(false);
    }
  }, [companyParam]);

  /** Faqat liniya tashkilotining xodimlari — boshqa tashkilot agentini tanlab bo‘lmasin */
  const loadPeople = useCallback(async (companyId: string | undefined) => {
    const requestId = ++peopleRequestRef.current;
    setAgents([]);
    setDeliveries([]);
    if (!hasApiToken() || !companyId) return;
    try {
      const list = await api.getDistributors(companyId);
      if (requestId !== peopleRequestRef.current) return;
      const active = list.filter(d =>
        d.user?.isActive !== false
        && (d.companyId === companyId || (d.companyIds ?? []).includes(companyId)),
      );
      setAgents(
        active
          .filter(d => !isDeliveryPerson(d))
          .map(d => ({ id: d.id, name: distributorName(d) }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setDeliveries(
        active
          .filter(isDeliveryPerson)
          .map(d => ({ id: d.id, name: distributorName(d) }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch {
      if (requestId !== peopleRequestRef.current) return;
      setAgents([]);
      setDeliveries([]);
    }
  }, []);

  useEffect(() => { refreshLines(); }, [refreshLines]);

  const syncLineCode = async (
    personName: string,
    people: PersonOption[],
    lineCode: string,
    assignClients: boolean,
    companyId: string | null | undefined,
  ) => {
    const person = people.find(p => p.name === personName);
    if (!person) return;
    try {
      await api.updateDistributor(person.id, { lineCode });
      if (assignClients) {
        await api.assignLineDistributor(lineCode, person.id, companyId);
      }
    } catch {
      /* ignore — name on line is already saved */
    }
  };

  const filtered = lines.filter(l =>
    textMatchesSearch(l.name, search) ||
    textMatchesSearch(l.code, search) ||
    textMatchesSearch(l.agent, search) ||
    textMatchesSearch(l.delivery, search)
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalTT = lines.reduce((s, l) => s + l.kolTT, 0);

  const txt    = D ? '#f9fafb' : '#111827';
  const muted  = D ? '#6b7280' : '#9ca3af';
  const border = D ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const inpBg  = D ? '#1a1a1a' : '#f9fafb';
  const indigo = '#6366f1';
  const modalBg = D ? '#1c1c1e' : '#ffffff';
  const overlayBg = 'rgba(0,0,0,0.45)';

  const summaryText = useMemo(() =>
    (t.lineTotalSummary ?? 'Jami: {count} liniya · {tt} savdo nuqtasi')
      .replace('{count}', String(lines.length))
      .replace('{tt}', String(totalTT)),
  [t.lineTotalSummary, lines.length, totalTT]);

  const openEdit = (line: Line) => {
    const others = lines.filter(l => l.id !== line.id);
    setForm({
      code: resolveLineCode(line.code, others),
      name: line.name, kolTT: line.kolTT,
      agent: line.agent, delivery: line.delivery,
      agentVisitDays: [...(line.agentVisitDays ?? [])],
      deliveryVisitDays: [...(line.deliveryVisitDays ?? [])],
      plan: line.plan, visits: line.visits, sales: line.sales,
    });
    setEditLine(line);
    setSaveError(null);
    const cid = line.companyId ?? singleCompanyId;
    setModalCompanyId(cid);
    void loadPeople(cid);
  };

  const linesOfCompany = (companyId: string | undefined) =>
    companyId ? lines.filter(l => l.companyId === companyId) : lines;

  const openAdd = () => {
    setForm({ ...emptyForm(), code: nextNumericLineCode(linesOfCompany(singleCompanyId)) });
    setAddMode(true);
    setSaveError(null);
    setModalCompanyId(singleCompanyId);
    void loadPeople(singleCompanyId);
  };

  const chooseAddCompany = (companyId: string) => {
    setModalCompanyId(companyId);
    setForm(f => ({ ...f, agent: '', delivery: '', code: nextNumericLineCode(linesOfCompany(companyId)) }));
    void loadPeople(companyId);
  };

  const closeModal = () => {
    setEditLine(null);
    setAddMode(false);
    setSaveError(null);
  };

  const openTradePoints = async (line: Line) => {
    setTtLine(line);
    setTtSearch('');
    setTtClients([]);
    if (!hasApiToken()) return;
    setTtLoading(true);
    try {
      const rows = await api.getClients(line.companyId ?? singleCompanyId, undefined, line.code);
      setTtClients(rows);
      setLines(prev => prev.map(l =>
        l.id === line.id ? { ...l, kolTT: rows.length } : l,
      ));
    } catch {
      setTtClients([]);
    } finally {
      setTtLoading(false);
    }
  };

  const closeTradePoints = () => {
    setTtLine(null);
    setTtClients([]);
    setTtSearch('');
  };

  const saveEdit = async () => {
    const others = linesOfCompany(modalCompanyId).filter(l => l.id !== editLine?.id);
    const code = resolveLineCode(form.code, others);
    setSaveError(null);
    if (hasApiToken() && typeof editLine?.id === 'string') {
      try {
        const updated = await api.updateLine(editLine.id, {
          code,
          name: form.name,
          agentName: form.agent || null,
          deliveryName: form.delivery || null,
          agentVisitDays: form.agentVisitDays.length ? form.agentVisitDays : null,
          deliveryVisitDays: form.deliveryVisitDays.length ? form.deliveryVisitDays : null,
        });
        const lineCompanyId = updated.companyId ?? editLine.companyId ?? singleCompanyId;
        if (form.agent) await syncLineCode(form.agent, agents, code, true, lineCompanyId);
        if (form.delivery) await syncLineCode(form.delivery, deliveries, code, false, lineCompanyId);
        setLines(prev => prev.map(l => l.id === editLine.id ? apiLineToRow(updated) : l));
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : String(e));
        return;
      }
    } else {
      setLines(prev => prev.map(l => l.id === editLine!.id ? { ...l, ...form, code } : l));
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
    const code = form.code || nextNumericLineCode(linesOfCompany(modalCompanyId));
    setSaveError(null);
    if (hasApiToken()) {
      if (!modalCompanyId) {
        setSaveError(t.lineSelectCompany ?? 'Tashkilotni tanlang');
        return;
      }
      try {
        const created = await api.createLine({
          code,
          name: form.name,
          agentName: form.agent || undefined,
          deliveryName: form.delivery || undefined,
          agentVisitDays: form.agentVisitDays.length ? form.agentVisitDays : undefined,
          deliveryVisitDays: form.deliveryVisitDays.length ? form.deliveryVisitDays : undefined,
          companyId: modalCompanyId,
        });
        const lineCompanyId = created.companyId ?? modalCompanyId;
        if (form.agent) await syncLineCode(form.agent, agents, code, true, lineCompanyId);
        if (form.delivery) await syncLineCode(form.delivery, deliveries, code, false, lineCompanyId);
        setLines(prev => [...prev, apiLineToRow(created)]);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : String(e));
        return;
      }
    } else {
      const newLine: Line = { id: Date.now(), ...form, code };
      setLines(prev => [...prev, newLine]);
    }
    setAddMode(false);
    setForm(emptyForm());
  };

  const InputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    background: inpBg, border: `1.5px solid ${border}`,
    borderRadius: 10, padding: '10px 12px',
    fontSize: 13, color: txt, outline: 'none',
  };

  const isOpen = !!editLine || addMode;
  const noneLabel = t.lineSelectNone ?? '— tanlanmagan —';

  const agentOptions = useMemo(() => {
    if (!form.agent) return agents;
    if (agents.some(a => a.name === form.agent)) return agents;
    return [{ id: '_current_agent', name: form.agent }, ...agents];
  }, [agents, form.agent]);

  const deliveryOptions = useMemo(() => {
    if (!form.delivery) return deliveries;
    if (deliveries.some(d => d.name === form.delivery)) return deliveries;
    return [{ id: '_current_delivery', name: form.delivery }, ...deliveries];
  }, [deliveries, form.delivery]);

  const tableHeaders = [
    t.lineColCode ?? 'Kod',
    t.lineColName ?? 'Nomi',
    t.lineColTT ?? 'Savdo nuqtalari',
    t.lineColAgent ?? 'Agent',
    t.lineColDelivery ?? 'Dostavkachi',
    t.lineColAgentDays ?? 'Agent kunlari',
    t.lineColDeliveryDays ?? 'Dostavkachi kunlari',
    '',
  ];

  const filteredTtClients = useMemo(() => {
    if (!ttSearch.trim()) return ttClients;
    return ttClients.filter(c =>
      textMatchesSearch(c.name, ttSearch) ||
      textMatchesSearch(c.code, ttSearch) ||
      textMatchesSearch(c.address ?? '', ttSearch) ||
      textMatchesSearch(c.phone ?? '', ttSearch),
    );
  }, [ttClients, ttSearch]);

  return (
    <div style={{ padding: '0 0 32px' }}>

      {/* ── Backdrop / Modal ── */}
      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: overlayBg,
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={closeModal}>
          <div style={{
            background: modalBg, borderRadius: 18, padding: 28, width: 460, maxWidth: '92vw',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            border: `1px solid ${border}`,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: txt }}>
                  {editLine ? (t.lineEditTitle ?? 'Liniyani tahrirlash') : (t.lineNewTitle ?? 'Yangi liniya')}
                </div>
                {showCompany && editLine && modalCompanyId && companyById.get(modalCompanyId) && (() => {
                  const org = companyById.get(modalCompanyId)!;
                  return (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
                      padding: '3px 10px 3px 3px', borderRadius: 999,
                      background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)',
                      fontSize: 11, fontWeight: 700, color: indigo,
                    }}>
                      <CompanyAvatar icon={org.icon} imageUrl={org.imageUrl} shortName={org.shortName} size={18} rounded="full" />
                      {org.shortName}
                    </span>
                  );
                })()}
              </div>
              <button onClick={closeModal} style={{
                width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: D ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={14} color={muted} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {showCompany && addMode && (
                <div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 6, fontWeight: 600 }}>
                    {t.lineLabelCompany ?? 'TASHKILOT'} *
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[...selectedCompanyIds].map(id => companyById.get(id)).filter(Boolean).map(org => {
                      const active = modalCompanyId === org!.id;
                      return (
                        <button
                          key={org!.id}
                          type="button"
                          onClick={() => chooseAddCompany(org!.id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '5px 12px 5px 5px', borderRadius: 999, cursor: 'pointer',
                            border: `1.5px solid ${active ? indigo : border}`,
                            background: active ? 'rgba(99,102,241,0.12)' : inpBg,
                            color: active ? indigo : txt, fontSize: 12, fontWeight: 700,
                          }}
                        >
                          <CompanyAvatar icon={org!.icon} imageUrl={org!.imageUrl} shortName={org!.shortName} size={20} rounded="full" />
                          {org!.shortName}
                          {active && <Check size={13} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 5, fontWeight: 600 }}>
                    {t.lineLabelCode ?? 'KOD'}
                  </div>
                  <input
                    style={{
                      ...InputStyle,
                      opacity: 0.75,
                      cursor: 'default',
                      color: indigo,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                    value={form.code}
                    readOnly
                    tabIndex={-1}
                    title={t.lineCodeAuto ?? 'Kod avtomatik yaratiladi'}
                    placeholder={t.linePhCode ?? '01'}
                  />
                  <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>
                    {t.lineCodeAuto ?? 'Kod avtomatik yaratiladi'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 5, fontWeight: 600 }}>
                    {t.lineLabelTT ?? 'SAVDO NUQTALARI'}
                  </div>
                  <input style={InputStyle} type="number" value={form.kolTT}
                    onChange={e => setForm(f => ({ ...f, kolTT: Number(e.target.value) }))}
                    placeholder={t.linePhTT ?? '0'} readOnly={hasApiToken()} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: muted, marginBottom: 5, fontWeight: 600 }}>
                  {t.lineLabelName ?? 'NOMI'}
                </div>
                <input style={InputStyle} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={t.linePhName ?? 'Liniya nomi'} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: muted, marginBottom: 5, fontWeight: 600 }}>
                  {t.lineLabelAgent ?? 'AGENT'}
                </div>
                <LineSelect
                  value={form.agent}
                  options={agentOptions}
                  placeholder={noneLabel}
                  onChange={v => setForm(f => ({ ...f, agent: v }))}
                  D={D} txt={txt} muted={muted} border={border} inpBg={inpBg} indigo={indigo}
                />
                {hasApiToken() && agentOptions.length === 0 && (
                  <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>
                    {t.lineNoAgents ?? 'Agent topilmadi'}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, color: muted, marginBottom: 5, fontWeight: 600 }}>
                  {t.lineLabelDelivery ?? 'DOSTAVKACHI'}
                </div>
                <LineSelect
                  value={form.delivery}
                  options={deliveryOptions}
                  placeholder={noneLabel}
                  onChange={v => setForm(f => ({ ...f, delivery: v }))}
                  D={D} txt={txt} muted={muted} border={border} inpBg={inpBg} indigo={indigo}
                />
                {hasApiToken() && deliveryOptions.length === 0 && (
                  <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>
                    {t.lineNoDelivery ?? 'Dostavkachi topilmadi'}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, color: muted, marginBottom: 5, fontWeight: 600 }}>
                  {t.lineLabelAgentDays ?? 'AGENT KUNLARI'}
                </div>
                <div style={{ fontSize: 10, color: muted, marginBottom: 8 }}>
                  {t.lineAgentDaysHint ?? 'Agent qaysi kunlari boradi'}
                </div>
                <DayChips
                  days={form.agentVisitDays}
                  onChange={days => setForm(f => ({ ...f, agentVisitDays: days }))}
                  t={t} txt={txt} muted={muted} border={border} indigo={indigo}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: muted, marginBottom: 5, fontWeight: 600 }}>
                  {t.lineLabelDeliveryDays ?? 'DOSTAVKACHI KUNLARI'}
                </div>
                <div style={{ fontSize: 10, color: muted, marginBottom: 8 }}>
                  {t.lineDeliveryDaysHint ?? 'Dostavkachi qaysi kunlari boradi'}
                </div>
                <DayChips
                  days={form.deliveryVisitDays}
                  onChange={days => setForm(f => ({ ...f, deliveryVisitDays: days }))}
                  t={t} txt={txt} muted={muted} border={border} indigo={indigo}
                />
              </div>
            </div>

            {saveError && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 16,
                padding: '10px 12px', borderRadius: 10,
                background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444', fontSize: 12, fontWeight: 600,
              }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={closeModal} style={{
                flex: 1, padding: '11px 0', borderRadius: 10, border: `1px solid ${border}`,
                background: 'transparent', color: txt, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                {t.lineCancel ?? 'Bekor'}
              </button>
              <button onClick={editLine ? saveEdit : saveAdd} style={{
                flex: 2, padding: '11px 0', borderRadius: 10, border: 'none',
                background: saved ? '#10b981' : indigo,
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background .2s',
              }}>
                {saved
                  ? <><Check size={14} /> {t.lineSaved ?? 'Saqlandi!'}</>
                  : (t.lineSave ?? 'Saqlash')}
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
              {t.lineDeleteTitle ?? "Liniyani o'chirish"}
            </div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 24 }}>
              <b style={{ color: txt }}>{deleteLine.code} — {deleteLine.name}</b><br />
              {t.lineDeleteConfirm ?? "liniyasini o'chirmoqchimisiz?"}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteLine(null)} style={{
                flex: 1, padding: '11px 0', borderRadius: 10, border: `1px solid ${border}`,
                background: 'transparent', color: txt, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                {t.lineCancel ?? 'Bekor'}
              </button>
              <button onClick={confirmDelete} style={{
                flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
                background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                {t.lineDelete ?? "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Savdo nuqtalari ro'yxati ── */}
      {ttLine && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: overlayBg, backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={closeTradePoints}>
          <div style={{
            background: modalBg, borderRadius: 18, padding: 24, width: 560, maxWidth: '94vw',
            maxHeight: '84vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            border: `1px solid ${border}`,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: txt }}>
                  {t.lineTTModalTitle ?? 'Savdo nuqtalari'}
                </div>
                <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                  {ttLine.code} — {ttLine.name} · {filteredTtClients.length}
                </div>
              </div>
              <button onClick={closeTradePoints} style={{
                width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: D ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={14} color={muted} />
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={14} color={muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={ttSearch}
                onChange={e => setTtSearch(e.target.value)}
                placeholder={t.lineTTModalSearch ?? 'Savdo nuqtasini qidirish...'}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: inpBg, border: `1.5px solid ${border}`,
                  borderRadius: 10, padding: '10px 36px 10px 36px',
                  fontSize: 13, color: txt, outline: 'none',
                }}
              />
              {ttSearch && (
                <SearchClearButton onClick={() => setTtSearch('')} D={D} muted={muted} />
              )}
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '64px 1.2fr 1fr 100px',
              gap: 8, padding: '6px 10px', marginBottom: 4,
              borderRadius: 8,
              background: D ? 'rgba(255,255,255,0.04)' : '#f3f4f6',
            }}>
              {[t.lineTTColCode ?? 'Kod', t.lineTTColName ?? 'Nomi', t.lineTTColAddress ?? 'Manzil', t.lineTTColPhone ?? 'Telefon'].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {h}
                </span>
              ))}
            </div>

            <div style={{ overflowY: 'auto', flex: 1, minHeight: 120 }}>
              {ttLoading ? (
                <div style={{ padding: 28, textAlign: 'center', color: muted, fontSize: 13 }}>
                  {t.msgLoading ?? 'Yuklanmoqda...'}
                </div>
              ) : filteredTtClients.length === 0 ? (
                <div style={{
                  padding: 36, textAlign: 'center', color: muted, fontSize: 13,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}>
                  <MapPin size={22} color={muted} />
                  {t.lineTTModalEmpty ?? "Bu liniyada savdo nuqtasi yo'q"}
                </div>
              ) : filteredTtClients.map(c => (
                <div
                  key={c.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '64px 1.2fr 1fr 100px',
                    gap: 8, padding: '10px', borderRadius: 10,
                    borderBottom: `1px solid ${border}`,
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: indigo }}>{c.code}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 500, color: txt,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {c.name}
                  </span>
                  <span style={{
                    fontSize: 12, color: muted,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {c.address || '—'}
                  </span>
                  <span style={{ fontSize: 12, color: muted }}>{c.phone || '—'}</span>
                </div>
              ))}
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
            <div style={{ fontSize: 17, fontWeight: 700, color: txt }}>
              {t.lineTitle ?? 'Liniyalar'}
            </div>
            <div style={{ fontSize: 11, color: muted }}>{summaryText}</div>
          </div>
        </div>
        <button onClick={openAdd} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: indigo, color: '#fff', fontSize: 13, fontWeight: 600,
        }}>
          <Plus size={14} /> {t.lineAdd ?? "Liniya qo'shish"}
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: GitBranch, label: t.lineStatLines ?? 'Liniyalar', value: String(lines.length), clr: indigo },
          { icon: Users, label: t.lineStatTT ?? 'Savdo nuqtalari', value: String(totalTT), clr: '#10b981' },
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
          placeholder={t.lineSearchPh ?? 'Liniya yoki agent qidirish...'}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: inpBg, border: `1.5px solid ${border}`,
            borderRadius: 10, padding: '10px 36px 10px 36px',
            fontSize: 13, color: txt, outline: 'none',
          }}
          onFocus={e => { e.target.style.borderColor = indigo; }}
          onBlur={e => { e.target.style.borderColor = border; }}
        />
        {search && (
          <SearchClearButton
            onClick={() => { setSearch(''); setPage(1); }}
            D={D}
            muted={muted}
          />
        )}
      </div>

      {/* ── Table header ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '48px 1fr 64px 80px 80px 100px 100px 60px',
        gap: 8, padding: '8px 12px',
        borderRadius: 8,
        background: D ? 'rgba(255,255,255,0.04)' : '#f3f4f6',
        marginBottom: 6,
      }}>
        {tableHeaders.map((h, i) => (
          <span key={`${h}-${i}`} style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {h}
          </span>
        ))}
      </div>

      {/* ── Rows ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading && lines.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: muted, fontSize: 13 }}>
            {t.msgLoading ?? 'Yuklanmoqda...'}
          </div>
        ) : paginated.map(line => (
          <div
            key={line.id}
            style={{
              display: 'grid', gridTemplateColumns: '48px 1fr 64px 80px 80px 100px 100px 60px',
              gap: 8, padding: '10px 12px', borderRadius: 10,
              border: `1px solid transparent`,
              cursor: 'pointer', alignItems: 'center', transition: 'all .12s',
            }}
            className={D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = border; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'rgba(99,102,241,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: indigo }}>{line.code}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{
                fontSize: 13, fontWeight: 500, color: txt,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {line.name}
              </span>
              {showCompany && (() => {
                const org = line.companyId ? companyById.get(line.companyId) : undefined;
                if (!org) return null;
                return (
                  <span
                    title={org.name}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
                      padding: '2px 8px 2px 3px', borderRadius: 999,
                      background: D ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                      border: `1px solid ${border}`,
                      fontSize: 10, fontWeight: 600, color: D ? '#d1d5db' : '#4b5563',
                    }}
                  >
                    <CompanyAvatar icon={org.icon} imageUrl={org.imageUrl} shortName={org.shortName} size={16} rounded="full" />
                    {org.shortName}
                  </span>
                );
              })()}
            </div>

            <button
              type="button"
              onClick={e => { e.stopPropagation(); void openTradePoints(line); }}
              style={{
                fontSize: 13, fontWeight: 700, color: indigo,
                background: 'rgba(99,102,241,0.10)',
                border: 'none', borderRadius: 8,
                padding: '4px 10px', cursor: 'pointer',
                justifySelf: 'start',
                transition: 'background .15s',
              }}
              title={t.lineTTModalTitle ?? 'Savdo nuqtalari'}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.10)'; }}
            >
              {line.kolTT}
            </button>

            <div style={{
              fontSize: 11, color: muted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {line.agent ? line.agent.split(' ')[0] : '—'}
            </div>

            <div style={{
              fontSize: 11, color: muted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {line.delivery ? line.delivery.split(' ')[0] : '—'}
            </div>

            <div style={{
              fontSize: 11, color: line.agentVisitDays.length ? txt : muted,
              fontWeight: line.agentVisitDays.length ? 600 : 400,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {formatVisitDays(line.agentVisitDays, t)}
            </div>

            <div style={{
              fontSize: 11, color: line.deliveryVisitDays.length ? txt : muted,
              fontWeight: line.deliveryVisitDays.length ? 600 : 400,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {formatVisitDays(line.deliveryVisitDays, t)}
            </div>

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
