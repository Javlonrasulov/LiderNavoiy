import { useState } from 'react';
import { X, Maximize2, Minimize2, Save, ChevronDown } from 'lucide-react';

/* ────────────────────────────── Types ──────────────────────────────── */
interface Props {
  D:       boolean;
  t:       Record<string, string>;
  onClose: () => void;
  onSave?: (data: BonusStrafForm) => void;
}

export interface BonusStrafForm {
  num:              string;
  date:             string;
  datePostavchik:   string;
  supplier:         string;
  direction:        string;
  org:              string;
  author:           string;
  bonusPayForm:     string;
  bonusOpType:      string;
  bonusSum:         string;
  bonusCurrency:    'UZS' | 'USD';
  bonusRate:        string;
  bonusIncomeItem:  string;
  bonusNote:        string;
  strafPayForm:     string;
  strafOpType:      string;
  strafSum:         string;
  strafCurrency:    'UZS' | 'USD';
  strafRate:        string;
  strafExpenseItem: string;
  strafNote:        string;
}

/* ─────────────────────────── Static data ───────────────────────────── */
const SUPPLIERS     = ['"IMILKY" MCHJ', 'SOF IN MChJ', 'BORAN LEADERS LLC', 'SHERIN AGRO'];
const DIRECTIONS    = ['SHERIN', 'SOF IN', 'IMILKY', 'BORAN'];
const ORGS          = ['OOO "BORAN LEADERS"', 'OOO "SHERIN TRADE"', 'IP Karimov'];
const PAY_FORMS     = ['Наличные', 'Безналичные', 'Карта'];
const OP_TYPES      = ['Скидка', 'Бонус за объём', 'Ретро-бонус', 'Штраф за просрочку', 'Штраф за качество'];
const INCOME_ITEMS  = ['Доход от скидок', 'Прочие доходы', 'Бонусные доходы'];
const EXPENSE_ITEMS = ['Штрафы поставщикам', 'Прочие расходы', 'Операционные расходы'];
const AUTHORS       = ['Менеджер', 'Администратор', 'Директор'];

function nowStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const INIT: BonusStrafForm = {
  num:'1', date: nowStr(), datePostavchik: nowStr(),
  supplier: SUPPLIERS[0], direction: DIRECTIONS[0], org: ORGS[0], author: AUTHORS[0],
  bonusPayForm:'', bonusOpType:'', bonusSum:'', bonusCurrency:'UZS', bonusRate:'', bonusIncomeItem:'', bonusNote:'',
  strafPayForm:'', strafOpType:'', strafSum:'', strafCurrency:'UZS', strafRate:'', strafExpenseItem:'', strafNote:'',
};

/* ────────────────────── Sub-components ─────────────────────────────── */
function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
      {text}{required && <span className="text-rose-400 ml-0.5">*</span>}
    </p>
  );
}

