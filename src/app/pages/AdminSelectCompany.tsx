import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  LogOut, Moon, Sun, Globe, ChevronDown, Users,
  Check, ArrowRight, Plus, Pencil, X, Upload, Smile, Image as ImageIcon,
} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { useAdminAuth, COMPANIES, Company } from '../components/AdminAuthContext';
import { useLang, Lang } from '../components/LangContext';

/* ─── Types ─────────────────────────────────────────────── */
interface LocalCompany extends Company {
  imageUrl?: string;
}

/* ─── Lang ───────────────────────────────────────────────── */
const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'uz', label: "O'zbek", flag: 'UZ' },
  { id: 'cy', label: 'Ўзбек',  flag: 'КР' },
  { id: 'ru', label: 'Русский', flag: 'RU' },
];

const T: Record<Lang, Record<string, string>> = {
  uz: {
    title: 'Organizatsiyani tanlang', subtitle: 'Quyidagi organizatsiyalardan birini tanlab, ulaning',
    connect: 'Ulash', agents: 'agent', clients: 'mijoz',
    selectHint: 'Organizatsiyani tanlang', archive: 'Arxiv', current: 'Joriy', logout: 'Chiqish',
    addTitle: 'Yangi organizatsiya', editTitle: 'Organizatsiyani tahrirlash',
    name: 'Nomi', desc: 'Izoh', save: 'Saqlash', cancel: 'Bekor qilish',
    iconTab: 'Icon', imageTab: 'Rasm', uploadImg: 'Rasm yuklash', namePlaceholder: "Organizatsiya nomi",
    descPlaceholder: 'Qisqa izoh...', chooseColor: 'Rang',
  },
  cy: {
    title: 'Организацияни танланг', subtitle: 'Қуйидаги организациялардан бирини танлаб, уланинг',
    connect: 'Улаш', agents: 'агент', clients: 'мижоз',
    selectHint: 'Организацияни танланг', archive: 'Архив', current: 'Жорий', logout: 'Чиқиш',
    addTitle: 'Янги организация', editTitle: 'Организацияни таҳрирлаш',
    name: 'Номи', desc: 'Изоҳ', save: 'Сақлаш', cancel: 'Бекор қилиш',
    iconTab: 'Иконка', imageTab: 'Расм', uploadImg: 'Расм юклаш', namePlaceholder: 'Организация номи',
    descPlaceholder: 'Қисқа изоҳ...', chooseColor: 'Ранг',
  },
  ru: {
    title: 'Выберите организацию', subtitle: 'Выберите одну из организаций ниже и подключитесь',
    connect: 'Подключить', agents: 'агент', clients: 'клиент',
    selectHint: 'Выберите организацию', archive: 'Архив', current: 'Текущий', logout: 'Выйти',
    addTitle: 'Новая организация', editTitle: 'Редактировать организацию',
    name: 'Название', desc: 'Описание', save: 'Сохранить', cancel: 'Отмена',
    iconTab: 'Иконка', imageTab: 'Фото', uploadImg: 'Загрузить фото', namePlaceholder: 'Название организации',
    descPlaceholder: 'Краткое описание...', chooseColor: 'Цвет',
  },
};

/* ─── Icon list ──────────────────────────────────────────── */
const ICONS = [
  '🏢','🏭','🏬','🏪','🏦','🏗','🏨','🏩','🏫','🏛',
  '🛒','🛍','📦','🚚','🏷','💼','📊','📈','📉','💰',
  '🥩','🥛','🍞','🥤','🍬','🧴','🌿','⚡','🔷','🌸',
  '🍎','🥦','🧀','🍗','🥚','🐄','🐖','🐑','🌾','🫙',
  '⚙️','🔧','🔩','🏚','🔌','💡','🖥','📱','🖨','🖱',
  '🌍','✈️','🚢','🚂','🚁','🚀','🛳','🏆','⭐','💎',
];

