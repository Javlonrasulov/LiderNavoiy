import { useState, useEffect } from "react";
import { X, Search, ChevronRight } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { useNavigate } from "react-router";

interface Client {
  id: number;
  code: string;
  name: string;
  subtitle: string;
  address: string;
  balance: number;
  day: string;
}

interface SearchClientsProps {
  onClose: () => void;
  clients: Client[];
}

export default function SearchClients({ onClose, clients }: SearchClientsProps) {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const translations = {
    uz_latn: {
      search: "Qidirish",
      searchPlaceholder: "Klient nomi yoki kodi...",
      noResults: "Natija topilmadi",
      results: "Natijalar",
    },
    uz_cyrl: {
      search: "Қидириш",
      searchPlaceholder: "Клиент номи ёки коди...",
      noResults: "Натижа топилмади",
      results: "Натижалар",
    },
    ru: {
      search: "Поиск",
      searchPlaceholder: "Имя клиента или код...",
      noResults: "Результатов не найдено",
      results: "Результаты",
    }
  };

  const t = translations[language];

  // Filter clients based on search query
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isVisible ? "opacity-50" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Search Panel */}
      <div
        className={`absolute inset-x-0 bottom-0 ${
          isDark ? "bg-black" : "bg-white"
        } rounded-t-[32px] shadow-2xl transition-transform duration-300 ease-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex flex-col h-full max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800">
            <h2
              className={`text-xl font-medium ${
                isDark ? "text-white" : "text-black"
              }`}
            >
              {t.search}
            </h2>
            <button
              onClick={handleClose}
              className={`w-10 h-10 rounded-full ${
                isDark ? "bg-gray-900 hover:bg-gray-800" : "bg-gray-100 hover:bg-gray-200"
              } flex items-center justify-center transition-colors`}
            >
              <X size={20} className={isDark ? "text-white" : "text-black"} />
            </button>
          </div>

          {/* Search Input */}
          <div className="px-6 py-4">
            <div className={`relative flex items-center ${
              isDark ? "bg-gray-900" : "bg-gray-100"
            } rounded-2xl px-4 py-3`}>
              <Search size={20} className={isDark ? "text-gray-400" : "text-gray-500"} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                autoFocus
                className={`flex-1 ml-3 bg-transparent outline-none ${
                  isDark ? "text-white placeholder-gray-500" : "text-black placeholder-gray-400"
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className={`ml-2 ${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-600"}`}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Results Header */}
          {searchQuery && (
            <div className="px-6 py-2">
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {t.results}: {filteredClients.length}
              </p>
            </div>
          )}

          {/* Results List */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
            {searchQuery ? (
              filteredClients.length > 0 ? (
                <div className={`${isDark ? "bg-gray-900" : "bg-gray-50"} rounded-2xl overflow-hidden`}>
                  {filteredClients.map((client, index) => (
                    <div
                      key={client.id}
                      className={`px-5 py-4 ${
                        index !== filteredClients.length - 1
                          ? `border-b ${isDark ? "border-gray-800" : "border-gray-200"}`
                          : ""
                      } hover:${isDark ? "bg-gray-800" : "bg-gray-100"} transition-colors cursor-pointer`}
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-blue-500 font-medium text-base mb-1">
                            {client.code} - {client.name}
                          </h3>
                          {client.subtitle && (
                            <p className={`text-sm mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              {client.subtitle}
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          size={20}
                          className={`flex-shrink-0 mt-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                          {client.address}
                        </span>
                        <span
                          className={`font-medium ${
                            client.balance < 0
                              ? "text-red-500"
                              : isDark
                              ? "text-white"
                              : "text-black"
                          }`}
                        >
                          {Math.abs(client.balance).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search size={48} className={`mx-auto mb-4 ${isDark ? "text-gray-700" : "text-gray-300"}`} />
                  <p className={`text-lg ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {t.noResults}
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Search size={48} className={`mx-auto mb-4 ${isDark ? "text-gray-700" : "text-gray-300"}`} />
                <p className={`text-lg ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {t.searchPlaceholder}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}