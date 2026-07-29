import { useState } from 'react';
import { ClipboardList, Package, ArrowLeft, Zap } from 'lucide-react';
import { ZayavkiPage }                              from './prodaji/ZayavkiPage';
import { TovarYuklashPage }                         from './prodaji/TovarYuklashPage';
import { TovarYuklashCreateModal, ConfirmedOrder }  from './prodaji/TovarYuklashCreateModal';
import { AksiyalarPage }                            from './prodaji/AksiyalarPage';

type ProdajiSub = 'zayavki' | 'tovarYuklash' | 'aksiyalar';

interface AdminProdajiTabProps {
  D: boolean;
  sub: string;
  t: Record<string, string>;
  selectedCompanyIds?: Set<string>;
}

export function AdminProdajiTab({ D, t, selectedCompanyIds }: AdminProdajiTabProps) {
  const [active,        setActive]        = useState<ProdajiSub>('zayavki');
  const [showCreate,    setShowCreate]    = useState(false);
  const [pendingOrders, setPendingOrders] = useState<ConfirmedOrder[]>([]);

  const handleConfirm = (order: ConfirmedOrder) => {
    setPendingOrders(prev => [order, ...prev]);
    setShowCreate(false);
    setActive('tovarYuklash');
  };

  const card  = D ? '#1c1c1e' : '#ffffff';
  const brd   = D ? '#2a2a2e' : '#e5e7eb';
  const muted = D ? '#6b7280' : '#9ca3af';
  const txt   = D ? '#f2f2f7' : '#111827';

  const TABS: { id: ProdajiSub; label: string; icon: React.ReactNode }[] = [
    {
      id: 'zayavki',
      label: t.prodajiZayavki ?? 'Buyurtmalar',
      icon: <ClipboardList size={15} strokeWidth={1.8} />,
    },
    {
      id: 'tovarYuklash',
      label: t.prodajiTovarYuklash ?? 'Tovar yuklash',
      icon: <Package size={15} strokeWidth={1.8} />,
    },
    {
      id: 'aksiyalar',
      label: t.prodajiAksiyalar ?? 'Aksiyalar',
      icon: <Zap size={15} strokeWidth={1.8} />,
    },
  ];

  /* ── Handle tab click — exit create mode if switching ── */
  const handleTabClick = (id: ProdajiSub) => {
    setActive(id);
    setShowCreate(false);
  };

  return (
    <div className="space-y-3 flex flex-col flex-1 min-h-0">

      {/* ── Tab menu ── */}
      <div
        className={`rounded-2xl border flex-shrink-0 ${D ? 'border-gray-800' : 'border-gray-200'}`}
        style={{ background: card }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', overflowX: 'auto' }}>

          {/* Back arrow — only visible in create mode */}
          {showCreate && (
            <button
              onClick={() => setShowCreate(false)}
              title={t.goBack ?? 'Orqaga'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 8, border: `1px solid ${brd}`,
                background: 'transparent', color: muted, cursor: 'pointer',
                flexShrink: 0, marginRight: 2, transition: 'background 0.15s',
              }}
            >
              <ArrowLeft size={15} strokeWidth={2} />
            </button>
          )}

          {TABS.map(tb => {
            /* In create mode, highlight "Tovar yuklash" tab */
            const isActive = showCreate
              ? tb.id === 'tovarYuklash'
              : active === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => handleTabClick(tb.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, border: 'none',
                  background: isActive ? '#6366f1' : (D ? '#2a2a2e' : '#f3f4f6'),
                  color: isActive ? '#fff' : muted,
                  fontSize: 13, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {tb.icon}
                <span>{tb.label}</span>
              </button>
            );
          })}

          {/* Breadcrumb › label in create mode */}
          {showCreate && (
            <>
              <span style={{ color: brd, fontSize: 16, userSelect: 'none', flexShrink: 0 }}>›</span>
              <span style={{
                fontSize: 13, color: txt, fontWeight: 600,
                padding: '7px 0', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {t.tovarYuklashNewTitle ?? 'Yangi yuklash'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Create view — full page (no modal overlay) ── */}
        {showCreate && (
          <TovarYuklashCreateModal
            D={D}
            t={t}
            onClose={() => setShowCreate(false)}
            pageMode={true}
            onConfirm={handleConfirm}
            selectedCompanyIds={selectedCompanyIds}
          />
        )}

        {/* ── List views ── */}
        {!showCreate && active === 'zayavki' && (
          <ZayavkiPage D={D} t={t} selectedCompanyIds={selectedCompanyIds} />
        )}
        {!showCreate && active === 'tovarYuklash' && (
          <TovarYuklashPage
            D={D}
            t={t}
            pendingOrders={pendingOrders}
            selectedCompanyIds={selectedCompanyIds}
            onCreateClick={() => {
              setActive('tovarYuklash');
              setShowCreate(true);
            }}
          />
        )}
        {!showCreate && active === 'aksiyalar' && (
          <AksiyalarPage D={D} t={t} />
        )}
      </div>
    </div>
  );
}
