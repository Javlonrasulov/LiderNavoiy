import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Minus, ShoppingCart, Package, Check, X, ChevronRight } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { useNavigate, useParams, useLocation } from 'react-router';
import { getProductById } from '../../data/categories';
import BottomNav from '../../components/BottomNav';
import productImage from 'figma:asset/2a99a8088f15654ac307b4f6c4d88bef7a24f8bd.png';
import { useCart } from '../../components/CartContext';

export default function ProductDetail() {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();
  const { addToCart, getProductQty } = useCart();
  const { productId } = useParams<{ productId: string }>();
  const location = useLocation();

  const data = productId ? getProductById(Number(productId)) : undefined;
  const product = data?.product;
  const category = data?.category;

  // categoryId: state'dan olish, agar yo'q bo'lsa product ma'lumotidan olish
  const categoryId = location.state?.categoryId ?? category?.id;

  // Kategoriya ichidagi mahsulotlar ro'yxati va joriy index
  const categoryProducts = category ? category.products : [];
  const currentIndex = categoryProducts.findIndex(p => p.id === product?.id);
  const prevProduct = currentIndex > 0 ? categoryProducts[currentIndex - 1] : null;
  const nextProduct = currentIndex < categoryProducts.length - 1 ? categoryProducts[currentIndex + 1] : null;

  // Savatchadagi mavjud miqdorni boshlang'ich qiymat sifatida yuklash
  const [quantity, setQuantity] = useState(() =>
    productId ? getProductQty(Number(productId)) : 0
  );
  const [note, setNote] = useState('');
  const [added, setAdded] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  // productId o'zgarganda (oldingi/keyingi mahsulot) savatchadan yangilash
  useEffect(() => {
    if (productId) {
      setQuantity(getProductQty(Number(productId)));
    }
    setNote('');
    setAdded(false);
  }, [productId]);

  const goToProduct = (targetId: number) => {
    navigate(`/visit/product/${targetId}`, {
      replace: true,
      state: { categoryId },
    });
    // useEffect productId o'zgarganda miqdorni avtomatik o'rnatadi
  };

  const translations = {
    uz_latn: {
      quantity: "Miqdor",
      stock: "Sklad",
      price: "Narx",
      total: "Jami",
      note: "Izoh...",
      addToCart: "Savatga qo'shish",
      added: "Qo'shildi!",
      unit: "kg",
      notFound: "Mahsulot topilmadi",
      perUnit: "so'm/kg",
      koldi: "Koldi",
      sotilgan: "Sotilgan",
      kaytOl: "Qayt.ol",
    },
    uz_cyrl: {
      quantity: "Миқдор",
      stock: "Склад",
      price: "Нарх",
      total: "Жами",
      note: "Изоҳ...",
      addToCart: "Саватга қўшиш",
      added: "Қўшилди!",
      unit: "кг",
      notFound: "Маҳсулот топилмади",
      perUnit: "сўм/кг",
      koldi: "Колдик",
      sotilgan: "Сотилган",
      kaytOl: "Кайт.ол",
    },
    ru: {
      quantity: "Количество",
      stock: "Склад",
      price: "Цена",
      total: "Итого",
      note: "Примечание...",
      addToCart: "Добавить в корзину",
      added: "Добавлено!",
      unit: "кг",
      notFound: "Продукт не найден",
      perUnit: "сум/кг",
      koldi: "Остаток",
      sotilgan: "Продано",
      kaytOl: "Возврат",
    },
  };

  const t = translations[language];
  const totalPrice = product ? (product.price ?? 0) * quantity : 0;

  const handleAddToCart = () => {
    if (quantity <= 0) return;
    addToCart({
      productId: product!.id,
      quantity,
      price: product!.price ?? 0,
      categoryId: categoryId ?? '',
    });
    setAdded(true);
    setTimeout(() => navigate(`/visit/category/${categoryId}`, { replace: true }), 800);
  };

  const increment = () => setQuantity(q => q + 1);
  const decrement = () => setQuantity(q => Math.max(0, q - 1));

  if (!product) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
        <p className={isDark ? 'text-white' : 'text-black'}>{t.notFound}</p>
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

      <div className="max-w-md mx-auto min-h-screen flex flex-col pb-24">

        {/* ── Gradient Header ── */}
        <div className={`relative overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900'
            : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="relative px-5 pt-8 pb-6">
            <div className="flex items-start gap-4">
              <button
                onClick={() => navigate(`/visit/category/${categoryId}`)}
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors flex-shrink-0 mt-0.5"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-white/60 text-sm mb-0.5">{category?.name}</p>
                <h1 className="text-white text-lg font-semibold tracking-tight leading-snug">
                  {product.code} — {product.name}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 px-4 py-4 space-y-3 scrollbar-hide overflow-y-auto">

          {/* Склад + Нарх cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-green-500/15' : 'bg-green-50'}`}>
                  <Package size={18} className="text-green-500" />
                </div>
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.stock}</span>
              </div>
              <p className={`text-2xl font-bold ${product.balance > 0 ? 'text-green-500' : isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                {product.balance.toFixed(3)}
              </p>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{product.unit}</p>
            </div>

            <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
                  <ShoppingCart size={18} className="text-blue-400" />
                </div>
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.price}</span>
              </div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {(product.price ?? 0).toLocaleString('ru-RU')}
              </p>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.perUnit}</p>
            </div>
          </div>

          {/* Миқдор */}
          <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.quantity}</p>
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={decrement}
                disabled={quantity <= 0}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                  quantity <= 0
                    ? isDark ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-300'
                    : isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Minus size={22} />
              </button>

              <div className="flex-1 text-center">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={quantity === 0 ? '' : quantity}
                  placeholder="0"
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || val === '-') { setQuantity(0); return; }
                    const num = parseFloat(val);
                    if (!isNaN(num) && num >= 0) setQuantity(num);
                  }}
                  className={`w-full bg-transparent text-center outline-none text-5xl font-bold tabular-nums
                    [appearance:textfield]
                    [&::-webkit-inner-spin-button]:appearance-none
                    [&::-webkit-outer-spin-button]:appearance-none
                    ${isDark ? 'text-white placeholder-gray-600' : 'text-black placeholder-gray-300'}
                  `}
                />
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.unit}</p>
              </div>

              <button
                onClick={increment}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                  isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <Plus size={22} />
              </button>
            </div>

            <div className="flex gap-2 mt-4">
              {[1, 5, 10, 25, 50].map(val => (
                <button
                  key={val}
                  onClick={() => setQuantity(val)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    quantity === val
                      ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      : isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Жами */}
          {quantity > 0 && (
            <div className={`rounded-2xl px-5 py-4 flex items-center justify-between ${
              isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'
            }`}>
              <span className={`text-base font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{t.total}</span>
              <span className={`text-xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {totalPrice.toLocaleString()} so'm
              </span>
            </div>
          )}

          {/* Изоҳ */}
          <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t.note}
              rows={3}
              className={`w-full bg-transparent px-4 py-4 text-base outline-none resize-none ${
                isDark ? 'text-white placeholder-gray-600' : 'text-black placeholder-gray-400'
              }`}
            />
          </div>

          {/* ← Oldingi / Keyingi → navigatsiya */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => prevProduct && goToProduct(prevProduct.id)}
              disabled={!prevProduct}
              className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                prevProduct
                  ? isDark ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50'
                  : isDark ? 'bg-gray-900/40 text-gray-700 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              <ChevronLeft size={20} />
              <span className="text-sm font-medium truncate max-w-[100px]">
                {prevProduct ? prevProduct.name.split(' ').slice(0, 2).join(' ') : '—'}
              </span>
            </button>

            <div className={`text-sm font-medium min-w-[52px] text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {currentIndex + 1} / {categoryProducts.length}
            </div>

            <button
              onClick={() => nextProduct && goToProduct(nextProduct.id)}
              disabled={!nextProduct}
              className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                nextProduct
                  ? isDark ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50'
                  : isDark ? 'bg-gray-900/40 text-gray-700 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              <span className="text-sm font-medium truncate max-w-[100px]">
                {nextProduct ? nextProduct.name.split(' ').slice(0, 2).join(' ') : '—'}
              </span>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Tovar rasmi */}
          <div
            className={`rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform ${
              isDark ? 'bg-gray-900' : 'bg-white border border-gray-200'
            }`}
            onClick={() => setImageOpen(true)}
          >
            <img src={productImage} alt={product.name} className="w-full object-contain max-h-56 p-4" />
          </div>

          <div className="h-20" />
        </div>

        {/* ── Fullscreen image modal ── */}
        {imageOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setImageOpen(false)}
          >
            <button
              onClick={() => setImageOpen(false)}
              className="fixed top-6 right-5 z-50 w-11 h-11 rounded-full bg-white/15 border border-white/25 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all"
            >
              <X size={22} />
            </button>
            <div className="relative w-full max-w-md px-4" onClick={e => e.stopPropagation()}>
              <img src={productImage} alt={product.name} className="w-full rounded-3xl object-contain max-h-[80vh]" />
            </div>
          </div>
        )}

        {/* ── Savatga qo'shish button ── */}
        <div className={`fixed bottom-[72px] left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-2 pt-2 ${
          isDark ? 'bg-black/95' : 'bg-gray-50/95'
        } backdrop-blur-sm`}>
          <button
            onClick={handleAddToCart}
            disabled={quantity <= 0 || added}
            className={`w-full h-14 rounded-2xl flex items-center justify-center gap-3 transition-all font-semibold text-base ${
              added
                ? 'bg-green-500 text-white'
                : quantity <= 0
                  ? isDark ? 'bg-gray-800/80 text-gray-500 border border-gray-700' : 'bg-gray-200 text-gray-400'
                  : isDark ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98]' : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.98]'
            }`}
          >
            {added ? (
              <>
                <Check size={22} />
                <span>{t.added}</span>
              </>
            ) : (
              <>
                <ShoppingCart size={20} />
                <span>{t.addToCart}</span>
                {quantity > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-lg text-sm">
                    {quantity} {t.unit}
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        <BottomNav activePage="dostavka" />
      </div>
    </div>
  );
}