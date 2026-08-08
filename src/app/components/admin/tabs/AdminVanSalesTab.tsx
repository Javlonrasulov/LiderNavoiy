import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PackagePlus,
  Activity,
  RotateCcw,
  BarChart3,
  Loader2,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { api, type VanLoadDto, type Distributor } from '../../../api/client';

type VanSub = 'yuklash' | 'faol' | 'qaytarish' | 'hisobot';
type ProductRow = Awaited<ReturnType<typeof api.getProducts>>[number];

interface Props {
  D: boolean;
  card: string;
  divider: string;
  cardHover: string;
  text: string;
  sub: string;
  input: string;
  t: Record<string, string>;
  viewOrg: string;
  activeIds: string[];
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isDelivery(position?: string | null) {
  const p = (position ?? '').toLowerCase();
  return (
    p.includes('delivery') ||
    p.includes('yetkaz') ||
    p.includes('kuryer') ||
    p.includes('dostav') ||
    p.includes('haydov')
  );
}

function fmtNum(n: number) {
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');
}

const fieldStyle = (D: boolean, bdr: string, text: string): React.CSSProperties => ({
  height: 34,
  padding: '0 12px',
  borderRadius: 8,
  border: `1px solid ${bdr}`,
  background: D ? '#111113' : '#fff',
  color: text,
  fontSize: 13,
  outline: 'none',
  width: '100%',
});

const panelStyle = (bg2: string, bdr: string): React.CSSProperties => ({
  background: bg2,
  border: `1px solid ${bdr}`,
  borderRadius: 16,
  padding: 16,
});

const btnPrimary = (acc: string, disabled?: boolean): React.CSSProperties => ({
  height: 34,
  padding: '0 14px',
  borderRadius: 8,
  border: 'none',
  background: disabled ? '#e5e7eb' : acc,
  color: disabled ? '#9ca3af' : '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: disabled ? 'default' : 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
});

const btnGhost = (D: boolean, bdr: string, text: string): React.CSSProperties => ({
  height: 34,
  padding: '0 14px',
  borderRadius: 8,
  border: `1px solid ${bdr}`,
  background: 'transparent',
  color: text,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
});

export function AdminVanSalesTab({
  D, divider, text, t, viewOrg, activeIds,
}: Props) {
  const [active, setActive] = useState<VanSub>('yuklash');
  const companyId = viewOrg !== 'all' ? viewOrg : (activeIds[0] ?? undefined);

  const bg = D ? '#0d0d0d' : '#f4f5f7';
  const bg2 = D ? '#1c1c1e' : '#ffffff';
  const bdr = D ? '#2a2a2e' : '#e5e7eb';
  const muted = D ? '#6b7280' : '#9ca3af';
  const acc = '#6366f1';

  const TABS: { id: VanSub; label: string; icon: React.ReactNode }[] = [
    { id: 'yuklash', label: t.vanTabLoad ?? 'Yuklash', icon: <PackagePlus size={15} strokeWidth={1.8} /> },
    { id: 'faol', label: t.vanTabActive ?? 'Faol', icon: <Activity size={15} strokeWidth={1.8} /> },
    { id: 'qaytarish', label: t.vanTabReturn ?? 'Qaytarish', icon: <RotateCcw size={15} strokeWidth={1.8} /> },
    { id: 'hisobot', label: t.vanTabReport ?? 'Hisobot', icon: <BarChart3 size={15} strokeWidth={1.8} /> },
  ];

  const [drivers, setDrivers] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loads, setLoads] = useState<VanLoadDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refreshLoads = useCallback(async () => {
    try {
      const rows = await api.getVanLoads({ companyId });
      setLoads(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dists, prods] = await Promise.all([
          api.getDistributors(companyId).catch(() => [] as Distributor[]),
          api.getProducts(undefined, companyId).catch(() => [] as ProductRow[]),
        ]);
        if (cancelled) return;
        setDrivers(dists.filter((d) => isDelivery(d.position)));
        setProducts(prods.filter((p) => p.isActive !== false));
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  useEffect(() => {
    refreshLoads();
    const id = setInterval(refreshLoads, 15000);
    return () => clearInterval(id);
  }, [refreshLoads]);

  const [driverId, setDriverId] = useState('');
  const [loadDate, setLoadDate] = useState(todayIso);
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<Array<{ productId: string; name: string; unit: string; stock: number; qty: number }>>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 40);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code || '').toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [products, prodSearch]);

