import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Moon, Sun, Shield, AlertCircle, Loader, Globe, ChevronDown, Check } from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { useAdminAuth } from '../components/AdminAuthContext';
import { api, setTokens, clearTokens } from '../api/client';
import { useLang, Lang } from '../components/LangContext';

const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'cy', label: 'Ўзбек',  flag: 'КР' },
  { id: 'uz', label: "O'zbek", flag: 'UZ' },
  { id: 'ru', label: 'Русский', flag: 'RU' },
];

const T: Record<Lang, Record<string, string>> = {
  uz: {
    title:       'Kirish',
    subtitle:    "Admin panelga kirish uchun ma'lumotlarni kiriting",
    loginLabel:  'Login',
    passLabel:   'Parol',
    submit:      'Kirish',
    loading:     'Tekshirilmoqda...',
    errEmpty:    "Login va parolni kiriting",
    errWrong:    "Login yoki parol noto'g'ri",
    errBackend:  "Backend ulanmagan. Keyinroq qayta urinib ko'ring.",
    demo:        'Demo',
    footer:      'Lider CRM tizimi — v2.0 · Barcha huquqlar himoyalangan',
  },
  cy: {
    title:       'Кириш',
    subtitle:    "Админ панелга кириш учун маълумотларни киритинг",
    loginLabel:  'Логин',
    passLabel:   'Парол',
    submit:      'Кириш',
    loading:     'Текширилмоқда...',
    errEmpty:    "Логин ва паролни киритинг",
    errWrong:    "Логин ёки парол нотўғри",
    errBackend:  "Backend уланмаган. Кейинроқ қайта уриниб кўринг.",
    demo:        'Демо',
    footer:      'Lider CRM тизими — v2.0 · Барча ҳуқуқлар ҳимояланган',
  },
  ru: {
    title:       'Вход',
    subtitle:    'Введите данные для входа в панель администратора',
    loginLabel:  'Логин',
    passLabel:   'Пароль',
    submit:      'Войти',
    loading:     'Проверяем...',
    errEmpty:    "Введите логин и пароль",
    errWrong:    "Неверный логин или пароль",
    errBackend:  "Backend недоступен. Попробуйте позже.",
    demo:        'Демо',
    footer:      'Lider CRM система — v2.0 · Все права защищены',
  },
};

export default function AdminLogin() {
  const { isDark, setIsDark } = useTheme();
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const { lang, setLang } = useLang();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const D = isDark;
  const t = T[lang];
  const currentLang = LANGS.find(l => l.id === lang)!;

  const bg      = D ? 'bg-[#0a0a0a]' : 'bg-gray-50';
  const cardBg  = D ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200';
  const text    = D ? 'text-white' : 'text-gray-900';
  const sub     = D ? 'text-gray-400' : 'text-gray-500';
  const inputCls = D
    ? 'bg-[#1e1e1e] border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-400';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t.errEmpty);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.login(username.trim(), password.trim());
      if (res.user.role !== 'admin' && res.user.role !== 'manager') {
        clearTokens();
        setError(t.errWrong);
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
      setTokens(res.accessToken, res.refreshToken);
      localStorage.setItem('api_user_id', res.user.id);
      window.dispatchEvent(new CustomEvent('lider:auth-changed'));
      const userData = {
        name: res.user.fullName,
        role: res.user.role,
        permissions: res.user.permissions ?? null,
      };
      login(username.trim(), password.trim(), userData);
      navigate('/admin/select');
    } catch (err) {
      clearTokens();
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const isAuth = msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid');
      const isNetwork =
        !isAuth &&
        (msg.includes('fetch') ||
          msg.includes('network') ||
          msg.includes('failed to fetch') ||
          msg.includes('refused') ||
          msg.includes('ulanmagan'));
      setError(isNetwork ? t.errBackend : isAuth ? t.errWrong : (err instanceof Error ? err.message : t.errWrong));
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${bg} ${text} flex flex-col`}>
      <style>{`
        *::-webkit-scrollbar{display:none}
        *{-ms-overflow-style:none;scrollbar-width:none}
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%,60%{transform:translateX(-8px)}
          40%,80%{transform:translateX(8px)}
        }
        .shake{animation:shake 0.5s ease-in-out}
        @keyframes fadeIn {
          from{opacity:0;transform:translateY(16px)}
          to{opacity:1;transform:translateY(0)}
        }
        .fadeIn{animation:fadeIn 0.4s ease-out}
      `}</style>

      {/* Top bar */}
      <div className="flex justify-between items-center px-6 pt-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${D ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
            <Shield size={16} className="text-indigo-500" />
          </div>
          <span className="font-bold text-sm">Lider Admin</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                D ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 shadow-sm'
              }`}
            >
              <Globe size={13} />
              <span>{currentLang.flag}</span>
              <ChevronDown size={11} className={`transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
            </button>

            {showLangMenu && (
              <div className={`absolute right-0 top-full mt-2 w-40 rounded-2xl border shadow-2xl z-50 overflow-hidden ${
                D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-100'
              }`}>
                {LANGS.map(l => (
                  <button
                    key={l.id}
                    onClick={() => { setLang(l.id); setShowLangMenu(false); setError(''); }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                      lang === l.id
                        ? D ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-700'
                        : D ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${D ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                        {l.flag}
                      </span>
                      <span>{l.label}</span>
                    </div>
                    {lang === l.id && <Check size={13} className="text-indigo-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setIsDark(!D)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              D ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 shadow-sm'
            }`}
          >
            {D ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm fadeIn">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 ${D ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
              <Shield size={32} className="text-indigo-500" />
            </div>
            <h1 className="text-2xl font-bold mb-1">{t.title}</h1>
            <p className={`text-sm ${sub}`}>{t.subtitle}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className={`rounded-3xl border p-6 space-y-4 ${cardBg} ${shake ? 'shake' : ''}`}>
            {/* Error */}
            {error && (
              <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl ${D ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-rose-50 border border-rose-200'}`}>
                <AlertCircle size={15} className="text-rose-400 flex-shrink-0" />
                <p className="text-sm text-rose-400">{error}</p>
              </div>
            )}

            {/* Username */}
            <div>
              <label className={`text-xs font-medium ${sub} mb-1.5 block`}>{t.loginLabel}</label>
              <input
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="admin"
                autoComplete="username"
                className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-colors ${inputCls}`}
              />
            </div>

            {/* Password */}
            <div>
              <label className={`text-xs font-medium ${sub} mb-1.5 block`}>{t.passLabel}</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full px-4 py-3.5 pr-12 rounded-2xl border text-sm outline-none transition-colors ${inputCls}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl ${D ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                loading
                  ? D ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : D ? 'bg-white text-black hover:bg-gray-100 active:scale-[0.98]' : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  {t.loading}
                </>
              ) : t.submit}
            </button>

            {/* Hint */}
            <div className="text-center pt-1">
              <p className={`text-xs ${sub}`}>
                {t.demo}: <span className={`font-mono ${D ? 'text-gray-300' : 'text-gray-600'}`}>admin / 123456</span>
              </p>
            </div>
          </form>

          {/* Footer */}
          <p className={`text-center text-xs ${sub} mt-6`}>{t.footer}</p>
        </div>
      </div>
    </div>
  );
}