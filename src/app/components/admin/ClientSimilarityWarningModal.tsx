import { AlertTriangle } from 'lucide-react';
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
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  labels?: SimilarityModalLabels;
};

export function ClientSimilarityWarningModal({
  D,
  match,
  busy,
  onCancel,
  onConfirm,
  title,
  confirmLabel,
  cancelLabel,
  labels = {},
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
  const risk = innBlocked ? 'red' : similarityRisk(match.overallPct);
  const colors = similarityRiskColors(risk, D);
  const riskLabel =
    risk === 'red' ? L.riskHigh : risk === 'yellow' ? L.riskMedium : L.riskLow;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={() => { if (!busy) onCancel(); }}
    >
      <div
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-5 sm:p-6 ${
          D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
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
            <p className="mt-1.5 text-sm font-bold" style={{ color: colors.color }}>
              {L.probability}: {match.overallPct}%
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
            {match.overallPct}%
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
            <p className={`text-xs mt-0.5 font-mono ${D ? 'text-gray-400' : 'text-gray-500'}`}>
              INN: {match.client.inn}
            </p>
          )}
          {match.client.phone && (
            <p className={`text-xs mt-0.5 ${D ? 'text-gray-400' : 'text-gray-500'}`}>{match.client.phone}</p>
          )}
        </div>

        <div className="flex flex-col gap-2.5 mb-5">
          {match.fields.map((f) => {
            const barColor =
              f.pct <= 0
                ? D
                  ? '#6b7280'
                  : '#9ca3af'
                : similarityRiskColors(f.pct >= 70 ? 'red' : f.pct >= 40 ? 'yellow' : 'green', D).color;
            return (
              <div key={f.key}>
                <div className="flex justify-between gap-2 mb-1">
                  <span className={`text-xs font-semibold ${D ? 'text-gray-400' : 'text-gray-500'}`}>
                    {fieldLabel(f.key)}
                  </span>
                  <span className="text-xs font-bold" style={{ color: barColor }}>
                    {f.pct}%
                  </span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${D ? 'bg-gray-800' : 'bg-gray-200'}`}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${f.pct}%`, background: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className={`grid gap-2.5 ${innBlocked ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className={`h-11 rounded-xl text-sm font-bold border transition-colors disabled:opacity-60 ${
              innBlocked
                ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-600 text-white'
                : D
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {innBlocked ? L.understand : L.cancelLabel}
          </button>
          {!innBlocked && (
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="h-11 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 shadow-lg shadow-indigo-500/20"
            >
              {L.confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
