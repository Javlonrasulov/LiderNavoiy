import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, Check, X, MapPin, Phone, User, Building2, AlertTriangle,
} from 'lucide-react';
import { useClientRequests, ClientRequestProvider } from '../ClientRequestContext';
import { useCompanies } from '../CompaniesContext';
import { useAdminAuth } from '../AdminAuthContext';
import { api } from '../../api/client';
import { getClientRequestCompareRows, resolvePreviousSnapshot, snapshotFromApiClient, type ClientRequestItem, type ClientRequestSnapshot } from '../../data/clientRequests';
import type { ClientRow } from '../../data/adminData';

interface Props {
  D: boolean;
  sub: string;
  text: string;
  t: Record<string, string>;
  existingClients?: ClientRow[];
  companyId?: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function RequestCard({
  item, D, sub, text, t, existingClients, companyId, onDone,
}: {
  item: ClientRequestItem;
  D: boolean;
  sub: string;
  text: string;
  t: Record<string, string>;
  existingClients: ClientRow[];
  companyId?: string;
  onDone: () => void;
}) {
  const { checkInn, approve, reject } = useClientRequests();
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fetchedPrev, setFetchedPrev] = useState<ClientRequestSnapshot | null>(null);
  const isUpdate = item.requestType === 'update';

  useEffect(() => {
    if (!isUpdate || !item.targetClientId) return;
    if (item.previousSnapshot) {
      setFetchedPrev(null);
      return;
    }
    const local = resolvePreviousSnapshot(item, existingClients);
    if (local) {
      setFetchedPrev(local);
      return;
    }
    let cancelled = false;
    void api.getClient(item.targetClientId)
      .then((c) => {
        if (!cancelled) setFetchedPrev(snapshotFromApiClient(c));
      })
      .catch(() => {
        if (!cancelled) setFetchedPrev(null);
      });
    return () => { cancelled = true; };
  }, [isUpdate, item.id, item.targetClientId, item.previousSnapshot, existingClients]);

  const prev = resolvePreviousSnapshot(item, existingClients, fetchedPrev);
  const compareRows = isUpdate
    ? getClientRequestCompareRows(item, prev, t)
    : [];
  const changedCount = compareRows.filter(r => r.changed).length;

  const dup = checkInn(
    item.inn,
    item.id,
    existingClients,
    isUpdate ? item.targetClientId : null,
  );

