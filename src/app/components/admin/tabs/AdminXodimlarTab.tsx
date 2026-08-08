import { useState, useEffect } from 'react';
import { UserCheck, Users, Truck, ClipboardList, Layers, Contact, Briefcase } from 'lucide-react';
import { type AgentRow } from '../../../data/adminData';
import { AdminAgentsTab } from './AdminAgentsTab';
import { AdminSotrudnikiTab } from './AdminSotrudnikiTab';
import { AdminDostavkaTab } from './AdminDostavkaTab';
import { AdminPlanTab } from './AdminPlanTab';
import { AdminDepartmentsTab } from './AdminDepartmentsTab';
import { AdminPositionsTab } from './AdminPositionsTab';
import { AdminUsersTab } from './AdminUsersTab';
import type { EmployeeMarker } from '../../EmployeeMapModal';

type XodimlarSubTab = 'agents' | 'dostavka' | 'sotrudniki' | 'plan' | 'departments' | 'positions' | 'users';

interface Props {
  D: boolean;
  card: string;
  divider: string;
  cardHover: string;
  sub: string;
  t: Record<string, string>;
  activeAgents: AgentRow[];
  selectedCompanyIds: Set<string>;
  showBalances: boolean;
  openModal: (type: 'agent' | 'category' | 'terminal' | 'product') => void;
  setSelectedAgent: (a: AgentRow) => void;
  activeMapEmployees: EmployeeMarker[];
  mapCenterInfo: { center: [number, number]; label: string; zoom: number };
  setShowEmpMap: (v: boolean) => void;
  activeWeekly?: { day: string; visits: number; orders: number }[];
}