function FInput({
  D, value, onChange, placeholder, type = 'text',
}: { D:boolean; value:string; onChange:(v:string)=>void; placeholder?:string; type?:string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border px-3 py-2.5 text-xs outline-none transition-all
        focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500
        ${D
          ? 'bg-[#1c1c1e] border-[#2a2a2e] text-white placeholder:text-gray-600'
          : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
        }`}
    />
  );
}

function FSelect({
  D, value, onChange, options, empty,
}: { D:boolean; value:string; onChange:(v:string)=>void; options:string[]; empty?:string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full rounded-xl border px-3 py-2.5 pr-8 text-xs outline-none transition-all appearance-none cursor-pointer
          focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500
          ${D
            ? 'bg-[#1c1c1e] border-[#2a2a2e] text-white'
            : 'bg-white border-gray-200 text-gray-900'
          }`}
      >
        {empty && <option value="">{empty}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown
        size={13}
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${D ? 'text-gray-500' : 'text-gray-400'}`}
      />
    </div>
  );
}

function FTextarea({
  D, value, onChange, placeholder,
}: { D:boolean; value:string; onChange:(v:string)=>void; placeholder?:string }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className={`w-full rounded-xl border px-3 py-2.5 text-xs outline-none transition-all resize-none
        focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500
        ${D
          ? 'bg-[#1c1c1e] border-[#2a2a2e] text-white placeholder:text-gray-600'
          : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
        }`}
    />
  );
}

/* ── Currency Toggle ── */
function CurrencyToggle({
  D, value, onChange,
}: { D: boolean; value: 'UZS' | 'USD'; onChange: (v: 'UZS' | 'USD') => void }) {
  return (
    <div className={`inline-flex rounded-xl border p-0.5 ${D ? 'border-[#2a2a2e] bg-[#1c1c1e]' : 'border-gray-200 bg-gray-100'}`}>
      {(['UZS', 'USD'] as const).map(cur => (
        <button
          key={cur}
          type="button"
          onClick={() => onChange(cur)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide transition-all ${
            value === cur
              ? cur === 'USD'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                : D ? 'bg-[#2a2a2e] text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
              : D ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          {cur}
        </button>
      ))}
    </div>
  );
}

/* ── Rate Input (shows only when USD selected) ── */
function RateInput({ D, value, onChange }: { D: boolean; value: string; onChange: (v: string) => void }) {
  return (
    <div className={`flex items-center gap-2 mt-2 rounded-xl border px-3 py-2 ${
      D ? 'bg-amber-500/[0.06] border-amber-500/25' : 'bg-amber-50 border-amber-200'
    }`}>
      <span className={`text-[10px] font-semibold whitespace-nowrap ${D ? 'text-amber-400' : 'text-amber-600'}`}>
        1 USD =
      </span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="12 700"
        className={`flex-1 bg-transparent outline-none text-xs font-semibold tabular-nums min-w-0
          ${D ? 'text-amber-300 placeholder:text-amber-700' : 'text-amber-700 placeholder:text-amber-300'}`}
      />
      <span className={`text-[10px] font-bold ${D ? 'text-amber-500' : 'text-amber-500'}`}>UZS</span>
    </div>
  );
}

/* ═══════════════════════════ Main Modal ════════════════════════════════ */
export function BonusStrafCreateModal({ D, t, onClose, onSave }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [form, setForm]   = useState<BonusStrafForm>(INIT);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof BonusStrafForm) => (v: string) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    onSave?.(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /* ── Style tokens (matches other CRM modals) ── */
  const bg      = D ? 'bg-[#0d0d0d]'               : 'bg-white';
  const panel   = D ? 'bg-[#111111] border-[#1f1f1f]' : 'bg-gray-50 border-gray-200';
  const hdr     = D ? 'bg-[#161618] border-[#1f1f1f]' : 'bg-gray-50 border-gray-200';
  const bdr     = D ? 'border-[#1f1f1f]'            : 'border-gray-200';
  const divider = D ? 'border-[#222224]'             : 'border-gray-100';
  const sub     = D ? 'text-gray-500'                : 'text-gray-400';
  const iconBtn = D
    ? 'p-1.5 rounded-lg hover:bg-white/[0.07] transition-colors'
    : 'p-1.5 rounded-lg hover:bg-gray-100 transition-colors';

  const bonusTotal = parseFloat(form.bonusSum) || 0;
  const strafTotal = parseFloat(form.strafSum) || 0;

  /* UZS ekvivalenti */
  const bonusRate  = parseFloat(form.bonusRate)  || 0;
  const strafRate  = parseFloat(form.strafRate)  || 0;
  const bonusUzs   = form.bonusCurrency === 'USD' && bonusRate > 0 ? bonusTotal * bonusRate : bonusTotal;
  const strafUzs   = form.strafCurrency === 'USD' && strafRate  > 0 ? strafTotal  * strafRate  : strafTotal;

  return (
    <div
      className="fixed inset-0 z-[280] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`flex flex-col ${bg} shadow-2xl w-full transition-all duration-300 ${
        fullscreen
          ? 'fixed inset-0 rounded-none'
          : 'sm:w-[97vw] sm:max-w-[860px] sm:max-h-[92vh] sm:rounded-2xl rounded-t-3xl max-h-[94vh]'
      } overflow-hidden`}>

        {/* ── drag handle (mobile) ── */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className={`w-9 h-[3px] rounded-full ${D ? 'bg-gray-700' : 'bg-gray-300'}`} />
        </div>

        {/* ══════════════ HEADER ══════════════ */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${bdr} ${hdr} flex-shrink-0`}>

          {/* Icon */}
          <div className={`hidden sm:flex w-8 h-8 rounded-xl items-center justify-center flex-shrink-0 ${
            D ? 'bg-indigo-500/15' : 'bg-indigo-50'
          }`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={D ? '#818cf8' : '#6366f1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4l3 3"/>
            </svg>
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`text-sm font-bold ${D ? 'text-white' : 'text-gray-900'}`}>
                {t.bnsCreateTitle ?? 'Бонусы и штрафы — создать'}
              </h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                D ? 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/25'
                  : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
              }`}>
                № {form.num}
              </span>
            </div>
            <p className={`text-[10px] mt-0.5 ${sub}`}>{form.date} · {form.supplier}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Save */}
            <button
              onClick={handleSave}
              title={t.bnsSave ?? 'Сохранить'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                saved
                  ? D ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-600'
                  : D ? 'border-[#2a2a2e] hover:bg-white/[0.06] text-gray-300'
                      : 'border-gray-200 hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Save size={12} />
              <span className="hidden sm:inline">
                {saved ? (t.bnsSaved ?? 'Сохранено') : (t.bnsSave ?? 'Сохранить')}
              </span>
            </button>

            <button onClick={() => setFullscreen(v => !v)} className={`hidden sm:flex ${iconBtn}`}>
              {fullscreen
                ? <Minimize2 size={14} className={sub} />
                : <Maximize2 size={14} className={sub} />}
            </button>

            <button onClick={onClose} className={iconBtn}>
              <X size={16} className={sub} />
            </button>
          </div>
        </div>

        {/* ══════════════ BODY ══════════════ */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-3 sm:p-4 space-y-3">

            {/* ── Asosiy ma'lumotlar ── */}
            <div className={`rounded-2xl border ${panel} p-3 sm:p-4`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${sub} mb-3`}>
                {t.bnsMainInfo ?? 'Основные данные'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-3">
                <div>
                  <Label text={t.bnsFieldNum ?? 'Номер'} required />
                  <FInput D={D} value={form.num} onChange={set('num')} placeholder="1" />
                </div>
                <div>
                  <Label text={t.bnsFieldDate ?? 'Дата'} required />
                  <FInput D={D} value={form.date} onChange={set('date')} />
                </div>
                <div>
                  <Label text={t.bnsFieldDatePost ?? 'Дата поставщика'} />
                  <FInput D={D} value={form.datePostavchik} onChange={set('datePostavchik')} />
                </div>
                <div>
                  <Label text={t.bnsFieldDir ?? 'Направление'} required />
                  <FSelect D={D} value={form.direction} onChange={set('direction')} options={DIRECTIONS} />
                </div>
                <div>
                  <Label text={t.bnsFieldOrg ?? 'Организация'} />
                  <FSelect D={D} value={form.org} onChange={set('org')} options={ORGS} />
                </div>
                <div>
                  <Label text={t.bnsFieldAuthor ?? 'Автор'} />
                  <FSelect D={D} value={form.author} onChange={set('author')} options={AUTHORS} />
                </div>
              </div>

              {/* Supplier — wide */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label text={t.bnsFieldSupplier ?? 'Поставщик'} required />
                  <FSelect
                    D={D} value={form.supplier} onChange={set('supplier')}
                    options={SUPPLIERS}
                    empty={t.bnsSupplierEmpty ?? 'Поставщик tanlang'}
                  />
                </div>
              </div>
            </div>

            {/* ── BONUS + SHTRAF ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* ─── BONUS ─── */}
              <div className={`rounded-2xl border ${panel} overflow-hidden`}>
                {/* section header */}
                <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${divider} ${
                  D ? 'bg-emerald-500/[0.06]' : 'bg-emerald-50/70'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <p className={`text-xs font-bold tracking-widest uppercase ${
                    D ? 'text-emerald-400' : 'text-emerald-600'
                  }`}>
                    {t.bnsBonusSection ?? 'БОНУС'}
                  </p>
                  {bonusTotal > 0 && (
                    <span className={`ml-auto text-xs font-bold tabular-nums ${
                      D ? 'text-emerald-400' : 'text-emerald-600'
                    }`}>
                      +{bonusTotal.toLocaleString('ru-RU')}
                    </span>
                  )}
                </div>

                <div className="p-3 sm:p-4 space-y-3">
                  <div>
                    <Label text={t.bnsPayForm ?? 'Форма оплаты'} />
                    <FSelect D={D} value={form.bonusPayForm} onChange={set('bonusPayForm')}
                      options={PAY_FORMS} empty={t.bnsChoose ?? 'Tanla'} />
                  </div>
                  <div>
                    <Label text={t.bnsOpType ?? 'Вид операции'} />
                    <FSelect D={D} value={form.bonusOpType} onChange={set('bonusOpType')}
                      options={OP_TYPES} empty={t.bnsChoose ?? 'Tanla'} />
                  </div>
                  <div>
                    <Label text={t.bnsSumma ?? 'Сумма'} />
                    <FInput D={D} type="number" value={form.bonusSum} onChange={set('bonusSum')} placeholder="0" />
                    {/* UZS equivalent preview */}
                    {form.bonusCurrency === 'USD' && bonusTotal > 0 && bonusRate > 0 && (
                      <div className={`mt-1.5 flex items-center justify-between rounded-lg px-2.5 py-1.5 ${
                        D ? 'bg-emerald-500/[0.08] border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'
                      }`}>
                        <span className={`text-[10px] ${D ? 'text-emerald-500' : 'text-emerald-500'}`}>
                          {bonusTotal.toLocaleString('ru-RU')} USD × {bonusRate.toLocaleString('ru-RU')} =
                        </span>
                        <span className={`text-[11px] font-bold tabular-nums ${D ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {bonusUzs.toLocaleString('ru-RU')} UZS
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label text={t.bnsCurrency ?? 'Валюта'} />
                    <CurrencyToggle D={D} value={form.bonusCurrency} onChange={v => set('bonusCurrency')(v)} />
                  </div>
                  {form.bonusCurrency === 'USD' && (
                    <div>
                      <RateInput D={D} value={form.bonusRate} onChange={set('bonusRate')} />
                    </div>
                  )}
                  <div>
                    <Label text={t.bnsIncomeItem ?? 'Статья дохода'} />
                    <FSelect D={D} value={form.bonusIncomeItem} onChange={set('bonusIncomeItem')}
                      options={INCOME_ITEMS} empty={t.bnsChoose ?? 'Tanla'} />
                  </div>
                  <div>
                    <Label text={t.bnsNote ?? 'Примечание'} />
                    <FTextarea D={D} value={form.bonusNote} onChange={set('bonusNote')}
                      placeholder={t.bnsNotePlaceholder ?? 'Январ ойи скидка...'} />
                  </div>
                </div>
              </div>

              {/* ─── SHTRAF ─── */}
              <div className={`rounded-2xl border ${panel} overflow-hidden`}>
                {/* section header */}
                <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${divider} ${
                  D ? 'bg-rose-500/[0.06]' : 'bg-rose-50/70'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                  <p className={`text-xs font-bold tracking-widest uppercase ${
                    D ? 'text-rose-400' : 'text-rose-600'
                  }`}>
                    {t.bnsStrafSection ?? 'ШТРАФ'}
                  </p>
                  {strafTotal > 0 && (
                    <span className={`ml-auto text-xs font-bold tabular-nums ${
                      D ? 'text-rose-400' : 'text-rose-600'
                    }`}>
                      -{strafTotal.toLocaleString('ru-RU')}
                    </span>
                  )}
                </div>

                <div className="p-3 sm:p-4 space-y-3">
                  <div>
                    <Label text={t.bnsPayForm ?? 'Форма оплаты'} />
                    <FSelect D={D} value={form.strafPayForm} onChange={set('strafPayForm')}
                      options={PAY_FORMS} empty={t.bnsChoose ?? 'Tanla'} />
                  </div>
                  <div>
                    <Label text={t.bnsOpType ?? 'Вид операции'} />
                    <FSelect D={D} value={form.strafOpType} onChange={set('strafOpType')}
                      options={OP_TYPES} empty={t.bnsChoose ?? 'Tanla'} />
                  </div>
                  <div>
                    <Label text={t.bnsSumma ?? 'Сумма'} />
                    <FInput D={D} type="number" value={form.strafSum} onChange={set('strafSum')} placeholder="0" />
                    {/* UZS equivalent preview */}
                    {form.strafCurrency === 'USD' && strafTotal > 0 && strafRate > 0 && (
                      <div className={`mt-1.5 flex items-center justify-between rounded-lg px-2.5 py-1.5 ${
                        D ? 'bg-rose-500/[0.08] border border-rose-500/20' : 'bg-rose-50 border border-rose-100'
                      }`}>
                        <span className={`text-[10px] ${D ? 'text-rose-500' : 'text-rose-400'}`}>
                          {strafTotal.toLocaleString('ru-RU')} USD × {strafRate.toLocaleString('ru-RU')} =
                        </span>
                        <span className={`text-[11px] font-bold tabular-nums ${D ? 'text-rose-400' : 'text-rose-600'}`}>
                          {strafUzs.toLocaleString('ru-RU')} UZS
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label text={t.bnsCurrency ?? 'Валюта'} />
                    <CurrencyToggle D={D} value={form.strafCurrency} onChange={v => set('strafCurrency')(v)} />
                  </div>
                  {form.strafCurrency === 'USD' && (
                    <div>
                      <RateInput D={D} value={form.strafRate} onChange={set('strafRate')} />
                    </div>
                  )}
                  <div>
                    <Label text={t.bnsExpenseItem ?? 'Статья расхода'} />
                    <FSelect D={D} value={form.strafExpenseItem} onChange={set('strafExpenseItem')}
                      options={EXPENSE_ITEMS} empty={t.bnsChoose ?? 'Tanla'} />
                  </div>
                  <div>
                    <Label text={t.bnsNote ?? 'Примечание'} />
                    <FTextarea D={D} value={form.strafNote} onChange={set('strafNote')}
                      placeholder={t.bnsNotePlaceholder ?? 'Примечание...'} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Jami / net ── */}
            {(bonusTotal > 0 || strafTotal > 0) && (
              <div className={`rounded-2xl border ${panel} px-4 py-3`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className={`text-xs font-semibold ${sub}`}>
                    {t.bnsSummaryTitle ?? 'Натижа'}
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    {bonusTotal > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold tabular-nums text-emerald-400">
                          +{bonusTotal.toLocaleString('ru-RU')}
                          {form.bonusCurrency === 'USD' ? ' $' : ''}
                        </span>
                        {form.bonusCurrency === 'USD' && bonusRate > 0 && (
                          <span className={`text-[10px] tabular-nums ${D ? 'text-emerald-600' : 'text-emerald-400'}`}>
                            ({bonusUzs.toLocaleString('ru-RU')} UZS)
                          </span>
                        )}
                        <span className={`text-[10px] ${sub}`}>{t.bnsBonusSection ?? 'бонус'}</span>
                      </div>
                    )}
                    {strafTotal > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span className="text-xs font-bold tabular-nums text-rose-400">
                          -{strafTotal.toLocaleString('ru-RU')}
                          {form.strafCurrency === 'USD' ? ' $' : ''}
                        </span>
                        {form.strafCurrency === 'USD' && strafRate > 0 && (
                          <span className={`text-[10px] tabular-nums ${D ? 'text-rose-600' : 'text-rose-400'}`}>
                            ({strafUzs.toLocaleString('ru-RU')} UZS)
                          </span>
                        )}
                        <span className={`text-[10px] ${sub}`}>{t.bnsStrafSection ?? 'штраф'}</span>
                      </div>
                    )}
                    {bonusTotal > 0 && strafTotal > 0 && (
                      <>
                        <span className={`text-xs ${sub}`}>=</span>
                        <span className={`text-xs font-bold tabular-nums ${
                          bonusUzs - strafUzs >= 0
                            ? D ? 'text-emerald-400' : 'text-emerald-600'
                            : D ? 'text-rose-400'    : 'text-rose-600'
                        }`}>
                          {bonusUzs - strafUzs >= 0 ? '+' : ''}
                          {(bonusUzs - strafUzs).toLocaleString('ru-RU')} UZS
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ══ MOBILE BOTTOM BAR ══ */}
        <div className={`sm:hidden border-t ${bdr} px-4 py-3 flex-shrink-0 ${hdr}`}>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                saved
                  ? D ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              }`}
            >
              <Save size={14} />
              {saved ? (t.bnsSaved ?? 'Сохранено') : (t.bnsSave ?? 'Сохранить')}
            </button>
            <button
              onClick={onClose}
              className={`flex items-center justify-center w-11 h-11 rounded-xl border transition-colors ${
                D ? 'border-[#2a2a2e] hover:bg-white/[0.06]' : 'border-gray-200 hover:bg-gray-100'
              }`}
            >
              <X size={16} className={sub} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}