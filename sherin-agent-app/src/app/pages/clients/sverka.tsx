import { useState, useRef } from 'react';
import { ChevronLeft, RefreshCw, MoreHorizontal, Plus, Minus } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { useNavigate, useParams } from 'react-router';
import { useCart } from '../../components/CartContext';
import { clients } from '../../data/clients';
import { getProductById } from '../../data/categories';

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n === 0) return '';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function isoFromDotDate(dot: string): string {
  const [d, m, y] = dot.split('.');
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

// ─── mock extra data so the document looks populated ─────────────────────────
const MOCK_PAYMENTS = [
  { id: 'p-mock-1', type: 'payment', opName: 'Касса-ТП № 168', credit: 382950,   date: '03.01.2026', ts: new Date('2026-01-03').getTime() },
  { id: 'p-mock-2', type: 'payment', opName: 'Банк № 9',        credit: 2626000,  date: '08.01.2026', ts: new Date('2026-01-08').getTime() },
  { id: 'p-mock-3', type: 'payment', opName: 'Банк № 12',       credit: 1954000,  date: '09.01.2026', ts: new Date('2026-01-09').getTime() },
  { id: 'p-mock-4', type: 'payment', opName: 'Банк № 65',       credit: 2500000,  date: '09.02.2026', ts: new Date('2026-02-09').getTime() },
  { id: 'p-mock-5', type: 'payment', opName: 'Банк № 83',       credit: 3000000,  date: '18.02.2026', ts: new Date('2026-02-18').getTime() },
];
const MOCK_ORDERS = [
  { id: 'o-mock-1', type: 'order', opName: 'Заявка № 3416',  debit: 763528.32,   date: '17.01.2026', ts: new Date('2026-01-17').getTime() },
  { id: 'o-mock-2', type: 'order', opName: 'Заявка № 7372',  debit: 1499700.24,  date: '31.01.2026', ts: new Date('2026-01-31').getTime() },
  { id: 'o-mock-3', type: 'order', opName: 'Заявка № 8967',  debit: 3503604.12,  date: '06.02.2026', ts: new Date('2026-02-06').getTime() },
  { id: 'o-mock-4', type: 'order', opName: 'Заявка № 11735', debit: 2737811.68,  date: '17.02.2026', ts: new Date('2026-02-17').getTime() },
  { id: 'o-mock-5', type: 'order', opName: 'Заявка № 14236', debit: 753304.28,   date: '25.02.2026', ts: new Date('2026-02-25').getTime() },
  { id: 'o-mock-6', type: 'order', opName: 'Заявка № 15648', debit: 2242873.76,  date: '02.03.2026', ts: new Date('2026-03-02').getTime() },
];

export default function Sverka() {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { getClientOrders, getClientPayments } = useCart();

  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate,   setToDate]   = useState('2026-03-06');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fromRef = useRef<HTMLInputElement>(null);
  const toRef   = useRef<HTMLInputElement>(null);

  const client = clients.find(c => c.id === Number(clientId));
  if (!client) { navigate('/clients'); return null; }

  const realOrders   = getClientOrders(client.id);
  const realPayments = getClientPayments(client.id);

  const fromMs = new Date(fromDate).getTime();
  const toMs   = new Date(toDate + 'T23:59:59').getTime();

  // Opening balance = client's static balance (pre-app debt)
  const openingBalance = client.balance;

  // Build timeline from real + mock data
  type TxRow = {
    id: string;
    isOrder: boolean;
    date: string;
    ts: number;
    opName: string;
    debit: number;
    credit: number;
    orderId?: string;
  };

  const rows: TxRow[] = [
    // real orders
    ...realOrders
      .filter(o => o.timestamp >= fromMs && o.timestamp <= toMs)
      .map(o => ({
        id: o.id,
        isOrder: true,
        date: o.date,
        ts: o.timestamp,
        opName: `Заявка № ${o.id.slice(-5).toUpperCase()}`,
        debit: o.total,
        credit: 0,
        orderId: o.id,
      })),
    // real payments
    ...realPayments
      .filter(p => p.timestamp >= fromMs && p.timestamp <= toMs)
      .map(p => ({
        id: p.id,
        isOrder: false,
        date: p.date,
        ts: p.timestamp,
        opName: p.note || 'Касса-ТП',
        debit: 0,
        credit: p.amount,
      })),
    // mock orders
    ...MOCK_ORDERS
      .filter(o => {
        const t = o.ts; return t >= fromMs && t <= toMs;
      })
      .map(o => ({ id: o.id, isOrder: true, date: o.date, ts: o.ts, opName: o.opName, debit: o.debit, credit: 0 })),
    // mock payments
    ...MOCK_PAYMENTS
      .filter(p => {
        const t = p.ts; return t >= fromMs && t <= toMs;
      })
      .map(p => ({ id: p.id, isOrder: false, date: p.date, ts: p.ts, opName: p.opName, debit: 0, credit: p.credit })),
  ].sort((a, b) => a.ts - b.ts);

  const totalDebit  = rows.reduce((s, r) => s + r.debit,  0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  const orgName = 'OOO "BORAN LEADERS"';

  const labels = {
    uz_latn: { title: 'ХИСОБЛАШУВ ДАЛОЛАТНОМАСИ', davr: 'Давр :', sana: 'Сана', op: 'Операция', deb: 'Дебет', kre: 'Кредит', oborot: 'Жами оборот', qarz: 'Қарз', avans: 'Аванс', gaKoldik: 'га колдик', sum: 'сум' },
    uz_cyrl: { title: 'ҲИСОБЛАШУВ ДАЛОЛАТНОМАСИ', davr: 'Давр :', sana: 'Сана', op: 'Операция', deb: 'Дебет', kre: 'Кредит', oborot: 'Жами оборот', qarz: 'Қарз', avans: 'Аванс', gaKoldik: 'га колдик', sum: 'сум' },
    ru:      { title: 'АКТ СВЕРКИ РАСЧЁТОВ',       davr: 'Период:',sana: 'Дата', op: 'Операция', deb: 'Дебет', kre: 'Кредит', oborot: 'Итого оборот', qarz: 'Долг',  avans: 'Аванс', gaKoldik: 'нач/кон. остаток', sum: 'сум' },
  }[language];

  const bg  = isDark ? 'bg-black'    : 'bg-gray-50';
  const doc = isDark ? 'bg-gray-950' : 'bg-white';
  const bdr = isDark ? 'border-gray-800' : 'border-gray-200';
  const txt = isDark ? 'text-white'  : 'text-gray-900';
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <style>{`
        .sv-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        .sv-scrollbar::-webkit-scrollbar { display:none; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity:0; position:absolute; inset:0; width:100%; height:100%; cursor:pointer; }
      `}</style>

      <div className="max-w-md mx-auto min-h-screen flex flex-col">

        {/* ── Top Bar ── */}
        <div className={`flex items-center justify-between px-4 pt-10 pb-3 ${isDark ? 'bg-gray-950' : 'bg-white'} border-b ${bdr}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/client/${clientId}`)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <ChevronLeft size={22} className={txt} />
            </button>
            <span className={`text-base font-bold tracking-tight ${txt}`}>{client.name}</span>
          </div>
          <button className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
            <MoreHorizontal size={20} className={muted} />
          </button>
        </div>

        {/* ── Date Range Picker ── */}
        <div className={`flex items-center gap-3 px-5 py-3 ${isDark ? 'bg-gray-950' : 'bg-white'} border-b ${bdr}`}>
          {/* From */}
          <div className="relative">
            <button
              onClick={() => fromRef.current?.showPicker?.()}
              className="text-teal-500 font-bold text-lg tracking-tight tabular-nums"
            >
              {fmtDate(fromDate)}
            </button>
            <input
              ref={fromRef}
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>

          {/* To */}
          <div className="relative">
            <button
              onClick={() => toRef.current?.showPicker?.()}
              className="text-teal-500 font-bold text-lg tracking-tight tabular-nums"
            >
              {fmtDate(toDate)}
            </button>
            <input
              ref={toRef}
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={() => { setFromDate('2026-01-01'); setToDate('2026-03-06'); }}
            className="ml-1 w-8 h-8 flex items-center justify-center rounded-full text-teal-500 hover:bg-teal-500/10 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* ── Document ── */}
        <div className="flex-1 sv-scrollbar overflow-y-auto px-3 py-4">
          <div className={`rounded-2xl overflow-hidden border ${bdr} ${doc}`}>

            {/* Doc title */}
            <div className={`text-center py-3 border-b ${bdr}`}>
              <p className={`text-xs font-bold tracking-wide ${txt}`}>{labels.title}</p>
              <p className={`text-xs ${muted} mt-0.5`}>
                {labels.davr}{'  '}{fmtDate(fromDate)}{'    '}{fmtDate(toDate)}
              </p>
            </div>

            {/* Client + org info */}
            <div className={`flex items-start justify-between gap-2 px-3 py-2 border-b ${bdr}`}>
              <p className={`text-xs ${muted} flex-1`}>{client.code} — {client.name}</p>
              <p className={`text-xs font-medium ${txt} flex-shrink-0`}>{orgName}</p>
            </div>

            {/* Table header */}
            <div className={`grid border-b ${bdr} ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
              style={{ gridTemplateColumns: '20px 1fr 1fr 1fr 1fr' }}>
              <div />
              <div className={`text-xs font-semibold py-2 px-1 ${txt}`}>{labels.sana}</div>
              <div className={`text-xs font-semibold py-2 px-1 ${txt}`}>{labels.op}</div>
              <div className={`text-xs font-semibold py-2 px-1 text-right ${txt}`}>{labels.deb}</div>
              <div className={`text-xs font-semibold py-2 px-1 text-right ${txt}`}>{labels.kre}</div>
            </div>

            {/* Opening balance row */}
            <div className={`border-b ${bdr} ${isDark ? 'bg-gray-900/50' : 'bg-gray-50/80'}`}>
              <p className={`text-xs font-semibold py-2 px-3 text-center ${txt}`}>
                {fmtDate(fromDate)} {labels.gaKoldik}
              </p>
              {openingBalance !== 0 && (
                <div className={`grid pb-2`} style={{ gridTemplateColumns: '20px 1fr 1fr 1fr 1fr' }}>
                  <div />
                  <div />
                  <div />
                  <div className={`text-xs px-1 text-right tabular-nums ${openingBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {openingBalance > 0 ? fmtNum(openingBalance) : ''}
                  </div>
                  <div className={`text-xs px-1 text-right tabular-nums ${openingBalance < 0 ? 'text-green-500' : ''}`}>
                    {openingBalance < 0 ? fmtNum(Math.abs(openingBalance)) : ''}
                  </div>
                </div>
              )}
            </div>

            {/* Transaction rows */}
            {rows.length === 0 ? (
              <div className={`text-center py-10 ${muted} text-sm`}>Ma'lumot yo'q</div>
            ) : (
              rows.map((row) => {
                const isExpanded = expandedId === row.id;
                const realOrder = row.orderId ? getClientOrders(client.id).find(o => o.id === row.orderId) : null;

                return (
                  <div key={row.id} className={`border-b ${bdr}`}>
                    {/* Main row */}
                    <div
                      className={`grid items-center transition-colors ${row.isOrder ? 'cursor-pointer' : ''} ${
                        isDark ? 'hover:bg-gray-900/60' : 'hover:bg-gray-50'
                      }`}
                      style={{ gridTemplateColumns: '20px 1fr 1fr 1fr 1fr' }}
                      onClick={() => row.isOrder && setExpandedId(isExpanded ? null : row.id)}
                    >
                      {/* Expand icon */}
                      <div className="flex items-center justify-center py-2 pl-1">
                        {row.isOrder ? (
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            isExpanded
                              ? 'bg-teal-500 border-teal-500 text-white'
                              : isDark ? 'border-gray-600 text-gray-400' : 'border-gray-400 text-gray-500'
                          }`}>
                            {isExpanded
                              ? <Minus size={9} />
                              : <Plus size={9} />
                            }
                          </div>
                        ) : <div />}
                      </div>

                      <div className={`text-xs py-2.5 px-1 tabular-nums ${muted}`}>{row.date}</div>
                      <div className={`text-xs py-2.5 px-1 ${txt} truncate`}>{row.opName}</div>
                      <div className={`text-xs py-2.5 px-1 text-right tabular-nums ${row.debit > 0 ? 'text-red-500' : muted}`}>
                        {fmtNum(row.debit)}
                      </div>
                      <div className={`text-xs py-2.5 px-1 text-right tabular-nums ${row.credit > 0 ? 'text-green-500' : muted}`}>
                        {fmtNum(row.credit)}
                      </div>
                    </div>

                    {/* Expanded order items */}
                    {isExpanded && realOrder && realOrder.items && (
                      <div className={`px-4 pb-2 pt-1 space-y-1.5 ${isDark ? 'bg-gray-900/40' : 'bg-gray-50/80'}`}>
                        {realOrder.items.map((item, i) => {
                          const pd = getProductById(item.productId);
                          return (
                            <div key={i} className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs ${txt} truncate`}>{pd?.product.name || `#${item.productId}`}</p>
                                <p className={`text-xs ${muted}`}>{item.quantity} × {item.price.toLocaleString('ru-RU')}</p>
                              </div>
                              <p className={`text-xs font-medium tabular-nums ${txt} flex-shrink-0`}>
                                {(item.quantity * item.price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Jami oborot */}
            <div className={`grid border-b ${bdr} ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
              style={{ gridTemplateColumns: '20px 1fr 1fr 1fr 1fr' }}>
              <div />
              <div />
              <div className={`text-xs font-bold py-2.5 px-1 ${txt}`}>{labels.oborot}</div>
              <div className={`text-xs font-bold py-2.5 px-1 text-right tabular-nums text-red-500`}>
                {totalDebit > 0 ? fmtNum(totalDebit) : ''}
              </div>
              <div className={`text-xs font-bold py-2.5 px-1 text-right tabular-nums text-green-500`}>
                {totalCredit > 0 ? fmtNum(totalCredit) : ''}
              </div>
            </div>

            {/* Closing balance date */}
            <div className={`border-b ${bdr} ${isDark ? 'bg-gray-900/50' : 'bg-gray-50/80'}`}>
              <p className={`text-xs font-semibold py-2 px-3 text-center ${txt}`}>
                {fmtDate(toDate)} {labels.gaKoldik}
              </p>
            </div>

            {/* Debt row */}
            <div className="px-4 py-3 flex items-center gap-2">
              <span className={`text-xs font-bold ${closingBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {closingBalance > 0 ? labels.qarz : labels.avans}
              </span>
              <span className={`text-sm font-bold tabular-nums ${closingBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {fmtNum(Math.abs(closingBalance))} {labels.sum}
              </span>
            </div>

          </div>

          <div className="h-8" />
        </div>

      </div>
    </div>
  );
}