export function AdminXodimlarTab({
  D, card, divider, cardHover, sub, t,
  activeAgents, selectedCompanyIds, showBalances,
  openModal, setSelectedAgent,
  activeMapEmployees = [],
  mapCenterInfo = { center: [41.2995, 69.2401] as [number, number], label: "O'zbekiston", zoom: 6 },
  setShowEmpMap,
  activeWeekly = [],
}: Props) {
  const [subTab, setSubTab] = useState<XodimlarSubTab>('sotrudniki');
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 768);

  useEffect(() => {
    const check = () => setW(window.innerWidth);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isMobile = w < 768;
  const isSmall  = w < 450;

  const border      = D ? '#2a2a2a' : '#e5e7eb';
  const activeBg    = '#6366f1';
  const inactiveTxt = D ? '#9ca3af' : '#6b7280';
  const activeTxt   = '#fff';

  const tabs: { id: XodimlarSubTab; label: string; shortLabel: string; tinyLabel: string; icon: React.ComponentType<any> }[] = [
    { id: 'sotrudniki',  label: t.navSotrudniki  || "Xodimlar ro'yxati", shortLabel: t.shortLabelRoyyxat  || "Ro'yxat",  tinyLabel: t.shortLabelRoyyxat  || "Ro'yxat",  icon: Users         },
    { id: 'departments', label: t.navDepartments || "Bo'linmalar",       shortLabel: t.shortLabelDept     || "Bo'linma", tinyLabel: t.shortLabelDept     || "Bo'linma", icon: Layers        },
    { id: 'positions',   label: t.navPositions   || 'Lavozimlar',        shortLabel: t.shortLabelPos      || 'Lavozim',  tinyLabel: t.shortLabelPos      || 'Lavozim',  icon: Briefcase     },
    { id: 'users',       label: t.navUsers       || 'Foydalanuvchilar',  shortLabel: t.shortLabelUsers    || 'Foydal.',  tinyLabel: t.shortLabelUsers    || 'Foydal.',  icon: Contact       },
    { id: 'agents',      label: t.navAgents      || 'Agentlar',          shortLabel: t.shortLabelAgents   || 'Agentlar', tinyLabel: t.shortLabelAgents   || 'Agentlar', icon: UserCheck     },
    { id: 'dostavka',    label: t.dostavkaNav    || 'Yetkazish',         shortLabel: t.shortLabelDostavka || 'Yetkazish', tinyLabel: t.shortLabelDostavka || 'Yetkazish', icon: Truck         },
    { id: 'plan',        label: t.planNav        || 'Reja',              shortLabel: t.planNav || 'Reja',     tinyLabel: t.planNav || 'Reja',     icon: ClipboardList },
  ];

  return (
    <div style={{ width: '100%', minWidth: 0, overflowX: 'hidden' }}>
      {/* ── Tab bar ── */}
      {isSmall ? (
        /* ── SMALL (<450px): icon + tiny label stacked, flex:1 each ── */
        <div style={{
          display: 'flex',
          padding: '4px',
          borderRadius: 14,
          background: D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          border: `1px solid ${border}`,
          marginBottom: 14,
          gap: 2,
        }}>
          {tabs.map(tab => {
            const active = subTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 3,
                  padding: '6px 2px',
                  borderRadius: 10, border: 'none',
                  cursor: 'pointer', transition: 'all 0.18s',
                  background: active ? activeBg : 'transparent',
                  color: active ? activeTxt : inactiveTxt,
                  boxShadow: active ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                  minWidth: 0,
                }}
              >
                <Icon size={13} />
                <span style={{
                  fontSize: 9,
                  fontWeight: active ? 700 : 500,
                  lineHeight: 1.1,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                  padding: '0 2px',
                }}>
                  {tab.tinyLabel}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* ── NORMAL (≥450px): horizontal scrollable ── */
        <div style={{
          display: 'flex',
          gap: isMobile ? 3 : 6,
          marginBottom: 16,
          padding: '5px',
          borderRadius: 14,
          background: D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          border: `1px solid ${border}`,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        } as React.CSSProperties}>
          {tabs.map(tab => {
            const active = subTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  padding: isMobile ? '7px 12px' : '8px 18px',
                  borderRadius: 10, border: 'none',
                  cursor: 'pointer', transition: 'all 0.18s',
                  background: active ? activeBg : 'transparent',
                  color: active ? activeTxt : inactiveTxt,
                  fontWeight: active ? 700 : 500,
                  fontSize: isMobile ? 12 : 13.5,
                  boxShadow: active ? '0 2px 10px rgba(99,102,241,0.35)' : 'none',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={isMobile ? 13 : 15} style={{ flexShrink: 0 }} />
                {isMobile ? tab.shortLabel : tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Sub-tab content */}
      {subTab === 'users' && (
        <AdminUsersTab D={D} t={t} card={card} divider={divider} sub={sub} />
      )}
      {subTab === 'departments' && (
        <AdminDepartmentsTab D={D} t={t} />
      )}
      {subTab === 'positions' && (
        <AdminPositionsTab D={D} t={t} />
      )}
      {subTab === 'agents' && (
        <AdminSotrudnikiTab
          D={D} card={card} divider={divider} sub={sub} t={t}
          activeAgents={activeAgents} selectedCompanyIds={selectedCompanyIds}
          showBalances={showBalances}
          activeMapEmployees={activeMapEmployees}
          mapCenterInfo={mapCenterInfo}
          setShowEmpMap={setShowEmpMap}
          activeWeekly={activeWeekly}
        />
      )}
      {subTab === 'dostavka' && (
        <AdminDostavkaTab
          D={D} card={card} divider={divider} sub={sub} t={t}
          activeAgents={activeAgents} selectedCompanyIds={selectedCompanyIds}
          showBalances={showBalances}
        />
      )}
      {subTab === 'sotrudniki' && (
        <AdminAgentsTab
          D={D} card={card} divider={divider} cardHover={cardHover} sub={sub} t={t}
          activeAgents={activeAgents} selectedCompanyIds={selectedCompanyIds}
          showBalances={showBalances} openModal={openModal} setSelectedAgent={setSelectedAgent}
        />
      )}
      {subTab === 'plan' && (
        <AdminPlanTab
          D={D} card={card} sub={sub} t={t}
          activeAgents={activeAgents} selectedCompanyIds={selectedCompanyIds}
          showBalances={showBalances}
        />
      )}
    </div>
  );
}