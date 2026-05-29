import { useState } from 'react';
import { ChevronLeft, Search, Package, ChevronDown } from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { useNavigate, useParams, useLocation } from 'react-router';
import { getCategoryById } from '../data/categories';
import BottomNav from '../components/BottomNav';
import { useCart } from '../components/CartContext';
import ProductCard from '../components/ProductCard';

export default function CategoryDetail() {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();
  const location = useLocation();
  const visitState = location.state?.visitState;

  const [showAllProducts, setShowAllProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpen, setSelectedOpen] = useState(false);

  const translations = {
    uz_latn: {
      allProducts: "Barcha tovarlar",
      search: "Qidirish...",
      noResults: "Mahsulot topilmadi",
      mahsulot: "mahsulot",
    },
    uz_cyrl: {
      allProducts: "Барча товарлар",
      search: "Қидириш...",
      noResults: "Маҳсулот топилмади",
      mahsulot: "маҳсулот",
    },
    ru: {
      allProducts: "Все товары",
      search: "Поиск...",
      noResults: "Продукты не найдены",
      mahsulot: "товаров",
    },
  };

  const t = translations[language];
  const category = categoryId ? getCategoryById(categoryId) : undefined;
  const allProducts = category?.products ?? [];

  const { getCategoryTotal, getProductQty, removeFromCart } = useCart();
  const totalSum = categoryId ? getCategoryTotal(categoryId) : 0;

  const visibleProducts = allProducts
    .filter(p => showAllProducts || p.balance > 0)
    .filter(p => {
      const q = searchQuery.toLowerCase();
      return (
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
      );
    });

  const selectedProducts = visibleProducts.filter(p => getProductQty(p.id) > 0);
  const otherProducts = visibleProducts.filter(p => getProductQty(p.id) === 0);

  const handleProductClick = (productId: number) => {
    navigate(`/visit/product/${productId}`, {
      state: { visitState, categoryId },
    });
  };

  const formatPrice = (price: number) => price.toLocaleString('ru-RU');
  const formatBalance = (balance: number) => balance.toFixed(3);

  if (!category) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
        <p className={isDark ? 'text-white' : 'text-black'}>Kategoriya topilmadi</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>

      <div className="max-w-md mx-auto min-h-screen flex flex-col pb-20">

        {/* ── Gradient Header ── */}
        <div className={`relative overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900'
            : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="relative px-5 pt-8 pb-5">

            {/* Back + Title */}
            <div className="flex items-center gap-4 mb-5">
              <button
                onClick={() => navigate('/visit')}
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-white text-2xl font-semibold tracking-tight truncate">{category.name}</h1>
                <p className="text-white/60 text-sm mt-0.5">
                  {visibleProducts.length} / {allProducts.length} {t.mahsulot}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
              <Search className="w-5 h-5 text-white/60 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="flex-1 bg-transparent outline-none text-base text-white placeholder-white/50"
              />
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setShowAllProducts(v => !v)}
                className={`flex items-center gap-3 px-4 py-2 rounded-2xl transition-all duration-300 border ${
                  showAllProducts
                    ? 'bg-white/25 border-white/40'
                    : 'bg-white/10 border-white/20'
                }`}
              >
                <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                  showAllProducts ? 'bg-white' : 'bg-white/30'
                }`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all duration-300 ${
                    showAllProducts ? 'left-5 bg-blue-600' : 'left-0.5 bg-white'
                  }`} />
                </div>
                <span className="text-white/90 text-sm font-medium">{t.allProducts}</span>
              </button>

              {/* Jami summa */}
              <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20">
                <p className="text-white text-sm font-semibold tabular-nums">
                  {totalSum > 0 ? totalSum.toLocaleString('ru-RU') + ' so\'m' : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Product List ── */}
        <div className="flex-1 scrollbar-hide overflow-y-auto px-4 pt-4 space-y-2.5">
          {visibleProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                isDark ? 'bg-gray-900' : 'bg-white border border-gray-200'
              }`}>
                <Package size={28} className={isDark ? 'text-gray-600' : 'text-gray-300'} />
              </div>
              <p className={`text-base ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.noResults}</p>
            </div>
          ) : (
            <>
              {/* ── Tanlangan tovarlar ── */}
              {selectedProducts.length > 0 && (
                <div className="mb-1">
                  {/* Collapsible header — faqat ochish/yopish */}
                  <button
                    onClick={() => setSelectedOpen(v => !v)}
                    className="w-full flex items-center gap-2 mb-2.5 px-1 py-1 rounded-xl transition-all active:scale-[0.98]"
                  >
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 ${
                      isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-100 text-green-700'
                    }`}>
                      {language === 'ru' ? 'Выбранные' : language === 'uz_cyrl' ? 'Танланганлар' : 'Tanlanganlar'}
                    </span>
                    <span className={`text-xs flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {selectedProducts.length} ta
                    </span>
                    <div className={`flex-1 h-px ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-300 flex-shrink-0 ${
                        selectedOpen ? 'rotate-180' : ''
                      } ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                    />
                  </button>

                  {/* Collapsible content */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    selectedOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="space-y-2.5 pb-1">
                      {selectedProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          inCart={true}
                          qty={getProductQty(product.id)}
                          isDark={isDark}
                          formatPrice={formatPrice}
                          formatBalance={formatBalance}
                          onClick={() => handleProductClick(product.id)}
                          onRemove={() => removeFromCart(product.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Qolgan tovarlar ── */}
              {otherProducts.length > 0 && (
                <div>
                  {selectedProducts.length > 0 && (
                    <div className="flex items-center gap-2 mb-2.5 px-1 mt-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {language === 'ru' ? 'Все товары' : language === 'uz_cyrl' ? 'Барча товарлар' : 'Barcha tovarlar'}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {otherProducts.length} ta
                      </span>
                      <div className={`flex-1 h-px ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />
                    </div>
                  )}
                  <div className="space-y-2.5">
                    {otherProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        inCart={false}
                        qty={0}
                        isDark={isDark}
                        formatPrice={formatPrice}
                        formatBalance={formatBalance}
                        onClick={() => handleProductClick(product.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div className="h-4" />
        </div>

        <BottomNav activePage="dostavka" />
      </div>
    </div>
  );
}