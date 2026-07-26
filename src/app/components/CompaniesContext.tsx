import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, type BackendCompany } from '../api/client';
import { COMPANIES, type Company, type ProductType } from './AdminAuthContext';

function mapCompany(row: BackendCompany): Company {
  return {
    id: row.id,
    name: row.name,
    shortName: row.shortName ?? row.name,
    icon: row.icon ?? '🏢',
    color: row.color ?? 'from-indigo-500 to-blue-600',
    description: row.description ?? '',
    agents: row.agents,
    clients: row.clients,
    productType: (row.productType as ProductType) || 'kg_dona',
    warehouseName: row.warehouseName ?? null,
  };
}

interface CompaniesContextValue {
  companies: Company[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CompaniesContext = createContext<CompaniesContextValue | null>(null);

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>(COMPANIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!localStorage.getItem('api_access_token')) {
      setCompanies(COMPANIES.map(c => ({ ...c, agents: 0, clients: 0 })));
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await api.getCompanies();
      if (rows.length > 0) {
        setCompanies(rows.map(mapCompany));
      } else {
        setCompanies(COMPANIES.map(c => ({ ...c, agents: 0, clients: 0 })));
      }
    } catch (e) {
      setCompanies(COMPANIES.map(c => ({ ...c, agents: 0, clients: 0 })));
      setError(e instanceof Error ? e.message : 'Tashkilotlarni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const onAuth = () => { refresh(); };
    window.addEventListener('lider:auth-changed', onAuth);
    return () => window.removeEventListener('lider:auth-changed', onAuth);
  }, []);

  return (
    <CompaniesContext.Provider value={{ companies, loading, error, refresh }}>
      {children}
    </CompaniesContext.Provider>
  );
}

export function useCompanies() {
  const ctx = useContext(CompaniesContext);
  if (!ctx) throw new Error('useCompanies must be used within CompaniesProvider');
  return ctx;
}