const COLORS = [
  { label: 'Qizil',   value: 'from-red-600 to-rose-700' },
  { label: 'Ko\'k',   value: 'from-blue-500 to-cyan-600' },
  { label: 'To\'q sariq', value: 'from-amber-500 to-orange-600' },
  { label: 'Yashil',  value: 'from-emerald-500 to-teal-600' },
  { label: 'Binafsha', value: 'from-purple-500 to-violet-600' },
  { label: 'Indigo',  value: 'from-indigo-500 to-blue-600' },
  { label: 'Pushti',  value: 'from-pink-500 to-rose-500' },
  { label: 'Kulrang', value: 'from-gray-500 to-slate-600' },
];

const COLOR_DOTS: Record<string, string> = {
  'from-red-600 to-rose-700':     'bg-red-500',
  'from-blue-500 to-cyan-600':    'bg-blue-500',
  'from-amber-500 to-orange-600': 'bg-amber-500',
  'from-emerald-500 to-teal-600': 'bg-emerald-500',
  'from-purple-500 to-violet-600':'bg-purple-500',
  'from-indigo-500 to-blue-600':  'bg-indigo-500',
  'from-pink-500 to-rose-500':    'bg-pink-500',
  'from-gray-500 to-slate-600':   'bg-gray-500',
};

const YEARS = [2026, 2025, 2024, 2023];

/* ─── Blank form ─────────────────────────────────────────── */
const blankForm = () => ({
  name: '', description: '', icon: '🏢',
  color: 'from-indigo-500 to-blue-600', imageUrl: '',
});

