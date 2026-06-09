import { useRef, useState } from 'react';
import {
  Check, ChevronDown, Eye, EyeOff, Globe, Menu, Moon, Sun, LayoutGrid, X,
} from 'lucide-react';
import { ADMIN_LANGS, COMPANY_DATA, NAV_ITEMS_BASE, fmt, type ClientRow, type LangAdmin, type Tab } from '../../data/adminData';
import { useCompanies } from '../CompaniesContext';
import { ClientRequestBell } from './ClientRequestBell';

interface AdminNavbarProps {
  D: boolean;
  sub: string;
  text: string;
  tab: Tab;
  navItems: { id: string; label: string; children?: { id: string; label: string }[] }[];
  t: Record<string, string>;
  selectedCompanyIds: Set<string>;
  setSelectedCompanyIds: (fn: (p: Set<string>) => Set<string>) => void;
  selectedCompany: { id: string };
  showBalances: boolean;
  setShowBalances: (fn: (p: boolean) => boolean) => void;
  adminLang: LangAdmin;
  setAdminLang: (l: LangAdmin) => void;
  setSidebarOpen: (v: boolean) => void;
  headerCollapsed: boolean;
  setHeaderCollapsed: (v: boolean) => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  showCompanyDropdown: boolean;
  setShowCompanyDropdown: (fn: (p: boolean) => boolean) => void;
  showLangMenu: boolean;
  setShowLangMenu: (fn: (p: boolean) => boolean) => void;
  companyBtnRef: React.RefObject<HTMLButtonElement | null>;
  langBtnRef: React.RefObject<HTMLButtonElement | null>;
  setTab: (t: Tab) => void;
  existingClients?: ClientRow[];
}

