import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Company {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  description: string;
  agents: number;
  clients: number;
}

export const COMPANIES: Company[] = [
  {
    id: 'boran',
    name: 'Boran Leaders+ Darveshi Navoiy',
    shortName: 'Boran Leaders+',
    icon: '🏢',
    color: 'from-red-600 to-rose-700',
    description: 'Savdo va distribyutsiya',
    agents: 5,
    clients: 138,
  },
  {
    id: 'zarafshon',
    name: 'Зарафшон Шерин',
    shortName: 'Зарафшон',
    icon: '🌿',
    color: 'from-blue-500 to-cyan-600',
    description: 'Oziq-ovqat mahsulotlari',
    agents: 4,
    clients: 112,
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
  },
];

interface AdminAuthContextType {
  isLoggedIn: boolean;
  selectedCompany: Company | null;
  adminUser: { name: string; role: string } | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  selectCompany: (company: Company) => void;
  clearCompany: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_CREDENTIALS = [
  { username: 'admin', password: 'admin123', name: 'Super Admin', role: 'Bosh administrator' },
  { username: 'manager', password: 'manager123', name: 'Mansur Toshev', role: 'Menejer' },
];

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('admin_logged_in') === 'true';
  });
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(() => {
    const saved = localStorage.getItem('admin_company');
    if (saved) {
      const found = COMPANIES.find(c => c.id === saved);
      return found || null;
    }
    return null;
  });
  const [adminUser, setAdminUser] = useState<{ name: string; role: string } | null>(() => {
    const saved = localStorage.getItem('admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (username: string, password: string): boolean => {
    const user = ADMIN_CREDENTIALS.find(
      c => c.username === username && c.password === password
    );
    if (user) {
      const userData = { name: user.name, role: user.role };
      setIsLoggedIn(true);
      setAdminUser(userData);
      localStorage.setItem('admin_logged_in', 'true');
      localStorage.setItem('admin_user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
    setAdminUser(null);
    setSelectedCompany(null);
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_company');
  };

  const selectCompany = (company: Company) => {
    setSelectedCompany(company);
    localStorage.setItem('admin_company', company.id);
  };

  const clearCompany = () => {
    setSelectedCompany(null);
    localStorage.removeItem('admin_company');
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