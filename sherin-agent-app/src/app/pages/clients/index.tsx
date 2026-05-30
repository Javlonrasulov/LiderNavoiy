import { useState } from "react";
import { X, Plus, ChevronRight, MapPin, ChevronDown, ChevronLeft } from "lucide-react";
import { useTheme } from "../../components/ThemeContext";
import { useNavigate } from "react-router";
import BottomNav from "../../components/BottomNav";
import AddClient from "../../components/AddClient";
import ClientMap from "../../components/ClientMap";
import SearchClients from "../../components/SearchClients";

type DayFilter = 'today' | 'all' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
type Tab = 'graph' | 'receipts' | 'documents';

// Mock client data
const mockClients = [
  { id: 1, code: "29072", name: "XOLMURODOVA SABRINA MIRO", subtitle: "Magistral pizza aeroportda tras...", address: "01 - Тошшироб;...", balance: -862.96, day: 'monday' },
  { id: 2, code: "29047", name: "YANGI ASR 777' OK", subtitle: "Magistral pizza aeroportda tras...", address: "01 - Тошшироб;...", balance: -343.12, day: 'monday' },
  { id: 3, code: "29043", name: "AZIZOVA VAZIRA MEHRIDDINOVA", subtitle: "", address: "01 - Тошшироб;...", balance: -471489.12, day: 'monday' },
  { id: 4, code: "29022", name: "GO ZAL TONG NURAPSONI", subtitle: "", address: "01 - Тошшироб;...", balance: 0.00, day: 'monday' },
  { id: 5, code: "29019", name: "SHAROPOV SHAROF YATT", subtitle: "АҲИМОВ ШАХЗОД ҒНИЗА", address: "01 - Тошшироб;...", balance: -720.89, day: 'monday' },
  { id: 6, code: "29012", name: "Муҳаммадиев Норир", subtitle: "Меҳр маркази", address: "01 - Тошшироб;...", balance: 191748.74, day: 'tuesday' },
  { id: 7, code: "29011", name: "QIZILTEPA ULGURLJ CHAKANA SAV...", subtitle: "Оператир центр", address: "01 - Тошшироб;...", balance: 0.00, day: 'tuesday' },
  { id: 8, code: "29008", name: "ABUXAMIDOVA SHAXZODABONU", subtitle: "ЭЛЕКТРОХИМИЯ УГЛИ", address: "01 - Тошшироб;...", balance: -799997.9, day: 'wednesday' },
];

