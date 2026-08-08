import { useEffect, useMemo, useState } from 'react';
import { X, Search, Check, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../../api/client';
import { PromoDateCalendar } from './PromoDateCalendar';

export type PromotionConditionRow = {
  productId: string;
  productName: string;
  buyQuantity: number;
};

export type PromotionRow = {
  id: string;
  title: string;
  subtitle: string | null;
  discountPercent: number;
  buyQuantity?: number | null;
  freeQuantity?: number | null;
  productId: string | null;
  productName: string | null;
  conditions?: PromotionConditionRow[];
  rewardProductId?: string | null;
  rewardProductName?: string | null;
  rewardQuantity?: number | null;
  rewardPrice?: number | null;
  colorStart: string;
  colorEnd: string;
  emoji: string | null;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  sortOrder: number;
};

type ProductOpt = {
  id: string;
  code: string;
  name: string;
  unit: string;
};

const COLOR_PRESETS: { start: string; end: string; label: string }[] = [
  { start: '#4F46E5', end: '#9333EA', label: 'Indigo' },
  { start: '#06B6D4', end: '#2563EB', label: 'Cyan' },
  { start: '#10B981', end: '#059669', label: 'Green' },
  { start: '#F59E0B', end: '#EF4444', label: 'Orange' },
  { start: '#EC4899', end: '#8B5CF6', label: 'Pink' },
  { start: '#0EA5E9', end: '#6366F1', label: 'Sky' },
];

const EMOJI_OPTS = ['🎁', '💰', '🔥', '⭐', '🏷️', '🎉', '💎', '🛒'];

function toDateInput(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function fromDateInput(v: string) {
  if (!v) return null;
  return `${v}T00:00:00.000Z`;
}

function initialConditions(initial: PromotionRow | null): PromotionConditionRow[] {
  if (initial?.conditions && initial.conditions.length > 0) {
    return initial.conditions.map((c) => ({
      productId: c.productId,
      productName: c.productName,
      buyQuantity: Number(c.buyQuantity) || 0,
    }));
  }
  if (initial?.productId) {
    return [{
      productId: initial.productId,
      productName: initial.productName || '',
      buyQuantity: Number(initial.buyQuantity) || 0,
    }];
  }
  return [];
}

interface Props {
  D: boolean;
  t: Record<string, string>;
  initial: PromotionRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AksiyaCreateModal({ D, t, initial, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? '');
  const [discountPercent, setDiscountPercent] = useState(
    initial ? String(initial.discountPercent || '') : '',
  );
  const [conditions, setConditions] = useState<PromotionConditionRow[]>(() =>
    initialConditions(initial),
  );
  const [rewardProductId, setRewardProductId] = useState<string | null>(
    initial?.rewardProductId ?? null,
  );
  const [rewardProductName, setRewardProductName] = useState(
    initial?.rewardProductName ?? '',
  );
  const [rewardQuantity, setRewardQuantity] = useState(
    initial?.rewardQuantity != null
      ? String(initial.rewardQuantity)
      : initial?.freeQuantity != null
        ? String(initial.freeQuantity)
        : '1',
  );
  const [rewardPrice, setRewardPrice] = useState(
    initial?.rewardPrice != null ? String(initial.rewardPrice) : '0',
  );
  const [colorStart, setColorStart] = useState(initial?.colorStart ?? '#4F46E5');
  const [colorEnd, setColorEnd] = useState(initial?.colorEnd ?? '#9333EA');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🎁');
  const [validFrom, setValidFrom] = useState(toDateInput(initial?.validFrom));
  const [validTo, setValidTo] = useState(toDateInput(initial?.validTo));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [productSearch, setProductSearch] = useState('');
  const [rewardSearch, setRewardSearch] = useState('');
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** qaysi condition qatoriga mahsulot tanlanmoqda; null = reward */
  const [pickingFor, setPickingFor] = useState<'condition' | 'reward'>('condition');

  const card = D ? '#1c1c1e' : '#ffffff';
  const brd = D ? '#2a2a2e' : '#e5e7eb';
  const muted = D ? '#6b7280' : '#9ca3af';
  const txt = D ? '#f2f2f7' : '#111827';
  const soft = D ? '#2a2a2e' : '#f3f4f6';
  const inputBg = D ? '#161618' : '#fff';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProductsLoading(true);
      try {
        const list = await api.getProducts();
        if (cancelled) return;
        setProducts(list.map((p) => ({ id: p.id, code: p.code, name: p.name, unit: p.unit })));
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeSearch = pickingFor === 'reward' ? rewardSearch : productSearch;
  const filteredProducts = useMemo(() => {
    const q = activeSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 40);
    return products
      .filter((p) =>
        p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [products, activeSearch]);

  const rewardQ = rewardQuantity === '' ? 0 : Number(rewardQuantity);
  const rewardP = rewardPrice === '' ? 0 : Number(rewardPrice);

  const fmtConditionQty = (n: number) =>
    (t.aksiyaConditionQty ?? 'kamida {n} ta').replace('{n}', String(n));

  const autoSubtitle = useMemo(() => {
    if (conditions.length === 0) return '';
    const parts = conditions
      .filter((c) => c.buyQuantity > 0)
      .map((c) => `${c.productName || '…'}: ${fmtConditionQty(c.buyQuantity)}`);
    const gift = rewardProductName
      ? ` → ${rewardProductName} ×${rewardQ || '?'}${rewardP === 0 ? ` (${t.aksiyaFreeLabel ?? 'tekin'})` : ` @${rewardP}`}`
      : '';
    return parts.join(', ') + gift;
  }, [conditions, rewardProductName, rewardQ, rewardP, t]);

  const previewSubtitle = subtitle.trim() || autoSubtitle
    || (Number(discountPercent) > 0
      ? `${discountPercent}% ${t.aksiyaDiscountSuffix ?? 'chegirma'}`
      : '');

  const addConditionProduct = (p: ProductOpt) => {
    if (conditions.some((c) => c.productId === p.id)) return;
    const nextLen = conditions.length + 1;
    setConditions((prev) => [
      ...prev,
      { productId: p.id, productName: p.name, buyQuantity: 10 },
    ]);
    // Birinchi shart tanlangach — sovg‘a tanlashga o‘tkazamiz
    if (nextLen === 1) setPickingFor('reward');
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t.aksiyaTitleRequired ?? 'Sarlavha majburiy');
      return;
    }
    const pct = Number(discountPercent);
    if (discountPercent !== '' && (Number.isNaN(pct) || pct < 0 || pct > 100)) {
      setError(t.aksiyaDiscountInvalid ?? 'Chegirma 0–100 oralig\'ida bo\'lishi kerak');
      return;
    }

    const cleanConditions = conditions.filter((c) => c.productId && Number(c.buyQuantity) > 0);
    for (const c of cleanConditions) {
      if (Number.isNaN(Number(c.buyQuantity)) || Number(c.buyQuantity) <= 0) {
        setError(t.aksiyaBuyInvalid ?? 'Buy qty noto‘g‘ri');
        return;
      }
    }

    if (cleanConditions.length > 0) {
      if (!rewardProductId) {
        setError(t.aksiyaRewardRequired ?? 'Sovg‘a mahsulot majburiy');
        return;
      }
      const rq = Number(rewardQuantity);
      if (!rq || Number.isNaN(rq) || rq <= 0) {
        setError(t.aksiyaRewardQtyInvalid ?? 'Sovg‘a miqdori noto‘g‘ri');
        return;
      }
      const rp = Number(rewardPrice);
      if (Number.isNaN(rp) || rp < 0) {
        setError(t.aksiyaRewardPriceInvalid ?? 'Aksiya narxi noto‘g‘ri');
        return;
      }
    }

    setSaving(true);
    setError(null);
    const body = {
      title: trimmedTitle,
      subtitle: subtitle.trim() || previewSubtitle || undefined,
      discountPercent: Number.isFinite(pct) ? pct : 0,
      conditions: cleanConditions.map((c) => ({
        productId: c.productId,
        productName: c.productName,
        buyQuantity: Number(c.buyQuantity),
      })),
      rewardProductId: rewardProductId || null,
      rewardQuantity: rewardQuantity === '' ? null : Number(rewardQuantity),
      rewardPrice: rewardPrice === '' ? 0 : Number(rewardPrice),
      colorStart,
      colorEnd,
      emoji: emoji || '🎁',
      validFrom: fromDateInput(validFrom),
      validTo: fromDateInput(validTo),
      isActive,
    };

    try {
      if (initial) {
        await api.updatePromotion(initial.id, body);
      } else {
        await api.createPromotion(body);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : (t.aksiyaSaveFail ?? 'Saqlab bo\'lmadi'));
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: `1px solid ${brd}`, background: inputBg, color: txt, fontSize: 13, outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.45)', display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 780, maxHeight: 'min(92vh, calc(100vh - 48px))',
          margin: 'auto 0', overflow: 'auto',
          borderRadius: 18, border: `1px solid ${brd}`, background: card,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: `1px solid ${brd}`, position: 'sticky', top: 0,
            background: card, zIndex: 1,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: txt }}>
              {initial
                ? (t.aksiyaEditTitle ?? 'Aksiyani tahrirlash')
                : (t.aksiyaCreateTitle ?? 'Yangi aksiya')}
            </div>
            <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
              {t.aksiyaCreateHint ?? 'Klient APKda ko\'rinadi'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: `1px solid ${brd}`,
              background: soft, color: muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>{t.aksiyaTitle ?? 'Sarlavha'} *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.aksiyaTitlePlaceholder ?? 'Yozgi chegirma'}
                style={fieldStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>{t.aksiyaSubtitle ?? 'Pastki matn'}</label>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder={autoSubtitle || (t.aksiyaSubtitlePlaceholder ?? 'Shartlar matni')}
                style={fieldStyle}
              />
            </div>

            {/* Shartli mahsulotlar */}
            <div>
              <label style={labelStyle}>
                {t.aksiyaConditions ?? 'Shartli mahsulotlar'}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {conditions.map((c) => (
                  <div
                    key={c.productId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 88px 32px',
                      gap: 8,
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: D ? '#1e1b4b' : '#eef2ff',
                      border: `1px solid ${D ? '#312e81' : '#c7d2fe'}`,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.productName}
                    </span>
                    <input
                      type="number"
                      min={0.001}
                      step={1}
                      value={c.buyQuantity || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setConditions((prev) =>
                          prev.map((x) =>
                            x.productId === c.productId
                              ? { ...x, buyQuantity: v === '' ? 0 : Number(v) }
                              : x,
                          ),
                        );
                      }}
                      title={t.aksiyaBuyQty ?? 'Min miqdor'}
                      placeholder="10"
                      style={{ ...fieldStyle, padding: '6px 8px', fontSize: 12 }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setConditions((prev) => prev.filter((x) => x.productId !== c.productId))
                      }
                      style={{
                        border: 'none', background: 'transparent', color: muted,
                        cursor: 'pointer', display: 'flex', justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 10, border: `1px solid ${brd}`,
                  background: soft, marginBottom: 6,
                }}
              >
                <Search size={14} color={muted} />
                <input
                  value={productSearch}
                  onFocus={() => setPickingFor('condition')}
                  onChange={(e) => {
                    setPickingFor('condition');
                    setProductSearch(e.target.value);
                  }}
                  placeholder={t.aksiyaProductSearch ?? 'Mahsulot qidirish...'}
                  style={{
                    flex: 1, border: 'none', outline: 'none', background: 'transparent',
                    color: txt, fontSize: 13,
                  }}
                />
              </div>
              {pickingFor === 'condition' && (
                <div
                  style={{
                    maxHeight: 120, overflow: 'auto', borderRadius: 10,
                    border: `1px solid ${brd}`, background: inputBg,
                  }}
                >
                  {productsLoading ? (
                    <div style={{ padding: 10, fontSize: 12, color: muted }}>{t.aksiyaLoading ?? '…'}</div>
                  ) : filteredProducts.map((p) => {
                    const active = conditions.some((c) => c.productId === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addConditionProduct(p)}
                        disabled={active}
                        style={{
                          width: '100%', textAlign: 'left', padding: '7px 10px',
                          border: 'none', borderBottom: `1px solid ${brd}`,
                          background: active ? (D ? '#1e1b4b' : '#eef2ff') : 'transparent',
                          color: txt, cursor: active ? 'default' : 'pointer', fontSize: 12,
                          display: 'flex', alignItems: 'center', gap: 8, opacity: active ? 0.6 : 1,
                        }}
                      >
                        {active ? <Check size={13} color="#6366f1" /> : <Plus size={13} color={muted} />}
                        <span style={{ flex: 1 }}>
                          <b>{p.name}</b>
                          <span style={{ color: muted }}> · {p.code}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={{ fontSize: 11, color: muted, marginTop: 6 }}>
                {t.aksiyaConditionsHint ?? 'Har bir mahsulot uchun minimal miqdor. Barchasi bajarilganda aksiya taklif qilinadi.'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>{t.aksiyaDiscount ?? 'Chegirma %'}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="0"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>{t.aksiyaEmoji ?? 'Emoji'}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {EMOJI_OPTS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(em)}
                      style={{
                        width: 34, height: 34, borderRadius: 8, fontSize: 16,
                        border: emoji === em ? '2px solid #6366f1' : `1px solid ${brd}`,
                        background: soft, cursor: 'pointer',
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t.aksiyaColors ?? 'Ranglar (gradient)'}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {COLOR_PRESETS.map((p) => {
                  const active = colorStart === p.start && colorEnd === p.end;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      title={p.label}
                      onClick={() => { setColorStart(p.start); setColorEnd(p.end); }}
                      style={{
                        width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
                        border: active ? '2px solid #111827' : `1px solid ${brd}`,
                        background: `linear-gradient(135deg, ${p.start}, ${p.end})`,
                        outline: active ? '2px solid #6366f1' : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ ...labelStyle, fontWeight: 500 }}>{t.aksiyaColorStart ?? 'Boshlanish'}</label>
                  <input type="color" value={colorStart} onChange={(e) => setColorStart(e.target.value)} style={{ width: '100%', height: 36, border: `1px solid ${brd}`, borderRadius: 8, background: soft, cursor: 'pointer' }} />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontWeight: 500 }}>{t.aksiyaColorEnd ?? 'Tugash'}</label>
                  <input type="color" value={colorEnd} onChange={(e) => setColorEnd(e.target.value)} style={{ width: '100%', height: 36, border: `1px solid ${brd}`, borderRadius: 8, background: soft, cursor: 'pointer' }} />
                </div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t.aksiyaPeriod ?? 'Aksiya muddati'}</label>
              <PromoDateCalendar
                D={D}
                t={t}
                validFrom={validFrom}
                validTo={validTo}
                onChange={(from, to) => {
                  setValidFrom(from);
                  setValidTo(to);
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: txt, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#6366f1' }}
              />
              {t.aksiyaActive ?? 'Aktiv (klientda ko\'rinsin)'}
            </label>
          </div>

          {/* Right: reward (shartlardan keyin) + preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {conditions.length === 0 ? (
              <div
                style={{
                  padding: 14, borderRadius: 12, border: `1px dashed ${brd}`,
                  background: soft, fontSize: 12, color: muted, lineHeight: 1.45,
                }}
              >
                {t.aksiyaRewardAfterConditions ?? 'Avval chapda shartli mahsulot tanlang — keyin sovg‘a mahsulot va miqdor shu yerda chiqadi.'}
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 84px 100px',
                    gap: 10,
                    alignItems: 'start',
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <label style={labelStyle}>
                      {t.aksiyaRewardProduct ?? 'Sovg‘a mahsulot'} *
                    </label>
                    {rewardProductId ? (
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 10px', borderRadius: 10, minHeight: 40,
                          background: D ? '#14532d' : '#ecfdf5',
                          border: `1px solid ${D ? '#166534' : '#a7f3d0'}`,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12, color: txt, fontWeight: 600,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {rewardProductName}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setRewardProductId(null); setRewardProductName(''); }}
                          style={{ border: 'none', background: 'transparent', color: muted, cursor: 'pointer', flexShrink: 0 }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px', borderRadius: 10, border: `1px solid ${brd}`,
                          background: soft, minHeight: 40,
                        }}
                      >
                        <Search size={14} color={muted} />
                        <input
                          value={rewardSearch}
                          onFocus={() => setPickingFor('reward')}
                          onChange={(e) => {
                            setPickingFor('reward');
                            setRewardSearch(e.target.value);
                          }}
                          placeholder={t.aksiyaProductSearch ?? 'Mahsulot qidirish...'}
                          style={{
                            flex: 1, border: 'none', outline: 'none', background: 'transparent',
                            color: txt, fontSize: 13, minWidth: 0,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>{t.aksiyaRewardQty ?? 'Sovg‘a miqdori'}</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={rewardQuantity}
                      onChange={(e) => setRewardQuantity(e.target.value)}
                      placeholder="1"
                      style={{ ...fieldStyle, minHeight: 40 }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.aksiyaRewardPrice ?? 'Aksiya narxi'}</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={rewardPrice}
                      onChange={(e) => setRewardPrice(e.target.value)}
                      placeholder="0"
                      title={t.aksiyaRewardPrice ?? 'Aksiya narxi (0=tekin)'}
                      style={{ ...fieldStyle, minHeight: 40 }}
                    />
                  </div>
                </div>

                {rewardProductId && (
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 10, border: `1px solid ${brd}`,
                      background: soft, marginBottom: 8,
                    }}
                  >
                    <Search size={14} color={muted} />
                    <input
                      value={rewardSearch}
                      onFocus={() => setPickingFor('reward')}
                      onChange={(e) => {
                        setPickingFor('reward');
                        setRewardSearch(e.target.value);
                      }}
                      placeholder={t.aksiyaProductSearch ?? 'Mahsulot qidirish...'}
                      style={{
                        flex: 1, border: 'none', outline: 'none', background: 'transparent',
                        color: txt, fontSize: 13,
                      }}
                    />
                  </div>
                )}

                {pickingFor === 'reward' && (
                  <div
                    style={{
                      maxHeight: 160, overflow: 'auto', borderRadius: 10,
                      border: `1px solid ${brd}`, background: inputBg, marginBottom: 6,
                    }}
                  >
                    {productsLoading ? (
                      <div style={{ padding: 12, fontSize: 12, color: muted }}>{t.aksiyaLoading ?? 'Yuklanmoqda...'}</div>
                    ) : filteredProducts.length === 0 ? (
                      <div style={{ padding: 12, fontSize: 12, color: muted }}>{t.noDataFound ?? 'Topilmadi'}</div>
                    ) : (
                      filteredProducts.map((p) => {
                        const active = rewardProductId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setRewardProductId(p.id);
                              setRewardProductName(p.name);
                              setPickingFor('reward');
                            }}
                            style={{
                              width: '100%', textAlign: 'left', padding: '8px 10px',
                              border: 'none', borderBottom: `1px solid ${brd}`,
                              background: active ? (D ? '#14532d' : '#ecfdf5') : 'transparent',
                              color: txt, cursor: 'pointer', fontSize: 12,
                              display: 'flex', alignItems: 'center', gap: 8,
                            }}
                          >
                            {active && <Check size={13} color="#059669" />}
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontWeight: 600 }}>{p.name}</span>
                              <span style={{ color: muted }}> · {p.code}</span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
                <div style={{ fontSize: 11, color: muted }}>
                  {t.aksiyaRewardHint ?? 'Aksiya yigilganda agentga shu mahsulot taklif qilinadi (Ha/Yo‘q).'}
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>{t.aksiyaPreview ?? 'Klientda ko\'rinishi'}</label>
              <div
                style={{
                  borderRadius: 16, padding: 16, minHeight: 110,
                  background: `linear-gradient(135deg, ${colorStart}, ${colorEnd})`,
                  color: '#fff', position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
                      {title.trim() || (t.aksiyaTitlePlaceholder ?? 'Sarlavha')}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6, lineHeight: 1.35 }}>
                      {previewSubtitle || (t.aksiyaSubtitlePlaceholder ?? 'Pastki matn')}
                    </div>
                  </div>
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{emoji || '🎁'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 8 }}>
                  {rewardQ > 0 ? (
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px', borderRadius: 999,
                        background: 'rgba(255,255,255,0.22)', fontSize: 12, fontWeight: 700,
                      }}
                    >
                      +{rewardQ}{rewardP === 0 ? ` ${t.aksiyaFreeLabel ?? 'tekin'}` : ` @${rewardP}`}
                    </div>
                  ) : Number(discountPercent) > 0 ? (
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px', borderRadius: 999,
                        background: 'rgba(255,255,255,0.22)', fontSize: 12, fontWeight: 700,
                      }}
                    >
                      {discountPercent}%
                    </div>
                  ) : <span />}
                  <div style={{ fontSize: 11, opacity: 0.85, textAlign: 'right' }}>
                    {validFrom && validTo
                      ? `${validFrom.split('-').reverse().join('-')} — ${validTo.split('-').reverse().join('-')}`
                      : (t.aksiyaUnlimited ?? 'Cheksiz')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '0 18px 10px', color: '#ef4444', fontSize: 13 }}>{error}</div>
        )}

        <div
          style={{
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            padding: '12px 18px', borderTop: `1px solid ${brd}`,
            position: 'sticky', bottom: 0, background: card,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 14px', borderRadius: 10, border: `1px solid ${brd}`,
              background: soft, color: txt, fontSize: 13, cursor: 'pointer',
            }}
          >
            {t.taroziCancel ?? 'Bekor qilish'}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            style={{
              padding: '9px 16px', borderRadius: 10, border: 'none',
              background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? (t.aksiyaSaving ?? 'Saqlanmoqda...')
              : (initial ? (t.aksiyaSave ?? 'Saqlash') : (t.aksiyaCreate ?? 'Yaratish'))}
          </button>
        </div>
      </div>
    </div>
  );
}
