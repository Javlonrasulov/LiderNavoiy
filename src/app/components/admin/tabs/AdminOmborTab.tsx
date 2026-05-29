import { useState } from 'react';
import { Package, RotateCcw } from 'lucide-react';
import { AdminProductsTab } from '../../AdminProductsTab';
import { AdminQaytarishTab } from './AdminQaytarishTab';

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