export default function ClientsList() {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState<DayFilter>('monday');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('graph');
  const [showAddClient, setShowAddClient] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const translations = {
    uz_latn: {
      clientsList: "Klientlar ro'yxati",
      monday: "Dushanba",
      tuesday: "Seshanba",
      wednesday: "Chorshanba",
      thursday: "Payshanba",
      friday: "Juma",
      saturday: "Shanba",
      sunday: "Yakshanba",
      all: "Barchasi",
      graph: "Grafik",
      receipts: "Граф ташлари",
      documents: "Қидирув",
      gps: "GPS",
      qrCode: "QR kod",
      save: "Юқлаш",
    },
    uz_cyrl: {
      clientsList: "Клиентлар рўйҳати",
      monday: "Душанба",
      tuesday: "Сешанба",
      wednesday: "Чоршанба",
      thursday: "Пайшанба",
      friday: "Жума",
      saturday: "Шанба",
      sunday: "Якшанба",
      all: "Барчаси",
      graph: "График",
      receipts: "Граф ташлари",
      documents: "Кидируv",
      gps: "GPS",
      qrCode: "QR код",
      save: "Юқлаш",
    },
    ru: {
      clientsList: "Список клиентов",
      monday: "Понедельник",
      tuesday: "Вторник",
      wednesday: "Среда",
      thursday: "Четверг",
      friday: "Пятница",
      saturday: "Суббота",
      sunday: "Воскресенье",
      all: "Все",
      graph: "График",
      receipts: "Граф ташлари",
      documents: "Кидируv",
      gps: "GPS",
      qrCode: "QR код",
      save: "Соханить",
    }
  };

  const t = translations[language];

  const dayOptions: { value: DayFilter; label: string }[] = [
    { value: 'all', label: t.all },
    { value: 'monday', label: t.monday },
    { value: 'tuesday', label: t.tuesday },
    { value: 'wednesday', label: t.wednesday },
    { value: 'thursday', label: t.thursday },
    { value: 'friday', label: t.friday },
  ];

  const getCurrentDayLabel = () => {
    return dayOptions.find(opt => opt.value === selectedDay)?.label || t.monday;
  };

  const handleDaySelect = (day: DayFilter) => {
    console.log('Selected day:', day, 'Current tab:', activeTab);
    setSelectedDay(day);
    setShowDropdown(false);
  };

  // Filter clients based on selected day
  const filteredClients = activeTab === 'graph' && selectedDay !== 'all'
    ? mockClients.filter(client => client.day === selectedDay)
    : selectedDay === 'all' || activeTab !== 'graph'
    ? mockClients
    : mockClients.filter(client => client.day === selectedDay);

  console.log('Active tab:', activeTab, 'Selected day:', selectedDay, 'Filtered clients count:', filteredClients.length);

  const tabs = [
    { id: 'graph' as Tab, label: t.graph },
    { id: 'receipts' as Tab, label: t.receipts },
    { id: 'documents' as Tab, label: t.documents },
  ];

  if (showAddClient) {
    return <AddClient onClose={() => setShowAddClient(false)} />;
  }

  if (showMap) {
    // Create stable coordinates for each client
    const mapClients = filteredClients.map((c, index) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      amount: Math.abs(c.balance).toFixed(2),
      visitTime: '09:00',
      lat: 40.0844 + (index * 0.01) - 0.02,
      lng: 65.3792 + (index * 0.01) - 0.02,
      debt: Math.abs(c.balance).toFixed(2),
      lastVisit: '01.03.2026',
      day: c.day
    }));

    console.log('MapClients:', mapClients); // Debug log

    return <ClientMap 
      onClose={() => setShowMap(false)} 
      clients={mapClients}
      language={language}
      onLanguageChange={() => {}}
    />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      <style>
        {`
          /* Hide scrollbar completely - ALL BROWSERS */
          .hide-scrollbar, .scrollbar-hide {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
          .hide-scrollbar::-webkit-scrollbar, .scrollbar-hide::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
            -webkit-appearance: none !important;
          }
          .hide-scrollbar::-webkit-scrollbar-track, .scrollbar-hide::-webkit-scrollbar-track {
            display: none !important;
            background: transparent !important;
          }
          .hide-scrollbar::-webkit-scrollbar-thumb, .scrollbar-hide::-webkit-scrollbar-thumb {
            display: none !important;
            background: transparent !important;
          }
          .hide-scrollbar::-webkit-scrollbar-corner, .scrollbar-hide::-webkit-scrollbar-corner {
            display: none !important;
            background: transparent !important;
          }
        `}
      </style>
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        
        {/* Header Section */}
        <div className={`relative overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900'
            : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

          <div className="relative px-5 pt-8 pb-6">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigate('/')}
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>

              <div className="flex-1 text-center">
                <h1 className="text-white text-lg font-medium tracking-wide">{t.clientsList}</h1>
              </div>

              <button
                onClick={() => setShowAddClient(true)}
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <Plus className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Dropdown for day selection */}
            <div className="relative z-50">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-colors"
              >
                <span className="text-white font-medium">{getCurrentDayLabel()}</span>
                <ChevronDown className={`w-5 h-5 text-white transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`sticky top-0 z-30 ${isDark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} border-b px-5 py-3 scrollbar-hide`}>
          <div className="flex gap-3 justify-center items-center">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'documents') {
                    setShowSearch(true);
                  }
                }}
                className={`px-6 py-2 rounded-full text-sm whitespace-nowrap transition-colors min-w-[110px] ${
                  activeTab === tab.id
                    ? isDark ? 'bg-white text-black' : 'bg-black text-white'
                    : isDark ? 'bg-gray-900 text-gray-400 hover:bg-gray-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Client List */}
        <div className={`flex-1 overflow-hidden pb-24 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
          <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} mx-5 mt-4 rounded-3xl overflow-hidden h-full`}>
            {filteredClients.map((client, index) => (
              <div
                key={client.id}
                onClick={() => navigate(`/clients/${client.id}`, { state: { client } })}
                className={`px-5 py-4 ${index !== filteredClients.length - 1 ? `border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}` : ''} hover:${isDark ? 'bg-gray-800' : 'bg-gray-50'} transition-colors cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-blue-500 font-medium text-base mb-1">
                      {client.code} - {client.name}
                    </h3>
                    {client.subtitle && (
                      <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{client.subtitle}</p>
                    )}
                  </div>
                  <ChevronRight size={20} className={`flex-shrink-0 mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{client.address}</span>
                  <span className={`font-medium ${client.balance < 0 ? 'text-red-500' : isDark ? 'text-white' : 'text-black'}`}>
                    {Math.abs(client.balance).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}

            {filteredClients.length === 0 && (
              <div className="text-center py-12">
                <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>Bu kunda mijozlar yo'q</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav activePage="locatsiya" onNavigate={(page) => {
          if (page === 'home') navigate('/');
          else if (page === 'dostavka') navigate('/visit');
          else if (page === 'locatsiya') navigate('/locatsiya');
          else if (page === 'plan') navigate('/plan');
          else if (page === 'messages') navigate('/messages');
        }} />

        {/* FAB — Klient qo'shish */}
        <button
          onClick={() => setShowAddClient(true)}
          className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-indigo-600/40 transition-all"
          style={{ maxWidth: 'calc(50% + 168px)' }}
        >
          <Plus className="w-7 h-7" />
        </button>

        {/* Backdrop for dropdown */}
        {showDropdown && (
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowDropdown(false)}
          />
        )}

        {/* Dropdown Portal - FIXED POSITION */}
        {showDropdown && (
          <div className="fixed inset-0 z-[9999] pointer-events-none flex items-start justify-center">
            <div className="w-full max-w-md px-5 pt-[140px] pointer-events-auto">
              <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-2xl overflow-hidden`}>
                {dayOptions.map((option, index) => (
                  <button
                    key={option.value}
                    onClick={() => handleDaySelect(option.value)}
                    className={`w-full text-left px-5 py-4 transition-colors ${
                      selectedDay === option.value
                        ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                        : isDark ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-50 text-black'
                    } ${index !== 0 ? `border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}` : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Clients Component */}
        {showSearch && (
          <SearchClients 
            onClose={() => setShowSearch(false)} 
            clients={mockClients}
          />
        )}
      </div>
    </div>
  );
}