import { useRef, useState } from 'react';
import { Check, Eye, EyeOff, Globe, Lock, Minus, Moon, Plus, Settings, Sun, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ADMIN_LANGS, type LangAdmin } from '../../data/adminData';
import { useTheme, type TextColorId, type TextScaleId } from '../ThemeContext';
import { useAdminAuth } from '../AdminAuthContext';
import { useAppLock } from '../AppLockContext';
import { TEXT_SCALE_OPTIONS, getTextScaleOption } from '../../utils/textScale';
import { ChangeCredentialsModal } from './ChangeCredentialsModal';
import { AppLockSetupModal } from './AppLockSetupModal';

interface AdminSettingsMenuProps {
  D: boolean;
  sub: string;
  text: string;
  t: Record<string, string>;
  showBalances: boolean;
  setShowBalances: (fn: (p: boolean) => boolean) => void;
  adminLang: LangAdmin;
  setAdminLang: (l: LangAdmin) => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  /** Tarozi kabi joylar uchun — tugma klassini moslash */
  triggerClassName?: string;
  triggerIconSize?: number;
  /** Dropdown joylashuvi: navbar odatda o'ngdan, tarozi ham */
  align?: 'right' | 'left';
}

export function AdminSettingsMenu({
  D, sub, text, t,
  showBalances, setShowBalances,
  adminLang, setAdminLang,
  isDark, setIsDark,
  triggerClassName,
  triggerIconSize = 16,
  align = 'right',
}: AdminSettingsMenuProps) {
  const { textColor, setTextColor, textScale, setTextScale } = useTheme();
  const { adminUser, updateAdminUser, logout } = useAdminAuth();
  const { hasPasscode } = useAppLock();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [lockMode, setLockMode] = useState<'set' | 'change' | 'remove' | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const scaleIdx = TEXT_SCALE_OPTIONS.findIndex(o => o.id === textScale);
  const scaleOpt = getTextScaleOption(textScale);
  const scaleLabels: Record<TextScaleId, string> = {
    sm: t.textSizeSmall ?? 'Kichik',
    md: t.textSizeNormal ?? 'Oddiy',
    lg: t.textSizeLarge ?? 'Katta',
    xl: t.textSizeXLarge ?? 'Juda katta',
  };
  const stepScale = (dir: -1 | 1) => {
    const next = TEXT_SCALE_OPTIONS[Math.min(TEXT_SCALE_OPTIONS.length - 1, Math.max(0, scaleIdx + dir))];
    if (next) setTextScale(next.id);
  };

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

  const r = btnRef.current?.getBoundingClientRect();
  const panelStyle = align === 'right'
    ? { top: r ? r.bottom + 6 : 66, right: r ? Math.max(8, window.innerWidth - r.right) : 16 }
    : { top: r ? r.bottom + 6 : 66, left: r ? Math.max(8, r.left) : 16 };

  const defaultTrigger =
    `w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-colors ${
      open
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
        : D ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
    }`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        title={t.settingsMenu ?? 'Sozlamalar'}
        aria-label={t.settingsMenu ?? 'Sozlamalar'}
        aria-expanded={open}
        className={triggerClassName ?? defaultTrigger}
      >
        <Settings size={triggerIconSize} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[230]" onClick={() => setOpen(false)} />
          <div
            className={`fixed z-[231] w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border shadow-2xl overflow-hidden ${
              D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-100'
            }`}
            style={panelStyle}
          >
            <div className={`px-4 py-3 border-b ${D ? 'border-gray-700' : 'border-gray-100'}`}>
              <p className={`text-sm font-semibold ${text}`}>{t.settingsMenu ?? 'Sozlamalar'}</p>
            </div>

            <div className="p-3 space-y-4 max-h-[min(70vh,520px)] overflow-y-auto">
              {/* Profil */}
              <div>
                <p className={sectionLabel}>{t.profileSection ?? 'Profil'}</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setShowProfile(true);
                  }}
                  className={btnCls(false)}
                >
                  <UserRound size={15} className="flex-shrink-0" />
                  <span className="flex-1 text-left min-w-0">
                    <span className="block font-medium truncate">
                      {adminUser?.name || (t.profileTitle ?? 'Profil')}
                    </span>
                    {adminUser?.username && (
                      <span className={`block text-[10px] mt-0.5 ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                        @{adminUser.username}
                      </span>
                    )}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0
                    ${D ? 'bg-indigo-600/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                    {t.profileChangeCreds ?? "Login / parol"}
                  </span>
                </button>
              </div>

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

              <div>
                <p className={sectionLabel}>{t.appLockSection ?? 'Qulf'}</p>
                {!hasPasscode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setLockMode('set');
                    }}
                    className={btnCls(false)}
                  >
                    <Lock size={15} className="flex-shrink-0" />
                    <span className="flex-1 text-left font-medium">
                      {t.appLockSet ?? 'Kod-parol o‘rnatish'}
                    </span>
                  </button>
                ) : (
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setLockMode('change');
                      }}
                      className={btnCls(false)}
                    >
                      <Lock size={15} className="flex-shrink-0" />
                      <span className="flex-1 text-left font-medium">
                        {t.appLockChange ?? 'Kod-parolni o‘zgartirish'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0
                        ${D ? 'bg-emerald-600/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
                        {t.appLockOn ?? 'Yoqilgan'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setLockMode('remove');
                      }}
                      className={btnCls(false)}
                    >
                      <Lock size={15} className="flex-shrink-0 opacity-60" />
                      <span className="flex-1 text-left font-medium">
                        {t.appLockRemove ?? 'Kod-parolni o‘chirish'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

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

              {/* Matn o'lchami */}
              <div>
                <p className={sectionLabel}>{t.textSizeLabel ?? "Matn o'lchami"}</p>
                <div className={`flex items-center gap-2 p-2 rounded-xl border ${D ? 'border-gray-700 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                  <button
                    type="button"
                    onClick={() => stepScale(-1)}
                    disabled={scaleIdx <= 0}
                    title={t.textSizeDecrease ?? 'Kichiklashtirish'}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30
                      ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'}`}
                  >
                    <span className="text-[11px] font-bold leading-none mr-0.5">A</span>
                    <Minus size={11} strokeWidth={2.5} />
                  </button>
                  <div className="flex-1 text-center min-w-0">
                    <p className={`text-sm font-semibold tabular-nums ${D ? 'text-gray-100' : 'text-gray-800'}`}>
                      {scaleOpt.percent}%
                    </p>
                    <p className={`text-[10px] truncate ${sub}`}>{scaleLabels[textScale]}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => stepScale(1)}
                    disabled={scaleIdx >= TEXT_SCALE_OPTIONS.length - 1}
                    title={t.textSizeIncrease ?? 'Kattalashtirish'}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30
                      ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'}`}
                  >
                    <span className="text-[15px] font-bold leading-none mr-0.5">A</span>
                    <Plus size={11} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="mt-1.5 grid grid-cols-4 gap-1">
                  {TEXT_SCALE_OPTIONS.map(opt => {
                    const active = textScale === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTextScale(opt.id)}
                        className={`px-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors truncate
                          ${active
                            ? D ? 'bg-indigo-600/25 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                            : D ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                      >
                        {scaleLabels[opt.id]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showProfile && (
        <ChangeCredentialsModal
          D={D}
          t={t}
          currentUsername={adminUser?.username}
          onClose={() => setShowProfile(false)}
          onSuccess={({ username, passwordChanged }) => {
            updateAdminUser({ username });
            setShowProfile(false);
            if (passwordChanged) {
              logout();
              navigate('/admin/login', {
                replace: true,
                state: { notice: t.profilePassChanged ?? "Parol o'zgardi — qayta kiring" },
              });
            }
          }}
        />
      )}

      {lockMode && (
        <AppLockSetupModal
          D={D}
          t={t}
          mode={lockMode}
          onClose={() => setLockMode(null)}
        />
      )}
    </>
  );
}
