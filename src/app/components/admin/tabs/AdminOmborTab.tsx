import { useEffect, useMemo, useState } from 'react';
import { Package, RotateCcw, Warehouse, Check, Loader2 } from 'lucide-react';
import { AdminProductsTab } from '../../AdminProductsTab';
import { AdminQaytarishTab } from './AdminQaytarishTab';
import { useCompanies } from '../../CompaniesContext';
import { api } from '../../../api/client';

type OmborSub = 'mahsulotlar' | 'qaytarish';

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

export function AdminOmborTab({ D, card, divider, cardHover, text, sub, input, t, viewOrg, activeIds }: Props) {
  const [active, setActive] = useState<OmborSub>('mahsulotlar');
  const { companies, refresh } = useCompanies();

  const targetCompanyId = viewOrg !== 'all' ? viewOrg : (activeIds[0] ?? companies[0]?.id);
  const targetCompany = useMemo(
    () => companies.find(c => c.id === targetCompanyId),
    [companies, targetCompanyId],
  );

  const [warehouseName, setWarehouseName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setWarehouseName(targetCompany?.warehouseName?.trim() || '');
    setSaveError(null);
    setSavedFlash(false);
  }, [targetCompany?.id, targetCompany?.warehouseName]);

  const dirty = (warehouseName.trim() || '') !== (targetCompany?.warehouseName?.trim() || '');

  const saveWarehouse = async () => {
    if (!targetCompanyId || !dirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.updateCompany(targetCompanyId, {
        warehouseName: warehouseName.trim() || null,
      });
      await refresh();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const bg   = D ? '#0d0d0d'  : '#f4f5f7';
  const bg2  = D ? '#1c1c1e'  : '#ffffff';
  const bdr  = D ? '#2a2a2e'  : '#e5e7eb';
  const muted = D ? '#6b7280' : '#9ca3af';
  const acc  = '#6366f1';

  const TABS: { id: OmborSub; label: string; icon: React.ReactNode }[] = [
    {
      id: 'mahsulotlar',
      label: t.omborTabProducts ?? 'Mahsulotlar',
      icon: <Package size={15} strokeWidth={1.8} />,
    },
    {
      id: 'qaytarish',
      label: t.omborTabReturns ?? 'Qaytarilgan',
      icon: <RotateCcw size={15} strokeWidth={1.8} />,
    },
  ];

  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Sub-tab bar ── */}
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
          {TABS.map(tb => {
            const isActive = active === tb.id;
            return (
              <button
                key={tb.id}
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

        {/* ── Sklad nomi (organizatsiya bo'yicha) ── */}
        {targetCompany && (
          <div style={{
            padding: '10px 16px 12px',
            borderTop: `1px solid ${bdr}`,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: 10,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 220px', minWidth: 180 }}>
              <label style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: muted,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Warehouse size={11} />
                {t.omborSkladName ?? 'Sklad nomi'}
                <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: muted }}>
                  · {targetCompany.shortName || targetCompany.name}
                </span>
              </label>
              <input
                value={warehouseName}
                onChange={e => setWarehouseName(e.target.value)}
                placeholder={t.omborSkladPlaceholder ?? 'Masalan: Sklad SHERIN'}
                style={{
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: `1px solid ${bdr}`,
                  background: D ? '#111113' : '#fff',
                  color: text,
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
            <button
              onClick={saveWarehouse}
              disabled={!dirty || saving}
              style={{
                height: 34,
                padding: '0 14px',
                borderRadius: 8,
                border: 'none',
                background: !dirty || saving ? (D ? '#2a2a2e' : '#e5e7eb') : acc,
                color: !dirty || saving ? muted : '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: !dirty || saving ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
              }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : savedFlash ? <Check size={13} /> : null}
              {saving
                ? (t.saving ?? 'Saqlanmoqda...')
                : savedFlash
                  ? (t.saved ?? 'Saqlandi')
                  : (t.save ?? 'Saqlash')}
            </button>
            {saveError && (
              <span style={{ fontSize: 12, color: '#ef4444', width: '100%' }}>{saveError}</span>
            )}
            <span style={{ fontSize: 11, color: muted, width: '100%' }}>
              {t.omborSkladHint ?? 'Bu nom Tovar yuklash (Forma zayavki) da avtomatik chiqadi'}
            </span>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {active === 'mahsulotlar' && (
          <div className="px-5 md:px-8 py-6">
            <AdminProductsTab
              D={D}
              card={card}
              divider={divider}
              cardHover={cardHover}
              text={text}
              sub={sub}
              input={input}
              t={t}
              viewOrg={viewOrg}
              activeIds={activeIds}
            />
          </div>
        )}
        {active === 'qaytarish' && (
          <AdminQaytarishTab D={D} t={t} />
        )}
      </div>
    </div>
  );
}
