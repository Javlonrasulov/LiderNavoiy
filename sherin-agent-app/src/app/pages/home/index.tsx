import { useState } from "react";
import { User, Calendar, Package, CheckCircle, TrendingUp, CreditCard, DollarSign, Award, Plus, RefreshCw, Info, MoreHorizontal, Moon, Sun, Globe, ChevronDown, ChevronUp, ChevronRight, Eye, EyeOff, ShoppingCart, Tag } from "lucide-react";
import { useTheme } from "../../components/ThemeContext";
import { useNavigate } from "react-router";
import ClientMap from "../../components/ClientMap";
import AddClient from "../../components/AddClient";
import BottomNav from "../../components/BottomNav";
import { useCart } from "../../components/CartContext";

export default function Dashboard() {
  const { isDark, setIsDark, language, setLanguage } = useTheme();
  const navigate = useNavigate();
  const { getTotal, cartItems } = useCart();
  const [showAll, setShowAll] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);

  const translations = {
    uz_latn: {
      totalSales: "Jami sotish",
      addMoney: "Qo'shish",
      move: "Yangilash",
      details: "Batafsil",
      more: "Ko'proq",
      seeAll: "Hammasini ko'rish",
      seeLess: "Yashirish",
      home: "Asosiy",
      delivery: "Dostavka",
      map: "Karta",
      plan: "Plan",
      messages: "Xabarlar",
      crypto: "Kripto",
      rewards: "Mukofotlar",
      clientsList: "Klientlar ro'yxati",
      visits: "Vizitlar soni",
      returns: "Jami qayt.olish",
      cashPayments: "To'lovlar - naqd",
      clickPayments: "To'lovlar - klik",
      terminalPayments: "To'lovlar - terminal",
      bonusStickers: "Bonus stikerlar",
      monday: "Dushanba",
      tuesday: "Seshanba",
      wednesday: "Chorshanba",
      thursday: "Payshanba",
      friday: "Juma",
      saturday: "Shanba",
      sunday: "Yakshanba",
      items: "mahsulot",
      products: "Mahsulotlar",
    },
    uz_cyrl: {
      totalSales: "Жами сотиш",
      addMoney: "Қўшиш",
      move: "Янгилаш",
      details: "Батафсил",
      more: "Кўпроқ",
      seeAll: "Ҳаммасини кўриш",
      seeLess: "Яшириш",
      home: "Асосий",
      delivery: "Доставка",
      map: "Харита",
      plan: "План",
      messages: "Хабарлар",
      crypto: "Крипто",
      rewards: "Мукофотлар",
      clientsList: "Клиентлар рўйҳати",
      visits: "Визитлар сони",
      returns: "Жами қайт.олиш",
      cashPayments: "Тўловлар - нақд",
      clickPayments: "Тўловлар - клик",
      terminalPayments: "Тўловлар - терминал",
      bonusStickers: "Бонус стикерлар",
      monday: "Душанба",
      tuesday: "Сешанба",
      wednesday: "Чоршанба",
      thursday: "Пайшанба",
      friday: "Жума",
      saturday: "Шанба",
      sunday: "Якшанба",
      items: "маҳсулот",
      products: "Махсулотлар",
    },
    ru: {
      totalSales: "Общие продажи",
      addMoney: "Добавить",
      move: "Обновить",
      details: "Детали",
      more: "Еще",
      seeAll: "Смотреть все",
      seeLess: "Скрыть",
      home: "Главная",
      delivery: "Доставка",
      map: "Карта",
      plan: "План",
      messages: "Сообщения",
      crypto: "Крипто",
      rewards: "Награды",
      clientsList: "Список клиентов",
      visits: "Количество визитов",
      returns: "Общий возврат",
      cashPayments: "Платежи - наличные",
      clickPayments: "Платежи - клик",
      terminalPayments: "Платежи - терминал",
      bonusStickers: "Бонус стикеры",
      monday: "Понедельник",
      tuesday: "Вторник",
      wednesday: "Среда",
      thursday: "Четверг",
      friday: "Пятница",
      saturday: "Суббота",
      sunday: "Воскресенье",
      items: "товар",
      products: "Товары",
    }
  };

  const t = translations[language];

  const agentName = "Абдужакимов Диёрбек";
  const companyName = "OOO \"BORAN LEADERS\"";
  const totalBalance = "487,000";

  const today = new Date();
  const dayNames = [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday];
  const dayName = dayNames[today.getDay()];
  const formattedDate = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
  const fullDate = `${dayName} ${formattedDate}`;

  // Get cart total and format it
  const cartTotal = getTotal();
  const cartItemsCount = cartItems.length;
  const cartValue = cartTotal > 0 ? `${cartTotal.toLocaleString()} (${cartItemsCount} ${t.items})` : "0";

  // Mock client data for today's visits
  const clientsData = [
    {
      id: 1,
      name: {
        uz_latn: "Aziz Karimov",
        uz_cyrl: "Азиз Каримов",
        ru: "Азиз Каримов"
      },
      address: {
        uz_latn: "Chilonzor tumani, Qatortol ko'chasi 25",
        uz_cyrl: "Чилонзор тумани, Қаторҳол кўчаси 25",
        ru: "Чилонзорский район, улица Каторхол 25"
      },
      amount: "150,000",
      visitTime: "09:30",
      lat: 40.0844,
      lng: 65.3792,
      debt: "250,000",
      lastVisit: "01.03.2026",
      day: "today",
    },
    {
      id: 2,
      name: {
        uz_latn: "Nodira Rashidova",
        uz_cyrl: "Нодира Рашидова",
        ru: "Нодира Рашидова"
      },
      address: {
        uz_latn: "Yunusobod tumani, Amir Temur ko'chasi 12",
        uz_cyrl: "Юнусобод тумани, Амир Темур кўчаси 12",
        ru: "Юнусободский район, улица мир Темур 12"
      },
      amount: "220,000",
      visitTime: "11:15",
      lat: 40.0920,
      lng: 65.3850,
      debt: "180,000",
      lastVisit: "28.02.2026",
      day: "today",
    },
    {
      id: 3,
      name: {
        uz_latn: "Sardor Toshmatov",
        uz_cyrl: "Сардор Тошматов",
        ru: "Сардор Тошматов"
      },
      address: {
        uz_latn: "Shayxontoxur tumani, Farxod ko'chasi 8",
        uz_cyrl: "Шайхонтоҳур тумани, Фарҳод кўчаси 8",
        ru: "Шайхонтохурский район, улица Фархад 8"
      },
      amount: "117,000",
      visitTime: "14:20",
      lat: 40.0780,
      lng: 65.3680,
      debt: "320,000",
      lastVisit: "25.02.2026",
      day: "today",
    },
    // Monday
    {
      id: 4,
      name: {
        uz_latn: "Dilshod Ergashev",
        uz_cyrl: "Дилшод Эргашев",
        ru: "Дилшод Эргашев"
      },
      address: {
        uz_latn: "Yunusobod 5-kvartal, 12-uy",
        uz_cyrl: "Юнусобод 5-квартал, 12-уй",
        ru: "Юнусобод 5-квартал, дом 12"
      },
      amount: "175,000",
      visitTime: "10:00",
      lat: 40.0900,
      lng: 65.3850,
      debt: "420,000",
      lastVisit: "24.02.2026",
      day: "monday",
    },
    {
      id: 5,
      name: {
        uz_latn: "Malika Juraeva",
        uz_cyrl: "Малика Жураева",
        ru: "Малика Жураева"
      },
      address: {
        uz_latn: "Chilonzor 9-kvartal, 45-uy",
        uz_cyrl: "Чилонзор 9-квартал, 45-уй",
        ru: "Чилонзорский район, 9-квартал, дом 45"
      },
      amount: "98,000",
      visitTime: "13:30",
      lat: 40.0820,
      lng: 65.3700,
      debt: "150,000",
      lastVisit: "20.02.2026",
      day: "monday",
    },
    // Tuesday
    {
      id: 6,
      name: {
        uz_latn: "Rustam Alimov",
        uz_cyrl: "Рустам Алимов",
        ru: "Рустам Алимов"
      },
      address: {
        uz_latn: "Navoiy ko'chasi, 78",
        uz_cyrl: "Навоий кўчаси, 78",
        ru: "Улица Навои, 78"
      },
      amount: "205,000",
      visitTime: "09:00",
      lat: 40.0880,
      lng: 65.3950,
      debt: "280,000",
      lastVisit: "26.02.2026",
      day: "tuesday",
    },
    {
      id: 7,
      name: {
        uz_latn: "Zulfiya Kamalova",
        uz_cyrl: "Зулфия Камалова",
        ru: "Зулфия Камалова"
      },
      address: {
        uz_latn: "Bobur ko'chasi, 23-uy",
        uz_cyrl: "Бобур кўчаси, 23-уй",
        ru: "Улица Бобур, 23"
      },
      amount: "143,000",
      visitTime: "15:00",
      lat: 40.0760,
      lng: 65.3680,
      debt: "190,000",
      lastVisit: "23.02.2026",
      day: "tuesday",
    },
    // Wednesday
    {
      id: 8,
      name: {
        uz_latn: "Jamshid Nematov",
        uz_cyrl: "Жамшид Нематов",
        ru: "Жамшид Нематов"
      },
      address: {
        uz_latn: "Mustaqillik ko'chasi, 56",
        uz_cyrl: "Мустақиллик кўчаси, 56",
        ru: "Улица Мустакиллк, 56"
      },
      amount: "189,000",
      visitTime: "10:30",
      lat: 40.0920,
      lng: 65.3820,
      debt: "340,000",
      lastVisit: "27.02.2026",
      day: "wednesday",
    },
    // Thursday
    {
      id: 9,
      name: {
        uz_latn: "Feruza Abdullayeva",
        uz_cyrl: "Феруза Абдуллаева",
        ru: "Феруза Абдуллаева"
      },
      address: {
        uz_latn: "Sharof Rashidov ko'chasi, 89",
        uz_cyrl: "Шароф Рашидов кўаси, 89",
        ru: "Улица Шароф Рашидов, 89"
      },
      amount: "167,000",
      visitTime: "11:45",
      lat: 40.0790,
      lng: 65.3720,
      debt: "220,000",
      lastVisit: "27.02.2026",
      day: "thursday",
    },
    {
      id: 10,
      name: {
        uz_latn: "Odiljon Haydarov",
        uz_cyrl: "Одижон Хайдаров",
        ru: "Одижон Хайдаров"
      },
      address: {
        uz_latn: "Alisher Navoiy ko'chasi, 34",
        uz_cyrl: "Алишер Навоий кўчаси, 34",
        ru: "Улица Алишер Навои, 34"
      },
      amount: "132,000",
      visitTime: "16:00",
      lat: 40.0870,
      lng: 65.3880,
      debt: "175,000",
      lastVisit: "24.02.2026",
      day: "thursday",
    },
    // Friday
    {
      id: 11,
      name: {
        uz_latn: "Sevara Ikromova",
        uz_cyrl: "Севера Икромова",
        ru: "Севера Икромова"
      },
      address: {
        uz_latn: "Amir Temur ko'chasi, 67",
        uz_cyrl: "Амир Темур кўчаси, 67",
        ru: "Улица Амир Темур, 67"
      },
      amount: "210,000",
      visitTime: "09:15",
      lat: 40.0810,
      lng: 65.3650,
      debt: "380,000",
      lastVisit: "28.02.2026",
      day: "friday",
    },
    // Saturday
    {
      id: 12,
      name: {
        uz_latn: "Bekzod Sodiqov",
        uz_cyrl: "Бекзод Содиқов",
        ru: "Бекзод Содиков"
      },
      address: {
        uz_latn: "Guliston ko'chasi, 12",
        uz_cyrl: "Гулистан кўчаси, 12",
        ru: "Улица Гулистан, 12"
      },
      amount: "156,000",
      visitTime: "12:00",
      lat: 40.0940,
      lng: 65.3760,
      debt: "260,000",
      lastVisit: "22.02.2026",
      day: "saturday",
    },
    {
      id: 13,
      name: {
        uz_latn: "Lola Mirzayeva",
        uz_cyrl: "Лола Мирзаяева",
        ru: "Лола Мирзаяева"
      },
      address: {
        uz_latn: "Yangi hayot ko'chasi, 91",
        uz_cyrl: "Янги хайот кўчаси, 91",
        ru: "Улица Янги хайот, 91"
      },
      amount: "178,000",
      visitTime: "14:45",
      lat: 40.0740,
      lng: 65.3580,
      debt: "310,000",
      lastVisit: "01.03.2026",
      day: "saturday",
    },
    // Sunday
    {
      id: 14,
      name: {
        uz_latn: "Shohruh Usmanov",
        uz_cyrl: "Шоҳрух Усманов",
        ru: "Шохрух Усманов"
      },
      address: {
        uz_latn: "Do'stlik ko'chasi, 45",
        uz_cyrl: "Достлик кўчаси, 45",
        ru: "Улица Достлик, 45"
      },
      amount: "192,000",
      visitTime: "10:20",
      lat: 40.0860,
      lng: 65.3910,
      debt: "295,000",
      lastVisit: "25.02.2026",
      day: "sunday",
    },
  ];

  const actionButtons = [
    { icon: Plus, label: t.addMoney },
    { icon: RefreshCw, label: t.move },
    { icon: Info, label: t.details },
    { icon: MoreHorizontal, label: t.more },
  ];

  const allTransactions = [
    { name: t.clientsList, value: "89 / 1 / 88", percentage: "1.1%", icon: User, color: "bg-emerald-500" },
    { name: t.visits, value: "1 / 0 / 1", percentage: "0%", icon: Calendar, color: "bg-orange-500" },
    { name: t.totalSales, value: cartValue, percentage: null, icon: ShoppingCart, color: "bg-blue-500", isCart: true },
    { name: t.products ?? 'Mahsulotlar', value: "34", percentage: null, icon: Tag, color: "bg-violet-500", isProducts: true },
    { name: t.returns, value: "0", percentage: null, icon: Package, color: "bg-red-500" },
    { name: t.cashPayments, value: "0", percentage: null, icon: DollarSign, color: "bg-green-500" },
    { name: t.clickPayments, value: "0", percentage: null, icon: CreditCard, color: "bg-indigo-500" },
    { name: t.terminalPayments, value: "0", percentage: null, icon: CheckCircle, color: "bg-cyan-500" },
    { name: t.bonusStickers, value: "0", percentage: null, icon: Award, color: "bg-pink-500" },
  ];

  const displayedTransactions = showAll ? allTransactions : allTransactions.slice(0, 3);

  if (showMap) {
    return <ClientMap onClose={() => setShowMap(false)} clients={clientsData} language={language} onLanguageChange={setLanguage} />;
  }

  if (showAddClient) {
    return <AddClient onClose={() => setShowAddClient(false)} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      <div className="max-w-md mx-auto min-h-screen flex flex-col">

        {/* Hero Section */}
        <div className={`relative overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900'
            : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

          <div className="relative px-5 pt-12 pb-8">
            {/* Header Row */}
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => navigate('/profile')}
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </button>

              <div className="flex-1 text-center">
                <span className="text-white text-sm tracking-wide">{companyName}</span>
              </div>

              <button
                onClick={() => {
                  const langs: Array<'uz_latn' | 'uz_cyrl' | 'ru'> = ['uz_latn', 'uz_cyrl', 'ru'];
                  const currentIndex = langs.indexOf(language);
                  const nextIndex = (currentIndex + 1) % langs.length;
                  setLanguage(langs[nextIndex]);
                }}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center"
              >
                <Globe className="w-5 h-5 text-white" />
              </button>

              <button
                onClick={() => setIsDark(!isDark)}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center"
              >
                {isDark ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-white" />}
              </button>
            </div>

            {/* Balance */}
            <div className="text-center mb-8">
              <div className="text-white text-lg mb-3">{agentName}</div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-white/80 text-sm">{t.totalSales}</div>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
                >
                  {showBalance ? <Eye className="w-4 h-4 text-white" /> : <EyeOff className="w-4 h-4 text-white" />}
                </button>
              </div>
              <div className="text-white text-6xl tracking-tight">
                {showBalance ? totalBalance : "•••••••"}
                <span className="text-2xl ml-2 text-white/70">сум</span>
              </div>
              <div className="text-white font-semibold text-xl mt-3">{fullDate}</div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-4 pb-6">
              {actionButtons.map((btn, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (idx === 0) {
                      setShowAddClient(true);
                    }
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all">
                    <btn.icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <span className="text-xs text-white/90">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="flex-1 px-5 mt-4 pb-24 overflow-hidden">
          <div className={`rounded-3xl p-5 ${isDark ? 'bg-gray-900' : 'bg-white'} shadow-xl`}>
            <div className="space-y-3">
              {displayedTransactions.map((transaction, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    // If it's the first card (Klientlar ro'yxati), navigate to clients page
                    if (idx === 0) {
                      navigate('/clients');
                    }
                    // If it's the cart card (Jami sotish), navigate to order summary
                    if (transaction.isCart) {
                      navigate('/order-summary');
                    }
                    // If it's the products card, navigate to products page
                    if ((transaction as any).isProducts) {
                      navigate('/products');
                    }
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl ${
                    isDark ? 'bg-gray-800/50 hover:bg-gray-800' : 'bg-gray-50 hover:bg-gray-100'
                  } transition-colors cursor-pointer`}
                >
                  <div className={`w-12 h-12 ${transaction.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <transaction.icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>

                  <div className="flex-1 text-left">
                    <div className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {transaction.name}
                    </div>
                    <div className={`text-xl font-medium ${isDark ? 'text-white' : 'text-black'}`}>
                      {transaction.value}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {transaction.percentage && (
                      <div className="px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-medium">
                        {transaction.percentage}
                      </div>
                    )}
                    {transaction.isCart && cartItemsCount > 0 && (
                      <div className="px-3 py-1.5 rounded-full bg-blue-500 text-white text-xs font-medium">
                        {cartItemsCount}
                      </div>
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isDark ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAll(!showAll)}
              className={`w-full mt-5 py-3 rounded-full text-sm flex items-center justify-center gap-2 transition-all ${
                isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {showAll ? t.seeLess : t.seeAll}
              {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav
          activePage="home"
          onNavigate={(page) => {
            if (page === 'home') navigate('/');
            else if (page === 'dostavka') navigate('/visit');
            else if (page === 'locatsiya') navigate('/locatsiya');
            else if (page === 'plan') navigate('/plan');
            else if (page === 'messages') navigate('/messages');
          }}
        />

      </div>
    </div>
  );
}