import { ArrowUpRight, Download } from 'lucide-react';
import { MiniLineChart, MiniBarChart, MiniDonutChart } from '../../MiniCharts';
import { AdminTip } from '../AdminTip';
import { fmt, salesChart, payPie, debtData, agentsReport } from '../../../data/adminData';

interface Props {
  D: boolean;
  card: string;
  divider: string;
  sub: string;
  t: Record<string, string>;
  showBalances: boolean;
  totalSales: number;
  totalPayments: number;
  totalDebt: number;
  planPct: number;
}

export function AdminReportsTab({
  D, card, divider, sub, t, showBalances,
  totalSales, totalPayments, totalDebt, planPct,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">{t.reportsTitle}</h2>
          <p className={`text-sm ${sub} mt-0.5`}>{t.financialAnalysis}</p>
        </div>
        <div className="flex items-center gap-2">
          {[t.periodWeekBtn, t.periodMonthBtn, t.periodYearBtn].map((p, i) => (
            <button key={i} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              i === 1 ? D ? 'bg-white text-black' : 'bg-gray-900 text-white' : `${sub} ${D ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`
            }`}>{p}</button>
          ))}
          <button className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
            <Download size={14} /> {t.exportBtn}
          </button>
        </div>
      </div>

      {/* Big revenue card */}
      <div className={`rounded-2xl border ${card} p-6`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className={`text-sm ${sub} mb-1`}>{t.currMonthSales}</p>
            <p className="text-4xl font-bold mb-2">{showBalances ? fmt(totalSales) : '••••'}</p>
            <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
              <ArrowUpRight size={15}/> <span>{t.vsLastMonthPct}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { l: t.payCol,   v: fmt(totalPayments), c: 'text-emerald-400' },
              { l: t.debtLabel, v: fmt(totalDebt),    c: 'text-rose-400' },
              { l: t.planLabel, v: `${planPct}%`,     c: 'text-indigo-400' },
            ].map((s, i) => (
              <div key={i}>
                <p className={`text-xl font-bold ${s.c}`}>{showBalances ? s.v : '••••'}</p>
                <p className={`text-xs ${sub} mt-0.5`}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-2xl border ${card} p-5`}>
          <h3 className="font-semibold mb-1">{t.monthlyTrend}</h3>
          <p className={`text-xs ${sub} mb-4`}>{t.salesAndPayments}</p>
          <div style={{ width: '100%', height: 200 }}>
            <MiniLineChart
              data={salesChart}
              labelKey="month"
              series={[
                { key: 'sales', name: t.sales, color: '#6366f1' },
                { key: 'payments', name: t.payments, color: '#10b981' },
              ]}
              dark={D}
              showDots
              height={200}
            />
          </div>
        </div>

        <div className={`rounded-2xl border ${card} p-5`}>
          <h3 className="font-semibold mb-1">{t.paymentMethods}</h3>
          <p className={`text-xs ${sub} mb-4`}>{t.distributionLabel}</p>
          <div className="flex items-center gap-4">
            <div style={{ flexShrink: 0 }}>
              <MiniDonutChart data={payPie} size={170} innerRadius={45} outerRadius={70} dark={D} />
            </div>
            <div className="flex-1 space-y-3">
              {payPie.map((d, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className={`text-sm ${sub}`}>{d.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{d.value}%</span>
                  </div>
                  <div className={`h-1.5 rounded-full ${D ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="h-1.5 rounded-full" style={{ width: `${d.value}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Agent performance table */}
      <div className={`rounded-2xl border ${card} overflow-hidden`}>
        <div className={`px-5 py-4 border-b ${divider}`}>
          <h3 className="font-semibold">{t.agentPerformance}</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className={`border-b ${divider}`}>
              {[t.colAgent, t.colSales, t.colPlan, t.colExec, t.debtLabel, t.payCol].map((h, i) => (
                <th key={i} className={`px-5 py-3 text-left text-xs font-medium ${sub}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...agentsReport].sort((a, b) => b.sales - a.sales).map((a, i) => {
              const p = Math.round((a.sales / a.plan) * 100);
              return (
                <tr key={a.id} className={i < agentsReport.length - 1 ? `border-b ${divider}` : ''}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${D ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{a.avatar}</div>
                      <span className="text-sm font-medium whitespace-nowrap">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold">{showBalances ? fmt(a.sales) : '••••'}</td>
                  <td className={`px-5 py-3.5 text-sm ${sub}`}>{showBalances ? fmt(a.plan) : '••••'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${p >= 80 ? 'bg-green-500/15 text-green-400' : p >= 50 ? 'bg-orange-500/15 text-orange-400' : 'bg-red-500/15 text-red-400'}`}>{p}%</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-rose-400">{showBalances ? fmt(a.debt) : '••••'}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-emerald-400">{showBalances ? fmt(a.payments) : '••••'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Debt aging */}
      <div className={`rounded-2xl border ${card} p-5`}>
        <h3 className="font-semibold mb-1">{t.debtAge}</h3>
        <p className={`text-xs ${sub} mb-5`}>{t.byDays}</p>
        <div style={{ width: '100%', height: 180 }}>
          <MiniBarChart
            data={debtData}
            labelKey="range"
            series={[{ key: 'amount', name: t.debtLabel, color: (d) => d.color as string }]}
            dark={D}
            showGrid
            barSize={50}
            height={180}
          />
        </div>
      </div>
    </div>
  );
}