/* ═══════════════════════════════════════════════════════════ */
export default function AdminSelectCompany() {
  const { isDark, setIsDark } = useTheme();
  const { adminUser, selectCompany, logout } = useAdminAuth();
  const navigate = useNavigate();

  /* lang / ui state */
  const { lang, setLang } = useLang();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* companies local state (starts from context) */
  const [companies, setCompanies] = useState<LocalCompany[]>(() =>
    COMPANIES.map(c => ({ ...c }))
  );

  /* modal state */
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm());
  const [iconTab, setIconTab] = useState<'icon' | 'image'>('icon');
  const fileRef = useRef<HTMLInputElement>(null);

  const t = T[lang];
  const D = isDark;
  const isCurrentYear = selectedYear === 2026;
  const currentLang = LANGS.find(l => l.id === lang)!;

  /* ── helpers ── */
  const openAdd = () => {
    setForm(blankForm());
    setIconTab('icon');
    setEditingId(null);
    setModalMode('add');
  };

  const openEdit = (e: React.MouseEvent, company: LocalCompany) => {
    e.stopPropagation();
    setForm({
      name: company.name, description: company.description,
      icon: company.icon, color: company.color,
      imageUrl: company.imageUrl ?? '',
    });
    setIconTab(company.imageUrl ? 'image' : 'icon');
    setEditingId(company.id);
    setModalMode('edit');
  };

  const closeModal = () => { setModalMode(null); setEditingId(null); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (modalMode === 'add') {
      const newCo: LocalCompany = {
        id: `org_${Date.now()}`,
        name: form.name.trim(),
        shortName: form.name.trim().split(' ')[0],
        description: form.description.trim(),
        icon: form.icon,
        color: form.color,
        imageUrl: form.imageUrl || undefined,
        agents: 0, clients: 0,
      };
      setCompanies(prev => [...prev, newCo]);
    } else if (modalMode === 'edit' && editingId) {
      setCompanies(prev => prev.map(c =>
        c.id === editingId
          ? { ...c, name: form.name.trim(), description: form.description.trim(),
              icon: form.icon, color: form.color, imageUrl: form.imageUrl || undefined }
          : c
      ));
    }
    closeModal();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, imageUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleConnect = () => {
    if (!selectedId) return;
    const company = companies.find(c => c.id === selectedId);
    if (company) { selectCompany(company); navigate('/admin'); }
  };

  /* ── tokens ── */
  const inputCls = D
    ? 'bg-[#1e1e1e] border-gray-700 text-white placeholder-gray-600 focus:border-indigo-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-400';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden ${D ? 'bg-[#0a0a0a]' : 'bg-[#f2f4f8]'}`}>
      <style>{`
        *::-webkit-scrollbar{display:none}
        *{-ms-overflow-style:none;scrollbar-width:none}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .modal-in{animation:modalIn .22s ease-out}
      `}</style>

      {/* bg blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-30 ${D ? 'bg-indigo-700' : 'bg-indigo-300'}`} />
        <div className={`absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 ${D ? 'bg-purple-700' : 'bg-purple-300'}`} />
      </div>

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
            {adminUser?.name?.charAt(0) ?? 'A'}
          </div>
          <div>
            <p className={`text-sm font-semibold leading-none ${D ? 'text-white' : 'text-gray-900'}`}>{adminUser?.name}</p>
            <p className={`text-xs mt-0.5 ${D ? 'text-gray-500' : 'text-gray-400'}`}>{adminUser?.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Lang */}
          <div className="relative">
            <button onClick={() => setShowLangMenu(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${D ? 'bg-white/8 hover:bg-white/14 text-gray-300 border border-white/10' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm'}`}>
              <Globe size={13} /><span>{currentLang.flag}</span>
              <ChevronDown size={11} className={`transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
            </button>
            {showLangMenu && (
              <div className={`absolute right-0 top-full mt-2 w-40 rounded-2xl border shadow-2xl z-50 overflow-hidden ${D ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-gray-100'}`}>
                {LANGS.map(l => (
                  <button key={l.id} onClick={() => { setLang(l.id); setShowLangMenu(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${lang === l.id ? D ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-700' : D ? 'text-gray-300 hover:bg-white/8' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${D ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{l.flag}</span>
                      <span>{l.label}</span>
                    </div>
                    {lang === l.id && <Check size={13} className="text-indigo-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setIsDark(!D)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${D ? 'bg-white/8 hover:bg-white/14 text-yellow-400 border border-white/10' : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 shadow-sm'}`}>
            {D ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button onClick={() => { logout(); navigate('/admin/login'); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${D ? 'bg-white/8 hover:bg-red-900/30 text-gray-400 hover:text-red-400 border border-white/10' : 'bg-white hover:bg-red-50 text-gray-500 hover:text-red-500 border border-gray-200 shadow-sm'}`}>
            <LogOut size={13} /><span className="hidden sm:inline">{t.logout}</span>
          </button>
        </div>
      </div>

      {/* ── Main card ── */}
      <div className={`relative z-10 w-full max-w-2xl mx-4 rounded-3xl border shadow-2xl overflow-hidden ${D ? 'bg-[#111111] border-white/8' : 'bg-white border-gray-200'}`}
        style={{ marginTop: '70px', marginBottom: '24px' }}>

        {/* Card header */}
        <div className={`px-8 pt-8 pb-6 border-b ${D ? 'border-white/6' : 'border-gray-100'}`}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${D ? 'text-white' : 'text-gray-900'}`}>{t.title}</h1>
              <p className={`text-sm mt-1.5 ${D ? 'text-gray-500' : 'text-gray-400'}`}>{t.subtitle}</p>
            </div>
            {/* + Add button */}
            <button onClick={openAdd}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ml-4 ${D ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-200'}`}>
              <Plus size={15} strokeWidth={2.5} />
              <span className="hidden sm:inline">{t.addTitle}</span>
            </button>
          </div>

          {/* Year tabs */}
          <div className="flex items-center gap-2 mt-5">
            {YEARS.map(year => (
              <button key={year} onClick={() => { setSelectedYear(year); setSelectedId(null); }}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${selectedYear === year ? D ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : D ? 'bg-white/6 text-gray-500 hover:bg-white/10 hover:text-gray-300' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}>
                {year}
                {year === 2026 && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${selectedYear === year ? 'bg-white/20 text-white' : D ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>{t.current}</span>
                )}
              </button>
            ))}
            {!isCurrentYear && (
              <span className={`ml-auto text-xs px-3 py-1 rounded-full ${D ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>{t.archive}</span>
            )}
          </div>
        </div>

        {/* Companies grid */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {companies.map(company => {
            const isSelected = selectedId === company.id;
            return (
              <div key={company.id}
                onClick={() => setSelectedId(company.id)}
                onDoubleClick={() => { setSelectedId(company.id); setTimeout(handleConnect, 50); }}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setSelectedId(company.id)}
                className={`relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-200 group cursor-pointer ${
                  isSelected
                    ? D ? 'border-indigo-500 bg-indigo-600/15 shadow-lg shadow-indigo-900/30' : 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100'
                    : D ? 'border-white/8 bg-white/4 hover:bg-white/8 hover:border-white/16' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 hover:shadow-md'
                }`}>
                {/* Edit pencil — top right */}
                <button
                  onClick={(e) => openEdit(e, company)}
                  className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10 ${
                    isSelected
                      ? 'opacity-100 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40'
                      : D ? 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Pencil size={11} strokeWidth={2.5} />
                </button>

                {/* Selected check (only when no pencil hovered) */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center group-hover:opacity-0 transition-opacity pointer-events-none">
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>
                )}

                {/* Icon / Image */}
                {company.imageUrl ? (
                  <div className="w-12 h-12 rounded-2xl overflow-hidden mb-3 shadow-md flex-shrink-0">
                    <img src={company.imageUrl} alt={company.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${company.color} flex items-center justify-center text-2xl mb-3 shadow-md flex-shrink-0`}>
                    {company.icon}
                  </div>
                )}

                <p className={`text-sm font-semibold leading-tight mb-1 pr-2 ${D ? 'text-gray-100' : 'text-gray-900'}`}>{company.name}</p>
                <p className={`text-xs mb-3 line-clamp-1 ${D ? 'text-gray-500' : 'text-gray-400'}`}>{company.description}</p>

                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1 text-xs ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Users size={11} /><span>{company.agents} {t.agents}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Connect button */}
        <div className="px-6 pb-6 pt-2">
          <button onClick={handleConnect} disabled={!selectedId}
            className={`w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2.5 transition-all duration-200 ${
              selectedId
                ? D ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-900/40 active:scale-[0.98]' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-200 active:scale-[0.98]'
                : D ? 'bg-white/6 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}>
            {selectedId ? (
              <><span>{companies.find(c => c.id === selectedId)?.name} — {t.connect}</span><ArrowRight size={18} /></>
            ) : <span>{t.selectHint}</span>}
          </button>
        </div>
      </div>

      {/* Version */}
      <div className={`relative z-10 flex items-center gap-2 mb-6 text-xs ${D ? 'text-gray-600' : 'text-gray-400'}`}>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Lider v2.1.0</span>
      </div>

      {/* ═══════ MODAL ═══════ */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeModal}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className={`modal-in relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${D ? 'bg-[#141414] border-white/10' : 'bg-white border-gray-200'}`}>

            {/* Modal header */}
            <div className={`flex items-center justify-between px-6 py-5 border-b ${D ? 'border-white/8' : 'border-gray-100'}`}>
              <h2 className={`font-bold text-lg ${D ? 'text-white' : 'text-gray-900'}`}>
                {modalMode === 'add' ? t.addTitle : t.editTitle}
              </h2>
              <button onClick={closeModal}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${D ? 'bg-white/8 hover:bg-white/16 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
                <X size={15} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* Preview */}
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg ${form.imageUrl ? '' : `bg-gradient-to-br ${form.color}`} flex items-center justify-center`}>
                  {form.imageUrl
                    ? <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="text-3xl">{form.icon}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${D ? 'text-white' : 'text-gray-900'}`}>{form.name || t.namePlaceholder}</p>
                  <p className={`text-xs mt-0.5 truncate ${D ? 'text-gray-500' : 'text-gray-400'}`}>{form.description || t.descPlaceholder}</p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className={`text-xs font-semibold mb-1.5 block ${D ? 'text-gray-400' : 'text-gray-500'}`}>{t.name}</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={t.namePlaceholder}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors ${inputCls}`} />
              </div>

              {/* Description */}
              <div>
                <label className={`text-xs font-semibold mb-1.5 block ${D ? 'text-gray-400' : 'text-gray-500'}`}>{t.desc}</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={t.descPlaceholder}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors ${inputCls}`} />
              </div>

              {/* Icon / Image tabs */}
              <div>
                <div className={`flex rounded-2xl p-1 gap-1 mb-3 ${D ? 'bg-white/6' : 'bg-gray-100'}`}>
                  <button onClick={() => setIconTab('icon')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${iconTab === 'icon' ? D ? 'bg-[#222] text-white shadow' : 'bg-white text-gray-900 shadow' : D ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Smile size={14} />{t.iconTab}
                  </button>
                  <button onClick={() => setIconTab('image')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${iconTab === 'image' ? D ? 'bg-[#222] text-white shadow' : 'bg-white text-gray-900 shadow' : D ? 'text-gray-500' : 'text-gray-400'}`}>
                    <ImageIcon size={14} />{t.imageTab}
                  </button>
                </div>

                {iconTab === 'icon' ? (
                  <div>
                    {/* Icon grid */}
                    <div className={`grid grid-cols-10 gap-1 p-3 rounded-2xl ${D ? 'bg-white/4' : 'bg-gray-50'}`}>
                      {ICONS.map(ic => (
                        <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic, imageUrl: '' }))}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg transition-all ${
                            form.icon === ic && !form.imageUrl
                              ? D ? 'bg-indigo-600/40 ring-2 ring-indigo-500' : 'bg-indigo-100 ring-2 ring-indigo-400'
                              : D ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                          }`}>
                          {ic}
                        </button>
                      ))}
                    </div>

                    {/* Color picker */}
                    <div className="mt-3">
                      <p className={`text-xs font-semibold mb-2 ${D ? 'text-gray-400' : 'text-gray-500'}`}>{t.chooseColor}</p>
                      <div className="flex gap-2 flex-wrap">
                        {COLORS.map(col => (
                          <button key={col.value} onClick={() => setForm(f => ({ ...f, color: col.value }))}
                            title={col.label}
                            className={`w-7 h-7 rounded-full ${COLOR_DOTS[col.value]} transition-all ${
                              form.color === col.value ? 'ring-2 ring-offset-2 scale-110 ' + (D ? 'ring-white ring-offset-[#141414]' : 'ring-gray-700 ring-offset-white') : 'opacity-70 hover:opacity-100'
                            }`} />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    {form.imageUrl ? (
                      <div className="relative">
                        <img src={form.imageUrl} alt="" className="w-full h-40 object-cover rounded-2xl" />
                        <button onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                          className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => fileRef.current?.click()}
                        className={`w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${D ? 'border-white/15 hover:border-white/30 text-gray-500 hover:text-gray-300' : 'border-gray-200 hover:border-gray-400 text-gray-400 hover:text-gray-600'}`}>
                        <Upload size={20} />
                        <span className="text-sm font-medium">{t.uploadImg}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className={`flex gap-3 px-6 py-4 border-t ${D ? 'border-white/8' : 'border-gray-100'}`}>
              <button onClick={closeModal}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-colors ${D ? 'bg-white/8 hover:bg-white/14 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                {t.cancel}
              </button>
              <button onClick={handleSave} disabled={!form.name.trim()}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  form.name.trim()
                    ? D ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                    : D ? 'bg-white/6 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}>
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}