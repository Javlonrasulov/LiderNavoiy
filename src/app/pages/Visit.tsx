import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, ShoppingCart, Package, RefreshCw, Search } from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { useNavigate, useLocation } from 'react-router';
import BottomNav from '../components/BottomNav';
import { mainCategories, allCategories, getProductById } from '../data/categories';
import { useCart } from '../components/CartContext';

export default function Visit() {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const client = location.state?.client;
  const { setCurrentClient, cartItems } = useCart();

  const [activeTab, setActiveTab] = useState<'products' | 'actions' | 'additions' | 'cart'>('products');
  const [cartTotal, setCartTotal] = useState(0.00);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllProducts, setShowAllProducts] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Set current client when component mounts
  useEffect(() => {
    if (client) {
      setCurrentClient({
        id: client.id,
        name: client.name,
        code: client.code,
      });
    }
  }, [client, setCurrentClient]);

  const translations = {
    uz_latn: {
      products: "Mahsulot",
      actions: "Aksiya",
      additions: "Qo'shimchalar",
      cart: "Savatcha",
      addProduct: "Mahsulot qo'shish",
      total: "Jami",
      search: "Qidirish...",
      allProducts: "Barcha tovarlar",
      viewAll: "Hammasini ko'rish",
      collapse: "Yopish",
      stock: "(Sklad)",
    },
    uz_cyrl: {
      products: "Маҳсулот",
      actions: "Акция",
      additions: "Қўшимчалар",
      cart: "Саватча",
      addProduct: "Маҳсулот қўшиш",
      total: "Жами",
      search: "Қидириш...",
      allProducts: "Барча товарлар",
      viewAll: "Ҳаммасини кўриш",
      collapse: "Ёпиш",
      stock: "(Склад)",
    },
    ru: {
      products: "Продукт",
      actions: "Акция",
      additions: "Дополнения",
      cart: "Корзина",
      addProduct: "Добавить продукт",
      total: "Всего",
      search: "Поиск...",
      allProducts: "Все товары",
      viewAll: "Посмотреть все",
      collapse: "Закрыть",
      stock: "(Склад)",
    }
  };

  const t = translations[language];

  const visibleCategories = showAllCategories ? allCategories : mainCategories;

  const filteredCategories = visibleCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/visit/category/${categoryId}`, {
      state: { visitState: { client } }
    });
  };

  // Check if category has products in cart
  const categoryHasItemsInCart = (categoryId: string) => {
    return cartItems.some(item => {
      const productData = getProductById(item.productId);
      return productData?.category?.id === categoryId;
    });
  };

  // Count cart items in a category
  const categoryCartCount = (categoryId: string) => {
    return cartItems.filter(item => {
      const productData = getProductById(item.productId);
      return productData?.category?.id === categoryId;
    }).length;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      <style>
        {`
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
            {/* Back Button and Title */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate(client?.id ? `/client/${client.id}` : '/clients')}
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <h1 className="text-white text-2xl font-semibold tracking-tight">
                Vizit
              </h1>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
              {(['products', 'actions', 'additions', 'cart'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 whitespace-nowrap text-sm font-medium transition-colors relative ${
                    activeTab === tab ? 'text-white' : 'text-white/50'
                  }`}
                >
                  {t[tab]}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-b px-5 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isDark ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}>
                <Package size={20} />
              </button>
              <button className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isDark ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}>
                <ShoppingCart size={20} />
              </button>
            </div>

            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>
              {cartTotal.toFixed(2)}
            </div>

            <button className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
            }`}>
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 py-6 scrollbar-hide overflow-y-auto">
          {/* Search Bar */}
          <div className="mb-4">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${
              isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
            }`}>
              <Search className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className={`flex-1 bg-transparent outline-none text-base ${
                  isDark ? 'text-white placeholder-gray-500' : 'text-black placeholder-gray-400'
                }`}
              />
            </div>
          </div>

          {/* Toggle - All Products / In Stock Only */}
          <div className="mb-4">
            <div className={`flex items-center justify-between px-4 py-3 rounded-2xl ${
              isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
            }`}>
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-black'}`}>
                {t.allProducts}
              </span>
              <button
                onClick={() => setShowAllProducts(!showAllProducts)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                  showAllProducts 
                    ? 'bg-blue-500' 
                    : isDark ? 'bg-gray-700' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
                  showAllProducts ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {activeTab === 'products' && (
            <div className="space-y-3">
              {filteredCategories.map((category) => {
                const hasItemsInCart = categoryHasItemsInCart(category.id);
                
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className={`w-full border rounded-2xl p-4 transition-all active:scale-[0.98] ${
                      isDark 
                        ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isDark ? 'bg-gray-800' : 'bg-gray-100'
                        }`}>
                          <Plus size={20} className={isDark ? 'text-white' : 'text-black'} />
                        </div>
                        <p className={`text-base font-medium ${isDark ? 'text-white' : 'text-black'}`}>
                          {category.name}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {categoryHasItemsInCart(category.id) && (
                          <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">
                            {categoryCartCount(category.id)}
                          </span>
                        )}
                        <span className={`text-lg font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {category.products.length}
                        </span>
                        <ChevronRight size={20} className={isDark ? 'text-gray-600' : 'text-gray-400'} />
                      </div>
                    </div>
                  </button>
                );
              })}
              
              {/* View All / Collapse Button */}
              {!showAllCategories ? (
                <button
                  onClick={() => setShowAllCategories(true)}
                  className={`w-full ${isDark ? 'bg-gray-900/50 border-gray-800 hover:bg-gray-900' : 'bg-white/50 border-gray-200 hover:bg-white'} border rounded-2xl p-4 transition-colors`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-base font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      {t.viewAll}
                    </span>
                    <ChevronRight size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setShowAllCategories(false)}
                  className={`w-full ${isDark ? 'bg-gray-900/50 border-gray-800 hover:bg-gray-900' : 'bg-white/50 border-gray-200 hover:bg-white'} border rounded-2xl p-4 transition-colors`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-base font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      {t.collapse}
                    </span>
                    <ChevronLeft size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                  </div>
                </button>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="flex items-center justify-center h-64">
              <p className={`text-base ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.actions}</p>
            </div>
          )}

          {activeTab === 'additions' && (
            <div className="flex items-center justify-center h-64">
              <p className={`text-base ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.additions}</p>
            </div>
          )}

          {activeTab === 'cart' && (
            <div className="flex items-center justify-center h-64">
              <p className={`text-base ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.cart}</p>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNav activePage="dostavka" onNavigate={(page) => {
          if (page === 'home') navigate('/');
          else if (page === 'dostavka') navigate('/visit');
          else if (page === 'locatsiya') navigate('/locatsiya');
          else if (page === 'plan') navigate('/plan');
          else if (page === 'messages') navigate('/messages');
        }} />
      </div>
    </div>
  );
}