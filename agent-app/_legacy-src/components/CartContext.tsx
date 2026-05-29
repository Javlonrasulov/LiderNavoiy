import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  productId: number;
  quantity: number;
  price: number;
  categoryId: string | number;
}

export interface ClientInfo {
  id: number;
  name: string;
  code?: string;
}

export interface SubmittedOrder {
  id: string;
  items: CartItem[];
  total: number;
  timestamp: number;
  date: string;
  client: ClientInfo;
}

export interface Payment {
  id: string;
  clientId: number;
  amount: number;
  timestamp: number;
  date: string;
  note?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  currentClient: ClientInfo | null;
  submittedOrders: SubmittedOrder[];
  payments: Payment[];
  addToCart: (item: CartItem) => void;
  getCategoryTotal: (categoryId: string | number) => number;
  getProductQty: (productId: number) => number;
  getTotal: () => number;
  clearCart: () => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  submitOrder: () => void;
  getTodayOrders: () => SubmittedOrder[];
  setCurrentClient: (client: ClientInfo | null) => void;
  addPayment: (clientId: number, amount: number, note?: string) => void;
  getClientOrders: (clientId: number) => SubmittedOrder[];
  getClientPayments: (clientId: number) => Payment[];
  getClientBalance: (clientId: number) => number;
}

const CartContext = createContext<CartContextType>({
  cartItems: [],
  currentClient: null,
  submittedOrders: [],
  payments: [],
  addToCart: () => {},
  getCategoryTotal: () => 0,
  getProductQty: () => 0,
  getTotal: () => 0,
  clearCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  submitOrder: () => {},
  getTodayOrders: () => [],
  setCurrentClient: () => {},
  addPayment: () => {},
  getClientOrders: () => [],
  getClientPayments: () => [],
  getClientBalance: () => 0,
});

const STORAGE_KEY = 'crm_cart_items';
const ORDERS_STORAGE_KEY = 'crm_submitted_orders';
const CLIENT_STORAGE_KEY = 'crm_current_client';
const PAYMENTS_STORAGE_KEY = 'crm_payments';

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentClient, setCurrentClient] = useState<ClientInfo | null>(() => {
    try {
      const saved = localStorage.getItem(CLIENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [submittedOrders, setSubmittedOrders] = useState<SubmittedOrder[]>(() => {
    try {
      const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    try {
      const saved = localStorage.getItem(PAYMENTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(currentClient));
  }, [currentClient]);

  useEffect(() => {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(submittedOrders));
  }, [submittedOrders]);

  useEffect(() => {
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
  }, [payments]);

  const addToCart = (item: CartItem) => {
    setCartItems(prev => {
      const existing = prev.findIndex(i => i.productId === item.productId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = item;
        return updated;
      }
      return [...prev, item];
    });
  };

  const getCategoryTotal = (categoryId: string | number) => {
    return cartItems
      .filter(i => String(i.categoryId) === String(categoryId))
      .reduce((sum, i) => sum + i.quantity * i.price, 0);
  };

  const getProductQty = (productId: number) => {
    return cartItems.find(i => i.productId === productId)?.quantity ?? 0;
  };

  const getTotal = () => {
    return cartItems.reduce((sum, i) => sum + i.quantity * i.price, 0);
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const removeFromCart = (productId: number) => {
    setCartItems(prev => prev.filter(i => i.productId !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prev => {
      const existing = prev.findIndex(i => i.productId === productId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity };
        return updated;
      }
      return prev;
    });
  };

  const submitOrder = () => {
    if (cartItems.length === 0 || !currentClient) return;
    
    const now = new Date();
    const order: SubmittedOrder = {
      id: `order-${Date.now()}`,
      items: [...cartItems],
      total: getTotal(),
      timestamp: Date.now(),
      date: `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`,
      client: { ...currentClient },
    };
    
    setSubmittedOrders(prev => [order, ...prev]);
    clearCart();
  };

  const getTodayOrders = () => {
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    return submittedOrders.filter(order => order.date === todayStr);
  };

  const addPayment = (clientId: number, amount: number, note?: string) => {
    const now = new Date();
    const payment: Payment = {
      id: `payment-${Date.now()}`,
      clientId,
      amount,
      timestamp: Date.now(),
      date: `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`,
      note,
    };
    
    setPayments(prev => [payment, ...prev]);
  };

  const getClientOrders = (clientId: number) => {
    return submittedOrders.filter(order => order.client && order.client.id === clientId);
  };

  const getClientPayments = (clientId: number) => {
    return payments.filter(payment => payment.clientId === clientId);
  };

  const getClientBalance = (clientId: number) => {
    const ordersTotal = getClientOrders(clientId).reduce((sum, order) => sum + order.total, 0);
    const paymentsTotal = getClientPayments(clientId).reduce((sum, payment) => sum + payment.amount, 0);
    return ordersTotal - paymentsTotal;
  };

  return (
    <CartContext.Provider value={{ 
      cartItems, 
      currentClient,
      submittedOrders,
      payments,
      addToCart, 
      getCategoryTotal, 
      getProductQty,
      getTotal,
      clearCart,
      removeFromCart,
      updateQuantity,
      submitOrder,
      getTodayOrders,
      setCurrentClient,
      addPayment,
      getClientOrders,
      getClientPayments,
      getClientBalance,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);