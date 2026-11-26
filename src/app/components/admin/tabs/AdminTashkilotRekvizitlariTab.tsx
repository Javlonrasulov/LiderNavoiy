import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Warehouse,
  X,
} from 'lucide-react';
import { useCompanies } from '../../CompaniesContext';
import {
  api,
  type CompanyBankAccount,
  type CompanySocialLink,
  type PaymentTerminalRow,
} from '../../../api/client';

type SubTab = 'accounts' | 'terminals' | 'social';

interface Props {
  D: boolean;
  card: string;
  divider: string;
  text: string;
  sub: string;
  input: string;
  t: Record<string, string>;
  viewOrg: string;
  activeIds: string[];
}

type OrgForm = {
  orgCode: string;
  shortName: string;
  fullLegalName: string;
  legalAddress: string;
  phone: string;
  callCenterPhone: string;
  inn: string;
  vatCode: string;
  rekvizitNote: string;
  cashCashboxName: string;
  clickCashboxName: string;
  warehouseName: string;
  primaryBankAccountId: string;
};

type AccForm = {
  code: string;
  name: string;
  accountNumber: string;
  bankName: string;
  mfo: string;
  isPrimary: boolean;
};

type TermForm = {
  code: string;
  name: string;
  externalId: string;
  account23510: string;
  bankAccountId: string;
  isActive: boolean;
};

const emptyOrg = (): OrgForm => ({
  orgCode: '',
  shortName: '',
  fullLegalName: '',
  legalAddress: '',
  phone: '',
  callCenterPhone: '',
  inn: '',
  vatCode: '',
  rekvizitNote: '',
  cashCashboxName: '',
  clickCashboxName: '',
  warehouseName: '',
  primaryBankAccountId: '',
});

const emptyAcc = (): AccForm => ({
  code: '',
  name: '',
  accountNumber: '',
  bankName: '',
  mfo: '',
  isPrimary: false,
});

const emptyTerm = (): TermForm => ({
  code: '',
  name: '',
  externalId: '',
  account23510: '',
  bankAccountId: '',
  isActive: true,
});