  const addProduct = (p: ProductRow) => {
    setCart((prev) => {
      const ex = prev.find((x) => x.productId === p.id);
      if (ex) {
        return prev.map((x) =>
          x.productId === p.id ? { ...x, qty: Math.min(x.qty + 1, Number(p.stockBalance) || x.qty + 1) } : x,
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          unit: p.unit || 'dona',
          stock: Number(p.stockBalance) || 0,
          qty: 1,
        },
      ];
    });
  };

  const createAndMaybeConfirm = async (confirm: boolean) => {
    if (!driverId || !cart.length) {
      setError('Dostavchik va mahsulotlar kerak');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await api.createVanLoad({
        distributorId: driverId,
        loadDate,
        companyId,
        notes: notes.trim() || undefined,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.qty })),
      });
      if (confirm) {
        await api.confirmVanLoad(created.id);
        setFlash(t.vanConfirmLoad ?? 'Yuklash tasdiqlandi');
      } else {
        setFlash(t.vanCreateDraft ?? 'Draft saqlandi');
      }
      setCart([]);
      setNotes('');
      await refreshLoads();
      setTimeout(() => setFlash(null), 2000);
      if (confirm) setActive('faol');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const activeLoads = loads.filter((l) => l.status === 'loaded');
  const returnLoads = loads.filter((l) => l.status === 'return_pending' || l.status === 'loaded');
  const draftLoads = loads.filter((l) => l.status === 'draft');

  const [cashInputs, setCashInputs] = useState<Record<string, string>>({});
  const [accepting, setAccepting] = useState<string | null>(null);

  const acceptReturn = async (load: VanLoadDto) => {
    setAccepting(load.id);
    setError(null);
    try {
      const cashRaw = cashInputs[load.id];
      const submittedCash =
        cashRaw != null && cashRaw.trim() !== '' ? Number(cashRaw) : undefined;
      if (load.status === 'loaded') {
        await api.submitVanReturn(load.id, {
          submittedCash: Number.isFinite(submittedCash) ? submittedCash : undefined,
        });
      }
      await api.acceptVanReturn(load.id, {
        submittedCash: Number.isFinite(submittedCash as number) ? submittedCash : undefined,
      });
      setFlash(t.vanAcceptReturn ?? 'Qabul qilindi');
      await refreshLoads();
      setTimeout(() => setFlash(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAccepting(null);
    }
  };

  const confirmDraft = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await api.confirmVanLoad(id);
      await refreshLoads();
      setFlash(t.vanConfirmLoad ?? 'Tasdiqlandi');
      setTimeout(() => setFlash(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const [reportDate, setReportDate] = useState(todayIso);
  const [report, setReport] = useState<Awaited<ReturnType<typeof api.getVanReport>> | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const r = await api.getVanReport({ companyId, loadDate: reportDate });
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReportLoading(false);
    }
  }, [companyId, reportDate]);

  useEffect(() => {
    if (active === 'hisobot') loadReport();
  }, [active, loadReport]);

  const labelCls: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: muted,
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sub-tab bar — Ombor uslubi */}
      <div style={{
        background: bg2,
        borderBottom: `1px solid ${bdr}`,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 16px',
          overflowX: 'auto',
        }}>
          {TABS.map((tb) => {
            const isActive = active === tb.id;
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => setActive(tb.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: isActive ? acc : (D ? '#2a2a2e' : '#f3f4f6'),
                  color: isActive ? '#ffffff' : muted,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'background 0.18s, color 0.18s',
                  boxShadow: isActive ? `0 4px 14px ${acc}45` : 'none',
                }}
              >
                {tb.icon}
                <span>{tb.label}</span>
              </button>
            );
          })}
        </div>
        <div style={{
          padding: '8px 16px 12px',
          borderTop: `1px solid ${bdr}`,
          fontSize: 11,
          color: muted,
        }}>
          {t.vanLineHint ?? 'Klientlar Liniya kunlaridan keladi'}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div className="px-5 md:px-8 py-6">
          {error && (
            <div className={`mb-4 rounded-xl px-3 py-2.5 text-sm ${D ? 'bg-red-950/40 text-red-300' : 'bg-red-50 text-red-700'}`}>
              {error}
            </div>
          )}
          {flash && (
            <div className={`mb-4 rounded-xl px-3 py-2.5 text-sm flex items-center gap-2 ${D ? 'bg-emerald-950/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
              <Check size={14} /> {flash}
            </div>
          )}

          {active === 'yuklash' && (
            <div className="space-y-4 max-w-5xl">
              <div style={panelStyle(bg2, bdr)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label style={labelCls}>{t.vanPickDriver ?? 'Dostavchik'}</label>
                    <select
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                      style={fieldStyle(D, bdr, text)}
                    >
                      <option value="">—</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.user?.fullName || d.user?.username || d.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelCls}>{t.vanPickDate ?? 'Sana'}</label>
                    <input
                      type="date"
                      value={loadDate}
                      onChange={(e) => setLoadDate(e.target.value)}
                      style={fieldStyle(D, bdr, text)}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={labelCls}>Izoh</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={fieldStyle(D, bdr, text)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div style={panelStyle(bg2, bdr)}>
                  <div className={`text-sm font-semibold mb-2 ${D ? 'text-white' : 'text-gray-900'}`}>
                    {t.vanAddProducts ?? 'Mahsulotlar'}
                  </div>
                  <input
                    placeholder="Qidirish..."
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    style={{ ...fieldStyle(D, bdr, text), marginBottom: 8 }}
                  />
                  <div style={{ maxHeight: 360, overflowY: 'auto', display: 'grid', gap: 4 }}>
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduct(p)}
                        className={`flex items-center justify-between text-left px-3 py-2 rounded-lg border transition-colors ${
                          D
                            ? 'border-gray-800 bg-[#111113] hover:border-indigo-500/40 text-gray-200'
                            : 'border-gray-100 bg-gray-50 hover:border-indigo-200 hover:bg-indigo-50/40 text-gray-800'
                        }`}
                      >
                        <span className="text-[13px]">
                          <span className="opacity-45 mr-1.5">{p.code}</span>
                          {p.name}
                        </span>
                        <span className="text-xs flex items-center gap-1.5" style={{ color: muted }}>
                          {Number(p.stockBalance) || 0} {p.unit}
                          <Plus size={14} color={acc} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={panelStyle(bg2, bdr)}>
                  <div className={`text-sm font-semibold mb-2 ${D ? 'text-white' : 'text-gray-900'}`}>Savatcha</div>
                  {cart.length === 0 && (
                    <div className="text-[13px]" style={{ color: muted }}>Mahsulot qo‘shing</div>
                  )}
                  <div className="space-y-2">
                    {cart.map((c) => (
                      <div
                        key={c.productId}
                        className={`flex items-center gap-2 p-2 rounded-lg border ${D ? 'border-gray-800' : 'border-gray-100'}`}
                      >
                        <div className="flex-1 text-[13px]" style={{ color: text }}>
                          {c.name}
                          <div className="text-[11px]" style={{ color: muted }}>
                            ombor: {c.stock} {c.unit}
                          </div>
                        </div>
                        <input
                          type="number"
                          min={0.001}
                          step="any"
                          value={c.qty}
                          onChange={(e) => {
                            const qty = Number(e.target.value) || 0;
                            setCart((prev) =>
                              prev.map((x) =>
                                x.productId === c.productId ? { ...x, qty } : x,
                              ),
                            );
                          }}
                          style={{
                            width: 72,
                            height: 32,
                            padding: '0 8px',
                            borderRadius: 8,
                            border: `1px solid ${bdr}`,
                            background: D ? '#0a0a0a' : '#fff',
                            color: text,
                            fontSize: 13,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setCart((prev) => prev.filter((x) => x.productId !== c.productId))}
                          className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => createAndMaybeConfirm(false)}
                      style={{ ...btnGhost(D, bdr, text), flex: 1 }}
                    >
                      {saving ? <Loader2 className="animate-spin" size={14} /> : (t.vanCreateDraft ?? 'Draft')}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => createAndMaybeConfirm(true)}
                      style={{ ...btnPrimary(acc, saving), flex: 1 }}
                    >
                      {t.vanConfirmLoad ?? 'Tasdiqlash'}
                    </button>
                  </div>
                </div>
              </div>

              {draftLoads.length > 0 && (
                <div style={panelStyle(bg2, bdr)}>
                  <div className={`text-sm font-semibold mb-2 ${D ? 'text-white' : 'text-gray-900'}`}>Draft yuklashlar</div>
                  {draftLoads.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between py-2.5"
                      style={{ borderBottom: `1px solid ${divider}` }}
                    >
                      <div className="text-[13px]" style={{ color: text }}>
                        {l.distributorName || l.distributorId.slice(0, 8)} · {l.loadDate} · {l.items.length} mahsulot
                      </div>
                      <button
                        type="button"
                        onClick={() => confirmDraft(l.id)}
                        style={btnPrimary(acc)}
                      >
                        {t.vanConfirmLoad ?? 'Tasdiqlash'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {active === 'faol' && (
            <div className="space-y-3 max-w-5xl">
              {activeLoads.length === 0 && (
                <div className="py-10 text-center text-sm" style={{ color: muted }}>
                  {t.vanNoLoads ?? 'Yuklashlar yo‘q'}
                </div>
              )}
              {activeLoads.map((l) => (
                <div key={l.id} style={panelStyle(bg2, bdr)}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className={`font-semibold text-sm ${D ? 'text-white' : 'text-gray-900'}`}>
                        {l.distributorName || 'Dostavchik'} · {l.loadDate}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: muted }}>
                        {t.vanExpectedCash ?? 'Naqd'}: {fmtNum(l.expectedCash)}
                      </div>
                    </div>
                    <span
                      className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                      style={{ background: `${acc}18`, color: acc }}
                    >
                      {l.status}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr style={{ color: muted, textAlign: 'left' }}>
                          <th className="py-2 pr-2 font-medium">Mahsulot</th>
                          <th className="py-2 font-medium">Yuk</th>
                          <th className="py-2 font-medium">{t.vanSold ?? 'Sotilgan'}</th>
                          <th className="py-2 font-medium">{t.vanRemaining ?? 'Qoldiq'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {l.items.map((it) => (
                          <tr key={it.id} style={{ borderTop: `1px solid ${bdr}`, color: text }}>
                            <td className="py-2.5 pr-2">{it.productName}</td>
                            <td className="py-2.5">{it.loadedQty}</td>
                            <td className="py-2.5">{it.soldQty}</td>
                            <td className="py-2.5 font-semibold">{it.remainingQty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {active === 'qaytarish' && (
            <div className="space-y-3 max-w-5xl">
              {returnLoads.length === 0 && (
                <div className="py-10 text-center text-sm" style={{ color: muted }}>
                  {t.vanNoLoads ?? 'Yuklashlar yo‘q'}
                </div>
              )}
              {returnLoads.map((l) => {
                const shortage = l.items.reduce((s, it) => s + (it.shortageQty || 0), 0);
                return (
                  <div key={l.id} style={panelStyle(bg2, bdr)}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className={`font-semibold text-sm ${D ? 'text-white' : 'text-gray-900'}`}>
                          {l.distributorName || 'Dostavchik'} · {l.loadDate}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: muted }}>
                          {t.vanExpectedCash ?? 'Kutilgan naqd'}: {fmtNum(l.expectedCash)}
                        </div>
                      </div>
                      {shortage > 0.001 && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
                          <AlertTriangle size={13} />
                          {t.vanShortage ?? 'Kamomad'}: {shortage}
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr style={{ color: muted, textAlign: 'left' }}>
                            <th className="py-2 pr-2 font-medium">Mahsulot</th>
                            <th className="py-2 font-medium">Kutilgan</th>
                            <th className="py-2 font-medium">Topshirilgan</th>
                            <th className="py-2 font-medium">{t.vanShortage ?? 'Kamomad'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {l.items.map((it) => (
                            <tr key={it.id} style={{ borderTop: `1px solid ${bdr}`, color: text }}>
                              <td className="py-2.5 pr-2">{it.productName}</td>
                              <td className="py-2.5">{it.expectedReturnQty}</td>
                              <td className="py-2.5">{it.returnedQty || it.expectedReturnQty}</td>
                              <td className={`py-2.5 ${it.shortageQty > 0 ? 'text-red-500 font-semibold' : ''}`}>
                                {it.shortageQty}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        placeholder={t.vanSubmittedCash ?? 'Topshirilgan naqd'}
                        value={cashInputs[l.id] ?? ''}
                        onChange={(e) =>
                          setCashInputs((prev) => ({ ...prev, [l.id]: e.target.value }))
                        }
                        style={{ ...fieldStyle(D, bdr, text), flex: 1, minWidth: 160 }}
                      />
                      <button
                        type="button"
                        disabled={accepting === l.id}
                        onClick={() => acceptReturn(l)}
                        style={btnPrimary(acc, accepting === l.id)}
                      >
                        {accepting === l.id ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          t.vanAcceptReturn ?? 'Qabul qilish'
                        )}
                      </button>
                    </div>
                    {l.cashDiff != null && (
                      <div className="mt-2 text-xs" style={{ color: muted }}>
                        {t.vanCashDiff ?? 'Farq'}: {fmtNum(l.cashDiff)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {active === 'hisobot' && (
            <div className="space-y-4 max-w-5xl">
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label style={labelCls}>{t.vanPickDate ?? 'Sana'}</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    style={{ ...fieldStyle(D, bdr, text), width: 'auto', minWidth: 160 }}
                  />
                </div>
                <button
                  type="button"
                  onClick={loadReport}
                  style={btnPrimary(acc, reportLoading)}
                >
                  {reportLoading ? <Loader2 className="animate-spin" size={14} /> : (t.refresh ?? 'Yangilash')}
                </button>
              </div>

              {report && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[
                      ['Sotuvlar', report.summary.ordersCount],
                      ['Jami sotish', fmtNum(report.summary.totalSales)],
                      ['Naqd', fmtNum(report.summary.cash)],
                      ['Terminal', fmtNum(report.summary.terminal)],
                      ['Qarz', fmtNum(report.summary.debt)],
                      ['Klientlar', report.summary.clientsSold],
                      [t.vanExpectedCash ?? 'Kutilgan naqd', fmtNum(report.summary.expectedCash)],
                      [t.vanSubmittedCash ?? 'Topshirilgan', fmtNum(report.summary.submittedCash)],
                    ].map(([label, val]) => (
                      <div key={String(label)} style={panelStyle(bg2, bdr)}>
                        <div className="text-[11px] font-medium" style={{ color: muted }}>{label}</div>
                        <div className={`text-xl font-bold mt-1 tabular-nums ${D ? 'text-white' : 'text-gray-900'}`}>
                          {val}
                        </div>
                      </div>
                    ))}
                  </div>
                  {report.loads.map((l) => (
                    <div key={l.id} style={panelStyle(bg2, bdr)}>
                      <div className={`font-semibold text-sm ${D ? 'text-white' : 'text-gray-900'}`}>
                        {l.distributorName} · {l.status}
                      </div>
                      <div className="text-xs mt-1" style={{ color: muted }}>
                        Sotilgan: {l.items.reduce((s, i) => s + i.soldQty, 0)} · Qoldiq:{' '}
                        {l.items.reduce((s, i) => s + i.remainingQty, 0)}
                        {l.cashDiff != null && ` · Farq: ${fmtNum(l.cashDiff)}`}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
