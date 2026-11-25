import { useRef, useState } from 'react';
import {
  Check, ChevronDown, Eye, EyeOff, Globe, Menu, Moon, Settings, Sun, LayoutGrid, X,
} from 'lucide-react';
import { ADMIN_LANGS, COMPANY_DATA, NAV_ITEMS_BASE, fmt, type ClientRow, type LangAdmin, type Tab } from '../../data/adminData';
import { useCompanies } from '../CompaniesContext';
import { companyShowsTarozi, useAdminAuth } from '../AdminAuthContext';
import { useTheme } from '../ThemeContext';
import { CompanyAvatar } from '../CompanyAvatar';
import { ClientRequestBell } from './ClientRequestBell';
import type { TextColorId } from '../../utils/textColor';

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
  const { selectedCompany: authCompany } = useAdminAuth();
  const { textColor, setTextColor } = useTheme();
  const [showModuleBar, setShowModuleBar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  void showLangMenu;
  void langBtnRef;

  // Build flat navItems with icons from NAV_ITEMS_BASE
  const flatNavWithIcons = NAV_ITEMS_BASE.map(base => {
    const item = navItems.find(n => n.id === base.id);
    const label = item?.label ?? t[base.key] ?? base.key;
    const sub = base.subKey ? (t[base.subKey] ?? base.subKey) : undefined;
    return { id: base.id as Tab, label, Icon: base.icon, sub };
  });

  // kg / kg+dona → Tarozi; faqat dona → tayyorlanmagan buyurtmalar
  const selectedOrgs = companies.filter(c => selectedCompanyIds.has(c.id));
  const showTarozi = selectedOrgs.length > 0
    ? selectedOrgs.some(c => companyShowsTarozi(c.productType))
    : companyShowsTarozi(
        authCompany?.productType
        ?? companies.find(c => c.id === selectedCompany.id)?.productType
        ?? 'kg_dona',
      );

  const MODULE_BAR_IDS = new Set<string>([
    'dashboard',
    showTarozi ? 'tarozi' : 'unpreparedOrders',
    'prodaji',
    'ombor',
    'vanSales',
  ]);
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
                      <CompanyAvatar
                        key={c.id}
                        icon={c.icon}
                        imageUrl={c.imageUrl}
                        shortName={c.shortName}
                        size={16}
                        rounded="full"
                        className="ring-1 ring-white dark:ring-gray-900"
                      />
                    ))}
                  </div>
                  <p className={`text-[10px] md:text-xs ${sub} max-w-[120px] md:max-w-[320px] leading-tight whitespace-normal`}>
                    {selectedOrgs.length === 0
                      ? '—'
                      : selectedOrgs.length === 1
                        ? selectedOrgs[0].name
                        : selectedOrgs.map(c => c.shortName).join(' · ')}
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

              {/* Sozlamalar: til, tun/kun, balans, matn rangi */}
              <button
                ref={settingsBtnRef}
                onClick={() => {
                  setShowSettings(v => !v);
                  setShowLangMenu(() => false);
                }}
                title={t.settingsMenu ?? 'Sozlamalar'}
                aria-label={t.settingsMenu ?? 'Sozlamalar'}
                aria-expanded={showSettings}
                className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-colors ${
                  showSettings
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                    : D ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Settings size={16} />
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
            <span className={`text-[11px] font-semibold truncate ${sub} flex items-center gap-1.5`}>
              {navItems.flatMap(n => n.children ? [n, ...n.children] : [n]).find(n => n.id === tab)?.label}
              {selectedOrgs.length === 1 ? (
                <>
                  <span>·</span>
                  <CompanyAvatar
                    icon={selectedOrgs[0].icon}
                    imageUrl={selectedOrgs[0].imageUrl}
                    shortName={selectedOrgs[0].shortName}
                    size={14}
                    rounded="full"
                  />
                  <span className="truncate">{selectedOrgs[0].shortName}</span>
                </>
              ) : selectedOrgs.length > 1 ? (
                <span className="truncate"> · {selectedOrgs.map(c => c.shortName).join(' · ')}</span>
              ) : null}
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
                    <CompanyAvatar
                      icon={c.icon}
                      imageUrl={c.imageUrl}
                      shortName={c.shortName}
                      size={28}
                      rounded="xl"
                    />
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
                <div className={`px-4 py-3 border-t ${D ? 'border-gray-700' : 'border-gray-100'} flex items-center justify-between gap-3`}>
                  <p className={`text-xs ${sub} min-w-0 truncate`}>
                    {selectedOrgs.map(c => c.shortName).join(' · ')}
                  </p>
                  <button
                    onClick={() => { setSelectedCompanyIds(() => new Set([selectedCompany.id])); setShowCompanyDropdown(() => false); }}
                    className="text-xs text-indigo-500 hover:text-indigo-400 font-medium flex-shrink-0"
                  >
                    Tozalash
                  </button>
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* Sozlamalar paneli */}
      {showSettings && (() => {
        const r = settingsBtnRef.current?.getBoundingClientRect();
        const btnCls = (active: boolean) =>
          `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
            active
              ? D ? 'bg-indigo-600/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
              : D ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
          }`;
        const sectionLabel = `px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider ${sub}`;
        const textOpts: { id: TextColorId; label: string; swatch: string }[] = [
          {
            id: 'default',
            label: t.textColorDefault ?? 'Standart',
            swatch: 'linear-gradient(135deg, #64748b 0%, #0f172a 100%)',
          },
          {
            id: 'black',
            label: t.textColorBlack ?? 'Qora',
            swatch: D ? '#ffffff' : '#000000',
          },
        ];
        return (
          <>
            <div className="fixed inset-0 z-[230]" onClick={() => setShowSettings(false)} />
            <div
              className={`fixed z-[231] w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border shadow-2xl overflow-hidden ${D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-100'}`}
              style={{ top: r ? r.bottom + 6 : 66, right: r ? Math.max(8, window.innerWidth - r.right) : 16 }}
            >
              <div className={`px-4 py-3 border-b ${D ? 'border-gray-700' : 'border-gray-100'}`}>
                <p className={`text-sm font-semibold ${text}`}>{t.settingsMenu ?? 'Sozlamalar'}</p>
              </div>

              <div className="p-3 space-y-4 max-h-[min(70vh,520px)] overflow-y-auto">
                {/* Til */}
                <div>
                  <p className={sectionLabel}>{t.languageLabel ?? 'Til'}</p>
                  <div className="space-y-0.5">
                    {ADMIN_LANGS.map(l => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setAdminLang(l.id)}
                        className={btnCls(adminLang === l.id)}
                      >
                        <Globe size={15} className="opacity-70 flex-shrink-0" />
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${D ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
                          {l.flag}
                        </span>
                        <span className="flex-1 text-left font-medium">{l.label}</span>
                        {adminLang === l.id && <Check size={14} className="text-indigo-500" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tun / kun */}
                <div>
                  <p className={sectionLabel}>{t.themeLabel ?? 'Mavzu'}</p>
                  <button
                    type="button"
                    onClick={() => setIsDark(!isDark)}
                    className={btnCls(false)}
                  >
                    {D ? <Sun size={15} className="flex-shrink-0" /> : <Moon size={15} className="flex-shrink-0" />}
                    <span className="flex-1 text-left font-medium">
                      {D ? (t.themeLight ?? 'Kun rejimi') : (t.themeDark ?? 'Tun rejimi')}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${D ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
                      {D ? (t.themeDarkShort ?? 'Tun') : (t.themeLightShort ?? 'Kun')}
                    </span>
                  </button>
                </div>

                {/* Balans */}
                <div>
                  <p className={sectionLabel}>{t.balanceLabel ?? 'Balans'}</p>
                  <button
                    type="button"
                    onClick={() => setShowBalances(v => !v)}
                    className={btnCls(false)}
                  >
                    {showBalances ? <Eye size={15} className="flex-shrink-0" /> : <EyeOff size={15} className="flex-shrink-0" />}
                    <span className="flex-1 text-left font-medium">
                      {showBalances ? (t.hideBalance ?? 'Balansni yashir') : (t.showBalance ?? "Balansni ko'rsat")}
                    </span>
                  </button>
                </div>

                {/* Matn rangi */}
                <div>
                  <p className={sectionLabel}>{t.textColor ?? 'Matn rangi'}</p>
                  <div className="space-y-0.5">
                    {textOpts.map(opt => {
                      const active = textColor === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTextColor(opt.id)}
                          className={btnCls(active)}
                        >
                          <span
                            className={`h-[18px] w-[18px] rounded-full border flex-shrink-0 ${D ? 'border-gray-600' : 'border-gray-200'}`}
                            style={{ background: opt.swatch }}
                          />
                          <span className="flex-1 text-left font-medium">{opt.label}</span>
                          {active && <Check size={14} className="text-indigo-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </>
  );
}