function FieldLabel({ children, sub }: { children: ReactNode; sub: string }) {
  return (
    <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.06em] ${sub}`}>
      {children}
    </label>
  );
}

type SelectOption = { value: string; label: string; hint?: string };

/** Tizim uslubidagi custom dropdown (native select o‘rniga) — portal + indigo */
function RekvizitSelect({
  value,
  options,
  onChange,
  D,
  placeholder = '—',
  className = '',
}: {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  D: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 240, openUp: false });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  const reposition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const listH = Math.min(options.length * 40 + 8, 240);
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const spaceAbove = r.top - 8;
    const openUp = spaceBelow < listH && spaceAbove > spaceBelow;
    const maxHeight = Math.min(listH, openUp ? spaceAbove : spaceBelow);
    setPos({
      top: openUp ? r.top - 4 : r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 200),
      maxHeight: Math.max(maxHeight, 96),
      openUp,
    });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || dropRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const menu = open
    ? createPortal(
        <div
          ref={dropRef}
          className={`fixed z-[10050] overflow-hidden rounded-xl border shadow-xl ${
            D
              ? 'border-indigo-500/40 bg-[#1a1a1a] shadow-black/60'
              : 'border-indigo-200 bg-white shadow-gray-300/70'
          }`}
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            transform: pos.openUp ? 'translateY(-100%)' : undefined,
            animation: 'rekvDropIn .12s ease-out',
          }}
        >
          <div className="overflow-y-auto py-1" style={{ maxHeight: pos.maxHeight }}>
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value || '__empty'}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                    active
                      ? D
                        ? 'bg-indigo-500/20 font-medium text-indigo-300'
                        : 'bg-indigo-50 font-medium text-indigo-600'
                      : D
                        ? 'text-gray-300 hover:bg-white/5'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    {active ? <Check size={12} className="text-indigo-500" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{opt.label}</span>
                    {opt.hint ? (
                      <span className={`mt-0.5 block truncate font-mono text-[11px] ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                        {opt.hint}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
          <style>{`@keyframes rekvDropIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-left text-sm outline-none transition-all ${
          open
            ? D
              ? 'border-indigo-500 bg-[#1e1e1e] text-gray-100 ring-[3px] ring-indigo-500/15'
              : 'border-indigo-400 bg-white text-gray-900 ring-[3px] ring-indigo-500/15'
            : D
              ? 'border-gray-700 bg-[#1e1e1e] text-gray-100 hover:border-gray-600'
              : 'border-gray-200 bg-gray-50 text-gray-900 hover:border-gray-300'
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${!selected ? (D ? 'text-gray-500' : 'text-gray-400') : ''}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 transition-transform duration-150 ${
            D ? 'text-gray-500' : 'text-gray-400'
          } ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </div>
  );
}

function SectionBand({
  title,
  D,
}: {
  title: string;
  D: boolean;
}) {
  return (
    <div
      className={`border-y px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] ${
        D
          ? 'border-white/[0.06] bg-indigo-500/10 text-indigo-300'
          : 'border-indigo-100 bg-indigo-50/80 text-indigo-700'
      }`}
    >
      {title}
    </div>
  );
}

export function AdminTashkilotRekvizitlariTab({
  D,
  card,
  divider,
  text,
  sub,
  input,
  t,
  viewOrg,
  activeIds,
}: Props) {
  const { companies, refresh } = useCompanies();
  const fieldCls = `h-10 w-full rounded-xl border px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/15 ${input}`;
  const areaCls = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/15 resize-y min-h-[72px] ${input}`;

  const selectable = useMemo(() => {
    if (viewOrg !== 'all') {
      const one = companies.find((c) => c.id === viewOrg);
      return one ? [one] : [];
    }
    const set = new Set(activeIds);
    const filtered = companies.filter((c) => set.has(c.id));
    return filtered.length ? filtered : companies;
  }, [companies, viewOrg, activeIds]);

  const [companyId, setCompanyId] = useState('');
  useEffect(() => {
    if (!selectable.length) {
      setCompanyId('');
      return;
    }
    setCompanyId((prev) =>
      selectable.some((c) => c.id === prev) ? prev : selectable[0].id,
    );
  }, [selectable]);

  const company = useMemo(
    () => companies.find((c) => c.id === companyId),
    [companies, companyId],
  );

  const [form, setForm] = useState<OrgForm>(emptyOrg);
  const [baseline, setBaseline] = useState<OrgForm>(emptyOrg);
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgFlash, setOrgFlash] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  /** Tashkilot rekvizitlari formasi — default yopiq */
  const [orgFormOpen, setOrgFormOpen] = useState(false);

  const [subTab, setSubTab] = useState<SubTab>('accounts');
  const [accounts, setAccounts] = useState<CompanyBankAccount[]>([]);
  const [terminals, setTerminals] = useState<PaymentTerminalRow[]>([]);
  const [social, setSocial] = useState<CompanySocialLink[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [accSearch, setAccSearch] = useState('');
  const [termSearch, setTermSearch] = useState('');
  const [accModal, setAccModal] = useState<null | { id?: string; data: AccForm }>(null);
  const [termModal, setTermModal] = useState<null | { id?: string; data: TermForm }>(null);
  const [socialDraft, setSocialDraft] = useState({ name: '', url: '' });
  const [socialEditId, setSocialEditId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const syncFormFromCompany = useCallback(() => {
    if (!company) {
      const empty = emptyOrg();
      setForm(empty);
      setBaseline(empty);
      return;
    }
    const next: OrgForm = {
      orgCode: company.orgCode ?? '',
      shortName: company.shortName ?? '',
      fullLegalName: company.fullLegalName ?? '',
      legalAddress: company.legalAddress ?? '',
      phone: company.phone ?? '',
      callCenterPhone: company.callCenterPhone ?? '',
      inn: company.inn ?? '',
      vatCode: company.vatCode ?? '',
      rekvizitNote: company.rekvizitNote ?? '',
      cashCashboxName: company.cashCashboxName ?? '',
      clickCashboxName: company.clickCashboxName ?? '',
      warehouseName: company.warehouseName ?? '',
      primaryBankAccountId: company.primaryBankAccountId ?? '',
    };
    setForm(next);
    setBaseline(next);
    setOrgError(null);
    setOrgFlash(false);
  }, [company]);

  useEffect(() => {
    syncFormFromCompany();
  }, [syncFormFromCompany]);

  const loadLists = useCallback(async () => {
    if (!companyId) {
      setAccounts([]);
      setTerminals([]);
      setSocial([]);
      return;
    }
    setLoadingLists(true);
    setListError(null);
    try {
      const [accs, terms, links] = await Promise.all([
        api.getCompanyBankAccounts(companyId),
        api.getTerminals(companyId),
        api.getCompanySocialLinks(companyId),
      ]);
      setAccounts(accs);
      setTerminals(terms);
      setSocial(links);
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingLists(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadLists();
    setAccModal(null);
    setTermModal(null);
    setSocialEditId(null);
    setSocialDraft({ name: '', url: '' });
    setAccSearch('');
    setTermSearch('');
    setListError(null);
    setOrgFormOpen(false);
  }, [loadLists]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(baseline),
    [form, baseline],
  );

  const setField = <K extends keyof OrgForm>(key: K, value: OrgForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveOrg = async () => {
    if (!companyId || !dirty) return;
    setSavingOrg(true);
    setOrgError(null);
    try {
      const short = form.shortName.trim();
      const full = form.fullLegalName.trim();
      await api.updateCompany(companyId, {
        orgCode: form.orgCode.trim() || null,
        shortName: short || undefined,
        name: short || full || company?.name,
        fullLegalName: full || null,
        legalAddress: form.legalAddress.trim() || null,
        phone: form.phone.trim() || null,
        callCenterPhone: form.callCenterPhone.trim() || null,
        inn: form.inn.trim() || null,
        vatCode: form.vatCode.trim() || null,
        rekvizitNote: form.rekvizitNote.trim() || null,
        cashCashboxName: form.cashCashboxName.trim() || null,
        clickCashboxName: form.clickCashboxName.trim() || null,
        warehouseName: form.warehouseName.trim() || null,
        primaryBankAccountId: form.primaryBankAccountId || null,
      });
      await refresh();
      setOrgFlash(true);
      setTimeout(() => setOrgFlash(false), 1800);
    } catch (e) {
      setOrgError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingOrg(false);
    }
  };

  const cancelOrg = () => {
    setForm(baseline);
    setOrgError(null);
  };

  const filteredAccounts = useMemo(() => {
    const q = accSearch.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.accountNumber.includes(q) ||
        (a.bankName ?? '').toLowerCase().includes(q) ||
        (a.code ?? '').toLowerCase().includes(q) ||
        (a.mfo ?? '').includes(q),
    );
  }, [accounts, accSearch]);

  const filteredTerminals = useMemo(() => {
    const q = termSearch.trim().toLowerCase();
    if (!q) return terminals;
    return terminals.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.code ?? '').toLowerCase().includes(q) ||
        (r.externalId ?? '').toLowerCase().includes(q) ||
        (r.account23510 ?? '').includes(q) ||
        (r.bankAccountName ?? '').toLowerCase().includes(q),
    );
  }, [terminals, termSearch]);

  const openAccCreate = () => {
    setModalError(null);
    setAccModal({ data: { ...emptyAcc(), isPrimary: accounts.length === 0 } });
  };

  const openAccEdit = (row: CompanyBankAccount) => {
    setModalError(null);
    setAccModal({
      id: row.id,
      data: {
        code: row.code ?? '',
        name: row.name,
        accountNumber: row.accountNumber,
        bankName: row.bankName ?? '',
        mfo: row.mfo ?? '',
        isPrimary: row.isPrimary,
      },
    });
  };

  const saveAcc = async () => {
    if (!companyId || !accModal) return;
    const d = accModal.data;
    if (!d.name.trim() || !/^\d{20}$/.test(d.accountNumber.trim())) {
      setModalError(t.rekvErrAccRequired ?? 'Hisob nomi va 20 xonali hisob raqami majburiy');
      return;
    }
    if (d.mfo.trim() && !/^\d{5}$/.test(d.mfo.trim())) {
      setModalError(t.rekvErrMfo ?? 'MFO 5 xonali bo‘lishi kerak');
      return;
    }
    setModalSaving(true);
    setModalError(null);
    try {
      const body = {
        code: d.code.trim() || null,
        name: d.name.trim(),
        accountNumber: d.accountNumber.trim(),
        bankName: d.bankName.trim() || null,
        mfo: d.mfo.trim() || null,
        isPrimary: d.isPrimary,
      };
      if (accModal.id) {
        await api.updateCompanyBankAccount(companyId, accModal.id, body);
      } else {
        await api.createCompanyBankAccount(companyId, body);
      }
      setAccModal(null);
      await Promise.all([loadLists(), refresh()]);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : String(e));
    } finally {
      setModalSaving(false);
    }
  };

  const deleteAcc = async (row: CompanyBankAccount) => {
    if (!companyId) return;
    try {
      await api.deleteCompanyBankAccount(companyId, row.id);
      await Promise.all([loadLists(), refresh()]);
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e));
    }
  };

  const openTermCreate = () => {
    setModalError(null);
    setTermModal({ data: emptyTerm() });
  };

  const openTermEdit = (row: PaymentTerminalRow) => {
    setModalError(null);
    setTermModal({
      id: row.id,
      data: {
        code: row.code ?? '',
        name: row.name,
        externalId: row.externalId ?? '',
        account23510: row.account23510 ?? '',
        bankAccountId: row.bankAccountId ?? '',
        isActive: row.isActive,
      },
    });
  };

  const selectedTermAccount = useMemo(() => {
    if (!termModal?.data.bankAccountId) return null;
    return accounts.find((a) => a.id === termModal.data.bankAccountId) ?? null;
  }, [termModal, accounts]);

  const saveTerm = async () => {
    if (!companyId || !termModal) return;
    if (!termModal.data.name.trim()) {
      setModalError(t.rekvErrTermName ?? 'Terminal nomi majburiy');
      return;
    }
    setModalSaving(true);
    setModalError(null);
    try {
      const body = {
        name: termModal.data.name.trim(),
        code: termModal.data.code.trim() || null,
        externalId: termModal.data.externalId.trim() || null,
        account23510: termModal.data.account23510.trim() || null,
        bankAccountId: termModal.data.bankAccountId || null,
        companyId,
        isActive: termModal.data.isActive,
      };
      if (termModal.id) {
        await api.updateTerminal(termModal.id, body);
      } else {
        await api.createTerminal(body);
      }
      setTermModal(null);
      await loadLists();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : String(e));
    } finally {
      setModalSaving(false);
    }
  };

  const deactivateTerm = async (id: string) => {
    try {
      await api.deleteTerminal(id);
      await loadLists();
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e));
    }
  };

  const saveSocial = async () => {
    if (!companyId || !socialDraft.name.trim() || !socialDraft.url.trim()) return;
    setModalSaving(true);
    setListError(null);
    try {
      if (socialEditId) {
        await api.updateCompanySocialLink(companyId, socialEditId, {
          name: socialDraft.name.trim(),
          url: socialDraft.url.trim(),
        });
      } else {
        await api.createCompanySocialLink(companyId, {
          name: socialDraft.name.trim(),
          url: socialDraft.url.trim(),
        });
      }
      setSocialDraft({ name: '', url: '' });
      setSocialEditId(null);
      await loadLists();
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e));
    } finally {
      setModalSaving(false);
    }
  };

  const removeSocial = async (id: string) => {
    if (!companyId) return;
    try {
      await api.deleteCompanySocialLink(companyId, id);
      await loadLists();
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e));
    }
  };

  const copyText = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      /* ignore */
    }
  };

  const TABS: { id: SubTab; label: string; icon: ReactNode; count: number }[] = [
    {
      id: 'accounts',
      label: t.rekvTabAccounts ?? 'Hisob raqamlari',
      icon: <Building2 size={14} strokeWidth={1.8} />,
      count: accounts.length,
    },
    {
      id: 'terminals',
      label: t.rekvTabTerminals ?? 'Savdo terminallari',
      icon: <CreditCard size={14} strokeWidth={1.8} />,
      count: terminals.length,
    },
    {
      id: 'social',
      label: t.rekvTabSocial ?? 'Ijtimoiy tarmoqlar',
      icon: <Link2 size={14} strokeWidth={1.8} />,
      count: social.length,
    },
  ];

  if (!selectable.length) {
    return (
      <div className={`flex min-h-full items-center justify-center p-8 ${sub}`}>
        <div className={`rounded-2xl border px-6 py-8 text-center ${card}`}>
          <Building2 size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t.rekvSelectOrg ?? 'Tahrirlash uchun tashkilotni tanlang'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-4">
      {/* Org compact bar — forma default yopiq */}
      <div className={`overflow-hidden rounded-2xl border ${card}`}>
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 ${
            orgFormOpen ? `border-b ${divider}` : ''
          } ${D ? 'bg-white/[0.02]' : 'bg-gray-50/80'}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                D ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
              }`}
            >
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <h2 className={`truncate text-base font-semibold ${text}`}>
                {company?.shortName || company?.name || (t.navTashkilotRekvizitlari ?? 'Tashkilot')}
              </h2>
              <p className={`mt-0.5 truncate text-xs ${sub}`}>
                {t.rekvTechId ?? 'Texnik ID'}: {companyId}
                {form.inn ? ` · ${t.rekvInn ?? 'STIR'} ${form.inn}` : ''}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {selectable.length > 1 && (
              <div className="min-w-[180px] flex-1 sm:flex-initial sm:w-[200px]">
                <RekvizitSelect
                  D={D}
                  value={companyId}
                  onChange={setCompanyId}
                  placeholder={t.rekvSelectOrg ?? 'Tashkilot'}
                  options={selectable.map((c) => ({
                    value: c.id,
                    label: c.shortName || c.name,
                  }))}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setOrgFormOpen((o) => !o)}
              className={`flex h-10 flex-shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold transition-colors ${
                orgFormOpen
                  ? D
                    ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : D
                    ? 'border-gray-700 text-gray-200 hover:bg-white/[0.04]'
                    : 'border-gray-200 text-gray-700 hover:bg-white'
              }`}
            >
              {orgFormOpen
                ? (t.rekvToggleClose ?? 'Yopish')
                : (t.rekvToggleOpen ?? 'Rekvizitlarni ochish')}
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${orgFormOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        {orgFormOpen && (
          <>
            <SectionBand
              D={D}
              title={t.rekvSecIdentity ?? 'Nom va manzil'}
            />
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
              <div>
                <FieldLabel sub={sub}>{t.rekvOrgCode ?? 'Tashkilot kodi'}</FieldLabel>
                <input value={form.orgCode} onChange={(e) => setField('orgCode', e.target.value)} className={fieldCls} />
              </div>
              <div>
                <FieldLabel sub={sub}>{t.rekvShortName ?? 'Qisqa nomi'}</FieldLabel>
                <input value={form.shortName} onChange={(e) => setField('shortName', e.target.value)} className={fieldCls} />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <FieldLabel sub={sub}>{t.rekvFullName ?? "To'liq yuridik nomi"}</FieldLabel>
                <input value={form.fullLegalName} onChange={(e) => setField('fullLegalName', e.target.value)} className={fieldCls} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <FieldLabel sub={sub}>{t.rekvLegalAddress ?? 'Yuridik manzil'}</FieldLabel>
                <input value={form.legalAddress} onChange={(e) => setField('legalAddress', e.target.value)} className={fieldCls} />
              </div>
            </div>

            <SectionBand D={D} title={t.rekvSecContact ?? 'Aloqa va soliq'} />
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
              <div>
                <FieldLabel sub={sub}>{t.rekvPhone ?? 'Telefon'}</FieldLabel>
                <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} className={fieldCls} />
              </div>
              <div>
                <FieldLabel sub={sub}>{t.rekvCallCenter ?? 'Call-markaz'}</FieldLabel>
                <input value={form.callCenterPhone} onChange={(e) => setField('callCenterPhone', e.target.value)} className={fieldCls} />
              </div>
              <div>
                <FieldLabel sub={sub}>{t.rekvInn ?? 'STIR'}</FieldLabel>
                <input value={form.inn} onChange={(e) => setField('inn', e.target.value)} className={`${fieldCls} font-mono`} />
              </div>
              <div>
                <FieldLabel sub={sub}>{t.rekvVatCode ?? 'QQS kodi'}</FieldLabel>
                <input value={form.vatCode} onChange={(e) => setField('vatCode', e.target.value)} className={fieldCls} />
              </div>
            </div>

            <SectionBand
              D={D}
              title={t.rekvSecCash ?? 'Kassa, ombor va hisob'}
            />
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
              <div>
                <FieldLabel sub={sub}>{t.rekvCashCashbox ?? 'Naqd pul kassasi'}</FieldLabel>
                <input value={form.cashCashboxName} onChange={(e) => setField('cashCashboxName', e.target.value)} className={fieldCls} />
              </div>
              <div>
                <FieldLabel sub={sub}>{t.rekvClickCashbox ?? 'Click kassasi'}</FieldLabel>
                <input value={form.clickCashboxName} onChange={(e) => setField('clickCashboxName', e.target.value)} className={fieldCls} />
              </div>
              <div>
                <FieldLabel sub={sub}>
                  <span className="inline-flex items-center gap-1">
                    <Warehouse size={10} />
                    {t.rekvWarehouse ?? 'Asosiy ombor'}
                  </span>
                </FieldLabel>
                <input value={form.warehouseName} onChange={(e) => setField('warehouseName', e.target.value)} className={fieldCls} />
              </div>
              <div>
                <FieldLabel sub={sub}>{t.rekvPrimaryAccount ?? 'Asosiy hisob raqami'}</FieldLabel>
                <RekvizitSelect
                  D={D}
                  value={form.primaryBankAccountId}
                  onChange={(v) => setField('primaryBankAccountId', v)}
                  placeholder={t.rekvNoAccount ?? '— tanlanmagan —'}
                  options={[
                    { value: '', label: t.rekvNoAccount ?? '— tanlanmagan —' },
                    ...accounts.map((a) => ({
                      value: a.id,
                      label: a.name,
                      hint: a.accountNumber,
                    })),
                  ]}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <FieldLabel sub={sub}>{t.rekvNote ?? 'Izoh'}</FieldLabel>
                <textarea
                  value={form.rekvizitNote}
                  onChange={(e) => setField('rekvizitNote', e.target.value)}
                  className={areaCls}
                  rows={2}
                />
              </div>
            </div>

            <div className={`flex flex-wrap items-center gap-2 border-t px-4 py-3 sm:px-5 ${divider}`}>
              <button
                type="button"
                onClick={() => void saveOrg()}
                disabled={!dirty || savingOrg}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-600 disabled:cursor-default disabled:bg-indigo-500/40 disabled:shadow-none"
              >
                {savingOrg ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : orgFlash ? (
                  <Check size={14} />
                ) : null}
                {savingOrg
                  ? (t.rekvSaving ?? 'Saqlanmoqda...')
                  : orgFlash
                    ? (t.rekvSaved ?? 'Saqlandi')
                    : (t.rekvSave ?? 'Saqlash')}
              </button>
              <button
                type="button"
                onClick={cancelOrg}
                disabled={!dirty || savingOrg}
                className={`h-10 rounded-xl border px-3.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                  D
                    ? 'border-gray-700 text-gray-300 hover:bg-white/[0.04]'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.rekvCancel ?? 'Bekor qilish'}
              </button>
              {orgError && <span className="text-sm text-red-500">{orgError}</span>}
            </div>
          </>
        )}
      </div>

      {/* Tabs + lists */}
      <div className={`overflow-hidden rounded-2xl border ${card}`}>
        <div
          className={`sticky top-0 z-10 flex gap-1.5 overflow-x-auto border-b p-2 sm:p-2.5 ${divider} ${
            D ? 'bg-[#161616]/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md'
          }`}
        >
          {TABS.map((tb) => {
            const on = subTab === tb.id;
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => setSubTab(tb.id)}
                className={`flex flex-shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                  on
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                    : D
                      ? 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.07] hover:text-gray-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800'
                }`}
              >
                {tb.icon}
                <span>{tb.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    on
                      ? 'bg-white/20 text-white'
                      : D
                        ? 'bg-white/10 text-gray-400'
                        : 'bg-white text-gray-500'
                  }`}
                >
                  {tb.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 sm:p-4">
          {listError && (
            <div className={`mb-3 rounded-xl border px-3 py-2 text-sm text-red-500 ${D ? 'border-red-500/30 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>
              {listError}
            </div>
          )}

          {subTab === 'accounts' && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 ${
                    D ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Search size={14} className={`${sub} flex-shrink-0`} />
                  <input
                    value={accSearch}
                    onChange={(e) => setAccSearch(e.target.value)}
                    placeholder={t.rekvAccSearch ?? 'Qidirish...'}
                    className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${text}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={openAccCreate}
                  className="flex h-10 flex-shrink-0 items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-600"
                >
                  <Plus size={15} />
                  {t.rekvAccAdd ?? "Hisob qo'shish"}
                </button>
              </div>

              <div className={`hidden overflow-hidden rounded-2xl border md:block ${card}`}>
                <div className={`flex items-center justify-between border-b px-4 py-3 ${divider}`}>
                  <div>
                    <h3 className={`font-semibold ${text}`}>{t.rekvTabAccounts}</h3>
                    <p className={`mt-0.5 text-xs ${sub}`}>
                      {filteredAccounts.length} / {accounts.length}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={`sticky top-0 z-[1] ${D ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                      <tr className={`border-b ${divider}`}>
                        {[t.rekvAccCode, t.rekvAccName, t.rekvAccNumber, t.rekvAccBank, t.rekvAccMfo, t.rekvAccPrimary, ''].map(
                          (h, i) => (
                            <th key={i} className={`px-4 py-3 text-left text-xs font-medium whitespace-nowrap ${sub}`}>
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {loadingLists && (
                        <tr>
                          <td colSpan={7} className={`px-4 py-10 text-center ${sub}`}>
                            <Loader2 size={18} className="mx-auto animate-spin opacity-50" />
                          </td>
                        </tr>
                      )}
                      {!loadingLists && filteredAccounts.length === 0 && (
                        <tr>
                          <td colSpan={7} className={`px-4 py-10 text-center ${sub}`}>
                            {t.rekvAccEmpty ?? "Hisob yo'q"}
                          </td>
                        </tr>
                      )}
                      {filteredAccounts.map((row, i) => (
                        <tr
                          key={row.id}
                          className={`${i < filteredAccounts.length - 1 ? `border-b ${divider}` : ''} transition-colors ${
                            D ? 'hover:bg-white/[0.025]' : 'hover:bg-indigo-50/40'
                          }`}
                        >
                          <td className={`px-4 py-3 ${sub}`}>{row.code || '—'}</td>
                          <td className={`px-4 py-3 font-medium ${text}`}>{row.name}</td>
                          <td className={`px-4 py-3 font-mono tabular-nums ${text}`}>
                            <span className="inline-flex items-center gap-1.5">
                              {row.accountNumber}
                              <button
                                type="button"
                                onClick={() => void copyText(row.accountNumber, row.id)}
                                className={`${sub} transition-colors hover:text-indigo-400`}
                                title={t.rekvCopy}
                              >
                                {copiedId === row.id ? <Check size={13} /> : <Copy size={13} />}
                              </button>
                            </span>
                          </td>
                          <td className={`px-4 py-3 ${sub}`}>{row.bankName || '—'}</td>
                          <td className={`px-4 py-3 font-mono ${sub}`}>{row.mfo || '—'}</td>
                          <td className="px-4 py-3">
                            {row.isPrimary ? (
                              <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                                D ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                <Star size={11} fill="currentColor" />
                                {t.rekvAccPrimary}
                              </span>
                            ) : (
                              <span className={sub}>—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button type="button" onClick={() => openAccEdit(row)} className={`mr-1 rounded-lg p-1.5 transition-colors ${D ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-800'}`}>
                              <Pencil size={15} />
                            </button>
                            <button type="button" onClick={() => void deleteAcc(row)} className={`rounded-lg p-1.5 transition-colors ${D ? 'text-gray-400 hover:bg-red-500/10 hover:text-red-400' : 'text-gray-400 hover:bg-red-50 hover:text-red-500'}`}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={`md:hidden overflow-hidden rounded-2xl border ${card}`}>
                <div className={`border-b px-4 py-3 ${divider}`}>
                  <h3 className={`font-semibold ${text}`}>{t.rekvTabAccounts}</h3>
                  <p className={`mt-0.5 text-xs ${sub}`}>{filteredAccounts.length}</p>
                </div>
                {filteredAccounts.map((row, i) => (
                  <div
                    key={row.id}
                    className={`px-4 py-3.5 ${i < filteredAccounts.length - 1 ? `border-b ${divider}` : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`font-semibold ${text}`}>{row.name}</div>
                      {row.isPrimary && (
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                          D ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          <Star size={10} fill="currentColor" />
                          {t.rekvAccPrimary}
                        </span>
                      )}
                    </div>
                    <div className={`mt-2 break-all font-mono text-sm ${text}`}>
                      {row.accountNumber}
                      <button
                        type="button"
                        onClick={() => void copyText(row.accountNumber, `m-${row.id}`)}
                        className={`ml-2 text-xs font-sans font-medium text-indigo-500`}
                      >
                        {copiedId === `m-${row.id}` ? (t.rekvCopied ?? 'OK') : (t.rekvCopy ?? 'Nusxa')}
                      </button>
                    </div>
                    <div className={`mt-1.5 text-xs ${sub}`}>
                      {row.bankName || '—'} · MFO {row.mfo || '—'}
                    </div>
                    <div className="mt-2.5 flex gap-3">
                      <button type="button" onClick={() => openAccEdit(row)} className="text-xs font-semibold text-indigo-500">
                        {t.rekvAccEdit}
                      </button>
                      <button type="button" onClick={() => void deleteAcc(row)} className="text-xs font-semibold text-red-500">
                        {t.rekvAccDelete}
                      </button>
                    </div>
                  </div>
                ))}
                {!loadingLists && filteredAccounts.length === 0 && (
                  <div className={`px-4 py-8 text-center text-sm ${sub}`}>{t.rekvAccEmpty}</div>
                )}
              </div>
            </>
          )}

          {subTab === 'terminals' && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 ${
                    D ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Search size={14} className={`${sub} flex-shrink-0`} />
                  <input
                    value={termSearch}
                    onChange={(e) => setTermSearch(e.target.value)}
                    placeholder={t.rekvTermSearch ?? 'Qidirish...'}
                    className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${text}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={openTermCreate}
                  className="flex h-10 flex-shrink-0 items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-600"
                >
                  <Plus size={15} />
                  {t.rekvTermAdd ?? "Terminal qo'shish"}
                </button>
              </div>

              <div className={`hidden overflow-hidden rounded-2xl border md:block ${card}`}>
                <div className={`flex items-center justify-between border-b px-4 py-3 ${divider}`}>
                  <div>
                    <h3 className={`font-semibold ${text}`}>{t.rekvTabTerminals}</h3>
                    <p className={`mt-0.5 text-xs ${sub}`}>
                      {filteredTerminals.length} / {terminals.length}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={`sticky top-0 z-[1] ${D ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                      <tr className={`border-b ${divider}`}>
                        {[t.rekvTermName, t.rekvTermExtId, t.rekvTerm23510, t.rekvTermBankAcc, t.rekvTermActive, ''].map(
                          (h, i) => (
                            <th key={i} className={`px-4 py-3 text-left text-xs font-medium whitespace-nowrap ${sub}`}>
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {!loadingLists && filteredTerminals.length === 0 && (
                        <tr>
                          <td colSpan={6} className={`px-4 py-10 text-center ${sub}`}>
                            {t.rekvTermEmpty ?? "Terminal yo'q"}
                          </td>
                        </tr>
                      )}
                      {filteredTerminals.map((row, i) => (
                        <tr
                          key={row.id}
                          className={`${i < filteredTerminals.length - 1 ? `border-b ${divider}` : ''} transition-colors ${
                            D ? 'hover:bg-white/[0.025]' : 'hover:bg-indigo-50/40'
                          }`}
                        >
                          <td className={`px-4 py-3 font-medium ${text}`}>
                            {row.name}
                            {row.code ? <span className={`ml-1.5 font-normal ${sub}`}>#{row.code}</span> : null}
                          </td>
                          <td className={`px-4 py-3 ${sub}`}>{row.externalId || '—'}</td>
                          <td className={`px-4 py-3 font-mono text-xs ${sub}`}>{row.account23510 || '—'}</td>
                          <td className={`px-4 py-3 ${sub}`}>
                            <div>{row.bankAccountName || '—'}</div>
                            {row.bankAccountNumber && (
                              <div className="mt-0.5 font-mono text-[11px] opacity-80">{row.bankAccountNumber}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${
                                row.isActive
                                  ? D
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-emerald-50 text-emerald-700'
                                  : D
                                    ? 'bg-white/10 text-gray-400'
                                    : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {row.isActive ? (t.rekvTermActive ?? 'Faol') : (t.rekvTermInactive ?? 'Nofaol')}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button type="button" onClick={() => openTermEdit(row)} className={`mr-1 rounded-lg p-1.5 transition-colors ${D ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-800'}`}>
                              <Pencil size={15} />
                            </button>
                            {row.isActive && (
                              <button type="button" onClick={() => void deactivateTerm(row.id)} className={`rounded-lg p-1.5 transition-colors ${D ? 'text-gray-400 hover:bg-red-500/10 hover:text-red-400' : 'text-gray-400 hover:bg-red-50 hover:text-red-500'}`}>
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={`md:hidden overflow-hidden rounded-2xl border ${card}`}>
                {filteredTerminals.map((row, i) => (
                  <div
                    key={row.id}
                    className={`px-4 py-3.5 ${i < filteredTerminals.length - 1 ? `border-b ${divider}` : ''}`}
                  >
                    <div className={`font-semibold ${text}`}>{row.name}</div>
                    <div className={`mt-1 text-xs ${sub}`}>
                      ID: {row.externalId || '—'} · 23510: {row.account23510 || '—'}
                    </div>
                    <div className={`mt-1 break-all text-xs ${sub}`}>
                      {row.bankAccountName || '—'}
                      {row.bankAccountNumber ? ` · ${row.bankAccountNumber}` : ''}
                    </div>
                    <div className="mt-2.5 flex items-center gap-3">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                          row.isActive
                            ? D
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-emerald-50 text-emerald-700'
                            : D
                              ? 'bg-white/10 text-gray-400'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {row.isActive ? (t.rekvTermActive ?? 'Faol') : (t.rekvTermInactive ?? 'Nofaol')}
                      </span>
                      <button type="button" onClick={() => openTermEdit(row)} className="text-xs font-semibold text-indigo-500">
                        {t.rekvTermEdit}
                      </button>
                    </div>
                  </div>
                ))}
                {!loadingLists && filteredTerminals.length === 0 && (
                  <div className={`px-4 py-8 text-center text-sm ${sub}`}>{t.rekvTermEmpty}</div>
                )}
              </div>
            </>
          )}

          {subTab === 'social' && (
            <>
              <div className={`mb-3 rounded-2xl border p-3 sm:p-4 ${card}`}>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[140px] flex-1">
                    <FieldLabel sub={sub}>{t.rekvSocialName ?? 'Nomi'}</FieldLabel>
                    <input
                      value={socialDraft.name}
                      onChange={(e) => setSocialDraft((p) => ({ ...p, name: e.target.value }))}
                      className={fieldCls}
                    />
                  </div>
                  <div className="min-w-[180px] flex-[2]">
                    <FieldLabel sub={sub}>{t.rekvSocialUrl ?? 'Havola'}</FieldLabel>
                    <input
                      value={socialDraft.url}
                      onChange={(e) => setSocialDraft((p) => ({ ...p, url: e.target.value }))}
                      className={fieldCls}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveSocial()}
                    disabled={modalSaving || !socialDraft.name.trim() || !socialDraft.url.trim()}
                    className="flex h-10 flex-shrink-0 items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {socialEditId ? (t.rekvSave ?? 'Saqlash') : (
                      <>
                        <Plus size={15} />
                        {t.rekvSocialAdd ?? "Qo'shish"}
                      </>
                    )}
                  </button>
                  {socialEditId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSocialEditId(null);
                        setSocialDraft({ name: '', url: '' });
                      }}
                      className={`h-10 rounded-xl border px-3 text-sm ${D ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}
                    >
                      {t.rekvCancel ?? 'Bekor'}
                    </button>
                  )}
                </div>
              </div>

              <div className={`overflow-hidden rounded-2xl border ${card}`}>
                {social.length === 0 && (
                  <div className={`px-4 py-10 text-center text-sm ${sub}`}>{t.rekvSocialEmpty ?? "Yo'q"}</div>
                )}
                {social.map((row, i) => (
                  <div
                    key={row.id}
                    className={`flex items-center gap-3 px-4 py-3.5 ${i < social.length - 1 ? `border-b ${divider}` : ''} ${
                      D ? 'hover:bg-white/[0.025]' : 'hover:bg-indigo-50/40'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                        D ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      <Link2 size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm font-semibold ${text}`}>{row.name}</div>
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 block truncate text-xs text-indigo-500 hover:underline"
                      >
                        {row.url}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSocialEditId(row.id);
                        setSocialDraft({ name: row.name, url: row.url });
                      }}
                      className={`rounded-lg p-1.5 ${D ? 'text-gray-400 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeSocial(row.id)}
                      className={`rounded-lg p-1.5 ${D ? 'text-gray-400 hover:bg-red-500/10 hover:text-red-400' : 'text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Account modal */}
      {accModal && (
        <ModalShell
          D={D}
          title={accModal.id ? (t.rekvAccEdit ?? 'Tahrirlash') : (t.rekvAccAdd ?? "Qo'shish")}
          onClose={() => setAccModal(null)}
        >
          {(
            [
              ['code', t.rekvAccCode ?? 'Kod'],
              ['name', t.rekvAccName ?? 'Nomi'],
              ['accountNumber', t.rekvAccNumber ?? 'Hisob raqami'],
              ['bankName', t.rekvAccBank ?? 'Bank'],
              ['mfo', t.rekvAccMfo ?? 'MFO'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="mb-3">
              <FieldLabel sub={sub}>{label}</FieldLabel>
              <input
                value={accModal.data[key]}
                onChange={(e) =>
                  setAccModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          data: {
                            ...prev.data,
                            [key]:
                              key === 'accountNumber' || key === 'mfo'
                                ? e.target.value.replace(/\D/g, '').slice(0, key === 'mfo' ? 5 : 20)
                                : e.target.value,
                          },
                        }
                      : prev,
                  )
                }
                maxLength={key === 'mfo' ? 5 : key === 'accountNumber' ? 20 : undefined}
                className={`${fieldCls} ${key === 'accountNumber' || key === 'mfo' ? 'font-mono' : ''}`}
              />
            </div>
          ))}
          <label className={`mb-4 flex items-center gap-2.5 text-sm ${text}`}>
            <input
              type="checkbox"
              checked={accModal.data.isPrimary}
              onChange={(e) =>
                setAccModal((prev) =>
                  prev ? { ...prev, data: { ...prev.data, isPrimary: e.target.checked } } : prev,
                )
              }
              className="h-4 w-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
            />
            {t.rekvAccPrimary ?? 'Asosiy'}
          </label>
          {modalError && <div className="mb-3 text-xs text-red-500">{modalError}</div>}
          <ModalActions
            D={D}
            cancelLabel={t.rekvCancel ?? 'Bekor'}
            saveLabel={modalSaving ? (t.rekvSaving ?? '...') : (t.rekvSave ?? 'Saqlash')}
            saving={modalSaving}
            onCancel={() => setAccModal(null)}
            onSave={() => void saveAcc()}
          />
        </ModalShell>
      )}

      {/* Terminal modal */}
      {termModal && (
        <ModalShell
          D={D}
          title={termModal.id ? (t.rekvTermEdit ?? 'Tahrirlash') : (t.rekvTermAdd ?? "Qo'shish")}
          onClose={() => setTermModal(null)}
        >
          {(
            [
              ['code', t.rekvTermCode ?? 'Kod'],
              ['name', t.rekvTermName ?? 'Nomi'],
              ['externalId', t.rekvTermExtId ?? 'Terminal ID'],
              ['account23510', t.rekvTerm23510 ?? '23510'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="mb-3">
              <FieldLabel sub={sub}>{label}</FieldLabel>
              <input
                value={termModal.data[key]}
                onChange={(e) =>
                  setTermModal((prev) =>
                    prev ? { ...prev, data: { ...prev.data, [key]: e.target.value } } : prev,
                  )
                }
                className={`${fieldCls} ${key === 'account23510' || key === 'externalId' ? 'font-mono' : ''}`}
              />
            </div>
          ))}
          <div className="mb-3">
            <FieldLabel sub={sub}>{t.rekvTermBankAcc ?? 'Hisob-kitob hisobi'}</FieldLabel>
            <RekvizitSelect
              D={D}
              value={termModal.data.bankAccountId}
              onChange={(v) =>
                setTermModal((prev) =>
                  prev ? { ...prev, data: { ...prev.data, bankAccountId: v } } : prev,
                )
              }
              placeholder={t.rekvNoAccount ?? '—'}
              options={[
                { value: '', label: t.rekvNoAccount ?? '—' },
                ...accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                  hint: a.accountNumber,
                })),
              ]}
            />
          </div>
          <div
            className={`mb-4 rounded-xl border p-3 ${
              D ? 'border-indigo-500/20 bg-indigo-500/10' : 'border-indigo-100 bg-indigo-50/70'
            }`}
          >
            <div className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${sub}`}>
              {t.rekvTermBankPreview ?? 'Hisob / MFO / Bank'}
            </div>
            <div className={`break-all font-mono text-sm ${text}`}>
              {selectedTermAccount?.accountNumber || '—'}
            </div>
            <div className={`mt-1 text-xs ${sub}`}>
              MFO {selectedTermAccount?.mfo || '—'} · {selectedTermAccount?.bankName || '—'}
            </div>
          </div>
          <label className={`mb-4 flex items-center gap-2.5 text-sm ${text}`}>
            <input
              type="checkbox"
              checked={termModal.data.isActive}
              onChange={(e) =>
                setTermModal((prev) =>
                  prev ? { ...prev, data: { ...prev.data, isActive: e.target.checked } } : prev,
                )
              }
              className="h-4 w-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
            />
            {t.rekvTermActive ?? 'Faol'}
          </label>
          {modalError && <div className="mb-3 text-xs text-red-500">{modalError}</div>}
          <ModalActions
            D={D}
            cancelLabel={t.rekvCancel ?? 'Bekor'}
            saveLabel={modalSaving ? (t.rekvSaving ?? '...') : (t.rekvSave ?? 'Saqlash')}
            saving={modalSaving}
            onCancel={() => setTermModal(null)}
            onSave={() => void saveTerm()}
          />
        </ModalShell>
      )}
    </div>
  );
}

function ModalShell({
  D,
  title,
  onClose,
  children,
}: {
  D: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{
        background: D ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.42)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md max-h-[90vh] overflow-auto rounded-3xl border shadow-2xl ${
          D
            ? 'border-white/10 bg-[#161616] shadow-black/60'
            : 'border-gray-200 bg-white shadow-black/15'
        }`}
      >
        <div
          className={`sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4 ${
            D ? 'border-white/[0.06] bg-[#161616]/95 backdrop-blur-md' : 'border-gray-100 bg-white/95 backdrop-blur-md'
          }`}
        >
          <h3 className={`text-base font-bold ${D ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl p-1.5 transition-colors ${
              D ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  D,
  cancelLabel,
  saveLabel,
  saving,
  onCancel,
  onSave,
}: {
  D: boolean;
  cancelLabel: string;
  saveLabel: string;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className={`h-10 rounded-xl border px-4 text-sm font-medium ${
          D
            ? 'border-gray-700 text-gray-300 hover:bg-white/[0.04]'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex h-10 items-center gap-1.5 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-600 disabled:opacity-60"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        {saveLabel}
      </button>
    </div>
  );
}
