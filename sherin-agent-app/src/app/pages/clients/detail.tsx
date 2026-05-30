import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useNavigate, useLocation, useParams } from 'react-router';
import { ChevronLeft, Phone, MapPin, Building2, User, Navigation, X, Banknote, CreditCard, ArrowLeftRight, ChevronRight, Check } from 'lucide-react';
import { useCart } from '../../components/CartContext';
import { useTheme } from '../../components/ThemeContext';
import BottomNav from '../../components/BottomNav';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Client {
  id: number;
  code: string;
  name: string;
  subtitle: string;
  address: string;
  balance: number;
  day: string;
  phone?: string;
  company?: string;
  category?: string;
  lat?: number;
  lng?: number;
}

// Mock client data - same as ClientsList
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

// Mock terminals list
const terminals = [
  { id: 1, name: 'Payme Terminal #1', bank: 'Payme' },
  { id: 2, name: 'Click Terminal #2', bank: 'Click' },
  { id: 3, name: 'Humo Terminal #3', bank: 'Xalq banki' },
  { id: 4, name: 'UzCard Terminal #4', bank: 'NBU' },
  { id: 5, name: 'Visa Terminal #5', bank: 'Kapitalbank' },
  { id: 6, name: 'Mastercard Terminal #6', bank: 'Ipoteka bank' },
];

