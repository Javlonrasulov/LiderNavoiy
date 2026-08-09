import { AlertCircle, ArrowDownRight, ArrowUpRight, BarChart3, ChevronRight, DollarSign, MapPin, Star, TrendingUp } from 'lucide-react';
import { MiniLineChart, MiniBarChart, MiniDonutChart } from '../../MiniCharts';
import { InlineEmployeeMap } from '../../InlineEmployeeMap';
import { fmt, type AgentRow, type ChartRow } from '../../../data/adminData';
import { AdminTip } from '../AdminTip';
import type { EmployeeMarker } from '../../EmployeeMapModal';
import { useCompanies } from '../../CompaniesContext';

interface Props {
  D: boolean;
  card: string;
  divider: string;
  cardHover: string;
  sub: string;
  t: Record<string, string>;
  showBalances: boolean;
  activeKpi: {
    sales: number;
    payments: number;
    debt: number;
    plan: number;
    planPct: number;
    salesTrend?: number;
    paymentsTrend?: number;
    debtTrend?: number;
    planTrend?: number;
  };
  salesPeriod: 'kun' | 'hafta' | 'oy';
  setSalesPeriod: (p: 'kun' | 'hafta' | 'oy') => void;
  aggSalesChart: ChartRow[];
  aggSalesChartWeek: ChartRow[];
  aggSalesChartDay: ChartRow[];
  activeCatPie: { name: string; value: number; color: string }[];
  weeklyView: 'map' | 'chart';
  setWeeklyView: (v: 'map' | 'chart') => void;
  activeWeekly: { day: string; visits: number; orders: number }[];
  activeMapEmployees: EmployeeMarker[];
  mapCenterInfo: { center: [number, number]; label: string; zoom: number };
  activeAgents: AgentRow[];
  selectedCompanyIds: Set<string>;
  setShowEmpMap: (v: boolean) => void;
  setTab: (t: any) => void;
  setSelectedAgent: (a: AgentRow) => void;
}