  const handleApprove = async () => {
    if (dup.duplicate) return;
    setActionError(null);
    setBusy('approve');
    try {
      const ok = await approve(item.id, companyId, existingClients);
      if (ok) {
        onDone();
      } else {
        setActionError(t.notifApproveFailed ?? 'Qabul qilib bo\'lmadi. INN takrorlanishi yoki so\'rov topilmadi.');
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : (t.notifApproveFailed ?? 'Qabul qilib bo\'lmadi'));
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    setBusy('reject');
    try {
      await reject(item.id);
      onDone();
    } finally {
      setBusy(null);
    }
  };

  const cardBg = D ? '#1a1a1a' : '#fff';
  const brd = D ? '#2a2a2e' : '#e5e7eb';

  return (
    <div
      className="rounded-xl border p-3 space-y-2"
      style={{ background: cardBg, borderColor: brd }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{
                background: isUpdate
                  ? (D ? 'rgba(59,130,246,0.2)' : '#eff6ff')
                  : (D ? 'rgba(16,185,129,0.2)' : '#ecfdf5'),
                color: isUpdate
                  ? (D ? '#93c5fd' : '#1d4ed8')
                  : (D ? '#6ee7b7' : '#047857'),
              }}
            >
              {isUpdate
                ? (t.notifTypeEdit ?? 'Tahrirlash')
                : (t.notifTypeNew ?? 'Yangi')}
            </span>
          </div>
          <p className="font-semibold text-sm truncate" style={{ color: text }}>{item.name}</p>
          {item.fullName && item.fullName !== item.name && (
            <p className="text-xs truncate" style={{ color: sub }}>{item.fullName}</p>
          )}
        </div>
        <span className="text-[10px] flex-shrink-0 whitespace-nowrap" style={{ color: sub }}>
          {formatDate(item.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-1 text-xs" style={{ color: sub }}>
        {item.agentName && (
          <span className="flex items-center gap-1.5">
            <User size={11} />{' '}
            {item.submitterPosition?.trim()
              || t.notifSubmitter
              || 'Yuboruvchi'}
            : <strong style={{ color: text }}>{item.agentName}</strong>
          </span>
        )}
        {!isUpdate && item.inn && (
          <span className="flex items-center gap-1.5">
            <Building2 size={11} /> INN: <strong style={{ color: text }}>{item.inn}</strong>
          </span>
        )}
        {!isUpdate && item.phone && (
          <span className="flex items-center gap-1.5">
            <Phone size={11} /> {item.phone}
          </span>
        )}
        {!isUpdate && item.address && (
          <span className="flex items-center gap-1.5">
            <MapPin size={11} className="flex-shrink-0" />
            <span className="truncate">{item.address}</span>
          </span>
        )}
        {!isUpdate && item.territory && <span>{t.colTerritory ?? 'Hudud'}: {item.territory}</span>}
        {!isUpdate && item.lineCode && <span>{t.colLine ?? 'Liniya'}: {item.lineCode}</span>}
        {!isUpdate && item.contactPerson && <span>{t.colContact ?? 'Kontakt'}: {item.contactPerson}</span>}
        {!isUpdate && item.category && <span>{t.colCategory ?? 'Kategoriya'}: {item.category}</span>}
        {!isUpdate && item.note && <span>{t.colNote ?? 'Izoh'}: {item.note}</span>}
      </div>

      {isUpdate && compareRows.length > 0 && (
        <div
          className="rounded-lg overflow-hidden"
          style={{
            border: `1px solid ${D ? 'rgba(59,130,246,0.25)' : '#bfdbfe'}`,
          }}
        >
          <div
            className="grid grid-cols-2 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: D ? 'rgba(59,130,246,0.15)' : '#dbeafe',
              color: D ? '#93c5fd' : '#1d4ed8',
            }}
          >
            <div className="px-2 py-1.5 border-r" style={{ borderColor: D ? 'rgba(59,130,246,0.25)' : '#bfdbfe' }}>
              {t.notifOldState ?? 'Eski holat'}
            </div>
            <div className="px-2 py-1.5">
              {t.notifNewState ?? 'O\'zgargan holat'}
              {changedCount > 0 && (
                <span className="ml-1 normal-case font-medium opacity-80">
                  ({changedCount})
                </span>
              )}
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: D ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}>
            {compareRows.map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-2 text-[11px] leading-snug"
                style={{
                  background: row.changed
                    ? (D ? 'rgba(245,158,11,0.08)' : '#fffbeb')
                    : undefined,
                }}
              >
                <div
                  className="px-2 py-1.5 border-r min-w-0"
                  style={{ borderColor: D ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}
                >
                  <p className="text-[9px] mb-0.5" style={{ color: sub }}>{row.label}</p>
                  <p
                    className={`break-words ${row.changed ? 'line-through' : ''}`}
                    style={{ color: row.changed ? (D ? '#9ca3af' : '#6b7280') : text }}
                  >
                    {row.from}
                  </p>
                </div>
                <div className="px-2 py-1.5 min-w-0">
                  <p className="text-[9px] mb-0.5" style={{ color: sub }}>{row.label}</p>
                  <p
                    className="break-words font-medium"
                    style={{
                      color: row.changed
                        ? (D ? '#fbbf24' : '#b45309')
                        : text,
                    }}
                  >
                    {row.to}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isUpdate && compareRows.length === 0 && (
        <p className="text-[11px]" style={{ color: sub }}>
          {t.notifNoFieldChanges ?? 'Maydon o\'zgarishi aniqlanmadi'}
        </p>
      )}

      {actionError && (
        <div
          className="flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs"
          style={{
            background: D ? 'rgba(239,68,68,0.12)' : '#fef2f2',
            color: D ? '#fca5a5' : '#b91c1c',
          }}
        >
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {dup.duplicate && (
        <div
          className="flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs"
          style={{
            background: D ? 'rgba(239,68,68,0.12)' : '#fef2f2',
            color: D ? '#fca5a5' : '#b91c1c',
          }}
        >
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            {dup.reason === 'client_exists'
              ? (t.notifInnExists ?? 'Bunday INN bilan mijoz tizimda mavjud — qabul qilib bo\'lmaydi')
              : (t.notifInnPending ?? 'Bunday INN bilan boshqa so\'rov mavjud')}
            {dup.existingClient && (
              <span className="block mt-0.5 font-medium">{dup.existingClient.name}</span>
            )}
          </span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={!!busy || dup.duplicate}
          onClick={handleApprove}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: '#10b981' }}
        >
          <Check size={13} />
          {busy === 'approve' ? '...' : (t.notifAccept ?? 'Qabul qilish')}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={handleReject}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: '#ef4444' }}
        >
          <X size={13} />
          {busy === 'reject' ? '...' : (t.notifReject ?? 'Bekor qilish')}
        </button>
      </div>
    </div>
  );
}

export function ClientRequestBell({ D, sub, text, t, existingClients = [], companyId }: Props) {
  return (
    <ClientRequestProvider companyId={companyId}>
      <ClientRequestBellInner
        D={D}
        sub={sub}
        text={text}
        t={t}
        existingClients={existingClients}
        companyId={companyId}
      />
    </ClientRequestProvider>
  );
}

function ClientRequestBellInner({ D, sub, text, t, existingClients = [], companyId }: Props) {
  const { pending, loading, error } = useClientRequests();
  const { companies, refresh: refreshCompanies } = useCompanies();
  const { selectedCompany, selectCompany } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [savingSkip, setSavingSkip] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const count = pending.length;

  const effectiveCompanyId =
    companyId ?? selectedCompany?.id ?? undefined;
  const company = companies.find(c => c.id === effectiveCompanyId)
    ?? (selectedCompany?.id === effectiveCompanyId ? selectedCompany : null);
  const skipApproval = !!company?.clientsAddWithoutApproval;
  /** UI: «Админ текшируви» — ёқилса сўров келади (foydalanuvchi tili) */
  const adminReviewOn = !skipApproval;

  const toggleAdminReview = async () => {
    if (!effectiveCompanyId || savingSkip) return;
    setSavingSkip(true);
    setSkipError(null);
    // Tekshiruvni O'CHIRISH = withoutApproval true
    const nextSkipApproval = adminReviewOn; // if currently ON, turning off → skip=true
    try {
      const updated = await api.updateCompany(effectiveCompanyId, {
        clientsAddWithoutApproval: nextSkipApproval,
      });
      await refreshCompanies();
      if (selectedCompany?.id === effectiveCompanyId) {
        selectCompany({
          ...selectedCompany,
          clientsAddWithoutApproval: !!updated.clientsAddWithoutApproval,
        });
      }
    } catch (e) {
      setSkipError(e instanceof Error ? e.message : 'Saqlashda xatolik');
    } finally {
      setSavingSkip(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    let removeListener: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      const close = (e: MouseEvent) => {
        const target = e.target as Node;
        if (btnRef.current?.contains(target)) return;
        if (panelRef.current?.contains(target)) return;
        setOpen(false);
      };
      document.addEventListener('mousedown', close);
      removeListener = () => document.removeEventListener('mousedown', close);
    }, 0);
    return () => {
      clearTimeout(timer);
      removeListener?.();
    };
  }, [open]);

  const panel = open && (() => {
    const r = btnRef.current?.getBoundingClientRect();
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const top = r ? r.bottom + 8 : 66;
    const right = isMobile ? undefined : (r ? window.innerWidth - r.right : 16);
    const left = isMobile ? '1rem' : undefined;
    const width = isMobile ? 'calc(100vw - 2rem)' : '380px';

    return createPortal(
      <>
        <div
          className="fixed inset-0 z-[240]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
        <div
          ref={panelRef}
          className={`fixed z-[241] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
            D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-100'
          }`}
          style={{
            top,
            right,
            left,
            width,
            maxWidth: '380px',
            maxHeight: 'min(70vh, 520px)',
          }}
        >
          <div className={`px-4 py-3 border-b flex-shrink-0 ${D ? 'border-gray-700' : 'border-gray-100'}`}>
            <p className={`text-sm font-semibold ${text}`}>
              {t.notifTitle ?? 'Bildirishnomalar'}
            </p>
            <p className={`text-xs mt-0.5 ${sub}`}>
              {t.notifSubtitle ?? 'Yangi mijoz yoki tahrirlash so\'rovlari shu yerda ko\'rinadi'}
            </p>

            {effectiveCompanyId ? (
              <div className="mt-3">
                <button
                  type="button"
                  disabled={savingSkip}
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleAdminReview();
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all disabled:opacity-60 ${
                    adminReviewOn
                      ? D
                        ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                        : 'border-amber-300 bg-amber-50 text-amber-800'
                      : D
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <span className="text-left leading-snug">
                    {t.notifAdminReview ?? 'Admin tekshiruvi'}
                  </span>
                  <span className={`w-10 h-5 rounded-full p-0.5 flex-shrink-0 transition-colors ${
                    adminReviewOn ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}>
                    <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      adminReviewOn ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </span>
                </button>
                <p className={`text-[10px] mt-1.5 leading-snug ${sub}`}>
                  {adminReviewOn
                    ? (t.notifAdminReviewOnHint ?? 'Yoqilgan: manager so\'rovi shu yerda chiqadi, siz tasdiqlaysiz')
                    : (t.notifAdminReviewOffHint ?? 'O\'chirilgan: manager mijozni darhol qo\'shadi (tekshiruvsiz)')}
                </p>
                {skipError && (
                  <p className="text-[10px] mt-1 text-red-500">{skipError}</p>
                )}
              </div>
            ) : (
              <p className={`text-[10px] mt-2 ${sub}`}>
                {t.notifSelectOneOrg ?? 'Sozlamani o\'zgartirish uchun bitta tashkilot tanlang'}
              </p>
            )}
          </div>

            <div className="overflow-y-auto p-3 space-y-3 flex-1">
              {error && (
                <p className="text-xs text-center py-4 text-red-500">{error}</p>
              )}
              {loading && pending.length === 0 && !error && (
                <p className={`text-xs text-center py-6 ${sub}`}>...</p>
              )}
              {!loading && pending.length === 0 && !error && (
                <p className={`text-xs text-center py-8 ${sub}`}>
                  {t.notifEmpty ?? 'Yangi so\'rovlar yo\'q'}
                </p>
              )}
            {pending.map(item => (
              <RequestCard
                key={item.id}
                item={item}
                D={D}
                sub={sub}
                text={text}
                t={t}
                existingClients={existingClients}
                companyId={companyId}
                onDone={() => setOpen(false)}
              />
            ))}
          </div>
        </div>
      </>,
      document.body,
    );
  })();

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(v => !v);
        }}
        title={t.notifTitle ?? 'Bildirishnomalar'}
        className={`relative w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-colors ${
          open
            ? 'bg-indigo-600 text-white'
            : D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        <Bell size={16} />
        {count > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
            style={{ background: '#ef4444' }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {panel}
    </>
  );
}
