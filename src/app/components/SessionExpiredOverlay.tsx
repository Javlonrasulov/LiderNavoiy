import { useEffect, useState } from 'react';
import { useAdminAuth } from './AdminAuthContext';
import { useLang, type Lang } from './LangContext';
import { resetUnauthorizedGuard } from '../api/client';

const COPY: Record<Lang, { title: string; body: string; wait: string; now: string }> = {
  uz: {
    title: 'Sessiya tugadi',
    body: 'Tizimga qayta kirish kerak. Demo malumotlar korsatilmaydi.',
    wait: 'Login sahifasiga otish',
    now: 'Hozir kirish',
  },
  cy: {
    title: 'Сессия тугади',
    body: 'Тизимга қайта кириш керак. Демо маълумотлар кўрсатилмайди.',
    wait: 'Логин саҳифасига ўтиш',
    now: 'Ҳозир кириш',
  },
  ru: {
    title: 'Сессия истекла',
    body: 'Нужно войти снова. Демо-данные не показываются.',
    wait: 'Переход на страницу входа',
    now: 'Войти сейчас',
  },
};

const REDIRECT_SEC = 10;

/** 401 da toliq ekran — demo kontent korinmasin, 10 s dan keyin login */
export function SessionExpiredOverlay() {
  const { logout, isLoggedIn } = useAdminAuth();
  const { lang } = useLang();
  const t = COPY[lang] ?? COPY.uz;
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(REDIRECT_SEC);

  useEffect(() => {
    const onUnauth = () => setActive(true);
    window.addEventListener('lider:unauthorized', onUnauth);
    return () => window.removeEventListener('lider:unauthorized', onUnauth);
  }, []);

  useEffect(() => {
    if (!active) return;
    setSeconds(REDIRECT_SEC);
    const tick = window.setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    const done = window.setTimeout(() => {
      logout();
      resetUnauthorizedGuard();
      window.location.assign('/admin/login');
    }, REDIRECT_SEC * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [active, logout]);

  if (!active || !isLoggedIn) return null;

  const goNow = () => {
    logout();
    resetUnauthorizedGuard();
    window.location.assign('/admin/login');
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0a0a0a]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="mx-4 max-w-md w-full rounded-2xl border border-rose-800/60 bg-[#161616] p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-900/40 text-rose-300 text-2xl font-bold">
          !
        </div>
        <h2 id="session-expired-title" className="text-xl font-bold text-white mb-2">
          {t.title}
        </h2>
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">{t.body}</p>
        <p className="text-sm text-rose-300 mb-6 tabular-nums">
          {t.wait}: <span className="font-bold text-white text-lg">{seconds}</span>
        </p>
        <button
          type="button"
          onClick={goNow}
          className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 transition-colors"
        >
          {t.now}
        </button>
      </div>
    </div>
  );
}