export function AdminDashboardTab({
  D, card, divider, cardHover, sub, t,
  showBalances, activeKpi,
  salesPeriod, setSalesPeriod,
  aggSalesChart, aggSalesChartWeek, aggSalesChartDay,
  activeCatPie, weeklyView, setWeeklyView,
  activeWeekly, activeMapEmployees, mapCenterInfo,
  activeAgents, selectedCompanyIds,
  setShowEmpMap, setTab, setSelectedAgent,
}: Props) {
  const { companies: COMPANIES } = useCompanies();
  const formatTrend = (n?: number) => {
    const v = n ?? 0;
    return `${v > 0 ? '+' : ''}${v}%`;
  };

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t.totalSales, value: fmt(activeKpi.sales), change: formatTrend(activeKpi.salesTrend), up: (activeKpi.salesTrend ?? 0) >= 0, grad: 'from-indigo-600 to-purple-600', icon: TrendingUp },
          { label: t.totalPayments, value: fmt(activeKpi.payments), change: formatTrend(activeKpi.paymentsTrend), up: (activeKpi.paymentsTrend ?? 0) >= 0, grad: 'from-emerald-600 to-teal-600', icon: DollarSign },
          { label: t.totalDebt, value: fmt(activeKpi.debt), change: formatTrend(activeKpi.debtTrend), up: (activeKpi.debtTrend ?? 0) <= 0, grad: 'from-rose-600 to-pink-600', icon: AlertCircle },
          { label: t.planExec, value: `${activeKpi.planPct}%`, change: formatTrend(activeKpi.planTrend), up: (activeKpi.planTrend ?? 0) >= 0, grad: 'from-orange-500 to-amber-500', icon: Star },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className={`bg-gradient-to-br ${k.grad} rounded-2xl p-5 text-white relative overflow-hidden`}>
              <div className="absolute right-4 top-4 opacity-20"><Icon size={36} /></div>
              <p className="text-xs font-medium opacity-75 mb-2">{k.label}</p>
              <p className="text-3xl font-bold mb-1">{showBalances ? k.value : '••••'}</p>
              <div className="flex items-center gap-1 text-xs opacity-80">
                {k.up ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                {k.change} {t.vsLastMonth}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 rounded-2xl border ${card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">{t.salesDynamics}</h3>
              <p className={`text-xs ${sub} mt-0.5`}>
                {salesPeriod === 'kun' ? t.currentWeekDays : salesPeriod === 'hafta' ? t.currentMonthWeeks : t.last6months}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center rounded-xl p-0.5 ${D ? 'bg-gray-800' : 'bg-gray-100'}`}>
                {(['kun', 'hafta', 'oy'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setSalesPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      salesPeriod === p
                        ? D ? 'bg-indigo-500 text-white shadow' : 'bg-white text-indigo-600 shadow'
                        : sub
                    }`}
                  >
                    {p === 'kun' ? t.periodDay : p === 'hafta' ? t.periodWeek : t.periodMonth}
                  </button>
                ))}
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"/><span className={sub}>{t.sales}</span></div>
              </div>
            </div>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <MiniLineChart
              data={salesPeriod === 'kun' ? aggSalesChartDay : salesPeriod === 'hafta' ? aggSalesChartWeek : aggSalesChart}
              labelKey="month"
              series={[{ key: 'sales', name: t.sales, color: '#6366f1' }]}
              dark={D}
              height={220}
              smooth={true}
              showDots={true}
            />
          </div>
        </div>

        <div className={`rounded-2xl border ${card} p-5`}>
          <h3 className="font-semibold mb-1">{t.clientDist}</h3>
          <p className={`text-xs ${sub} mb-4`}>{t.byCategory}</p>
          <div style={{ width: '100%', height: 150 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <MiniDonutChart data={activeCatPie} size={150} innerRadius={40} outerRadius={65} dark={D} />
            </div>
          </div>
          <div className="space-y-2 mt-3">
            {activeCatPie.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className={`text-sm ${sub}`}>{d.name}</span>
                </div>
                <span className="text-sm font-semibold">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`rounded-2xl border ${card} p-5 overflow-hidden`}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold">{t.weeklyVisitsTitle}</h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {weeklyView === 'chart' && (
                <button
                  onClick={() => setWeeklyView('map')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all
                    ${D ? 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                >
                  <MapPin size={11} /><span>{t.empMapBtn}</span>
                </button>
              )}
              {weeklyView === 'map' && (
                <button
                  onClick={() => setWeeklyView('chart')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all
                    ${D ? 'bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                >
                  <BarChart3 size={11} /><span>{t.visitsLabel}</span>
                </button>
              )}
            </div>
          </div>
          <p className={`text-xs ${sub} mb-3`}>{weeklyView === 'map' ? mapCenterInfo.label : t.thisWeek}</p>
          {weeklyView === 'map' && (
            <InlineEmployeeMap
              employees={activeMapEmployees}
              centerCoord={mapCenterInfo.center}
              initialZoom={mapCenterInfo.zoom}
              dark={D}
              height={220}
              t={t}
              onExpand={() => setShowEmpMap(true)}
            />
          )}
          {weeklyView === 'chart' && (
            <div style={{ width: '100%', height: 165 }}>
              <MiniBarChart
                data={activeWeekly}
                labelKey="day"
                series={[
                  { key: 'visits', name: t.visitsLabel, color: '#6366f1' },
                  { key: 'orders', name: t.ordersLabel, color: '#10b981' },
                ]}
                dark={D}
                height={165}
                showLabels
              />
            </div>
          )}
        </div>

        <div className={`lg:col-span-2 rounded-2xl border ${card} overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${divider} flex items-center justify-between`}>
            <h3 className="font-semibold">{t.topAgents}</h3>
            <button onClick={() => setTab('xodimlar')} className={`text-xs ${sub} flex items-center gap-1 hover:text-indigo-400 transition-colors`}>
              {t.allBtn} <ChevronRight size={13}/>
            </button>
          </div>
          <div className="divide-y divide-inherit">
            {activeAgents.length === 0 && (
              <p className={`px-5 py-8 text-center text-sm ${sub}`}>
                {t.noData ?? 'Ma\'lumot yo\'q'}
              </p>
            )}
            {[...activeAgents].sort((a, b) => b.sales - a.sales).slice(0, 5).map((agent, i) => {
              const p = Math.round((agent.sales / agent.plan) * 100);
              const orgInfo = COMPANIES.find(c => c.id === agent.orgId);
              return (
                <div key={agent.id} className={`px-5 py-4 flex items-center gap-4 ${cardHover} transition-colors cursor-pointer`}
                  onClick={() => setSelectedAgent(agent)}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : 'bg-orange-500/20 text-orange-400'
                  }`}>{i + 1}</div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${D ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    {agent.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{agent.name}</p>
                      {selectedCompanyIds.size > 1 && orgInfo && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 ${D ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                          {orgInfo.icon} {orgInfo.shortName}
                        </span>
                      )}
                    </div>
                    <div className={`h-1.5 rounded-full mt-1.5 ${D ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <div className={`h-1.5 rounded-full ${p >= 80 ? 'bg-green-500' : p >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(p, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">{showBalances ? fmt(agent.sales) : '••••'}</p>
                    <p className={`text-xs ${sub}`}>{p}% {t.planLabel}</p>
                  </div>
                  <ChevronRight size={15} className={sub} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}