import { ClipboardCheck } from 'lucide-react';

interface AdminUnpreparedOrdersTabProps {
  D: boolean;
  card: string;
  sub: string;
  t: Record<string, string>;
}

/** Placeholder — dona-only organizatsiyalar uchun Tarozi o‘rniga. Batafsil keyin. */
export function AdminUnpreparedOrdersTab({ D, card, sub, t }: AdminUnpreparedOrdersTabProps) {
  return (
    <div className={`rounded-2xl border p-8 md:p-12 flex flex-col items-center justify-center text-center min-h-[50vh] ${card}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${D ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
        <ClipboardCheck size={28} strokeWidth={1.8} />
      </div>
      <h2 className={`text-lg font-semibold mb-1.5 ${D ? 'text-white' : 'text-gray-900'}`}>
        {t.navUnpreparedOrders ?? 'Tayyorlanmagan buyurtmalar'}
      </h2>
      <p className={`text-sm max-w-md ${sub}`}>
        {t.unpreparedOrdersPlaceholder
          ?? 'Bu bo‘lim tez orada qo‘shiladi. Hozircha dona mahsulotli organizatsiyalar uchun Tarozi o‘rniga ko‘rsatiladi.'}
      </p>
    </div>
  );
}
