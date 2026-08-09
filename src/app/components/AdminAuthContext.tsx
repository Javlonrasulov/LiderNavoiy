import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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
  /** Agent/dostavkachi mijoz qo‘sha oladimi (default false) */
  agentsCanAddClients?: boolean;
  /** true — manager/agent tasdiqsiz qo‘shadi; false — admin tasdigi kerak */
  clientsAddWithoutApproval?: boolean;
}

export function companyShowsTarozi(productType?: ProductType | string | null): boolean {
  return productType !== 'dona';
}

/** @deprecated Hardcoded ro‘yxat olib tashlandi — useCompanies() ishlatilsin */
export const COMPANIES: Company[] = [];

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
    // Faqat to‘liq company JSON saqlangan bo‘lsa tiklanadi (hardcoded fallback yo‘q)
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
      agentsCanAddClients: !!company.agentsCanAddClients,
      clientsAddWithoutApproval: !!company.clientsAddWithoutApproval,
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