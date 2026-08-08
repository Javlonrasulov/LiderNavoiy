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
  clearLegacyDemoStorage,
  normalizeInn,
} from '../data/clientRequests';
import type { ClientRow } from '../data/adminData';

function hasApiToken(): boolean {
  return !!localStorage.getItem('api_access_token');
}

function mapApiRow(r: ClientRequestItem & Record<string, unknown>): ClientRequestItem {
  const distributor = r.distributor as {
    position?: string | null;
    user?: { fullName?: string; position?: string | null };
  } | undefined;
  const agentName =
    r.agentName
    ?? distributor?.user?.fullName
    ?? null;
  const submitterPosition =
    (r.submitterPosition as string | null | undefined)?.trim()
    || distributor?.position?.trim()
    || distributor?.user?.position?.trim()
    || null;
  return {
    id: r.id,
    status: (r.status as ClientRequestItem['status']) ?? 'pending',
    requestType: (r.requestType as ClientRequestItem['requestType']) ?? 'create',
    targetClientId: (r.targetClientId as string | null | undefined) ?? null,
    name: r.name,
    fullName: r.fullName ?? r.name,
    phone: r.phone ?? null,
    address: r.address ?? null,
    companyId: r.companyId ?? null,
    lineCode: r.lineCode ?? null,
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    category: r.category ?? null,
    inn: r.inn ?? null,
    contactPerson: r.contactPerson ?? null,
    territory: r.territory ?? null,
    clientClass: r.clientClass ?? null,
    priceCategory: r.priceCategory ?? null,
    photoUrl: r.photoUrl ?? null,
    canSeePromotions: r.canSeePromotions === true,
    agentName,
    submitterPosition,
    note: r.note ?? null,
    previousSnapshot: (r.previousSnapshot as ClientRequestItem['previousSnapshot']) ?? null,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    distributor: r.distributor ?? null,
  };
}

interface ClientRequestContextValue {
  pending: ClientRequestItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  checkInn: (
    inn: string | null | undefined,
    requestId?: string,
    existingClients?: ClientRow[],
    excludeClientId?: string | null,
  ) => InnCheckResult;
  approve: (id: string, companyId?: string, existingClients?: ClientRow[]) => Promise<boolean>;
  reject: (id: string) => Promise<void>;
}

const ClientRequestContext = createContext<ClientRequestContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
  companyId?: string;
}

export function ClientRequestProvider({ children, companyId }: ProviderProps) {
  const [pending, setPending] = useState<ClientRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clearLegacyDemoStorage();
  }, []);

  const refresh = useCallback(async () => {
    if (!hasApiToken()) {
      setPending([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await api.getClientRequests(companyId);
      setPending(
        rows
          .filter(r => r.status === 'pending')
          .map(r => mapApiRow(r as ClientRequestItem & Record<string, unknown>)),
      );
    } catch (e) {
      setPending([]);
      setError(e instanceof Error ? e.message : 'So\'rovlarni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
  }, [refresh]);

  const checkInn = useCallback((
    inn: string | null | undefined,
    requestId?: string,
    existingClients: ClientRow[] = [],
    excludeClientId?: string | null,
  ): InnCheckResult => {
    const normalized = normalizeInn(inn);
    if (!normalized) {
      return { inn: null, duplicate: false };
    }

    const existingClient = existingClients.find(
      c =>
        normalizeInn(c.inn) === normalized &&
        String(c.id) !== String(excludeClientId ?? ''),
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
    await api.rejectClientRequest(id);
    await refresh();
  }, [refresh]);

  const approve = useCallback(async (
    id: string,
    _companyId?: string,
    existingClients: ClientRow[] = [],
  ): Promise<boolean> => {
    const item = pending.find(r => r.id === id);
    if (!item) return false;

    const dup = checkInn(
      item.inn,
      id,
      existingClients,
      item.requestType === 'update' ? item.targetClientId : null,
    );
    if (dup.duplicate) return false;

    await api.approveClientRequest(id);
    window.dispatchEvent(new CustomEvent('lider:client-approved'));
    await refresh();
    return true;
  }, [pending, checkInn, refresh]);

  const value = useMemo(() => ({
    pending,
    loading,
    error,
    refresh,
    checkInn,
    approve,
    reject,
  }), [pending, loading, error, refresh, checkInn, approve, reject]);

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
