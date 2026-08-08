import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, RefreshCw, Pencil, Trash2, Zap, X, Check,
} from 'lucide-react';
import { api } from '../../../../api/client';
import { AksiyaCreateModal, type PromotionRow } from './AksiyaCreateModal';

function hasApiToken() {
  return !!localStorage.getItem('api_access_token');
}

function fmtPct(n: number | string) {
  const v = Number(n);
  if (!v) return '—';
  return `${v}%`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

const COLOR_PRESETS = [
  { start: '#4F46E5', end: '#9333EA' },
  { start: '#06B6D4', end: '#2563EB' },
  { start: '#10B981', end: '#059669' },
  { start: '#F59E0B', end: '#EF4444' },
  { start: '#EC4899', end: '#8B5CF6' },
];

interface AksiyalarPageProps {
  D: boolean;
  t: Record<string, string>;
}

export function AksiyalarPage({ D, t }: AksiyalarPageProps) {
  const [rows, setRows] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const card = D ? '#1c1c1e' : '#ffffff';
  const brd = D ? '#2a2a2e' : '#e5e7eb';
  const muted = D ? '#6b7280' : '#9ca3af';
  const txt = D ? '#f2f2f7' : '#111827';
  const soft = D ? '#2a2a2e' : '#f3f4f6';

  const load = async () => {
    if (!hasApiToken()) {
      setRows([]);
      setError(t.aksiyaNoApi ?? 'API ulanmagan');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPromotions();
      setRows(data.map((p) => ({
        ...p,
        discountPercent: Number(p.discountPercent) || 0,
        buyQuantity: p.buyQuantity != null ? Number(p.buyQuantity) : null,
        freeQuantity: p.freeQuantity != null ? Number(p.freeQuantity) : null,
        conditions: Array.isArray(p.conditions)
          ? p.conditions.map((c) => ({
              productId: c.productId,
              productName: c.productName,
              buyQuantity: Number(c.buyQuantity) || 0,
            }))
          : undefined,
        rewards: Array.isArray(p.rewards)
          ? p.rewards.map((r) => ({
              productId: r.productId,
              productName: r.productName,
              quantity: Number(r.quantity) || 0,
              price: Number(r.price) || 0,
            }))
          : undefined,
        rewardProductId: p.rewardProductId ?? null,
        rewardProductName: p.rewardProductName ?? null,
        rewardQuantity: p.rewardQuantity != null ? Number(p.rewardQuantity) : null,
        rewardPrice: p.rewardPrice != null ? Number(p.rewardPrice) : null,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : (t.aksiyaLoadFail ?? 'Yuklab bo\'lmadi'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.title, r.subtitle, r.productName]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: PromotionRow) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditing(null);
    void load();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.deletePromotion(id);
      setDeleteConfirmId(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : (t.aksiyaDeleteFail ?? 'O\'chirib bo\'lmadi'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '10px 14px', borderRadius: 14, border: `1px solid ${brd}`, background: card,
        }}
      >
        <button
          type="button"
          onClick={openCreate}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10, border: 'none',
            background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={15} strokeWidth={2.2} />
          {t.zCreate ?? 'Yaratish'}
        </button>

        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 180,
            padding: '7px 12px', borderRadius: 10, border: `1px solid ${brd}`, background: soft,
          }}
        >
          <Search size={14} color={muted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.zSearch ?? 'Qidirish...'}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              color: txt, fontSize: 13,
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: muted, padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          title={t.aksiyaRefresh ?? 'Yangilash'}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10, border: `1px solid ${brd}`,
            background: soft, color: muted, cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
        </button>

        <span style={{ fontSize: 12, color: muted, whiteSpace: 'nowrap' }}>
          {filtered.length} {t.zRowCount ?? 'ta'}
        </span>
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px', borderRadius: 12, fontSize: 13,
            background: D ? '#3f1d1d' : '#fef2f2', color: D ? '#fca5a5' : '#b91c1c',
            border: `1px solid ${D ? '#7f1d1d' : '#fecaca'}`,
          }}
        >
          {error}
        </div>
      )}

      {/* List */}
      <div
        style={{
          flex: 1, minHeight: 0, overflow: 'auto', borderRadius: 14,
          border: `1px solid ${brd}`, background: card,
        }}
      >
        {loading && rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: muted, fontSize: 13 }}>
            {t.aksiyaLoading ?? 'Yuklanmoqda...'}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div
              style={{
                width: 52, height: 52, borderRadius: 16, margin: '0 auto 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: soft, color: '#6366f1',
              }}
            >
              <Zap size={22} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: txt, marginBottom: 4 }}>
              {t.aksiyaEmptyTitle ?? 'Aksiyalar yo\'q'}
            </div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 16 }}>
              {t.aksiyaEmptyDesc ?? 'Klient APKda ko\'rinadigan yangi aksiya yarating'}
            </div>
            <button
              type="button"
              onClick={openCreate}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10, border: 'none',
                background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              {t.aksiyaCreate ?? 'Aksiya yaratish'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
            {filtered.map((row) => (
              <div
                key={row.id}
                style={{
                  display: 'flex', gap: 12, alignItems: 'stretch',
                  borderRadius: 14, border: `1px solid ${brd}`, overflow: 'hidden',
                  background: D ? '#161618' : '#fafafa',
                }}
              >
                {/* Preview card */}
                <div
                  style={{
                    width: 220, minHeight: 100, flexShrink: 0, padding: 14,
                    background: `linear-gradient(135deg, ${row.colorStart}, ${row.colorEnd})`,
                    color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{row.title}</div>
                      {row.subtitle && (
                        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4, lineHeight: 1.3 }}>
                          {row.subtitle}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{row.emoji || '🎁'}</span>
                  </div>
                  {Number(row.discountPercent) > 0 && (
                    <div
                      style={{
                        alignSelf: 'flex-start', marginTop: 10,
                        padding: '3px 8px', borderRadius: 999,
                        background: 'rgba(255,255,255,0.22)', fontSize: 11, fontWeight: 700,
                      }}
                    >
                      {fmtPct(row.discountPercent)}
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div style={{ flex: 1, padding: '12px 12px 12px 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                        background: row.isActive ? (D ? '#064e3b' : '#d1fae5') : soft,
                        color: row.isActive ? (D ? '#6ee7b7' : '#047857') : muted,
                      }}
                    >
                      {row.isActive ? (t.aksiyaActive ?? 'Aktiv') : (t.aksiyaInactive ?? 'Nofaol')}
                    </span>
                    {(row.conditions && row.conditions.length > 0) || row.productName ? (
                      <span style={{ fontSize: 12, color: muted }}>
                        {t.aksiyaProduct ?? 'Mahsulot'}:{' '}
                        <b style={{ color: txt, fontWeight: 600 }}>
                          {row.conditions && row.conditions.length > 0
                            ? row.conditions.map((c) => {
                                const qty = (t.aksiyaConditionQty ?? 'kamida {n} ta')
                                  .replace('{n}', String(c.buyQuantity));
                                return `${c.productName}: ${qty}`;
                              }).join(', ')
                            : row.productName}
                        </b>
                        {(row.rewards && row.rewards.length > 0)
                          ? <> → {row.rewards.map((r) => `${r.productName}×${r.quantity}`).join(', ')}</>
                          : row.rewardProductName
                            ? <> → {row.rewardProductName}×{row.rewardQuantity ?? '?'}</>
                            : null}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: muted }}>
                        {t.aksiyaGeneral ?? 'Umumiy chegirma'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: muted }}>
                    {t.aksiyaUntil ?? 'Amal qiladi'}:{' '}
                    {row.validFrom || row.validTo
                      ? `${fmtDate(row.validFrom)} → ${fmtDate(row.validTo)}`
                      : (t.aksiyaUnlimited ?? 'Cheksiz (admin ochirmaguncha)')}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                    {COLOR_PRESETS.slice(0, 1).map(() => null)}
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 10px', borderRadius: 8, border: `1px solid ${brd}`,
                        background: soft, color: txt, fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      <Pencil size={13} />
                      {t.aksiyaEdit ?? 'Tahrirlash'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(row.id)}
                      disabled={deletingId === row.id}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 10px', borderRadius: 8, border: `1px solid ${D ? '#7f1d1d' : '#fecaca'}`,
                        background: D ? '#3f1d1d' : '#fef2f2', color: D ? '#fca5a5' : '#b91c1c',
                        fontSize: 12, cursor: 'pointer', opacity: deletingId === row.id ? 0.6 : 1,
                      }}
                    >
                      <Trash2 size={13} />
                      {t.aksiyaDelete ?? 'O\'chirish'}
                    </button>
                    {row.isActive && (
                      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: muted }}>
                        <Check size={12} color="#10b981" />
                        {t.aksiyaClientVisible ?? 'Klientda ko\'rinadi'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <AksiyaCreateModal
          D={D}
          t={t}
          initial={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}

      {deleteConfirmId && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => { if (!deletingId) setDeleteConfirmId(null); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 420, borderRadius: 18,
              border: `1px solid ${brd}`, background: card,
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)', padding: 20,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: txt, marginBottom: 8 }}>
              {t.aksiyaDeleteTitle ?? 'Aksiyani o\'chirish'}
            </div>
            <div style={{ fontSize: 13, color: muted, lineHeight: 1.5, marginBottom: 18 }}>
              {t.aksiyaDeleteConfirm ?? 'Aksiyani o\'chirishni xohlaysizmi?'}
              <br />
              {t.aksiyaDeleteWarn ?? 'O\'chirilgach klient va agentda ko\'rinmaydi.'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                disabled={!!deletingId}
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  padding: '9px 14px', borderRadius: 10, border: `1px solid ${brd}`,
                  background: soft, color: txt, fontSize: 13, cursor: 'pointer',
                }}
              >
                {t.taroziCancel ?? 'Bekor qilish'}
              </button>
              <button
                type="button"
                disabled={!!deletingId}
                onClick={() => void handleDelete(deleteConfirmId)}
                style={{
                  padding: '9px 16px', borderRadius: 10, border: 'none',
                  background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: deletingId ? 'wait' : 'pointer', opacity: deletingId ? 0.7 : 1,
                }}
              >
                {deletingId ? (t.aksiyaDeleting ?? 'O\'chirilmoqda...') : (t.aksiyaDelete ?? 'O\'chirish')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
