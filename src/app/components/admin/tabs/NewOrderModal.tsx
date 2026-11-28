import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X, Phone, ChevronDown, Trash2, RefreshCw,
  Package, Tag, FolderOpen, ArrowRight, Zap, Save,
  Search, Building2, User, Layers, Warehouse, FileText,
  Maximize2, Minimize2, Plus, Minus, ChevronRight, Loader2,
} from 'lucide-react';
import { api, type Client, type Distributor } from '../../../api/client';
import { isAgentStaff } from '../../../utils/positionsStore';

interface Props {
  D: boolean;
  divider: string;
  sub: string;
  t: Record<string, string>;
  onClose: () => void;
  companyId?: string;
  onSaved?: () => void;
}

type CatalogProduct = {
  id: string;
  code: string;
  name: string;
  cena: number;
  qoldiq: number;
  ed: string;
  kategory: string;
};

type Row = {
  id: string;
  prodId: string;
  code: string;
  name: string;
  cena: number;
  qoldiq: number;
  qty: number;
  skidka: number;
  ed: string;
  summa: number;
};

type SelectOpt = { value: string; label: string; meta?: string };

const fmt = (n: number) => n.toLocaleString('uz-UZ');
const fmtQ = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmtDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}` +
  ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const calcSumma = (qty: number, cena: number, skidka: number) =>
  Math.round(qty * cena * (1 - skidka / 100));

/** Tizim uslubidagi custom dropdown (native <select> o‘rniga) */
function OrderSelect({
  value,
  options,
  onChange,
  D,
  placeholder,
  disabled,
  searchable,
}: {
  value: string;
  options: SelectOpt[];
  onChange: (v: string) => void;
  D: boolean;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const selected = options.find(o => o.value === value);
  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const qq = q.toLowerCase();
    return options.filter(
      o =>
        o.label.toLowerCase().includes(qq) ||
        (o.meta ?? '').toLowerCase().includes(qq),
    );
  }, [options, q]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen(o => !o);
          setQ('');
        }}
        className={`w-full flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border outline-none transition-colors text-left
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
          ${open
            ? D
              ? 'bg-[#1c1c1e] border-indigo-500 text-gray-200'
              : 'bg-white border-indigo-400 text-gray-800'
            : D
              ? 'bg-[#1c1c1e] border-gray-700 text-gray-200 hover:border-gray-600'
              : 'bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300'
          }`}
      >
        <span className={`flex-1 min-w-0 truncate ${!selected ? (D ? 'text-gray-600' : 'text-gray-400') : ''}`}>
          {selected ? (
            <>
              {selected.label}
              {selected.meta ? (
                <span className={`ml-1.5 ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                  {selected.meta}
                </span>
              ) : null}
            </>
          ) : (
            placeholder || '—'
          )}
        </span>
        <ChevronDown
          size={11}
          className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${D ? 'text-gray-500' : 'text-gray-400'}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[10001]" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-[calc(100%+4px)] left-0 right-0 z-[10002] rounded-xl overflow-hidden shadow-xl border
              ${D ? 'bg-[#1c1c1e] border-indigo-500/60' : 'bg-white border-indigo-300'}`}
          >
            {(searchable || options.length > 6) && (
              <div className={`px-2 py-1.5 border-b ${D ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg
                  ${D ? 'bg-[#0d0d0d]' : 'bg-gray-50'}`}>
                  <Search size={11} className={D ? 'text-gray-500' : 'text-gray-400'} />
                  <input
                    autoFocus
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Qidirish..."
                    className={`flex-1 bg-transparent outline-none text-xs
                      ${D ? 'text-gray-200 placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`}
                  />
                </div>
              </div>
            )}
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 && (
                <div className={`px-3 py-3 text-xs ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                  Topilmadi
                </div>
              )}
              {filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQ('');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2
                    ${opt.value === value
                      ? D
                        ? 'bg-indigo-600/20 text-indigo-300'
                        : 'bg-indigo-50 text-indigo-700'
                      : D
                        ? 'text-gray-300 hover:bg-gray-800/60'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                  {opt.meta && (
                    <span className={`flex-shrink-0 text-[10px] font-semibold tabular-nums
                      ${D ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      {opt.meta}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function NewOrderModal({ D, divider, sub, t, onClose, companyId, onSaved }: Props) {
  const [sana] = useState(fmtDate(new Date()));
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [kategoriya, setKat] = useState('');
  const [sklad, setSklad] = useState('');
  const [izoh, setIzoh] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [showOstatok, setShowOstatok] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');

  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<Distributor[]>([]);
  const [agentOrderCounts, setAgentOrderCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerKat, setPickerKat] = useState('');

  const clientRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node))
        setShowClientDrop(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (showPicker) setTimeout(() => searchRef.current?.focus(), 80);
  }, [showPicker]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const [clientsRaw, distsRaw, catsRaw, productsRaw, companiesRaw, ordersRaw] =
        await Promise.all([
          api.getClients(companyId),
          api.getDistributors(companyId),
          api.getProductCategories(companyId),
          api.getProducts(undefined, companyId),
          api.getCompanies(),
          api.getOrders(companyId).catch(() => []),
        ]);

      const agentList = (distsRaw || []).filter(d =>
        isAgentStaff(d.position, d.user?.username),
      );
      setAgents(agentList);

      const counts: Record<string, number> = {};
      for (const o of ordersRaw || []) {
        if (o.distributorId) counts[o.distributorId] = (counts[o.distributorId] || 0) + 1;
      }
      setAgentOrderCounts(counts);

      setClients((clientsRaw || []).filter(c => c.isActive !== false));

      const cats = (catsRaw || [])
        .map(c => c.category)
        .filter((c): c is string => !!c && c.trim().length > 0);
      setCategories(cats);
      setKat(prev => prev || cats[0] || '');

      const whSet = new Set<string>();
      for (const c of companiesRaw || []) {
        if (companyId && c.id !== companyId) continue;
        const wh = (c.warehouseName || '').trim();
        if (wh) whSet.add(wh);
        else if (c.name) whSet.add(`Sklad ${c.name}`);
      }
      const whArr = [...whSet];
      setWarehouses(whArr.length ? whArr : ['Asosiy Sklad']);
      setSklad(prev => prev || whArr[0] || 'Asosiy Sklad');

      setProducts(
        (productsRaw || []).map(p => ({
          id: p.id,
          code: p.code || '',
          name: p.name,
          cena: Number(p.price) || 0,
          qoldiq: Number(p.stockBalance) || 0,
          ed: p.unit || 'dona',
          kategory: p.category || '',
        })),
      );
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Yuklash xatosi');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedClient = useMemo(
    () => clients.find(c => c.id === clientId) || null,
    [clients, clientId],
  );

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients.slice(0, 80);
    return clients
      .filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          (c.code || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [clients, clientSearch]);

  const agentOptions: SelectOpt[] = useMemo(
    () =>
      agents.map(a => ({
        value: a.id,
        label: a.user?.fullName || a.user?.username || a.id.slice(0, 8),
        meta: `${agentOrderCounts[a.id] ?? 0}`,
      })),
    [agents, agentOrderCounts],
  );

  const catOptions: SelectOpt[] = useMemo(
    () => categories.map(c => ({ value: c, label: c })),
    [categories],
  );

  const skladOptions: SelectOpt[] = useMemo(
    () => warehouses.map(w => ({ value: w, label: w })),
    [warehouses],
  );

  const filteredProducts = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const activeKat = pickerKat || kategoriya;
    return products.filter(p => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q);
      const matchKat =
        !activeKat || !p.kategory || p.kategory === activeKat;
      return matchSearch && matchKat;
    });
  }, [products, pickerSearch, pickerKat, kategoriya]);

  const getRowQty = (prodId: string) => rows.find(r => r.prodId === prodId)?.qty ?? 0;

  const addOrIncrProduct = (p: CatalogProduct) => {
    setRows(prev => {
      const exist = prev.find(r => r.prodId === p.id);
      if (exist) {
        return prev.map(r =>
          r.prodId === p.id
            ? { ...r, qty: r.qty + 1, summa: calcSumma(r.qty + 1, r.cena, r.skidka) }
            : r,
        );
      }
      return [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          prodId: p.id,
          code: p.code,
          name: p.name,
          cena: p.cena,
          qoldiq: p.qoldiq,
          qty: 1,
          skidka: 0,
          ed: p.ed,
          summa: calcSumma(1, p.cena, 0),
        },
      ];
    });
  };

  const decrProduct = (prodId: string) => {
    setRows(prev => {
      const exist = prev.find(r => r.prodId === prodId);
      if (!exist) return prev;
      if (exist.qty <= 1) return prev.filter(r => r.prodId !== prodId);
      return prev.map(r =>
        r.prodId === prodId
          ? { ...r, qty: r.qty - 1, summa: calcSumma(r.qty - 1, r.cena, r.skidka) }
          : r,
      );
    });
  };

  const updateRowQty = (id: string, val: number) => {
    const q = Math.max(0, Math.min(1100, val));
    setRows(prev =>
      q === 0
        ? prev.filter(r => r.id !== id)
        : prev.map(r => (r.id === id ? { ...r, qty: q, summa: calcSumma(q, r.cena, r.skidka) } : r)),
    );
  };

  const updateRowSkidka = (id: string, val: number) => {
    const s = Math.min(100, Math.max(0, val));
    setRows(prev =>
      prev.map(r =>
        r.id === id ? { ...r, skidka: s, summa: calcSumma(r.qty, r.cena, s) } : r,
      ),
    );
  };

  const deleteRow = (id: string) => setRows(r => r.filter(x => x.id !== id));
  const clearAll = () => setRows([]);

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalSum = rows.reduce((s, r) => s + r.summa, 0);
  const totalKg = rows.reduce((s, r) => {
    const u = (r.ed || '').toLowerCase();
    if (u.includes('kg') || u.includes('кг')) return s + r.qty;
    return s;
  }, 0);

  const selectClient = (c: Client) => {
    setClientId(c.id);
    setClientSearch('');
    setShowClientDrop(false);
    if (c.distributorId && agents.some(a => a.id === c.distributorId)) {
      setAgentId(c.distributorId);
    }
  };

  const handleSave = async () => {
    setSaveErr('');
    if (!clientId) {
      setSaveErr(t.noKlientPh || 'Klient tanlang');
      return;
    }
    if (!agentId) {
      setSaveErr(t.noAgentPh || 'Agent tanlang');
      return;
    }
    if (rows.length === 0) {
      setSaveErr(t.noEmpty || 'Tovar qo‘shing');
      return;
    }
    setSaving(true);
    try {
      await api.createOrderAdmin({
        distributorId: agentId,
        clientId,
        items: rows.map(r => ({
          productId: r.prodId,
          productCode: r.code || r.prodId,
          productName: r.name,
          quantity: r.qty,
          price: r.skidka > 0 ? calcSumma(1, r.cena, r.skidka) : r.cena,
          unit: r.ed,
        })),
      });
      try {
        window.dispatchEvent(new CustomEvent('lider:order-created'));
      } catch { /* ignore */ }
      setSaved(true);
      onSaved?.();
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 700);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Saqlash xatosi');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors
    ${D
      ? 'bg-[#1c1c1e] border-gray-700 text-gray-200 placeholder-gray-600 focus:border-indigo-500'
      : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-indigo-400'}`;
  const labelCls = `flex items-center gap-1 text-[10px] font-semibold mb-1 ${D ? 'text-gray-500' : 'text-gray-400'}`;
  const gridCols = '28px 1fr 88px 68px 52px 36px 74px 22px';

  const orderNo =
    selectedClient?.code ||
    (clientId ? clientId.slice(0, 6).toUpperCase() : '——');

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col sm:items-end sm:justify-end md:items-center md:justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`
          relative flex flex-col transition-all duration-300
          ${fullscreen
            ? 'w-full h-full'
            : 'w-full h-[92dvh] sm:h-[88dvh] sm:rounded-t-3xl md:h-auto md:max-h-[90dvh] md:max-w-3xl md:rounded-2xl md:mx-4 lg:max-w-4xl'}
          overflow-hidden shadow-2xl
          ${D
            ? 'bg-[#0d0d0d] sm:border-t border-gray-700/60 md:border'
            : 'bg-white sm:border-t border-gray-200 md:border'}
        `}
        style={{ animation: 'orderSlide .24s cubic-bezier(.32,1.2,.56,1)' }}
      >
        {/* Header */}
        <div
          className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b ${divider}
          ${D ? 'bg-[#161618]' : 'bg-gray-50/80'}`}
        >
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0
            ${D ? 'bg-indigo-600/25 ring-1 ring-indigo-500/30' : 'bg-indigo-100'}`}
          >
            <Phone size={15} className={D ? 'text-indigo-400' : 'text-indigo-600'} />
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold leading-tight ${D ? 'text-gray-100' : 'text-gray-800'}`}>
              {t.noTitle}
            </p>
            <p className={`text-[10px] font-mono ${sub}`}>
              {t.noZayvka}
              {orderNo}
            </p>
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => void loadData()}
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 mr-1
              ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
            title="Yangilash"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setFullscreen(f => !f)}
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 mr-1
              ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors flex-shrink-0
              ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
          >
            <X size={14} />
          </button>
        </div>

        {loading && (
          <div className={`flex items-center justify-center gap-2 py-16 ${sub}`}>
            <Loader2 size={18} className="animate-spin" />
            <span className="text-xs">Yuklanmoqda...</span>
          </div>
        )}

        {!!loadErr && !loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-4">
            <p className="text-xs text-rose-400 text-center">{loadErr}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
            >
              Qayta urinish
            </button>
          </div>
        )}

        {!loading && !loadErr && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overscroll-contain">
              {/* Fields */}
              <div className={`px-4 py-3 border-b ${divider}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className={labelCls}>
                      <FileText size={10} /> {t.noSana}
                    </p>
                    <input value={sana} readOnly className={`${inputCls} cursor-default font-mono`} />
                  </div>
                  <div ref={clientRef}>
                    <p className={labelCls}>
                      <Building2 size={10} /> {t.noKlient}
                      {selectedClient?.code ? (
                        <span
                          className={`ml-1 font-mono font-bold ${D ? 'text-indigo-400' : 'text-indigo-600'}`}
                        >
                          #{selectedClient.code}
                        </span>
                      ) : null}
                    </p>
                    <div className="relative">
                      <div
                        className={`flex items-center rounded-xl border overflow-hidden transition-colors
                        ${showClientDrop
                          ? D
                            ? 'border-indigo-500'
                            : 'border-indigo-400'
                          : D
                            ? 'border-gray-700'
                            : 'border-gray-200'
                        }`}
                      >
                        <input
                          value={
                            selectedClient
                              ? `${selectedClient.name}${selectedClient.code ? ` (${selectedClient.code})` : ''}`
                              : clientSearch
                          }
                          onChange={e => {
                            setClientSearch(e.target.value);
                            setClientId('');
                            setShowClientDrop(true);
                          }}
                          onFocus={() => setShowClientDrop(true)}
                          placeholder={t.noKlientPh}
                          className={`flex-1 px-3 py-2 text-xs outline-none bg-transparent
                            ${D ? 'text-gray-200 placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`}
                        />
                        <span
                          className={`px-2 text-[10px] font-bold cursor-pointer
                            ${D ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                          onClick={() => setShowClientDrop(s => !s)}
                        >
                          ···
                        </span>
                      </div>
                      {showClientDrop && (
                        <div
                          className={`absolute top-full left-0 right-0 mt-1 z-20 rounded-xl overflow-hidden shadow-xl border max-h-56 overflow-y-auto
                          ${D ? 'bg-[#1c1c1e] border-gray-700' : 'bg-white border-gray-200'}`}
                        >
                          {filteredClients.length === 0 && (
                            <div className={`px-3 py-3 text-xs ${sub}`}>Topilmadi</div>
                          )}
                          {filteredClients.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => selectClient(c)}
                              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2
                                ${D ? 'hover:bg-gray-700/60 text-gray-300' : 'hover:bg-indigo-50 text-gray-700'}`}
                            >
                              <span className="flex-1 min-w-0 truncate">{c.name}</span>
                              {c.code && (
                                <span
                                  className={`flex-shrink-0 font-mono text-[10px] ${D ? 'text-indigo-400' : 'text-indigo-600'}`}
                                >
                                  {c.code}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className={labelCls}>
                      <User size={10} /> {t.noAgent}
                    </p>
                    <OrderSelect
                      value={agentId}
                      options={agentOptions}
                      onChange={setAgentId}
                      D={D}
                      placeholder={t.noAgentPh}
                      searchable
                    />
                  </div>
                  <div>
                    <p className={labelCls}>
                      <Layers size={10} /> {t.noKategoriya}
                    </p>
                    <OrderSelect
                      value={kategoriya}
                      options={catOptions}
                      onChange={v => {
                        setKat(v);
                        setPickerKat('');
                      }}
                      D={D}
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <p className={labelCls}>
                      <Warehouse size={10} /> {t.noSklad}
                    </p>
                    <OrderSelect
                      value={sklad}
                      options={skladOptions}
                      onChange={setSklad}
                      D={D}
                      placeholder="—"
                    />
                  </div>
                </div>

                <div>
                  <p className={labelCls}>
                    <FileText size={10} /> {t.noIzoh}
                  </p>
                  <input
                    value={izoh}
                    onChange={e => setIzoh(e.target.value)}
                    placeholder={t.noIzohPh}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Toolbar */}
              <div className={`px-3 py-2.5 border-b ${divider} flex flex-wrap gap-1.5`}>
                <button
                  type="button"
                  onClick={() => setShowPicker(s => !s)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all border
                    ${showPicker
                      ? D
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-600/50'
                        : 'bg-indigo-100 text-indigo-600 border-indigo-300'
                      : D
                        ? 'bg-[#1c1c1e] hover:bg-gray-800 text-gray-300 border-gray-700/50'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200'
                    }`}
                >
                  <Tag size={11} />
                  <span>{t.noTovar}</span>
                  {rows.length > 0 && (
                    <span
                      className={`ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center
                      ${D ? 'bg-indigo-600/40 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}
                    >
                      {rows.length}
                    </span>
                  )}
                  <ChevronRight
                    size={10}
                    className={`transition-transform ${showPicker ? 'rotate-90' : ''}`}
                  />
                </button>

                {(
                  [
                    { icon: FolderOpen, label: t.noGuruh, action: undefined, danger: false, active: false },
                    { icon: ArrowRight, label: t.noYonalish, action: undefined, danger: false, active: false },
                    { icon: Zap, label: t.noAksiya, action: undefined, danger: false, active: false },
                    { icon: Trash2, label: t.noOchir, action: clearAll, danger: true, active: false },
                    {
                      icon: RefreshCw,
                      label: t.noOstatok,
                      action: () => setShowOstatok(s => !s),
                      danger: false,
                      active: showOstatok,
                    },
                  ] as const
                ).map(btn => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={btn.action as (() => void) | undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all border
                      ${btn.danger
                        ? D
                          ? 'bg-rose-900/25 hover:bg-rose-900/40 text-rose-400 border-rose-800/30'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-500 border-rose-200'
                        : btn.active
                          ? D
                            ? 'bg-emerald-900/25 text-emerald-400 border-emerald-800/30'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : D
                            ? 'bg-[#1c1c1e] hover:bg-gray-800 text-gray-300 border-gray-700/50'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200'
                      }`}
                  >
                    <btn.icon size={11} />
                    <span>{btn.label}</span>
                  </button>
                ))}
              </div>

              {/* Product table */}
              <div className="flex-1">
                <div
                  className={`hidden sm:grid items-center px-3 py-2 border-b ${divider} ${D ? 'bg-[#161618]' : 'bg-gray-50'}`}
                  style={{ gridTemplateColumns: gridCols }}
                >
                  <span className={`text-[10px] font-semibold ${sub}`}>№</span>
                  <span className={`text-[10px] font-semibold ${sub}`}>{t.noTovar}</span>
                  <span
                    className={`text-[10px] font-semibold text-center ${D ? 'text-indigo-400' : 'text-indigo-600'}`}
                  >
                    {t.noKolvo}
                  </span>
                  <span className={`text-[10px] font-semibold text-right pr-1 ${sub}`}>{t.noNarx}</span>
                  <span
                    className={`text-[10px] font-semibold text-center ${D ? 'text-amber-400' : 'text-amber-600'}`}
                  >
                    {t.noSkidka}
                  </span>
                  <span className={`text-[10px] font-semibold text-center ${sub}`}>{t.noEd}</span>
                  <span className={`text-[10px] font-semibold text-right pr-1 ${sub}`}>{t.noSumma}</span>
                  <span />
                </div>

                {rows.length === 0 && (
                  <div className={`flex flex-col items-center justify-center py-12 gap-3 ${sub}`}>
                    <Package size={36} className="opacity-20" />
                    <span className="text-xs">{t.noEmpty}</span>
                    <button
                      type="button"
                      onClick={() => setShowPicker(true)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all
                        ${D
                          ? 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-700/40'
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
                        }`}
                    >
                      <Plus size={13} /> {t.noAddBtn}
                    </button>
                  </div>
                )}

                {rows.map((r, i) => (
                  <div
                    key={r.id}
                    className={`hidden sm:grid items-center px-3 border-b text-xs transition-colors ${divider}
                      ${D ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50/80'}`}
                    style={{ gridTemplateColumns: gridCols, minHeight: 40 }}
                  >
                    <span className={`font-mono text-[11px] ${sub}`}>{i + 1}</span>
                    <span className={`text-[11px] truncate pr-2 ${D ? 'text-gray-200' : 'text-gray-700'}`}>
                      {r.name}
                    </span>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateRowQty(r.id, r.qty - 1)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors
                          ${D ? 'bg-gray-800 hover:bg-rose-900/50 text-rose-400' : 'bg-gray-100 hover:bg-rose-50 text-rose-500'}`}
                      >
                        <Minus size={9} />
                      </button>
                      <input
                        type="number"
                        value={r.qty}
                        min={1}
                        max={1100}
                        onChange={e => updateRowQty(r.id, Number(e.target.value))}
                        className={`w-8 text-center text-[11px] font-semibold bg-transparent outline-none border-b
                          ${D ? 'text-indigo-300 border-gray-700' : 'text-indigo-600 border-gray-300'}`}
                      />
                      <button
                        type="button"
                        onClick={() => updateRowQty(r.id, r.qty + 1)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors
                          ${D ? 'bg-gray-800 hover:bg-emerald-900/50 text-emerald-400' : 'bg-gray-100 hover:bg-emerald-50 text-emerald-600'}`}
                      >
                        <Plus size={9} />
                      </button>
                    </div>
                    <span className={`text-right pr-1 text-[11px] ${sub}`}>{fmt(r.cena)}</span>
                    <div className="flex items-center justify-center">
                      <input
                        type="number"
                        value={r.skidka || ''}
                        min={0}
                        max={100}
                        placeholder="0"
                        onChange={e => updateRowSkidka(r.id, Number(e.target.value))}
                        className={`w-10 text-center text-[11px] bg-transparent outline-none border-b
                          ${r.skidka > 0
                            ? D
                              ? 'text-amber-400 border-amber-700'
                              : 'text-amber-600 border-amber-400'
                            : D
                              ? 'text-gray-500 border-gray-700'
                              : 'text-gray-400 border-gray-300'
                          }`}
                      />
                      <span className={`text-[9px] ml-0.5 ${sub}`}>%</span>
                    </div>
                    <span className={`text-center text-[11px] ${sub}`}>{r.ed}</span>
                    <span
                      className={`text-right pr-1 font-semibold text-[11px]
                      ${D ? 'text-indigo-400' : 'text-indigo-600'}`}
                    >
                      {fmt(r.summa)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteRow(r.id)}
                      className={`w-5 h-5 flex items-center justify-center rounded-lg transition-colors
                        ${D ? 'text-gray-600 hover:text-rose-400 hover:bg-rose-900/30' : 'text-gray-300 hover:text-rose-500 hover:bg-rose-50'}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}

                {rows.map((r, i) => (
                  <div
                    key={`m-${r.id}`}
                    className={`sm:hidden px-3 py-2.5 border-b ${divider} ${D ? 'bg-[#0d0d0d]' : 'bg-white'}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-[10px] font-mono mt-0.5 w-5 flex-shrink-0 ${sub}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs truncate mb-1.5 ${D ? 'text-gray-200' : 'text-gray-800'}`}>
                          {r.name}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateRowQty(r.id, r.qty - 1)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center
                                ${D ? 'bg-gray-800 text-rose-400' : 'bg-gray-100 text-rose-500'}`}
                            >
                              <Minus size={10} />
                            </button>
                            <span
                              className={`text-xs font-semibold min-w-[20px] text-center ${D ? 'text-indigo-300' : 'text-indigo-600'}`}
                            >
                              {r.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateRowQty(r.id, r.qty + 1)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center
                                ${D ? 'bg-gray-800 text-emerald-400' : 'bg-gray-100 text-emerald-600'}`}
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                          <span className={`text-[10px] ${sub}`}>{r.ed}</span>
                          <span className={`text-[10px] ${sub}`}>× {fmt(r.cena)}</span>
                          <span
                            className={`text-[10px] font-semibold ml-auto ${D ? 'text-indigo-400' : 'text-indigo-600'}`}
                          >
                            {fmt(r.summa)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteRow(r.id)}
                        className={`mt-0.5 w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0
                          ${D ? 'text-gray-600 hover:text-rose-400' : 'text-gray-300 hover:text-rose-500'}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {rows.length > 0 && (
                  <div
                    className={`flex items-center justify-between px-3 py-2.5 border-t ${divider}
                    ${D ? 'bg-[#161618]' : 'bg-gray-50'}`}
                  >
                    <span className={`text-[11px] font-semibold ${sub}`}>
                      {t.noJami}{' '}
                      <span className={D ? 'text-gray-200' : 'text-gray-700'}>
                        {rows.length} {t.noTovarCount}
                      </span>
                      <span className={`ml-2 ${sub}`}>
                        / {totalQty} {t.noDona}
                      </span>
                      {totalKg > 0 && (
                        <span className={`ml-2 ${D ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          / {fmtQ(totalKg)} kg
                        </span>
                      )}
                    </span>
                    <span className={`text-sm font-bold ${D ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      {fmt(totalSum)} {t.taroziSomUnit}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Product picker */}
            <div
              className={`flex-shrink-0 flex flex-col border-l transition-all duration-300 overflow-hidden
                ${showPicker ? 'w-full sm:w-72' : 'w-0'}
                ${D ? 'border-gray-700/60 bg-[#0d0d0d]' : 'border-gray-200 bg-gray-50/50'}`}
            >
              {showPicker && (
                <>
                  <div
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b ${divider}
                    ${D ? 'bg-[#161618]' : 'bg-white'}`}
                  >
                    <Tag size={12} className={D ? 'text-indigo-400' : 'text-indigo-500'} />
                    <span className={`text-xs font-semibold flex-1 ${D ? 'text-gray-200' : 'text-gray-700'}`}>
                      {t.noPickerTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPicker(false)}
                      className={`w-6 h-6 flex items-center justify-center rounded-lg
                        ${D ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <X size={12} />
                    </button>
                  </div>

                  <div className={`flex-shrink-0 px-3 pt-2.5 pb-2 border-b ${divider}`}>
                    <div
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border
                      ${D ? 'bg-[#1c1c1e] border-gray-700' : 'bg-white border-gray-200'}`}
                    >
                      <Search size={12} className={D ? 'text-gray-500' : 'text-gray-400'} />
                      <input
                        ref={searchRef}
                        value={pickerSearch}
                        onChange={e => setPickerSearch(e.target.value)}
                        placeholder={t.noPickerSearch}
                        className={`flex-1 text-xs bg-transparent outline-none
                          ${D ? 'text-gray-200 placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`}
                      />
                      {pickerSearch && (
                        <button
                          type="button"
                          onClick={() => setPickerSearch('')}
                          className={D ? 'text-gray-600 hover:text-gray-400' : 'text-gray-300 hover:text-gray-500'}
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {['', ...categories].map(k => (
                        <button
                          key={k || 'all'}
                          type="button"
                          onClick={() => setPickerKat(k)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border
                            ${pickerKat === k
                              ? D
                                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-600/50'
                                : 'bg-indigo-100 text-indigo-600 border-indigo-300'
                              : D
                                ? 'bg-transparent text-gray-500 border-gray-700/50 hover:border-gray-600'
                                : 'bg-transparent text-gray-400 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          {k || t.noPickerAll}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto overscroll-contain">
                    {filteredProducts.length === 0 && (
                      <div className={`flex flex-col items-center justify-center py-10 gap-2 ${sub}`}>
                        <Search size={24} className="opacity-20" />
                        <span className="text-xs">{t.noPickerEmpty}</span>
                      </div>
                    )}
                    {filteredProducts.map(p => {
                      const qty = getRowQty(p.id);
                      const inOrder = qty > 0;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center gap-2 px-3 py-2.5 border-b transition-colors cursor-pointer
                            ${divider}
                            ${inOrder
                              ? D
                                ? 'bg-indigo-950/40'
                                : 'bg-indigo-50/80'
                              : D
                                ? 'hover:bg-gray-800/40'
                                : 'hover:bg-gray-100/60'
                            }`}
                          onClick={() => addOrIncrProduct(p)}
                        >
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-[11px] leading-tight truncate font-medium
                              ${inOrder
                                ? D
                                  ? 'text-indigo-200'
                                  : 'text-indigo-700'
                                : D
                                  ? 'text-gray-200'
                                  : 'text-gray-700'
                              }`}
                            >
                              {p.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`text-[10px] font-semibold ${D ? 'text-indigo-400' : 'text-indigo-600'}`}
                              >
                                {fmt(p.cena)}
                              </span>
                              <span
                                className={`text-[9px] ${
                                  p.qoldiq < 5
                                    ? 'text-rose-400'
                                    : D
                                      ? 'text-emerald-500'
                                      : 'text-emerald-600'
                                }`}
                              >
                                {showOstatok ? `${fmtQ(p.qoldiq)} ${p.ed}` : p.ed}
                              </span>
                            </div>
                          </div>
                          {inOrder ? (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  decrProduct(p.id);
                                }}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors
                                  ${D ? 'bg-gray-800 hover:bg-rose-900/50 text-rose-400' : 'bg-white hover:bg-rose-50 text-rose-500 border border-gray-200'}`}
                              >
                                <Minus size={9} />
                              </button>
                              <span
                                className={`text-xs font-bold min-w-[20px] text-center
                                ${D ? 'text-indigo-300' : 'text-indigo-600'}`}
                              >
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  addOrIncrProduct(p);
                                }}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors
                                  ${D ? 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-400' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600'}`}
                              >
                                <Plus size={9} />
                              </button>
                            </div>
                          ) : (
                            <div
                              className={`w-7 h-7 flex-shrink-0 rounded-xl flex items-center justify-center transition-colors
                              ${D
                                ? 'bg-gray-800 hover:bg-indigo-600/30 text-gray-500 hover:text-indigo-400'
                                : 'bg-gray-100 hover:bg-indigo-100 text-gray-400 hover:text-indigo-600'
                              }`}
                            >
                              <Plus size={12} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {rows.length > 0 && (
                    <div
                      className={`flex-shrink-0 px-3 py-2.5 border-t ${divider}
                      ${D ? 'bg-[#161618]' : 'bg-white'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] ${sub}`}>
                          {rows.length} {t.noPickerAdded}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPicker(false)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors
                            ${D
                              ? 'bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50'
                              : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                            }`}
                        >
                          {t.noPickerTayyor} <ChevronRight size={10} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className={`flex-shrink-0 flex flex-col gap-2 px-4 py-3 border-t ${divider}
          ${D ? 'bg-[#161618]' : 'bg-gray-50/80'}`}
        >
          {!!saveErr && <p className="text-[11px] text-rose-400 text-center">{saveErr}</p>}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-colors
                ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
            >
              {t.noBekor}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || loading || !!loadErr}
              className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold
                transition-all active:scale-[.97] disabled:opacity-60
                ${saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saved ? t.noSaqlandi : t.noSaqlash}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes orderSlide {
          from { opacity: 0; transform: translateY(32px) scale(.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
}