export default function ClientDetail() {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { addPayment } = useCart();
  
  // Get client from location.state or find by ID from params
  let client = location.state?.client as Client | undefined;
  
  if (!client && params.clientId) {
    const clientId = parseInt(params.clientId);
    client = mockClients.find(c => c.id === clientId);
  }
  
  const [showMap, setShowMap] = useState(false);
  const [showNoLocationModal, setShowNoLocationModal] = useState(false);
  const [showChangeLocationModal, setShowChangeLocationModal] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  
  // Payment states
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'method' | 'terminal' | 'amount'>('method');
  const [paymentMethod, setPaymentMethod] = useState<'naxt' | 'karta' | 'transfer' | null>(null);
  const [selectedTerminal, setSelectedTerminal] = useState<typeof terminals[0] | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const sheetDragStartY = useRef(0);
  const sheetDragStartOffset = useRef(0);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!client) {
      navigate('/clients');
    }
  }, [client, navigate]);

  const translations = {
    uz_latn: {
      company: "Orientr",
      address: "Manzil",
      phone: "Telefon",
      category: "Kategoriya",
      debt: "Qarz",
      agent: "Agent",
      visit: "Vizit",
      check: "Sverka",
      payment: "To'lov",
      standard: "Standart",
      vip: "VIP",
      premium: "Premium",
      location: "Manzil",
      navigation: "Navigatsiya",
      noLocationTitle: "Locatsiya qo'yilmagan",
      noLocationMessage: "Bu magazin uchun locatsiya qo'yilmagan",
      changeLocationTitle: "Locatsiyani o'zgartirish",
      changeLocationMessage: "Oldingi locatsiyani o'zgartirmoqchimisiz?",
      yes: "Ha",
      no: "Yo'q",
      ok: "OK",
      selectLocation: "Locatsiyani tanlang",
      saveLocation: "Saqlash",
      cancel: "Bekor qilish",
      chooseMethod: "To'lov turini tanlang",
      naxt: "Naxt",
      karta: "Bank karta",
      transfer: "Pul ko'chirish",
      chooseTerminal: "Terminalni tanlang",
      enterAmount: "Summani kiriting",
      confirm: "Tasdiqlash",
      back: "Orqaga",
    },
    uz_cyrl: {
      company: "Ориентр",
      address: "Манзил",
      phone: "Телефон",
      category: "Категория",
      debt: "Қарз",
      agent: "Агент",
      visit: "Визит",
      check: "Сверка",
      payment: "Тўлов",
      standard: "Стандарт",
      vip: "VIP",
      premium: "Премиум",
      location: "Манзил",
      navigation: "Навигация",
      noLocationTitle: "Локация қўйилмаган",
      noLocationMessage: "Бу магазин учун локация қўйилмаган",
      changeLocationTitle: "Локацияни ўзгартириш",
      changeLocationMessage: "Олдинги локацияни ўзгартирмоқчимисиз?",
      yes: "Ҳа",
      no: "Йўқ",
      ok: "OK",
      selectLocation: "Локацияни танланг",
      saveLocation: "Сақлаш",
      cancel: "Бекор қилиш",
      chooseMethod: "Тўлов турини танланг",
      naxt: "Нақт",
      karta: "Банк карта",
      transfer: "Пул кўчириш",
      chooseTerminal: "Терминални танланг",
      enterAmount: "Суммани киритинг",
      confirm: "Тасдиқлаш",
      back: "Орқага",
    },
    ru: {
      company: "Ориентир",
      address: "Адрес",
      phone: "Телефон",
      category: "Категория",
      debt: "Долг",
      agent: "Агент",
      visit: "Визит",
      check: "Сверка",
      payment: "Оплата",
      standard: "Стандарт",
      vip: "VIP",
      premium: "Премиум",
      location: "Адрес",
      navigation: "Навигация",
      noLocationTitle: "Локация не установлена",
      noLocationMessage: "Для этого магазина локация не установлена",
      changeLocationTitle: "Изменить локацию",
      changeLocationMessage: "Вы хотите изменить предыдущую локацию?",
      yes: "Да",
      no: "Нет",
      ok: "OK",
      selectLocation: "Выберите локацию",
      saveLocation: "Сохранить",
      cancel: "Отмена",
      chooseMethod: "Выберите тип оплаты",
      naxt: "Наличные",
      karta: "Банковская карта",
      transfer: "Перевод",
      chooseTerminal: "Выберите терминал",
      enterAmount: "Введите сумму",
      confirm: "Подтвердить",
      back: "Назад",
    }
  };

  const t = translations[language];

  // Payment handlers
  const openPaymentSheet = () => {
    setPaymentStep('method');
    setPaymentMethod(null);
    setSelectedTerminal(null);
    setPaymentAmount('');
    setSheetExpanded(false);
    setDragOffset(0);
    setShowPaymentSheet(true);
  };

  const closePaymentSheet = () => {
    setShowPaymentSheet(false);
    setPaymentStep('method');
    setPaymentMethod(null);
    setSelectedTerminal(null);
    setPaymentAmount('');
    setSheetExpanded(false);
    setDragOffset(0);
  };

  const handleSelectMethod = (method: 'naxt' | 'karta' | 'transfer') => {
    setPaymentMethod(method);
    if (method === 'karta') {
      setPaymentStep('terminal');
    } else {
      setPaymentStep('amount');
    }
  };

  const handleSelectTerminal = (terminal: typeof terminals[0]) => {
    setSelectedTerminal(terminal);
    setPaymentStep('amount');
  };

  const handleConfirmPayment = () => {
    const amount = parseFloat(paymentAmount.replace(/\s/g, ''));
    if (isNaN(amount) || amount <= 0 || !clientData) return;
    
    let note = '';
    if (paymentMethod === 'naxt') note = language === 'ru' ? 'Наличными' : language === 'uz_cyrl' ? 'Нақт' : 'Naxt';
    else if (paymentMethod === 'karta') note = `${language === 'ru' ? 'Карта' : language === 'uz_cyrl' ? 'Карта' : 'Karta'}: ${selectedTerminal?.name || ''}`;
    else if (paymentMethod === 'transfer') note = language === 'ru' ? 'Перевод' : language === 'uz_cyrl' ? 'Пул кўчириш' : "Pul ko'chirish";
    
    addPayment(clientData.id, amount, note);
    closePaymentSheet();
  };

  // Drag handlers for bottom sheet
  const onHandlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsSheetDragging(true);
    sheetDragStartY.current = e.clientY;
    sheetDragStartOffset.current = dragOffset;
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!isSheetDragging) return;
    const delta = e.clientY - sheetDragStartY.current;
    const base = sheetDragStartOffset.current;
    const maxUp = sheetExpanded ? 40 : window.innerHeight * 0.45;
    const newOffset = base + delta;
    setDragOffset(Math.max(-maxUp, Math.min(window.innerHeight * 0.5, newOffset)));
  };

  const onHandlePointerUp = () => {
    if (!isSheetDragging) return;
    setIsSheetDragging(false);
    if (dragOffset > 140) {
      closePaymentSheet();
    } else if (!sheetExpanded && dragOffset < -60) {
      setSheetExpanded(true);
      setDragOffset(0);
    } else if (sheetExpanded && dragOffset > 60) {
      setSheetExpanded(false);
      setDragOffset(0);
    } else {
      setDragOffset(0);
    }
  };

  // Format number with spaces as thousand separators
  const formatAmountDisplay = (raw: string) => {
    if (!raw) return '';
    const parts = raw.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.length > 1 ? intPart + '.' + parts[1] : intPart;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip spaces, allow only digits and one decimal point
    let raw = e.target.value.replace(/\s/g, '');
    raw = raw.replace(/[^\d.]/g, '');
    // Prevent multiple decimal points
    const parts = raw.split('.');
    if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
    // Max 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) raw = parts[0] + '.' + parts[1].slice(0, 2);
    setPaymentAmount(raw);
  };

  // Default values if not provided
  const clientData = client ? {
    ...client,
    phone: client.phone || '+998 93 483 06 00',
    company: client.subtitle || 'KONIMEX',
    category: client.category || t.standard,
    lat: client.lat,
    lng: client.lng,
  } : null;

  const agentBalance = 0.00;
  const [selectedLat, setSelectedLat] = useState<number | undefined>(clientData?.lat);
  const [selectedLng, setSelectedLng] = useState<number | undefined>(clientData?.lng);

  // Handle navigation button click
  const handleNavigationClick = () => {
    if (!clientData?.lat || !clientData?.lng) {
      setShowNoLocationModal(true);
      return;
    }

    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          
          // Open Google Maps with directions
          const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${clientData.lat},${clientData.lng}&travelmode=driving`;
          window.open(url, '_blank');
        },
        (error) => {
          // If geolocation fails, just open destination
          const url = `https://www.google.com/maps/search/?api=1&query=${clientData.lat},${clientData.lng}`;
          window.open(url, '_blank');
        }
      );
    } else {
      // Browser doesn't support geolocation
      const url = `https://www.google.com/maps/search/?api=1&query=${clientData.lat},${clientData.lng}`;
      window.open(url, '_blank');
    }
  };

  // Handle location button click
  const handleLocationClick = () => {
    if (clientData?.lat && clientData?.lng) {
      setShowChangeLocationModal(true);
    } else {
      setIsSelectingLocation(true);
      setShowMap(true);
    }
  };

  // Handle confirm change location
  const handleConfirmChangeLocation = () => {
    setShowChangeLocationModal(false);
    setIsSelectingLocation(true);
    setShowMap(true);
  };

  // Handle save location
  const handleSaveLocation = () => {
    // In real app, save to backend
    console.log('Saving location:', selectedLat, selectedLng);
    setIsSelectingLocation(false);
    setShowMap(false);
    // Update client data with new location
    if (clientData) {
      clientData.lat = selectedLat;
      clientData.lng = selectedLng;
    }
  };

  // Initialize map when showMap is true
  useEffect(() => {
    if (!showMap || !mapContainerRef.current || mapRef.current || !clientData) return;

    const initialLat = selectedLat || clientData.lat || 40.0844;
    const initialLng = selectedLng || clientData.lng || 65.3792;

    // Small timeout to ensure DOM is ready
    setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      try {
        const map = L.map(mapContainerRef.current, { zoomAnimation: false }).setView(
          [initialLat, initialLng],
          15
        );

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        const marker = L.marker([initialLat, initialLng], {
          draggable: isSelectingLocation
        })
          .addTo(map)
          .bindPopup(`
            <div style="font-size: 14px;">
              <p style="font-weight: 500; margin: 0 0 4px 0;">${clientData.name}</p>
              <p style="color: #666; margin: 0;">${clientData.address}</p>
            </div>
          `);
        
        if (!isSelectingLocation) {
          marker.openPopup();
        }

        // If selecting location, allow map click to change marker position
        if (isSelectingLocation) {
          map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            setSelectedLat(lat);
            setSelectedLng(lng);
            marker.setLatLng([lat, lng]);
          });

          // Also allow marker drag
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            setSelectedLat(pos.lat);
            setSelectedLng(pos.lng);
          });
        }

        mapRef.current = map;

        // Force resize after a small delay
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [showMap, clientData, isSelectingLocation]);

  if (!clientData) {
    return null;
  }

  if (showMap) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
        <style>
          {`
            .leaflet-container {
              width: 100%;
              height: 100%;
              border-radius: 0;
            }
            .map-wrapper {
              height: calc(100vh - 72px);
              width: 100%;
              position: relative;
            }
          `}
        </style>
        <div className="max-w-md mx-auto h-screen flex flex-col">
          {/* Header */}
          <div className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-b px-5 py-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setShowMap(false);
                    setIsSelectingLocation(false);
                  }}
                  className={`${isDark ? 'text-white' : 'text-black'} hover:opacity-70 transition-opacity`}
                >
                  <ChevronLeft size={24} />
                </button>
                <h1 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-black'}`}>
                  {isSelectingLocation ? t.selectLocation : t.location}
                </h1>
              </div>
              
              {isSelectingLocation && (
                <button
                  onClick={handleSaveLocation}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-900'
                  }`}
                >
                  {t.saveLocation}
                </button>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="map-wrapper">
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
            
            {isSelectingLocation && (
              <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] ${isDark ? 'bg-gray-900/90' : 'bg-white/90'} backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg`}>
                <p className={`text-sm ${isDark ? 'text-white' : 'text-black'}`}>
                  Xaritani bosing yoki marker'ni sudrab locatsiya tanlang
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
      <div className="max-w-md mx-auto min-h-screen flex flex-col pb-20">
        {/* Header Section with Gradient */}
        <div className={`relative overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900'
            : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

          <div className="relative px-5 pt-8 pb-6">
            {/* Back Button */}
            <button
              onClick={() => navigate('/clients')}
              className="mb-6 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            {/* Client Name & Code */}
            <div className="mb-8">
              <p className="text-white/80 text-sm mb-2">{clientData.code}</p>
              <h1 className="text-white text-2xl font-semibold tracking-tight">{clientData.name}</h1>
            </div>

            {/* Balance Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-white/70 text-sm mb-2">{t.debt}</p>
                  <p className="text-white text-3xl font-bold">
                    {clientData.balance < 0 ? clientData.balance.toFixed(2) : `+${clientData.balance.toFixed(2)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-sm mb-2">{t.agent}</p>
                  <p className="text-white text-xl font-medium">{agentBalance.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 px-5 py-6 scrollbar-hide overflow-y-auto">
          {/* Action Buttons - Visit, Sverka & Payment */}
          <div className="space-y-3 mb-6">
            <button 
              onClick={() => navigate('/visit', { state: { client: clientData } })}
              className={`w-full py-4 rounded-2xl font-medium text-base transition-colors ${
                isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-900'
              }`}
            >
              {t.visit}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => navigate(`/sverka/${clientData.id}`)}
                className={`py-4 rounded-2xl font-medium text-base transition-colors ${
                  isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                {t.check}
              </button>

              <button 
                onClick={openPaymentSheet}
                className={`py-4 rounded-2xl font-medium text-base transition-colors flex items-center justify-center gap-2 ${
                  isDark ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                <Banknote className="w-5 h-5" />
                {t.payment}
              </button>
            </div>
          </div>

          {/* Info Cards */}
          <div className="space-y-3 mb-6">
            {/* Phone */}
            <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} rounded-2xl p-5 border ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-green-500/10' : 'bg-green-50'} flex items-center justify-center`}>
                  <Phone className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t.phone}</p>
                  <p className={`text-base font-medium ${isDark ? 'text-white' : 'text-black'}`}>{clientData.phone}</p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} rounded-2xl p-5 border ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-purple-500/10' : 'bg-purple-50'} flex items-center justify-center`}>
                  <MapPin className="w-6 h-6 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t.address}</p>
                  <p className={`text-base font-medium ${isDark ? 'text-white' : 'text-black'}`}>{clientData.address}</p>
                </div>
              </div>
            </div>

            {/* Company */}
            <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} rounded-2xl p-5 border ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'} flex items-center justify-center flex-shrink-0`}>
                  <Building2 className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t.company}</p>
                  <p className={`text-base font-medium ${isDark ? 'text-white' : 'text-black'} break-words`}>{clientData.company}</p>
                </div>
              </div>
            </div>

            {/* Category */}
            <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} rounded-2xl p-5 border ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'} flex items-center justify-center`}>
                  <User className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t.category}</p>
                  <p className={`text-base font-medium ${isDark ? 'text-white' : 'text-black'}`}>{clientData.category}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Location & Navigation Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleLocationClick}
              className={`flex-1 py-4 rounded-2xl font-medium text-base transition-colors flex items-center justify-center gap-2 ${
                isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              <MapPin className="w-5 h-5" />
              {t.location}
            </button>
            
            <button
              onClick={handleNavigationClick}
              className={`flex-1 py-4 rounded-2xl font-medium text-base transition-colors flex items-center justify-center gap-2 ${
                isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              <Navigation className="w-5 h-5" />
              {t.navigation}
            </button>
          </div>

          {/* Store Image */}
          <div className="rounded-3xl overflow-hidden mb-6">
            <img 
              src="https://images.unsplash.com/photo-1771033834141-023d630b3965?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjByZXRhaWwlMjBzdG9yZSUyMGludGVyaW9yfGVufDF8fHx8MTc3MjYzNjU1MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Store"
              className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowImageModal(true)}
            />
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav activePage="locatsiya" />
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setShowImageModal(false)}>
          <div className="absolute inset-0 bg-black/90" />
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X size={24} />
            </button>
            <img 
              src="https://images.unsplash.com/photo-1771033834141-023d630b3965?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjByZXRhaWwlMjBzdG9yZSUyMGludGVyaW9yfGVufDF8fHx8MTc3MjYzNjU1MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Store"
              className="w-full h-auto rounded-3xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* No Location Modal */}
      {showNoLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNoLocationModal(false)} />
          <div className={`relative max-w-sm mx-5 ${isDark ? 'bg-gray-900' : 'bg-white'} rounded-3xl p-6 shadow-2xl`}>
            <h2 className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-black'}`}>
              {t.noLocationTitle}
            </h2>
            <p className={`text-base mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {t.noLocationMessage}
            </p>
            <button
              onClick={() => setShowNoLocationModal(false)}
              className={`w-full py-3 rounded-2xl font-medium transition-colors ${
                isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-900'
              }`}
            >
              {t.ok}
            </button>
          </div>
        </div>
      )}

      {/* Change Location Confirmation Modal */}
      {showChangeLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowChangeLocationModal(false)} />
          <div className={`relative max-w-sm mx-5 ${isDark ? 'bg-gray-900' : 'bg-white'} rounded-3xl p-6 shadow-2xl`}>
            <h2 className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-black'}`}>
              {t.changeLocationTitle}
            </h2>
            <p className={`text-base mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {t.changeLocationMessage}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowChangeLocationModal(false)}
                className={`flex-1 py-3 rounded-2xl font-medium transition-colors ${
                  isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                {t.no}
              </button>
              <button
                onClick={handleConfirmChangeLocation}
                className={`flex-1 py-3 rounded-2xl font-medium transition-colors ${
                  isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-900'
                }`}
              >
                {t.yes}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Bottom Sheet */}
      {showPaymentSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closePaymentSheet} />
          <div
            style={{
              transform: `translateY(${dragOffset}px)`,
              transition: isSheetDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32,0.72,0,1), max-height 0.3s cubic-bezier(0.32,0.72,0,1)',
              maxHeight: sheetExpanded ? '92vh' : '78vh',
            }}
            className={`relative w-full max-w-md rounded-t-3xl ${isDark ? 'bg-gray-900' : 'bg-white'} flex flex-col overflow-hidden`}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none flex-shrink-0"
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
            >
              <div className={`w-10 h-1.5 rounded-full transition-colors ${isSheetDragging ? 'bg-blue-400' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
            </div>

            {/* Step: Choose Method */}
            {paymentStep === 'method' && (
              <div className="px-5 pt-3 pb-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                    {t.chooseMethod}
                  </h3>
                  <button onClick={closePaymentSheet} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  {/* Naxt */}
                  <button
                    onClick={() => handleSelectMethod('naxt')}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] ${
                      isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-green-500/20' : 'bg-green-50'}`}>
                      <Banknote className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-black'}`}>{t.naxt}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{language === 'ru' ? 'Наличный расчёт' : language === 'uz_cyrl' ? 'Нақд пул' : "Naqd pul"}</p>
                    </div>
                    <ChevronRight size={20} className={isDark ? 'text-gray-600' : 'text-gray-400'} />
                  </button>

                  {/* Bank karta */}
                  <button
                    onClick={() => handleSelectMethod('karta')}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] ${
                      isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                      <CreditCard className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-black'}`}>{t.karta}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{language === 'ru' ? 'Через терминал' : language === 'uz_cyrl' ? 'Терминал орқали' : "Terminal orqali"}</p>
                    </div>
                    <ChevronRight size={20} className={isDark ? 'text-gray-600' : 'text-gray-400'} />
                  </button>

                  {/* Pul ko'chirish */}
                  <button
                    onClick={() => handleSelectMethod('transfer')}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] ${
                      isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-purple-500/20' : 'bg-purple-50'}`}>
                      <ArrowLeftRight className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-black'}`}>{t.transfer}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{language === 'ru' ? 'Банкоский перевод' : language === 'uz_cyrl' ? 'Банк ўтказмаси' : "Bank o'tkazmasi"}</p>
                    </div>
                    <ChevronRight size={20} className={isDark ? 'text-gray-600' : 'text-gray-400'} />
                  </button>
                </div>
              </div>
            )}

            {/* Step: Choose Terminal */}
            {paymentStep === 'terminal' && (
              <div className="px-5 pt-3 pb-8 flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                  <button
                    onClick={() => setPaymentStep('method')}
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}`}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                    {t.chooseTerminal}
                  </h3>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide">
                  {terminals.map(terminal => (
                    <button
                      key={terminal.id}
                      onClick={() => handleSelectTerminal(terminal)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] ${
                        isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                        <CreditCard className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-black'}`}>{terminal.name}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{terminal.bank}</p>
                      </div>
                      <ChevronRight size={18} className={isDark ? 'text-gray-600' : 'text-gray-400'} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Enter Amount */}
            {paymentStep === 'amount' && (
              <div className="px-5 pt-3 pb-8">
                <div className="flex items-center gap-3 mb-5">
                  <button
                    onClick={() => setPaymentStep(paymentMethod === 'karta' ? 'terminal' : 'method')}
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}`}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                    {t.enterAmount}
                  </h3>
                </div>

                {/* Selected method/terminal summary */}
                <div className={`flex items-center gap-3 p-3 rounded-2xl mb-5 ${isDark ? 'bg-gray-800' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    paymentMethod === 'naxt' ? isDark ? 'bg-green-500/20' : 'bg-green-50' :
                    paymentMethod === 'karta' ? isDark ? 'bg-blue-500/20' : 'bg-blue-50' :
                    isDark ? 'bg-purple-500/20' : 'bg-purple-50'
                  }`}>
                    {paymentMethod === 'naxt' && <Banknote size={18} className="text-green-500" />}
                    {paymentMethod === 'karta' && <CreditCard size={18} className="text-blue-500" />}
                    {paymentMethod === 'transfer' && <ArrowLeftRight size={18} className="text-purple-500" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-black'}`}>
                      {paymentMethod === 'naxt' ? t.naxt : paymentMethod === 'karta' ? t.karta : t.transfer}
                    </p>
                    {selectedTerminal && (
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{selectedTerminal.name}</p>
                    )}
                  </div>
                  <Check size={16} className={isDark ? 'text-green-400' : 'text-green-600'} />
                </div>

                <input
                  type="text"
                  inputMode="decimal"
                  value={formatAmountDisplay(paymentAmount)}
                  onChange={handleAmountChange}
                  placeholder="0"
                  autoFocus
                  className={`w-full px-5 py-4 rounded-2xl text-2xl font-bold tabular-nums outline-none mb-4 transition-colors ${
                    isDark
                      ? 'bg-gray-800 text-white placeholder-gray-600 border border-gray-700 focus:border-green-500'
                      : 'bg-gray-50 text-black placeholder-gray-300 border border-gray-200 focus:border-green-500'
                  }`}
                />

                <button
                  onClick={handleConfirmPayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount.replace(/\s/g, '')) <= 0}
                  className={`w-full h-14 rounded-2xl font-semibold text-base transition-colors ${
                    !paymentAmount || parseFloat(paymentAmount.replace(/\s/g, '')) <= 0
                      ? isDark ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-400'
                      : isDark ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {t.confirm}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}