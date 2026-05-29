import { useState } from 'react';
import { ChevronLeft, Eye, EyeOff, LogOut, Moon, Sun, X, ChevronDown } from 'lucide-react';
import { type Tab, type NavEntry } from '../../data/adminData';

interface AdminSidebarProps {
  D: boolean;
  sidebar: string;
  divider: string;
  sub: string;
  text: string;
  tab: Tab;
  setTab: (t: Tab) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean | ((p: boolean) => boolean)) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  showBalances: boolean;
  setShowBalances: (v: boolean | ((p: boolean) => boolean)) => void;
  t: Record<string, string>;
  selectedCompany: { id: string; icon: string; shortName: string };
  clearCompany: () => void;
  navigate: (path: string) => void;
  logout: () => void;
  setIsDark: (v: boolean) => void;
  navItems: (NavEntry & { label: string; children?: (NavEntry['children'] extends infer C ? C extends any[] ? (C[number] & { label: string })[] : never : never) })[];
}

export function AdminSidebar({
  D, sidebar, divider, sub, text,
  tab, setTab,
  sidebarCollapsed, setSidebarCollapsed,
  sidebarOpen, setSidebarOpen,
  showBalances, setShowBalances,
  t, selectedCompany, clearCompany, navigate, logout, setIsDark,
  navItems,
}: AdminSidebarProps) {

  // Track which groups are expanded (default: expand group if active tab is inside it)
  const isTabInGroup = (entry: typeof navItems[number]) =>
    entry.children?.some(c => c.id === tab) ?? false;

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    navItems.forEach(item => {
      if (item.children) init[item.id] = isTabInGroup(item);
    });
    return init;
  });

  const toggleGroup = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 ${sidebarCollapsed && !mobile ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">L</div>
        {(!sidebarCollapsed || mobile) && <span className="font-bold text-base tracking-tight">Lider CRM</span>}
      </div>

      {/* Company */}
      <button
        onClick={() => { clearCompany(); navigate('/admin/select'); setSidebarOpen(false); }}
        className={`mx-3 mb-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${D ? 'border-gray-800 bg-white/4 hover:bg-white/8' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'} ${sidebarCollapsed && !mobile ? 'justify-center px-2' : ''}`}
        title={sidebarCollapsed && !mobile ? t.change : undefined}
      >
        <span className="text-xl flex-shrink-0">{selectedCompany.icon}</span>
        {(!sidebarCollapsed || mobile) && (
          <div className="flex-1 min-w-0 text-left">
            <p className={`text-xs font-semibold truncate ${text}`}>{selectedCompany.shortName}</p>
            <p className={`text-xs ${sub} truncate`}>{t.change}</p>
          </div>
        )}
      </button>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.filter(item => !item.hideInSidebar).map(item => {
          const Icon = item.icon;

          /* ── Group item ── */
          if (item.children) {
            const isOpen = expanded[item.id] ?? false;
            const hasActiveChild = item.children.some(c => c.id === tab);
            return (
              <div key={item.id}>
                {/* Group header */}
                <button
                  onClick={() => {
                    if (sidebarCollapsed && !mobile) {
                      // On collapsed sidebar, click goes to first child
                      const first = item.children![0];
                      if (first) { setTab(first.id as Tab); setSidebarOpen(false); }
                    } else {
                      toggleGroup(item.id);
                    }
                  }}
                  title={sidebarCollapsed && !mobile ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${sidebarCollapsed && !mobile ? 'justify-center px-2' : ''} ${
                    hasActiveChild
                      ? D ? 'text-indigo-400' : 'text-indigo-600'
                      : D ? `${sub} hover:bg-gray-800 hover:text-white` : `${sub} hover:bg-gray-100 hover:text-gray-900`
                  }`}
                >
                  <Icon size={17} className="flex-shrink-0" />
                  {(!sidebarCollapsed || mobile) && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        size={13}
                        className="flex-shrink-0 transition-transform duration-200"
                        style={{ transform: isOpen ? 'rotate(-180deg)' : 'rotate(0deg)' }}
                      />
                    </>
                  )}
                </button>

                {/* Children */}
                {(!sidebarCollapsed || mobile) && isOpen && (
                  <div className="mt-0.5 ml-3 pl-3 border-l border-gray-700/40 space-y-0.5">
                    {item.children.map(child => {
                      const CIcon = child.icon;
                      const active = tab === child.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => { setTab(child.id as Tab); setSidebarOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            active
                              ? D ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                              : D ? `${sub} hover:bg-gray-800 hover:text-white` : `${sub} hover:bg-gray-100 hover:text-gray-900`
                          }`}
                        >
                          <CIcon size={15} className="flex-shrink-0" />
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          /* ── Regular item ── */
          const active = tab === item.id;
          return (
            <button key={item.id}
              onClick={() => { setTab(item.id as Tab); setSidebarOpen(false); }}
              title={sidebarCollapsed && !mobile ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${sidebarCollapsed && !mobile ? 'justify-center px-2' : ''} ${
                active
                  ? D ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : D ? `${sub} hover:bg-gray-800 hover:text-white` : `${sub} hover:bg-gray-100 hover:text-gray-900`
              }`}>
              <Icon size={17} className="flex-shrink-0" />
              {(!sidebarCollapsed || mobile) && (
                item.id === 'dashboard'
                  ? <span className="flex flex-col leading-tight">
                      <span>{item.label}</span>
                      <span className="text-[10px] font-normal opacity-60">{t.navDashboardSub}</span>
                    </span>
                  : <span>{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className={`px-3 py-4 border-t ${divider} space-y-1`}>
        <button
          onClick={() => setShowBalances(v => !v)}
          title={sidebarCollapsed && !mobile ? (showBalances ? t.hideBalance : t.showBalance) : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${sub} ${D ? 'hover:bg-gray-800 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900'} transition-all ${sidebarCollapsed && !mobile ? 'justify-center px-2' : ''}`}>
          {showBalances ? <Eye size={17} /> : <EyeOff size={17} />}
          {(!sidebarCollapsed || mobile) && <span className="whitespace-nowrap">{showBalances ? t.hideBalance : t.showBalance}</span>}
        </button>

        <button
          onClick={() => setIsDark(!D)}
          title={sidebarCollapsed && !mobile ? (D ? t.lightTheme : t.darkTheme) : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${sub} ${D ? 'hover:bg-gray-800 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900'} transition-all ${sidebarCollapsed && !mobile ? 'justify-center px-2' : ''}`}>
          {D ? <Sun size={17} /> : <Moon size={17} />}
          {(!sidebarCollapsed || mobile) && <span className="whitespace-nowrap">{D ? t.lightTheme : t.darkTheme}</span>}
        </button>

        {!mobile && (
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            title={sidebarCollapsed ? t.expand : t.collapse}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${sub} ${D ? 'hover:bg-gray-800 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900'} transition-all ${sidebarCollapsed ? 'justify-center px-2' : ''}`}>
            <ChevronLeft size={17} className={`transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            {!sidebarCollapsed && <span className="whitespace-nowrap">{t.collapse}</span>}
          </button>
        )}

        <button
          onClick={() => { logout(); navigate('/admin/login'); }}
          title={sidebarCollapsed && !mobile ? t.logout : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-500 ${D ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'} transition-all ${sidebarCollapsed && !mobile ? 'justify-center px-2' : ''}`}>
          <LogOut size={17} />
          {(!sidebarCollapsed || mobile) && <span className="whitespace-nowrap">{t.logout}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col fixed left-0 top-0 h-full border-r ${sidebar} z-[230] transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-[240] flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className={`relative z-[250] w-72 h-full border-r ${sidebar} flex flex-col`}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-inherit">
              <span className="font-bold">Lider CRM</span>
              <button onClick={() => setSidebarOpen(false)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent mobile />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}