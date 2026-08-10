import { AlertTriangle, X } from 'lucide-react';
import {
  SIMILARITY_FIELD_LABELS,
  hasExactInnCollision,
  similarityRisk,
  similarityRiskColors,
  type SimilarityFieldKey,
  type SimilarityMatch,
} from '../../utils/clientSimilarity';

export type SimilarityModalLabels = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  probability?: string;
  riskHigh?: string;
  riskMedium?: string;
  riskLow?: string;
  foundClient?: string;
  innBlocked?: string;
  understand?: string;
  fieldName?: string;
  fieldFullName?: string;
  fieldPhone?: string;
  fieldInn?: string;
  fieldTerritory?: string;
};

type Props = {
  D: boolean;
  match: SimilarityMatch;
  busy?: boolean;
  /** «O‘tkazib yuborish» — keyingi qadam (masalan keyingi mijoz) */
  onCancel: () => void;
  onConfirm: () => void;
  /** X / overlay — dialogni yopish (importni to‘xtatish). Berilmasa onCancel */
  onClose?: () => void;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  labels?: SimilarityModalLabels;
  /** Import progress: joriy indeks (1-based) va jami */
  progressIndex?: number;
  progressTotal?: number;
  progressHint?: string;
};

export function ClientSimilarityWarningModal({
  D,
  match,
  busy,
  onCancel,
  onConfirm,
  onClose,
  title,
  confirmLabel,
  cancelLabel,
  labels = {},
  progressIndex,
  progressTotal,
  progressHint,
}: Props) {
  const L = {
    title: title ?? labels.title ?? "O'xshash mijoz topildi",
    confirmLabel: confirmLabel ?? labels.confirmLabel ?? "Baribir qo'shish",
    cancelLabel: cancelLabel ?? labels.cancelLabel ?? 'Bekor qilish',
    probability: labels.probability ?? "O'xshashlik ehtimoli",
    riskHigh: labels.riskHigh ?? 'Yuqori xavf',
    riskMedium: labels.riskMedium ?? "O'rtacha xavf",
    riskLow: labels.riskLow ?? 'Past xavf',
    foundClient: labels.foundClient ?? 'Topilgan mijoz',
    innBlocked:
      labels.innBlocked ??
      "Bir xil INN bilan mijoz allaqachon mavjud. «Baribir qo'shish» mumkin emas — INN ni o'zgartiring yoki mavjud mijozni tahrirlang.",
    understand: labels.understand ?? 'Tushunarli',
    fieldName: labels.fieldName ?? SIMILARITY_FIELD_LABELS.name,
    fieldFullName: labels.fieldFullName ?? SIMILARITY_FIELD_LABELS.fullName,
    fieldPhone: labels.fieldPhone ?? SIMILARITY_FIELD_LABELS.phone,
    fieldInn: labels.fieldInn ?? SIMILARITY_FIELD_LABELS.inn,
    fieldTerritory: labels.fieldTerritory ?? SIMILARITY_FIELD_LABELS.territory,
  };

  const fieldLabel = (key: SimilarityFieldKey): string => {
    switch (key) {
      case 'name':
        return L.fieldName;
      case 'fullName':
        return L.fieldFullName;
      case 'phone':
        return L.fieldPhone;
      case 'inn':
        return L.fieldInn;
      case 'territory':
        return L.fieldTerritory;
      default:
        return SIMILARITY_FIELD_LABELS[key] ?? key;
    }
  };

  const innBlocked = hasExactInnCollision(match);
  const displayPct = innBlocked ? 100 : match.overallPct;
  const risk = innBlocked ? 'red' : similarityRisk(match.overallPct);
  const colors = similarityRiskColors(risk, D);
  const riskLabel =
    risk === 'red' ? L.riskHigh : risk === 'yellow' ? L.riskMedium : L.riskLow;

  const fieldsOrdered = [...match.fields].sort((a, b) => {
    if (a.key === 'inn') return -1;
    if (b.key === 'inn') return 1;
    return 0;
  });

  const closeOnly = () => {
    if (busy) return;
    (onClose ?? onCancel)();
  };

  const skipOrCancel = () => {
    if (busy) return;
    onCancel();
  };

  const remaining =
    progressIndex != null && progressTotal != null && progressTotal > 0
      ? Math.max(0, progressTotal - progressIndex + 1)
      : null;
  const progressText =
    progressHint
    || (progressIndex != null && progressTotal != null
      ? `${progressIndex} / ${progressTotal}${remaining != null ? ` · ${remaining} ta qoldi` : ''}`
      : null);

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={closeOnly}
    >
      <div
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-5 sm:p-6 ${
          D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={busy}
          onClick={closeOnly}
          aria-label="Close"
          className={`absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50
            ${D ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3 mb-4 pr-8">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              innBlocked
                ? D ? 'bg-rose-500/15' : 'bg-rose-50'
                : D ? 'bg-indigo-500/15' : 'bg-indigo-50'
            }`}
          >
            <AlertTriangle
              size={20}
              className={innBlocked ? 'text-rose-500' : 'text-indigo-500'}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-base font-bold ${D ? 'text-white' : 'text-gray-900'}`}>{L.title}</p>
            {progressText && (
              <p className={`mt-1 text-xs font-semibold tabular-nums ${D ? 'text-indigo-300' : 'text-indigo-600'}`}>
                {progressText}
              </p>
            )}
            <p className="mt-1.5 text-sm font-bold" style={{ color: colors.color }}>
              {L.probability}: {displayPct}%
              {innBlocked ? ' · INN 100%' : ''}
            </p>
            <span
              className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: colors.color }} />
              {riskLabel}
            </span>
          </div>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shrink-0"
            style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}
          >
            {displayPct}%
          </div>
        </div>

        {innBlocked && (
          <div
            className={`mb-4 rounded-xl px-3 py-2.5 text-xs font-semibold leading-relaxed border ${
              D
                ? 'bg-rose-500/10 border-rose-500/35 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {L.innBlocked}
          </div>
        )}

        <div
          className={`rounded-xl p-3 mb-4 border ${
            D ? 'bg-[#121212] border-gray-800' : 'bg-gray-50 border-gray-100'
          }`}
          style={{ borderColor: colors.border }}
        >
          <p className={`text-[11px] font-semibold ${D ? 'text-gray-400' : 'text-gray-500'}`}>
            {L.foundClient}
          </p>
          <p className={`mt-1 text-sm font-bold ${D ? 'text-white' : 'text-gray-900'}`}>
            {match.client.name || '—'}
          </p>
          {match.client.inn && (
            <p
              className={`text-xs mt-0.5 font-mono font-bold ${
                innBlocked ? 'text-rose-500' : D ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              INN: {match.client.inn}
              {innBlocked ? ' · 100%' : ''}
            </p>
          )}
          {match.client.phone && (
            <p className={`text-xs mt-0.5 ${D ? 'text-gray-400' : 'text-gray-500'}`}>{match.client.phone}</p>
          )}
        </div>

        <div className="flex flex-col gap-2.5 mb-5">
          {fieldsOrdered.map((f) => {
            const pct = f.key === 'inn' && innBlocked ? 100 : f.pct;
            const barColor =
              pct <= 0
                ? D
                  ? '#6b7280'
                  : '#9ca3af'
                : similarityRiskColors(pct >= 70 ? 'red' : pct >= 40 ? 'yellow' : 'green', D).color;
            return (
              <div key={f.key}>
                <div className="flex justify-between gap-2 mb-1">
                  <span className={`text-xs font-semibold ${D ? 'text-gray-400' : 'text-gray-500'}`}>
                    {fieldLabel(f.key)}
                  </span>
                  <span className="text-xs font-bold" style={{ color: barColor }}>
                    {pct}%
                  </span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${D ? 'bg-gray-800' : 'bg-gray-200'}`}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={skipOrCancel}
            className={`h-11 rounded-xl text-sm font-bold border transition-colors disabled:opacity-60 ${
              D
                ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {innBlocked ? L.understand : L.cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy || innBlocked}
            onClick={() => {
              if (innBlocked || busy) return;
              onConfirm();
            }}
            title={innBlocked ? L.innBlocked : undefined}
            className={`h-11 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-500/20
              ${innBlocked
                ? 'bg-gray-400 cursor-not-allowed opacity-50 shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60'}`}
          >
            {L.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
