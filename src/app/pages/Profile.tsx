import { useState } from 'react';
import { useTheme } from '../components/ThemeContext';
import { useNavigate } from 'react-router';
import { ChevronLeft, User, Eye, EyeOff, Lock, Check, X, KeyRound } from 'lucide-react';

const PROFILE_KEY = 'crm_profile_password';

function getSavedPassword() {
  return localStorage.getItem(PROFILE_KEY) || 'agent2024';
}

export default function Profile() {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();

  const [savedPassword, setSavedPassword] = useState(getSavedPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [oldInput, setOldInput] = useState('');
  const [newInput, setNewInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const t = {
    uz_latn: {
      profile: 'Profil',
      name: 'Ism',
      surname: 'Familiya',
      login: 'Login',
      password: 'Parol',
      position: 'Lavozim',
      company: 'Kompaniya',
      changePass: 'Parolni o\'zgartirish',
      oldPass: 'Joriy parol',
      newPass: 'Yangi parol',
      confirmPass: 'Tasdiqlash',
      save: 'Saqlash',
      cancel: 'Bekor qilish',
      wrongOld: 'Joriy parol noto\'g\'ri',
      notMatch: 'Parollar mos emas',
      tooShort: 'Parol kamida 6 ta belgi bo\'lishi kerak',
      successMsg: 'Parol muvaffaqiyatli o\'zgartirildi!',
      info: 'Ma\'lumotlar',
    },
    uz_cyrl: {
      profile: 'Профил',
      name: 'Исм',
      surname: 'Фамилия',
      login: 'Логин',
      password: 'Парол',
      position: 'Лавозим',
      company: 'Компания',
      changePass: 'Паролни ўзгартириш',
      oldPass: 'Жорий парол',
      newPass: 'Янги парол',
      confirmPass: 'Тасдиқлаш',
      save: 'Сақлаш',
      cancel: 'Бекор қилиш',
      wrongOld: 'Жорий парол нотўғри',
      notMatch: 'Паролlar мос эмас',
      tooShort: 'Парол камида 6 та белги бўлиши керак',
      successMsg: 'Парол муваффақиятли ўзгартирилди!',
      info: 'Маълумотлар',
    },
    ru: {
      profile: 'Профиль',
      name: 'Имя',
      surname: 'Фамилия',
      login: 'Логин',
      password: 'Пароль',
      position: 'Должность',
      company: 'Компания',
      changePass: 'Изменить пароль',
      oldPass: 'Текущий пароль',
      newPass: 'Новый пароль',
      confirmPass: 'Подтверждение',
      save: 'Сохранить',
      cancel: 'Отмена',
      wrongOld: 'Текущий пароль неверный',
      notMatch: 'Пароли не совпадают',
      tooShort: 'Пароль должен быть не менее 6 символов',
      successMsg: 'Пароль успешно изменён!',
      info: 'Данные',
    },
  }[language];

  const profileData = {
    firstName: { uz_latn: 'Diyorbek', uz_cyrl: 'Диёрбек', ru: 'Диёрбек' },
    lastName:  { uz_latn: 'Abdujaqimov', uz_cyrl: 'Абдужакимов', ru: 'Абдужакимов' },
    login: 'diyorbek_agent',
    position: { uz_latn: 'Sotuv agenti', uz_cyrl: 'Сотув агенти', ru: 'Агент по продажам' },
    company: 'OOO "BORAN LEADERS"',
  };

  const firstName = profileData.firstName[language as keyof typeof profileData.firstName];
  const lastName = profileData.lastName[language as keyof typeof profileData.lastName];
  const position = profileData.position[language as keyof typeof profileData.position];

  const handleSavePassword = () => {
    setError('');
    if (oldInput !== savedPassword) { setError(t.wrongOld); return; }
    if (newInput.length < 6) { setError(t.tooShort); return; }
    if (newInput !== confirmInput) { setError(t.notMatch); return; }
    localStorage.setItem(PROFILE_KEY, newInput);
    setSavedPassword(newInput);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setShowChangeModal(false);
      setOldInput(''); setNewInput(''); setConfirmInput('');
    }, 1500);
  };

  const closeModal = () => {
    setShowChangeModal(false);
    setOldInput(''); setNewInput(''); setConfirmInput('');
    setError(''); setSuccess(false);
  };

  const maskedPassword = '•'.repeat(savedPassword.length);

  return (
    <div
      className={`min-h-screen ${isDark ? 'bg-black' : 'bg-gray-50'} transition-colors duration-300`}
      style={{ scrollbarWidth: 'none' }}
    >
      <style>{`::-webkit-scrollbar{display:none}`}</style>
      <div className="max-w-md mx-auto flex flex-col min-h-screen">

        {/* ── Header ── */}
        <div className={`relative overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900'
            : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="relative px-5 pt-12 pb-10">
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => navigate('/')}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <h1 className="text-white text-lg flex-1 text-center">{t.profile}</h1>
              <div className="w-10 h-10" />
            </div>

            {/* Avatar + company block (matches the Figma image) */}
            <div className="flex flex-col items-center gap-4">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center shadow-xl">
                <User className="w-12 h-12 text-white" />
              </div>

              {/* Full name */}
              <div className="text-center">
                <p className="text-white text-xl">{lastName} {firstName}</p>
                <p className="text-white/70 text-sm mt-1">{position}</p>
              </div>

              {/* Company chip — exactly like the Figma image */}
              <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-white/80" />
                </div>
                <span className="text-white text-sm tracking-wide">{profileData.company}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Info cards ── */}
        <div className="flex-1 px-5 py-6 space-y-3 pb-10">
          <p className={`text-xs uppercase tracking-widest mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {t.info}
          </p>

          {[
            { label: t.name,     value: firstName },
            { label: t.surname,  value: lastName },
            { label: t.login,    value: profileData.login },
            {
              label: t.password,
              value: showPassword ? savedPassword : maskedPassword,
              isPassword: true,
            },
            { label: t.position, value: position },
            { label: t.company,  value: profileData.company },
          ].map((row, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-4 rounded-2xl ${
                isDark ? 'bg-gray-900' : 'bg-white'
              } shadow-sm`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{row.label}</p>
                <p className={`text-sm tracking-wide ${isDark ? 'text-white' : 'text-black'} ${
                  row.isPassword && !showPassword ? 'text-lg tracking-widest leading-none mt-1' : ''
                }`}>
                  {row.value}
                </p>
              </div>
              {row.isPassword && (
                <button
                  onClick={() => setShowPassword(p => !p)}
                  className={`ml-3 w-9 h-9 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-gray-800' : 'bg-gray-100'
                  }`}
                >
                  {showPassword
                    ? <Eye className="w-4 h-4 text-gray-400" />
                    : <EyeOff className="w-4 h-4 text-gray-400" />
                  }
                </button>
              )}
            </div>
          ))}

          {/* Change password button */}
          <button
            onClick={() => setShowChangeModal(true)}
            className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-500 shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all"
          >
            <KeyRound className="w-5 h-5 text-white" />
            <span className="text-white text-sm">{t.changePass}</span>
          </button>
        </div>
      </div>

      {/* ── Change password modal ── */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />

          {/* Sheet */}
          <div className={`relative w-full max-w-md rounded-t-3xl px-5 pt-6 pb-10 ${
            isDark ? 'bg-gray-900' : 'bg-white'
          } shadow-2xl`}>
            {/* Handle */}
            <div className={`w-10 h-1 rounded-full mx-auto mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Lock className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                <h2 className={`text-base ${isDark ? 'text-white' : 'text-black'}`}>{t.changePass}</h2>
              </div>
              <button onClick={closeModal} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Old password */}
              <PasswordField
                label={t.oldPass}
                value={oldInput}
                onChange={setOldInput}
                show={showOld}
                onToggle={() => setShowOld(p => !p)}
                isDark={isDark}
              />
              {/* New password */}
              <PasswordField
                label={t.newPass}
                value={newInput}
                onChange={setNewInput}
                show={showNew}
                onToggle={() => setShowNew(p => !p)}
                isDark={isDark}
              />
              {/* Confirm */}
              <PasswordField
                label={t.confirmPass}
                value={confirmInput}
                onChange={setConfirmInput}
                show={showConfirm}
                onToggle={() => setShowConfirm(p => !p)}
                isDark={isDark}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mt-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="mt-3 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <p className="text-green-400 text-sm">{t.successMsg}</p>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={closeModal}
                className={`flex-1 py-3.5 rounded-2xl text-sm ${
                  isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSavePassword}
                className="flex-1 py-3.5 rounded-2xl bg-blue-500 text-white text-sm shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordField({
  label, value, onChange, show, onToggle, isDark,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  isDark: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-transparent text-sm outline-none ${isDark ? 'text-white' : 'text-black'}`}
        />
      </div>
      <button onClick={onToggle} className="flex-shrink-0">
        {show
          ? <Eye className="w-4 h-4 text-gray-400" />
          : <EyeOff className="w-4 h-4 text-gray-400" />
        }
      </button>
    </div>
  );
}
