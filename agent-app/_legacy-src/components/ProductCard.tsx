import { ChevronRight, Trash2 } from 'lucide-react';

interface Product {
  id: number;
  code: string;
  name: string;
  price: number;
  balance: number;
  unit: string;
}

interface ProductCardProps {
  product: Product;
  inCart: boolean;
  qty: number;
  isDark: boolean;
  formatPrice: (price: number) => string;
  formatBalance: (balance: number) => string;
  onClick: () => void;
  onRemove?: () => void;
}

export default function ProductCard({
  product,
  inCart,
  qty,
  isDark,
  formatPrice,
  formatBalance,
  onClick,
  onRemove,
}: ProductCardProps) {
  return (
    <div className={`relative w-full rounded-2xl transition-all ${
      inCart
        ? isDark
          ? 'bg-green-900/30 border border-green-700'
          : 'bg-green-50 border border-green-300'
        : isDark
          ? 'bg-gray-900 border border-transparent'
          : 'bg-white border border-gray-100'
    }`}>
      <button
        onClick={onClick}
        className="w-full text-left px-4 py-4 active:scale-[0.98] transition-all"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Chap: code + nom + narx */}
          <div className="flex-1 min-w-0">
            {/* Kod */}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-lg inline-block mb-1.5 ${
              inCart
                ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                : isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'
            }`}>
              {product.code}
            </span>
            {/* Nom */}
            <p className={`text-sm leading-snug mb-2 ${
              inCart
                ? isDark ? 'text-green-300' : 'text-green-800'
                : isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {product.name}
            </p>
            {/* Narx */}
            <p className={`text-sm tabular-nums ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {formatPrice(product.price)} so'm
            </p>
          </div>

          {/* O'ng: balans badge + strelka + cart qty */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              {inCart && (
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">
                  {qty}
                </span>
              )}
              <ChevronRight
                size={18}
                className={inCart ? 'text-green-500' : isDark ? 'text-gray-600' : 'text-gray-300'}
              />
            </div>
            <div className={`px-3 py-1.5 rounded-xl text-center min-w-[72px] ${
              product.balance > 0
                ? isDark ? 'bg-green-500/15' : 'bg-green-50'
                : isDark ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              <p className={`text-sm tabular-nums font-bold ${
                product.balance > 0
                  ? 'text-green-500'
                  : isDark ? 'text-gray-600' : 'text-gray-400'
              }`}>
                {formatBalance(product.balance)}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                {product.unit}
              </p>
            </div>
          </div>
        </div>
      </button>

      {/* Korzonka — faqat savatdagi mahsulotlarda */}
      {inCart && onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className={`absolute top-3 right-3 w-7 h-7 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
            isDark
              ? 'bg-red-500/10 hover:bg-red-500/25 text-red-400'
              : 'bg-red-50 hover:bg-red-100 text-red-500'
          }`}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
