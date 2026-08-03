import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { demo } from '../data/demoLimit';
import { api, clearTokens, resetUnauthorizedGuard } from '../api/client';
import { registerAdminWebPush } from '../lib/firebaseMessaging';

export type ProductType = 'kg_dona' | 'dona' | 'kg';

export interface Company {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  description: string;
  agents: number;
  clients: number;
  /** kg_dona / kg → Tarozi; dona → tayyorlanmagan buyurtmalar */
  productType: ProductType;
  /** Ombor sahifasida kiritiladigan sklad nomi */
  warehouseName?: string | null;
}

export function companyShowsTarozi(productType?: ProductType | string | null): boolean {
  return productType !== 'dona';
}

const ALL_COMPANIES: Company[] = [
  {
    id: 'boran',
    name: 'Boran Leaders+ Darveshi Navoiy',
    shortName: 'Boran Leaders+',
    icon: '🏢',
    color: 'from-red-600 to-rose-700',
    description: 'Savdo va distribyutsiya',
    agents: 0,
    clients: 0,
    productType: 'kg_dona',
  },
  {
    id: 'zarafshon',
    name: 'Зарафшон Шерин',
    shortName: 'Зарафшон',
    icon: '🌿',
    color: 'from-blue-500 to-cyan-600',
    description: 'Oziq-ovqat mahsulotlari',
    agents: 0,
    clients: 0,
    productType: 'kg_dona',
  },
  {
    id: 'mipter',
    name: 'Миптер Навоий',
    shortName: 'Миптер',
    icon: '⚡',
    color: 'from-amber-500 to-orange-600',
    description: 'Savdo kompaniyasi',
    agents: 3,
    clients: 87,
    productType: 'kg_dona',
  },
  {
    id: 'navruz',
    name: 'Navruz Savdo Buxoro',
    shortName: 'Navruz Savdo',
    icon: '🌸',
    color: 'from-emerald-500 to-teal-600',
    description: 'Ulgurji savdo',
    agents: 6,
    clients: 195,
    productType: 'kg_dona',
  },
  {
    id: 'sarbon',
    name: 'Sarbon Group Samarqand',
    shortName: 'Sarbon Group',
    icon: '🔷',
    color: 'from-purple-500 to-violet-600',
    description: 'Distribyutsiya markazi',
    agents: 4,
    clients: 103,
    productType: 'kg_dona',
  },
  {
    id: 'atlas',
    name: 'Atlas Trade Farg\'ona',
    shortName: 'Atlas Trade',
    icon: '🌐',
    color: 'from-indigo-500 to-blue-600',
    description: 'Import va savdo',
    agents: 3,
    clients: 76,
    productType: 'kg_dona',
  },
];

export const COMPANIES = demo(ALL_COMPANIES);

interface AdminAuthContextType {
  isLoggedIn: boolean;
  selectedCompany: Company | null;
  adminUser: { name: string; role: string; permissions?: string[] | null } | null;
  login: (username: string, password: string, userData?: { name: string; role: string; permissions?: string[] | null }) => boolean;
  logout: () => void;
  selectCompany: (company: Company) => void;
  clearCompany: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const logged = localStorage.getItem('admin_logged_in') === 'true';
    const hasToken = !!localStorage.getItem('api_access_token');
    if (logged && !hasToken) {
      localStorage.removeItem('admin_logged_in');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_company');
      localStorage.removeItem('admin_company_data');
      return false;
    }
    return logged;
  });
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(() => {
    const savedJson = localStorage.getItem('admin_company_data');
    if (savedJson) {
      try {
        const parsed = JSON.parse(savedJson) as Company;
        if (parsed?.id) {
          return { ...parsed, productType: parsed.productType ?? 'kg_dona' };
        }
      } catch { /* ignore */ }
    }
    const saved = localStorage.getItem('admin_company');
    if (saved) {
      const found = COMPANIES.find(c => c.id === saved);
      return found || null;
    }
    return null;
  });
  const [adminUser, setAdminUser] = useState<{ name: string; role: string; permissions?: string[] | null } | null>(() => {
    const saved = localStorage.getItem('admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (isLoggedIn && localStorage.getItem('api_access_token')) {
      void registerAdminWebPush();
    }
  }, [isLoggedIn]);

  const login = (username: string, password: string, userData?: { name: string; role: string; permissions?: string[] | null }): boolean => {
    resetUnauthorizedGuard();
    if (!userData) return false;
    setIsLoggedIn(true);
    setAdminUser(userData);
    localStorage.setItem('admin_logged_in', 'true');
    localStorage.setItem('admin_user', JSON.stringify(userData));
    return true;
  };

  const logout = () => {
    void api.logout().catch(() => undefined);
    clearTokens();
    setIsLoggedIn(false);
    setAdminUser(null);
    setSelectedCompany(null);
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_company');
    localStorage.removeItem('admin_company_data');
  };

  const selectCompany = (company: Company) => {
    const withType: Company = {
      ...company,
      productType: company.productType ?? 'kg_dona',
    };
    setSelectedCompany(withType);
    localStorage.setItem('admin_company', withType.id);
    localStorage.setItem('admin_company_data', JSON.stringify(withType));
  };

  const clearCompany = () => {
    setSelectedCompany(null);
    localStorage.removeItem('admin_company');
    localStorage.removeItem('admin_company_data');
  };

  return (
    <AdminAuthContext.Provider value={{
      isLoggedIn, selectedCompany, adminUser,
      login, logout, selectCompany, clearCompany,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}