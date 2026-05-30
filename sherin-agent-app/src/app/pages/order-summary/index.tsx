import { useState } from 'react';
import { ChevronLeft, Trash2, Plus, Minus, Send, Package, CheckCircle, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { useNavigate } from 'react-router';
import { useCart } from '../../components/CartContext';
import { getProductById } from '../../data/categories';
import BottomNav from '../../components/BottomNav';

export default function OrderSummary() {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();
  const { cartItems, currentClient, submittedOrders, getTotal, removeFromCart, updateQuantity, submitOrder, getTodayOrders } = useCart();
  const [activeTab, setActiveTab] = useState<'current' | 'submitted'>('current');
  const [submitting, setSubmitting] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const translations = {
    uz_latn: {
      orderSummary: "Jami sotish",
      currentOrder: "Joriy buyurtma",
      submittedOrders: "Yuborilgan buyurtmalar",
      total: "Jami",
      submit: "Yuborish",
      empty: "Mahsulot tanlanmagan",
      noOrders: "Bugun yuborilgan buyurtmalar yo'q",
      product: "Mahsulot",
      quantity: "Miqdor",
      price: "Narx",
      sum: "Summa",
      submittedAt: "Yuborilgan vaqt",
      orderNumber: "Buyurtma",
      selectClient: "Klient tanlanmagan",
      kg: "kg",
    },
    uz_cyrl: {
      orderSummary: "Жами сотиш",
      currentOrder: "Жорий буюртма",
      submittedOrders: "Юборилган буюртмалар",
      total: "Жами",
      submit: "Юбориш",
      empty: "Маҳсулот танланмаган",
      noOrders: "Бугун юборилган буюртмалар йўқ",
      product: "Маҳсулот",
      quantity: "Миқдор",
      price: "Нарх",
      sum: "Сумма",
      submittedAt: "Юборилган вақт",
      orderNumber: "Буюртма",
      selectClient: "Клиент танланмаган",
      kg: "кг",
    },
    ru: {
      orderSummary: "Общие продажи",
      currentOrder: "Текущий заказ",
      submittedOrders: "Отправленные заказы",
      total: "Итого",
      submit: "Отправить",
      empty: "Продукты не выбраны",
      noOrders: "Сегодня нет отправленных заказов",
      product: "Продукт",
      quantity: "Количество",
      price: "Цена",
      sum: "Сумма",
      submittedAt: "Отправлено",
      orderNumber: "Заказ",
      selectClient: "Клиент не выбран",
      kg: "кг",
    }
  };

  const t = translations[language];
  const totalAmount = getTotal();
  
  // Get today's orders
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
  const todayOrders = submittedOrders.filter(order => order.date === todayStr);

  const handleSubmit = () => {
    if (cartItems.length === 0 || !currentClient) return;
    setSubmitting(true);
    submitOrder();
    setTimeout(() => {
      setSubmitting(false);
      setActiveTab('submitted');
    }, 1000);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const toggleExpand = (productId: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none !important;
        }
      `}</style>

      <div className="max-w-md mx-auto min-h-screen flex flex-col pb-20">
        {/* Header */}
        <div className={`relative overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900'
            : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          <div className="relative px-5 pt-8 pb-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate('/')}
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <h1 className="text-white text-2xl font-semibold tracking-tight">
                {t.orderSummary}
              </h1>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
              {(['current', 'submitted'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 whitespace-nowrap text-sm font-medium transition-colors relative ${
                    activeTab === tab ? 'text-white' : 'text-white/50'
                  }`}
                >
                  {tab === 'current' ? t.currentOrder : t.submittedOrders}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 py-6 scrollbar-hide overflow-y-auto">
          {activeTab === 'current' && (
            <>
              {!currentClient ? (
                <div className={`rounded-2xl p-12 text-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                  <Package className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                  <p className={`text-base ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.selectClient}</p>
                </div>
              ) : cartItems.length === 0 ? (
                <div className={`rounded-2xl p-12 text-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                  <Package className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                  <p className={`text-base ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.empty}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Client Card with Products */}
                  <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}>
                    {/* Client Header */}
                    <div className="w-full p-4">
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => setExpandedItems(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(-1)) {
                              newSet.delete(-1);
                            } else {
                              newSet.add(-1);
                            }
                            return newSet;
                          })}
                        >
                          <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {currentClient.code || '—'}
                          </p>
                          <h3 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-black'}`}>
                            {currentClient.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Navigate to Visit page with client info
                              navigate('/visit', { 
                                state: { 
                                  client: {
                                    id: currentClient.id,
                                    code: currentClient.code,
                                    name: currentClient.name
                                  }
                                } 
                              });
                            }}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                          >
                            <Edit3 size={18} />
                          </button>
                          <button
                            onClick={() => setExpandedItems(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(-1)) {
                                newSet.delete(-1);
                              } else {
                                newSet.add(-1);
                              }
                              return newSet;
                            })}
                            className="flex items-center justify-center"
                          >
                            {expandedItems.has(-1) ? (
                              <ChevronUp className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            ) : (
                              <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Products List - Expanded View */}
                    {expandedItems.has(-1) && (
                      <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                        {cartItems.map((item) => {
                          const productData = getProductById(item.productId);
                          const product = productData?.product;
                          const category = productData?.category;
                          
                          if (!product) return null;

                          const isProductExpanded = expandedItems.has(item.productId);
                          const itemTotal = item.quantity * item.price;

                          return (
                            <div
                              key={item.productId}
                              className={`rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}
                            >
                              {/* Product Header */}
                              <div
                                onClick={() => toggleExpand(item.productId)}
                                className="w-full p-3 cursor-pointer"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0 mr-3">
                                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                      {category?.name || '—'}
                                    </p>
                                    <h4 className={`font-medium text-sm mb-1 ${isDark ? 'text-white' : 'text-black'}`}>
                                      {product.code} — {product.name}
                                    </h4>
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {product.subtitle || 'Краковкя 0,9'}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeFromCart(item.productId);
                                      }}
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                                        isDark ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'
                                      }`}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                    {isProductExpanded ? (
                                      <ChevronUp className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                    ) : (
                                      <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                    )}
                                  </div>
                                </div>

                                {/* Summary row */}
                                <div className="flex items-center justify-between mt-3">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateQuantity(item.productId, item.quantity - 1);
                                      }}
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                        isDark ? 'bg-gray-900 text-white hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'
                                      }`}
                                    >
                                      <Minus size={16} />
                                    </button>
                                    
                                    <div className="text-center min-w-[50px]">
                                      <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                                        {item.quantity}
                                      </p>
                                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {t.kg}
                                      </p>
                                    </div>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateQuantity(item.productId, item.quantity + 1);
                                      }}
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                        isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-500 text-white hover:bg-blue-600'
                                      }`}
                                    >
                                      <Plus size={16} />
                                    </button>
                                  </div>

                                  <div className="text-right">
                                    <p className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                      {itemTotal.toLocaleString()}
                                    </p>
                                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                      {item.price.toLocaleString()} × {item.quantity}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Product Details - Expanded View */}
                              {isProductExpanded && (
                                <div className={`px-3 pb-3 space-y-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                  <div className="grid grid-cols-3 gap-2 pt-3">
                                    {[1, 5, 10, 25, 50].map(val => (
                                      <button
                                        key={val}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateQuantity(item.productId, val);
                                        }}
                                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                                          item.quantity === val
                                            ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                                            : isDark ? 'bg-gray-900 text-gray-400 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100'
                                        }`}
                                      >
                                        {val}
                                      </button>
                                    ))}
                                  </div>

                                  <div className={`rounded-xl p-3 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                      <div>
                                        <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                          Sklad
                                        </p>
                                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-black'}`}>
                                          {product.balance?.toFixed(1) || '0.0'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                          Narx
                                        </p>
                                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-black'}`}>
                                          {product.price?.toLocaleString() || '0'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                          Jami
                                        </p>
                                        <p className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                          {itemTotal.toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Total Card */}
                  <div className={`rounded-2xl p-5 ${
                    isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-lg font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                        {t.total}
                      </span>
                      <span className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        {totalAmount.toLocaleString()} so'm
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`w-full h-14 rounded-2xl flex items-center justify-center gap-3 transition-all font-semibold text-base ${
                      submitting
                        ? 'bg-green-500 text-white'
                        : isDark 
                          ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98]'
                          : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.98]'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <CheckCircle size={22} />
                        <span>Yuborildi!</span>
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        <span>{t.submit}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'submitted' && (
            <>
              {todayOrders.length === 0 ? (
                <div className={`rounded-2xl p-12 text-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                  <CheckCircle className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                  <p className={`text-base ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t.noOrders}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayOrders.map((order) => {
                    const isExpanded = expandedOrders.has(order.id);
                    
                    // Guard against missing client data
                    if (!order.client) return null;

                    return (
                      <div
                        key={order.id}
                        className={`rounded-2xl overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}
                      >
                        {/* Client Header - Collapsed View */}
                        <div
                          onClick={() => toggleOrderExpand(order.id)}
                          className="w-full p-4 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {order.client?.code || order.id.slice(-6)}
                              </p>
                              <h3 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-black'}`}>
                                {order.client?.name || 'Unknown Client'}
                              </h3>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            ) : (
                              <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            )}
                          </div>
                        </div>

                        {/* Products List - Expanded View */}
                        {isExpanded && (
                          <div className={`px-4 pb-4 space-y-2 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                            {order.items.map((item, idx) => {
                              const productData = getProductById(item.productId);
                              const product = productData?.product;
                              const category = productData?.category;
                              
                              if (!product) return null;

                              const itemTotal = item.quantity * item.price;

                              return (
                                <div
                                  key={idx}
                                  className={`py-3 ${
                                    idx !== order.items.length - 1 
                                      ? `border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`
                                      : ''
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0 mr-3">
                                      <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {category?.name || '—'}
                                      </p>
                                      <h4 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-black'}`}>
                                        {product.code} — {product.name}
                                      </h4>
                                      <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {product.subtitle || 'Краковская 0,9'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="text-center">
                                        <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                                          {item.quantity}
                                        </p>
                                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                          {t.kg}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <p className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                        {itemTotal.toLocaleString()}
                                      </p>
                                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {item.price.toLocaleString()} × {item.quantity}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Total for this order */}
                            <div className={`pt-3 mt-2 border-t flex items-center justify-between ${
                              isDark ? 'border-gray-800' : 'border-gray-200'
                            }`}>
                              <span className={`font-semibold ${isDark ? 'text-white' : 'text-black'}`}>
                                {t.total}
                              </span>
                              <span className={`text-xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                {order.total.toLocaleString()} so'm
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <BottomNav activePage="dostavka" />
      </div>
    </div>
  );
}