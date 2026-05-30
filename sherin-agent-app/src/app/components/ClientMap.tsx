import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  X,
  User,
  Navigation,
  ChevronDown,
  ChevronLeft,
  Moon,
  Sun,
  Globe,
  Image,
} from "lucide-react";
import { useTheme } from "./ThemeContext";
import BottomNav from "./BottomNav";
import storeImage from "figma:asset/58fc246c4a155129d1144ff650ab41d756727992.png";
import {
  MapLayerSwitcher,
  switchTileLayer,
  type LayerId,
} from "./MapLayerSwitcher";

interface Client {
  id: number;
  name:
    | {
        uz_latn: string;
        uz_cyrl: string;
        ru: string;
      }
    | string;
  address:
    | {
        uz_latn: string;
        uz_cyrl: string;
        ru: string;
      }
    | string;
  amount: string;
  visitTime: string;
  lat: number;
  lng: number;
  debt: string;
  lastVisit: string;
  day: string;
}

interface ClientMapProps {
  onClose: () => void;
  clients: Client[];
  language: string;
  onLanguageChange: (lang: string) => void;
}

export default function ClientMap({
  onClose,
  clients,
  language,
  onLanguageChange,
}: ClientMapProps) {
  const { isDark, toggleTheme } = useTheme();
  const mapRef        = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef  = useRef<L.TileLayer | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerId>('standard');
  const activeLayerRef = useRef<LayerId>('standard');

  const [selectedDay, setSelectedDay] =
    useState<string>("today"); // Default: bugungi klientlar
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(350); // Initial height in pixels
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(event.target as Node)
      ) {
        setShowLangMenu(false);
      }
    };

    if (showDropdown || showLangMenu) {
      document.addEventListener(
        "mousedown",
        handleClickOutside,
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, [showDropdown, showLangMenu]);

  const translations = {
    uz_latn: {
      today: "Bugungi klientlar",
      all: "Barchasi",
      debt: "Qarz",
      lastVisit: "Oxirgi tashrif",
      openNavigator: "Navigator ochish",
      viewImage: "Rasmi",
      monday: "Dushanba",
      tuesday: "Seshanba",
      wednesday: "Chorshanba",
      thursday: "Payshanba",
      friday: "Juma",
      saturday: "Shanba",
      sunday: "Yakshanba",
      home: "Bosh sahifa",
      delivery: "Dostavka",
      map: "Xarita",
    },
    uz_cyrl: {
      today: "Бугунги клиентлар",
      all: "Барчаси",
      debt: "Қарз",
      lastVisit: "Охирги ташриф",
      openNavigator: "Навигатор очиш",
      viewImage: "Расми",
      monday: "Душанба",
      tuesday: "Сешанба",
      wednesday: "Чоршанба",
      thursday: "Пайшанба",
      friday: "Жума",
      saturday: "Шанба",
      sunday: "Якшанба",
      home: "Бош саҳифа",
      delivery: "Доставка",
      map: "Харита",
    },
    ru: {
      today: "Сегодняшние клиенты",
      all: "Все",
      debt: "Долг",
      lastVisit: "Последний визит",
      openNavigator: "Открыть навигатор",
      viewImage: "Фото",
      monday: "Понедельник",
      tuesday: "Вторник",
      wednesday: "Среда",
      thursday: "Четверг",
      friday: "Пятница",
      saturday: "Суббота",
      sunday: "Воскресенье",
      home: "Главная",
      delivery: "Доставка",
      map: "Карта",
    },
  };

  const t = translations[language as keyof typeof translations];

  const dayOptions = [
    { value: "today", label: t.today },
    { value: "all", label: t.all },
    { value: "monday", label: t.monday },
    { value: "tuesday", label: t.tuesday },
    { value: "wednesday", label: t.wednesday },
    { value: "thursday", label: t.thursday },
    { value: "friday", label: t.friday },
    { value: "saturday", label: t.saturday },
    { value: "sunday", label: t.sunday },
  ];

  // Filter clients based on selected day
  const filteredClients =
    selectedDay === "all"
      ? clients
      : selectedDay === "today"
        ? clients.filter((c) => c.day === "today")
        : clients.filter((c) => c.day === selectedDay);

  console.log("ClientMap - selectedDay:", selectedDay);
  console.log("ClientMap - filteredClients:", filteredClients);

  const selectedDayLabel =
    dayOptions.find((d) => d.value === selectedDay)?.label ||
    t.today;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map centered on Navoiy, Uzbekistan
    const map = L.map(mapContainerRef.current, { zoomAnimation: false }).setView(
      [40.0844, 65.3792],
      13,
    );

    // Add tile layer
    const tileLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    ).addTo(map);
    tileLayerRef.current = tileLayer;

    // Custom red marker icon
    const redIcon = L.divIcon({
      className: "custom-marker",
      html: `
        <div style="position: relative;">
          <div style="
            width: 40px;
            height: 40px;
            background-color: #ef4444;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          "></div>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(45deg);
            width: 12px;
            height: 12px;
            background-color: white;
            border-radius: 50%;
          "></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });

    // Add markers for each client
    filteredClients.forEach((client) => {
      const marker = L.marker([client.lat, client.lng], {
        icon: redIcon,
      }).addTo(map);

      // Create popup content with correct data structure
      const popupContent = `
        <div style="min-width: 220px; font-family: system-ui, -apple-system, sans-serif; padding: 4px;">
          <div style="font-weight: 600; font-size: 16px; margin-bottom: 6px; color: #1f2937;">
            ${typeof client.name === "string" ? client.name : client.name[language as keyof typeof client.name]}
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">
            ${typeof client.address === "string" ? client.address : client.address[language as keyof typeof client.address]}
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px;">
            <div style="color: #ef4444; font-weight: 500;">
              ${client.debt} сум
            </div>
            <div style="color: #6b7280;">
              ${client.lastVisit}
            </div>
          </div>
          <button 
            onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}', '_blank')"
            style="
              width: 100%;
              padding: 10px 12px;
              background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
              color: white;
              border: none;
              border-radius: 12px;
              font-weight: 500;
              cursor: pointer;
              font-size: 13px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
            "
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
              <path d="M12 2L4 9L12 22L20 9L12 2Z" fill="white"/>
              <path d="M12 2L4 9L12 22L20 9L12 2Z" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linejoin="round"/>
              <circle cx="12" cy="10" r="2.5" fill="#3b82f6"/>
            </svg>
            ${t.openNavigator}
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 250,
        className: "custom-popup",
      });

      // Show client name on hover
      const clientName =
        typeof client.name === "string"
          ? client.name
          : client.name[language as keyof typeof client.name];
      marker.bindTooltip(clientName, {
        permanent: false,
        direction: "top",
        className: "custom-tooltip",
      });
    });

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [filteredClients, t.openNavigator, language]);

  // Switch tile layer when activeLayer changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    activeLayerRef.current = activeLayer;
    switchTileLayer(mapRef.current, tileLayerRef, activeLayer, false);
  }, [activeLayer]);

  const openNavigator = (lat: number, lng: number) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank",
    );
  };

  const handleDragStart = (
    e:
      | React.TouchEvent<HTMLDivElement>
      | React.MouseEvent<HTMLDivElement>,
  ) => {
    setIsDragging(true);
    const clientY =
      "touches" in e ? e.touches[0].clientY : e.clientY;
    setStartY(clientY);
    setStartHeight(sheetHeight);
  };

  const handleDrag = (
    e:
      | React.TouchEvent<HTMLDivElement>
      | React.MouseEvent<HTMLDivElement>,
  ) => {
    if (!isDragging) return;
    const clientY =
      "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = startY - clientY;
    const newHeight = Math.max(
      200,
      Math.min(window.innerHeight - 180, startHeight + deltaY),
    );
    setSheetHeight(newHeight);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${isDark ? "bg-black" : "bg-gray-50"}`}
      onMouseMove={handleDrag}
      onMouseUp={handleDragEnd}
      onTouchMove={handleDrag}
      onTouchEnd={handleDragEnd}
    >
      <style>
        {`
          .custom-tooltip {
            background: #1f2937 !important;
            border: none !important;
            border-radius: 8px !important;
            color: white !important;
            font-weight: 500 !important;
            padding: 6px 12px !important;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3) !important;
          }
          .custom-tooltip::before {
            border-top-color: #1f2937 !important;
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px !important;
            padding: 0 !important;
          }
          .leaflet-popup-content {
            margin: 12px !important;
          }
          .leaflet-popup-close-button {
            top: 8px !important;
            right: 8px !important;
            width: 24px !important;
            height: 24px !important;
            font-size: 20px !important;
            color: #6b7280 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 50% !important;
            background: #f3f4f6 !important;
            border: none !important;
            z-index: 1000 !important;
          }
          .leaflet-popup-close-button:hover {
            color: #1f2937 !important;
            background: #e5e7eb !important;
          }
          /* Hide scrollbar completely - ALL BROWSERS */
          .hide-scrollbar {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
            -webkit-appearance: none !important;
          }
          .hide-scrollbar::-webkit-scrollbar-track {
            display: none !important;
            background: transparent !important;
          }
          .hide-scrollbar::-webkit-scrollbar-thumb {
            display: none !important;
            background: transparent !important;
          }
          .hide-scrollbar::-webkit-scrollbar-corner {
            display: none !important;
            background: transparent !important;
          }
        `}
      </style>
      <div className="max-w-md mx-auto h-full flex flex-col">
        {/* Header */}
        <div
          className={`relative z-[100] ${
            isDark
              ? "bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900"
              : "bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

          <div className="relative px-5 pt-6 pb-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              {/* Back Button */}
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>

              {/* Dropdown for day selection */}
              <div
                className="relative flex-1 z-[110]"
                ref={dropdownRef}
              >
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 hover:bg-white/20 transition-all"
                >
                  <span className="text-white text-xl font-medium">
                    {selectedDayLabel}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-white transition-transform ${showDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown menu */}
                {showDropdown && (
                  <div
                    className={`absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-[120] ${
                      isDark
                        ? "bg-gray-800 border border-gray-700"
                        : "bg-white border border-gray-200"
                    } shadow-xl max-h-80 overflow-y-auto hide-scrollbar`}
                  >
                    {dayOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedDay(option.value);
                          setShowDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                          selectedDay === option.value
                            ? isDark
                              ? "bg-blue-600 text-white"
                              : "bg-blue-500 text-white"
                            : isDark
                              ? "text-white hover:bg-gray-700"
                              : "text-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all flex-shrink-0"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-white" />
                ) : (
                  <Moon className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Language Menu */}
              <div
                className="relative z-[110]"
                ref={langMenuRef}
              >
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all flex-shrink-0"
                >
                  <Globe className="w-5 h-5 text-white" />
                </button>

                {showLangMenu && (
                  <div
                    className={`absolute top-full right-0 mt-2 rounded-2xl overflow-hidden z-[120] min-w-[180px] ${
                      isDark
                        ? "bg-gray-800 border border-gray-700"
                        : "bg-white border border-gray-200"
                    } shadow-xl`}
                  >
                    {[
                      {
                        code: "uz_latn",
                        label: "O'zbek Lotin",
                      },
                      { code: "uz_cyrl", label: "Ўзбек Крил" },
                      { code: "ru", label: "Русский" },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          onLanguageChange(lang.code);
                          setShowLangMenu(false);
                        }}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                          language === lang.code
                            ? isDark
                              ? "bg-blue-600 text-white"
                              : "bg-blue-500 text-white"
                            : isDark
                              ? "text-white hover:bg-gray-700"
                              : "text-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div
          className="flex-1 relative z-10"
          style={{
            height: `calc(100vh - 180px - ${sheetHeight}px)`,
          }}
        >
          <div
            ref={mapContainerRef}
            className="w-full h-full"
          />
          <MapLayerSwitcher
            activeLayer={activeLayer}
            onChange={(id) => {
              setActiveLayer(id);
              activeLayerRef.current = id;
            }}
            bottom={12}
            left={12}
          />
        </div>

        {/* Draggable Bottom Sheet */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-[90] ${isDark ? "bg-gray-900" : "bg-white"} rounded-t-3xl shadow-2xl`}
          style={{ height: `${sheetHeight}px` }}
        >
          <div className="max-w-md mx-auto h-full flex flex-col">
            {/* Drag Handle */}
            <div
              className="pt-3 pb-2 cursor-grab active:cursor-grabbing"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <div
                className={`w-12 h-1.5 ${isDark ? "bg-gray-700" : "bg-gray-300"} rounded-full mx-auto`}
              ></div>
            </div>

            {/* Client List */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-20">
              <div className="space-y-3">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className={`p-4 rounded-2xl ${isDark ? "bg-gray-800" : "bg-gray-50"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium mb-1 ${isDark ? "text-white" : "text-black"}`}
                        >
                          {typeof client.name === "string"
                            ? client.name
                            : client.name[
                                language as keyof typeof client.name
                              ]}
                        </div>
                        <div
                          className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"} mb-3`}
                        >
                          {typeof client.address === "string"
                            ? client.address
                            : client.address[
                                language as keyof typeof client.address
                              ]}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div
                              className={
                                isDark
                                  ? "text-gray-500"
                                  : "text-gray-400"
                              }
                            >
                              {t.debt}:
                            </div>
                            <div className="text-red-500 font-medium">
                              {client.debt} сум
                            </div>
                          </div>
                          <div>
                            <div
                              className={
                                isDark
                                  ? "text-gray-500"
                                  : "text-gray-400"
                              }
                            >
                              {t.lastVisit}:
                            </div>
                            <div
                              className={
                                isDark
                                  ? "text-gray-300"
                                  : "text-gray-600"
                              }
                            >
                              {client.lastVisit}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() => setShowImageModal(true)}
                        className={`py-3.5 ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-700 hover:bg-gray-600"} text-white rounded-2xl font-medium transition-all flex items-center justify-center gap-2 text-sm`}
                      >
                        <Image className="w-5 h-5" />
                        {t.viewImage}
                      </button>
                      <button
                        onClick={() =>
                          openNavigator(client.lat, client.lng)
                        }
                        className="py-3.5 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white rounded-2xl font-medium hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 text-sm"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="flex-shrink-0"
                        >
                          <path
                            d="M12 2L4 9L12 22L20 9L12 2Z"
                            fill="white"
                          />
                          <path
                            d="M12 2L4 9L12 22L20 9L12 2Z"
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="12"
                            cy="10"
                            r="2.5"
                            fill="#3b82f6"
                          />
                        </svg>
                        {t.openNavigator}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Navigation */}
            <BottomNav activePage="locatsiya" />
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <img
                src={storeImage}
                alt="Do'kon rasmi"
                className="w-full rounded-3xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}