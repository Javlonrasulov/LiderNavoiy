import { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, User, X } from 'lucide-react';
import { api } from '../../api/client';

interface Props {
  D: boolean;
  t: Record<string, string>;
  currentUsername?: string | null;
  onClose: () => void;
  onSuccess: (result: { username: string; passwordChanged: boolean }) => void;
}

export function ChangeCredentialsModal({
  D, t, currentUsername, onClose, onSuccess,
}: Props) {
  const [username, setUsername] = useState(currentUsername ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setUsername(currentUsername ?? '');
  }, [currentUsername]);

  const inputCls = `w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors
    ${D
      ? 'bg-[#0d0d0d] border-gray-700 text-gray-100 placeholder-gray-600 focus:border-indigo-500'
      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-400'}`;

  const labelCls = `text-[11px] font-semibold mb-1 block ${D ? 'text-gray-400' : 'text-gray-500'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const loginTrim = username.trim().toLowerCase();
    const cur = currentPassword.trim();
    const np = newPassword.trim();
    const cp = confirmPassword.trim();
    const loginChanged = !!loginTrim && loginTrim !== (currentUsername ?? '').trim().toLowerCase();
    const passwordChanged = np.length > 0;

    if (!cur) {
      setError(t.profileErrCurrentPass ?? 'Joriy parolni kiriting');
      return;
    }
    if (!loginChanged && !passwordChanged) {
      setError(t.profileErrNothing ?? "Login yoki yangi parolni o'zgartiring");
      return;
    }
    if (loginChanged && loginTrim.length < 3) {
      setError(t.profileErrLoginShort ?? "Login kamida 3 belgidan iborat bo'lsin");
      return;
    }
    if (passwordChanged && np.length < 6) {
      setError(t.profileErrPassShort ?? "Yangi parol kamida 6 belgidan iborat bo'lsin");
      return;
    }
    if (passwordChanged && np !== cp) {
      setError(t.profileErrPassMatch ?? 'Yangi parollar mos emas');
      return;
    }

    setLoading(true);
    try {
      const result = await api.changeCredentials({
        currentPassword: cur,
        newUsername: loginChanged ? loginTrim : undefined,
        newPassword: passwordChanged ? np : undefined,
      });
      onSuccess(result);
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      const low = raw.toLowerCase();
      if (low.includes('401') || low.includes('invalid current') || low.includes('unauthorized')) {
        setError(t.profileErrWrongPass ?? "Joriy parol noto'g'ri");
      } else if (low.includes('409') || low.includes('already exists') || low.includes('conflict')) {
        setError(t.profileErrLoginTaken ?? 'Bu login band — boshqasini tanlang');
      } else {
        setError(raw.replace(/^HTTP \d+:\s*/, '') || (t.profileErrGeneric ?? 'Xatolik yuz berdi'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-[400px] rounded-2xl border shadow-2xl overflow-hidden
          ${D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-100'}`}
        style={{ animation: 'credModalIn .16s ease-out' }}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${D ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${D ? 'text-white' : 'text-gray-900'}`}>
              {t.profileTitle ?? 'Profil'}
            </p>
            <p className={`text-[11px] mt-0.5 ${D ? 'text-gray-500' : 'text-gray-400'}`}>
              {t.profileSubtitle ?? "Login va parolni o'zgartirish"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
              ${D ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className={labelCls}>{t.loginLabel ?? 'Login'}</label>
            <div className="relative">
              <User size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${D ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={`${inputCls} pl-9`}
                autoComplete="username"
                placeholder={t.loginLabel ?? 'Login'}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t.profileCurrentPass ?? 'Joriy parol'}</label>
            <div className="relative">
              <Lock size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${D ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type={showCur ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className={`${inputCls} pl-9 pr-10`}
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCur(v => !v)}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 ${D ? 'text-gray-500' : 'text-gray-400'}`}
              >
                {showCur ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>
              {t.profileNewPass ?? 'Yangi parol'}
              <span className={`font-normal ml-1 ${D ? 'text-gray-600' : 'text-gray-400'}`}>
                ({t.profileOptional ?? 'ixtiyoriy'})
              </span>
            </label>
            <div className="relative">
              <Lock size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${D ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className={`${inputCls} pl-9 pr-10`}
                autoComplete="new-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 ${D ? 'text-gray-500' : 'text-gray-400'}`}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {newPassword.trim().length > 0 && (
            <div>
              <label className={labelCls}>{t.profileConfirmPass ?? 'Yangi parolni tasdiqlang'}</label>
              <input
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={inputCls}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <p className={`text-xs px-3 py-2 rounded-xl ${D ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-50 text-rose-600'}`}>
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors
                ${D ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {t.cancel ?? 'Bekor'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-60"
            >
              {loading ? (t.saving ?? 'Saqlanmoqda...') : (t.save ?? 'Saqlash')}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes credModalIn{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
