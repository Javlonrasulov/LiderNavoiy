import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Truck,
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

export function AdminVanSalesTab({
  D, card, divider, text, sub, input, t, viewOrg, activeIds,
}: Props) {
  const [active, setActive] = useState<VanSub>('yuklash');
  const companyId = viewOrg !== 'all' ? viewOrg : (activeIds[0] ?? undefined);

  const bg = D ? '#0d0d0d' : '#f4f5f7';
  const bg2 = D ? '#1c1c1e' : '#ffffff';
  const bdr = D ? '#2a2a2e' : '#e5e7eb';
  const muted = D ? '#6b7280' : '#9ca3af';
  const acc = '#0ea5e9';

  const TABS: { id: VanSub; label: string; icon: React.ReactNode }[] = [
    { id: 'yuklash', label: t.vanTabLoad ?? 'Yuklash', icon: <PackagePlus size={15} /> },
    { id: 'faol', label: t.vanTabActive ?? 'Faol', icon: <Activity size={15} /> },
    { id: 'qaytarish', label: t.vanTabReturn ?? 'Qaytarish', icon: <RotateCcw size={15} /> },
    { id: 'hisobot', label: t.vanTabReport ?? 'Hisobot', icon: <BarChart3 size={15} /> },
  ];

  // ── shared data ──
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

  // ── Yuklash form ──
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

  // ── Report ──
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

  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          background: bg2,
          borderBottom: `1px solid ${bdr}`,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', overflowX: 'auto' }}>
          <Truck size={18} color={acc} style={{ flexShrink: 0 }} />
          {TABS.map((tab) => {
            const on = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  background: on ? (D ? '#0c4a6e' : '#e0f2fe') : 'transparent',
                  color: on ? (D ? '#7dd3fc' : '#0369a1') : muted,
                  fontWeight: on ? 600 : 500,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
        <div style={{ padding: '0 16px 10px', fontSize: 12, color: muted }}>
          {t.vanLineHint ?? 'Klientlar Liniya kunlaridan keladi'}
        </div>
      </div>

      <div style={{ padding: 16, flex: 1 }}>
        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: D ? '#450a0a' : '#fef2f2',
              color: D ? '#fca5a5' : '#b91c1c',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
        {flash && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: D ? '#052e16' : '#f0fdf4',
              color: D ? '#86efac' : '#15803d',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Check size={14} /> {flash}
          </div>
        )}

        {active === 'yuklash' && (
          <div style={{ display: 'grid', gap: 16, maxWidth: 960 }}>
            <div className={card} style={{ padding: 16, borderRadius: 16, border: `1px solid ${bdr}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 4, fontSize: 12, color: muted }}>
                  {t.vanPickDriver ?? 'Dostavchik'}
                  <select
                    className={input}
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 10 }}
                  >
                    <option value="">—</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user?.fullName || d.user?.username || d.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: 12, color: muted }}>
                  {t.vanPickDate ?? 'Sana'}
                  <input
                    type="date"
                    className={input}
                    value={loadDate}
                    onChange={(e) => setLoadDate(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 10 }}
                  />
                </label>
              </div>
              <label style={{ display: 'grid', gap: 4, fontSize: 12, color: muted, marginTop: 12 }}>
                Izoh
                <input
                  className={input}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 10 }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className={card} style={{ padding: 16, borderRadius: 16, border: `1px solid ${bdr}` }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: text }}>
                  {t.vanAddProducts ?? 'Mahsulotlar'}
                </div>
                <input
                  className={input}
                  placeholder="Qidirish..."
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 10, width: '100%', marginBottom: 8 }}
                />
                <div style={{ maxHeight: 360, overflowY: 'auto', display: 'grid', gap: 4 }}>
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: `1px solid ${bdr}`,
                        background: D ? '#111' : '#fafafa',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: text,
                      }}
                    >
                      <span style={{ fontSize: 13 }}>
                        <span style={{ opacity: 0.5, marginRight: 6 }}>{p.code}</span>
                        {p.name}
                      </span>
                      <span style={{ fontSize: 12, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {Number(p.stockBalance) || 0} {p.unit}
                        <Plus size={14} color={acc} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={card} style={{ padding: 16, borderRadius: 16, border: `1px solid ${bdr}` }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: text }}>Savatcha</div>
                {cart.length === 0 && (
                  <div style={{ color: muted, fontSize: 13 }}>Mahsulot qo‘shing</div>
                )}
                <div style={{ display: 'grid', gap: 8 }}>
                  {cart.map((c) => (
                    <div
                      key={c.productId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 8,
                        borderRadius: 10,
                        border: `1px solid ${bdr}`,
                      }}
                    >
                      <div style={{ flex: 1, fontSize: 13, color: text }}>
                        {c.name}
                        <div style={{ fontSize: 11, color: muted }}>
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
                          padding: '6px 8px',
                          borderRadius: 8,
                          border: `1px solid ${bdr}`,
                          background: D ? '#0a0a0a' : '#fff',
                          color: text,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setCart((prev) => prev.filter((x) => x.productId !== c.productId))}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: muted }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => createAndMaybeConfirm(false)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: `1px solid ${bdr}`,
                      background: 'transparent',
                      color: text,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : (t.vanCreateDraft ?? 'Draft')}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => createAndMaybeConfirm(true)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: 'none',
                      background: acc,
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {t.vanConfirmLoad ?? 'Tasdiqlash'}
                  </button>
                </div>
              </div>
            </div>

            {draftLoads.length > 0 && (
              <div className={card} style={{ padding: 16, borderRadius: 16, border: `1px solid ${bdr}` }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: text }}>Draft yuklashlar</div>
                {draftLoads.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: `1px solid ${divider}`,
                    }}
                  >
                    <div style={{ fontSize: 13, color: text }}>
                      {l.distributorName || l.distributorId.slice(0, 8)} · {l.loadDate} ·{' '}
                      {l.items.length} mahsulot
                    </div>
                    <button
                      type="button"
                      onClick={() => confirmDraft(l.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: acc,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
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
          <div style={{ display: 'grid', gap: 12 }}>
            {activeLoads.length === 0 && (
              <div style={{ color: muted, padding: 24 }}>{t.vanNoLoads ?? 'Yuklashlar yo‘q'}</div>
            )}
            {activeLoads.map((l) => (
              <div
                key={l.id}
                className={card}
                style={{ padding: 16, borderRadius: 16, border: `1px solid ${bdr}` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: text }}>
                      {l.distributorName || 'Dostavchik'} · {l.loadDate}
                    </div>
                    <div style={{ fontSize: 12, color: muted }}>
                      {t.vanExpectedCash ?? 'Naqd'}: {fmtNum(l.expectedCash)}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: 8,
                      background: D ? '#0c4a6e' : '#e0f2fe',
                      color: D ? '#7dd3fc' : '#0369a1',
                      height: 'fit-content',
                    }}
                  >
                    {l.status}
                  </span>
                </div>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: muted, textAlign: 'left' }}>
                      <th style={{ padding: '6px 4px' }}>Mahsulot</th>
                      <th>Yuk</th>
                      <th>{t.vanSold ?? 'Sotilgan'}</th>
                      <th>{t.vanRemaining ?? 'Qoldiq'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {l.items.map((it) => (
                      <tr key={it.id} style={{ borderTop: `1px solid ${bdr}`, color: text }}>
                        <td style={{ padding: '8px 4px' }}>{it.productName}</td>
                        <td>{it.loadedQty}</td>
                        <td>{it.soldQty}</td>
                        <td style={{ fontWeight: 600 }}>{it.remainingQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {active === 'qaytarish' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {returnLoads.length === 0 && (
              <div style={{ color: muted, padding: 24 }}>{t.vanNoLoads ?? 'Yuklashlar yo‘q'}</div>
            )}
            {returnLoads.map((l) => {
              const shortage = l.items.reduce((s, it) => s + (it.shortageQty || 0), 0);
              return (
                <div
                  key={l.id}
                  className={card}
                  style={{ padding: 16, borderRadius: 16, border: `1px solid ${bdr}` }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: text }}>
                        {l.distributorName || 'Dostavchik'} · {l.loadDate}
                      </div>
                      <div style={{ fontSize: 12, color: muted }}>
                        {t.vanExpectedCash ?? 'Kutilgan naqd'}: {fmtNum(l.expectedCash)}
                      </div>
                    </div>
                    {shortage > 0.001 && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          color: '#dc2626',
                          fontWeight: 600,
                        }}
                      >
                        <AlertTriangle size={14} />
                        {t.vanShortage ?? 'Kamomad'}: {shortage}
                      </span>
                    )}
                  </div>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 12 }}>
                    <thead>
                      <tr style={{ color: muted, textAlign: 'left' }}>
                        <th style={{ padding: '6px 4px' }}>Mahsulot</th>
                        <th>Kutilgan qaytish</th>
                        <th>Topshirilgan</th>
                        <th>{t.vanShortage ?? 'Kamomad'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {l.items.map((it) => (
                        <tr key={it.id} style={{ borderTop: `1px solid ${bdr}`, color: text }}>
                          <td style={{ padding: '8px 4px' }}>{it.productName}</td>
                          <td>{it.expectedReturnQty}</td>
                          <td>{it.returnedQty || it.expectedReturnQty}</td>
                          <td style={{ color: it.shortageQty > 0 ? '#dc2626' : text }}>
                            {it.shortageQty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className={input}
                      placeholder={t.vanSubmittedCash ?? 'Topshirilgan naqd'}
                      value={cashInputs[l.id] ?? ''}
                      onChange={(e) =>
                        setCashInputs((prev) => ({ ...prev, [l.id]: e.target.value }))
                      }
                      style={{ padding: '8px 10px', borderRadius: 10, flex: 1 }}
                    />
                    <button
                      type="button"
                      disabled={accepting === l.id}
                      onClick={() => acceptReturn(l)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 12,
                        border: 'none',
                        background: '#059669',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {accepting === l.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        t.vanAcceptReturn ?? 'Qabul qilish'
                      )}
                    </button>
                  </div>
                  {l.cashDiff != null && (
                    <div style={{ marginTop: 8, fontSize: 12, color: muted }}>
                      {t.vanCashDiff ?? 'Farq'}: {fmtNum(l.cashDiff)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {active === 'hisobot' && (
          <div style={{ display: 'grid', gap: 16, maxWidth: 800 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="date"
                className={input}
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 10 }}
              />
              <button
                type="button"
                onClick={loadReport}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: acc,
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {reportLoading ? <Loader2 className="animate-spin" size={16} /> : 'Yangilash'}
              </button>
            </div>
            {report && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 10,
                  }}
                >
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
                    <div
                      key={String(label)}
                      className={card}
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        border: `1px solid ${bdr}`,
                      }}
                    >
                      <div style={{ fontSize: 11, color: muted }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: text, marginTop: 4 }}>
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
                {report.loads.map((l) => (
                  <div
                    key={l.id}
                    className={card}
                    style={{ padding: 14, borderRadius: 14, border: `1px solid ${bdr}` }}
                  >
                    <div style={{ fontWeight: 600, color: text }}>
                      {l.distributorName} · {l.status}
                    </div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>
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
  );
}
