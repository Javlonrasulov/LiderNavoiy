import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import {
  type ClientRequestItem,
  type InnCheckResult,
  loadApprovedDemoClients,
  loadDemoRequests,
  normalizeInn,
  requestToClientRow,
  saveApprovedDemoClients,
  saveDemoRequests,
} from '../data/clientRequests';
import type { ClientRow } from '../data/adminData';

function hasApiToken(): boolean {
  return !!localStorage.getItem('api_access_token');
}

function mapApiRow(r: ClientRequestItem & Record<string, unknown>): ClientRequestItem {
  const agentName =
    r.agentName
    ?? (r.distributor as { user?: { fullName?: string } } | undefined)?.user?.fullName
    ?? null;
  return {
    ...r,
    agentName,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
  };
}

interface ClientRequestContextValue {
  pending: ClientRequestItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  checkInn: (inn: string | null | undefined, requestId?: string, existingClients?: ClientRow[]) => InnCheckResult;
  approve: (id: string, companyId?: string, existingClients?: ClientRow[]) => Promise<boolean>;
  reject: (id: string) => Promise<void>;
  onClientApproved?: () => void;
  setOnClientApproved: (fn: (() => void) | undefined) => void;
}

const ClientRequestContext = createContext<ClientRequestContextValue | null>(null);

export function ClientRequestProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ClientRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [onClientApproved, setOnClientApproved] = useState<(() => void) | undefined>();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (hasApiToken()) {
        const rows = await api.getClientRequests();
        setPending(rows.filter(r => r.status === 'pending').map(mapApiRow));
      } else {
        setPending(loadDemoRequests().filter(r => r.status === 'pending'));
      }
    } catch {
      setPending(loadDemoRequests().filter(r => r.status === 'pending'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  const checkInn = useCallback((
    inn: string | null | undefined,
    requestId?: string,
    existingClients: ClientRow[] = [],
  ): InnCheckResult => {
    const normalized = normalizeInn(inn);
    if (!normalized) {
      return { inn: null, duplicate: false };
    }

    const existingClient = existingClients.find(
      c => normalizeInn(c.inn) === normalized,
    );
    if (existingClient) {
      return {
        inn: normalized,
        duplicate: true,
        reason: 'client_exists',
        existingClient: {
          id: String(existingClient.id),
          name: existingClient.name,
          inn: existingClient.inn,
        },
      };
    }

    const existingRequest = pending.find(
      r => r.id !== requestId && normalizeInn(r.inn) === normalized,
    );
    if (existingRequest) {
      return {
        inn: normalized,
        duplicate: true,
        reason: 'request_exists',
        existingRequest: {
          id: existingRequest.id,
          name: existingRequest.name,
          inn: existingRequest.inn ?? null,
        },
      };
    }

    return { inn: normalized, duplicate: false };
  }, [pending]);

  const reject = useCallback(async (id: string) => {
    if (hasApiToken()) {
      await api.rejectClientRequest(id);
    } else {
      const all = loadDemoRequests();
      saveDemoRequests(
        all.map(r => r.id === id
          ? { ...r, status: 'rejected' as const }
          : r),
      );
    }
    await refresh();
  }, [refresh]);

  const approve = useCallback(async (
    id: string,
    companyId?: string,
    existingClients: ClientRow[] = [],
  ): Promise<boolean> => {
    const item = pending.find(r => r.id === id);
    if (!item) return false;

    const dup = checkInn(item.inn, id, existingClients);
    if (dup.duplicate) return false;

    if (hasApiToken()) {
      await api.approveClientRequest(id);
      onClientApproved?.();
      window.dispatchEvent(new CustomEvent('lider:client-approved'));
    } else {
      const row = requestToClientRow(item);
      const stored = loadApprovedDemoClients();
      saveApprovedDemoClients([...stored, row]);
      const all = loadDemoRequests();
      saveDemoRequests(
        all.map(r => r.id === id
          ? { ...r, status: 'approved' as const }
          : r),
      );
      onClientApproved?.();
      window.dispatchEvent(new CustomEvent('lider:client-approved'));
    }
    await refresh();
    return true;
  }, [pending, checkInn, onClientApproved, refresh]);

  const value = useMemo(() => ({
    pending,
    loading,
    refresh,
    checkInn,
    approve,
    reject,
    onClientApproved,
    setOnClientApproved,
  }), [pending, loading, refresh, checkInn, approve, reject, onClientApproved]);

  return (
    <ClientRequestContext.Provider value={value}>
      {children}
    </ClientRequestContext.Provider>
  );
}

export function useClientRequests() {
  const ctx = useContext(ClientRequestContext);
  if (!ctx) throw new Error('useClientRequests must be used within ClientRequestProvider');
  return ctx;
}