export function AdminNavbar({
  D, sub, text, tab, navItems, t,
  selectedCompanyIds, setSelectedCompanyIds, selectedCompany,
  showBalances, setShowBalances,
  adminLang, setAdminLang,
  setSidebarOpen, headerCollapsed, setHeaderCollapsed,
  isDark, setIsDark,
  showCompanyDropdown, setShowCompanyDropdown,
  showLangMenu, setShowLangMenu,
  companyBtnRef, langBtnRef,
  setTab,
  existingClients = [],
}: AdminNavbarProps) {
  const { companies } = useCompanies();
  const currentLang = ADMIN_LANGS.find(l => l.id === adminLang)!;
  const [showModuleBar, setShowModuleBar] = useState(false);

  // Build flat navItems with icons from NAV_ITEMS_BASE
  const flatNavWithIcons = NAV_ITEMS_BASE.map(base => {
    const item = navItems.find(n => n.id === base.id);
    const label = item?.label ?? t[base.key] ?? base.key;
    const sub = base.subKey ? (t[base.subKey] ?? base.subKey) : undefined;
    return { id: base.id as Tab, label, Icon: base.icon, sub };
  });

  // Module bar da faqat dashboard va tarozi ko'rinadi
  // Qolganlar (products, clients, liniya, xodimlar, reports, zatrati, postavchik)
  // faqat sidebar orqali ochiladi
  const MODULE_BAR_IDS = new Set<string>(['dashboard', 'tarozi', 'prodaji', 'ombor']);
  const moduleBarItems = flatNavWithIcons.filter(item => MODULE_BAR_IDS.has(item.id));

  return (
    <>
      {/* ── Sticky navbar wrapper — ONLY header, NO module bar inside ── */}
      <div className={`sticky top-0 z-[200] backdrop-blur-md
        ${headerCollapsed ? 'border-b-0' : `border-b ${D ? 'border-gray-800' : 'border-gray-200'}`}
        ${D ? 'bg-[#0a0a0a]/95' : 'bg-gray-50/95'}`}
      >
        <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out
          ${headerCollapsed ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'}`}
        >
          <div className="px-4 md:px-8 py-2.5 md:py-4 flex items-center gap-3 md:gap-4">
            <button className="md:hidden w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center"
              onClick={() => setSidebarOpen(true)}>
              <Menu size={17} className="md:hidden" />
              <Menu size={18} className="hidden md:block" />
            </button>

            <div>
              <h1 className="font-bold text-sm md:text-base lg:text-lg">
                {(() => {
                  const flat = navItems.flatMap(n => n.children ? [n, ...n.children] : [n]);
                  return flat.find(n => n.id === tab)?.label;
                })()}
                {tab === 'dashboard' && (
                  <span className="ml-1.5 text-xs font-normal opacity-50">{t.navDashboardSub}</span>
                )}
              </h1>
              <div>
                <button
                  ref={companyBtnRef}
                  onClick={() => setShowCompanyDropdown(v => !v)}
                  className={`flex items-start gap-1 md:gap-1.5 mt-0.5 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg transition-colors ${D ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                >
                  <div className="flex -space-x-1 flex-shrink-0 pt-0.5">
                    {companies.filter(c => selectedCompanyIds.has(c.id)).slice(0, 4).map(c => (
                      <span key={c.id} className="text-xs md:text-sm leading-none">{c.icon}</span>
                    ))}
                  </div>
                  <p className={`text-[10px] md:text-xs ${sub} max-w-[80px] md:max-w-[220px] leading-tight whitespace-normal`}>
                    {selectedCompanyIds.size === 1
                      ? companies.find(c => selectedCompanyIds.has(c.id))?.name
                      : `${selectedCompanyIds.size} ta tashkilot tanlangan`}
                  </p>
                  <ChevronDown size={11} className={`${sub} transition-transform duration-200 flex-shrink-0 mt-0.5 ${showCompanyDropdown ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-1 md:gap-1.5 lg:gap-2">
              <ClientRequestBell
                D={D}
                sub={sub}
                text={text}
                t={t}
                existingClients={existingClients}
                companyId={selectedCompanyIds.size === 1 ? [...selectedCompanyIds][0] : undefined}
              />
              <button onClick={() => setShowBalances(v => !v)}
                className={`hidden sm:flex w-8 h-8 md:w-9 md:h-9 rounded-xl items-center justify-center ${D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
                {showBalances ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button
                ref={langBtnRef}
                onClick={() => setShowLangMenu(v => !v)}
                className={`flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2.5 py-1.5 md:py-2 rounded-xl text-xs font-medium transition-all ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'}`}>
                <Globe size={13} className="hidden sm:block" />
                <span className="text-xs">{currentLang.flag}</span>
                <ChevronDown size={11} className={`transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
              </button>
              <button onClick={() => setIsDark(!isDark)}
                className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center ${D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
                {D ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* ── Module bar toggle button ── */}
              <button
                onClick={() => setShowModuleBar(v => !v)}
                title={t.navModules ?? 'Modullar'}
                className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-all ${
                  showModuleBar
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                    : D ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}>
                {showModuleBar ? <X size={16} /> : <LayoutGrid size={16} />}
              </button>

              <button
                onClick={() => setHeaderCollapsed(true)}
                title="Yashirish"
                className={`hidden sm:flex w-8 h-8 md:w-9 md:h-9 rounded-xl items-center justify-center transition-colors
                  ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900'}`}
              >
                <ChevronDown size={16} className="rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Collapsed mini-bar — sticky, replaces full navbar, ALWAYS above module bar ── */}
      {headerCollapsed && (
        <div className={`sticky top-0 z-[200] h-8 flex items-center justify-between px-3 border-b backdrop-blur-md
          ${D ? 'bg-[#0a0a0a]/95 border-gray-800' : 'bg-gray-50/95 border-gray-200'}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button className="md:hidden flex-shrink-0" onClick={() => setSidebarOpen(true)}>
              <Menu size={13} />
            </button>
            <span className={`text-[11px] font-semibold truncate ${sub}`}>
              {navItems.flatMap(n => n.children ? [n, ...n.children] : [n]).find(n => n.id === tab)?.label}
              {selectedCompanyIds.size === 1
                ? ` · ${companies.find(c => selectedCompanyIds.has(c.id))?.icon} ${companies.find(c => selectedCompanyIds.has(c.id))?.shortName}`
                : ` · ${selectedCompanyIds.size} ta tashkilot`}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setShowModuleBar(v => !v)}
              title={t.navModules ?? 'Modullar'}
              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                showModuleBar
                  ? 'bg-indigo-600 text-white'
                  : D ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
              }`}
            >
              {showModuleBar ? <X size={12} /> : <LayoutGrid size={12} />}
            </button>
            <button
              onClick={() => setHeaderCollapsed(false)}
              title="Ko'rsatish"
              className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${sub} hover:text-indigo-400`}
            >
              <ChevronDown size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Module bar — ALWAYS LAST, always below navbar OR collapsed mini-bar ── */}
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out
          border-b ${D ? 'bg-[#0a0a0a]/95 border-gray-800' : 'bg-gray-50/95 border-gray-200'}
          backdrop-blur-md
          ${showModuleBar ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div
          className="px-3 md:px-6 py-2 flex items-center gap-1 md:gap-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {moduleBarItems.map(({ id, label, Icon, sub }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-1.5 flex-shrink-0 px-3 md:px-4 py-2 rounded-xl transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                    : D
                      ? 'bg-gray-800/70 text-gray-400 hover:bg-gray-700 hover:text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                <span style={{ fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1 }}>
                  {label}
                </span>
                {sub && (
                  <span style={{ fontSize: 9, whiteSpace: 'nowrap', lineHeight: 1, opacity: 0.65, marginTop: -1 }}>
                    {sub}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Company dropdown — fixed portal */}
      {showCompanyDropdown && (() => {
        const r = companyBtnRef.current?.getBoundingClientRect();
        const isMobile = window.innerWidth < 640;
        return (
          <>
            <div className="fixed inset-0 z-[230]" onClick={() => setShowCompanyDropdown(v => !v)} />
            <div
              className={`fixed z-[231] rounded-2xl border shadow-2xl overflow-hidden ${D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-100'}`}
              style={{
                top: r ? r.bottom + 6 : 66,
                left: isMobile ? '1rem' : (r ? r.left : 80),
                right: isMobile ? '1rem' : 'auto',
                width: isMobile ? 'calc(100vw - 2rem)' : '320px',
                maxWidth: isMobile ? '100%' : '320px'
              }}
            >
              <div className={`px-4 py-3 border-b ${D ? 'border-gray-700' : 'border-gray-100'}`}>
                <p className={`text-xs font-semibold ${sub}`}>Tashkilotni tanlang</p>
              </div>
              {companies.map(c => {
                const isSel = selectedCompanyIds.has(c.id);
                const d = COMPANY_DATA[c.id];
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCompanyIds(prev => {
                        const next = new Set(prev);
                        if (isSel && next.size > 1) next.delete(c.id);
                        else next.add(c.id);
                        return next;
                      });
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      isSel
                        ? D ? 'bg-indigo-600/15' : 'bg-indigo-50'
                        : D ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{c.icon}</span>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`font-medium text-sm truncate ${isSel ? D ? 'text-indigo-300' : 'text-indigo-700' : text}`}>{c.shortName}</p>
                      <p className={`text-xs ${sub} truncate`}>{d ? fmt(d.sales) + ' savdo' : c.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSel ? 'bg-indigo-600 border-indigo-600' : D ? 'border-gray-600' : 'border-gray-300'
                    }`}>
                      {isSel && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
              {selectedCompanyIds.size > 1 && (
                <div className={`px-4 py-3 border-t ${D ? 'border-gray-700' : 'border-gray-100'} flex items-center justify-between`}>
                  <p className={`text-xs ${sub}`}>{selectedCompanyIds.size} ta tanlangan</p>
                  <button
                    onClick={() => { setSelectedCompanyIds(() => new Set([selectedCompany.id])); setShowCompanyDropdown(() => false); }}
                    className="text-xs text-indigo-500 hover:text-indigo-400 font-medium"
                  >
                    Tozalash
                  </button>
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* Lang dropdown — fixed portal */}
      {showLangMenu && (() => {
        const r = langBtnRef.current?.getBoundingClientRect();
        return (
          <>
            <div className="fixed inset-0 z-[230]" onClick={() => setShowLangMenu(() => false)} />
            <div
              className={`fixed z-[231] w-40 rounded-2xl border shadow-2xl overflow-hidden ${D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-100'}`}
              style={{ top: r ? r.bottom + 6 : 66, right: r ? window.innerWidth - r.right : 16 }}
            >
              {ADMIN_LANGS.map(l => (
                <button key={l.id} onClick={() => { setAdminLang(l.id); setShowLangMenu(() => false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${adminLang === l.id ? D ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-700' : D ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${D ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{l.flag}</span>
                    <span>{l.label}</span>
                  </div>
                  {adminLang === l.id && <Check size={13} className="text-indigo-500" />}
                </button>
              ))}
            </div>
          </>
        );
      })()}
    </>
  );
}