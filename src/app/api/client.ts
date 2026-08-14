/**
 * Backend API client for Admin Panel
 * Set VITE_API_URL in .env (default: http://localhost:3000/api/v1)
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

function resolveWsBase(): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicit) return String(explicit).replace(/\/$/, '');
  const fromApi = String(API_BASE).replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '');
  if (fromApi.startsWith('http://') || fromApi.startsWith('https://')) return fromApi;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

const WS_BASE = resolveWsBase();
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: string;
    position?: string | null;
    permissions?: string[] | null;
    distributorId?: string;
    companyName?: string;
  };
}

export interface SystemUserRecord {
  id: string;
  username: string;
  fullName: string;
  role: string;
  position: string | null;
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  isProtected: boolean;
}

export interface AppUserDeviceRecord {
  brand: string | null;
  model: string | null;
  os: string | null;
  lastLoginAt: string;
}

export interface AppUserRecord {
  id: string;
  username: string;
  fullName: string;
  role: string;
  position?: string | null;
  positionId?: string | null;
  department?: string | null;
  departmentId?: string | null;
  isActive: boolean;
  companyId?: string | null;
  companyName?: string | null;
  companyIds?: string[];
  lastLoginAt?: string | null;
  lastActiveAt?: string | null;
  isOnline?: boolean;
  lastDeviceBrand?: string | null;
  lastDeviceModel?: string | null;
  lastDeviceOs?: string | null;
  devices?: AppUserDeviceRecord[];
  canAddClients?: boolean;
}

export type PositionAppAccess = 'agent' | 'delivery' | 'manager';

export interface BackendDepartment {
  id: string;
  code: number;
  name: string;
  isActive: boolean;
}

export interface BackendStaffPosition {
  id: string;
  code: number;
  name: string;
  appAccess: PositionAppAccess;
  isActive: boolean;
}

export interface Distributor {
  id: string;
  userId: string;
  companyId: string | null;
  companyName: string | null;
  lineCode: string | null;
  phone: string | null;
  position?: string | null;
  status: string;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastLocationAt: string | null;
  isOnline: boolean;
  user?: {
    fullName: string;
    username: string;
    role?: string;
    isActive?: boolean;
    lastLoginAt?: string | null;
  };
}

export interface BackendCompany {
  id: string;
  name: string;
  shortName: string | null;
  icon: string | null;
  color: string | null;
  imageUrl?: string | null;
  description: string | null;
  productType?: 'kg_dona' | 'dona' | 'kg' | null;
  warehouseName?: string | null;
  agentsCanAddClients?: boolean;
  clientsAddWithoutApproval?: boolean;
  agents: number;
  clients: number;
}

export interface AdminDashboardData {
  kpi: {
    sales: number;
    payments: number;
    debt: number;
    plan: number;
    planPct: number;
    salesTrend: number;
    paymentsTrend: number;
    debtTrend: number;
    planTrend: number;
  };
  clientCategories: { name: string; value: number; color: string }[];
  topAgents: {
    distributorId: string;
    name: string;
    avatar: string;
    sales: number;
    plan: number;
    planPct: number;
    orgId: string;
    status: string;
  }[];
  employeeLocations: {
    distributorId: string;
    name: string;
    avatar: string;
    role: 'agent' | 'delivery';
    online: boolean;
    lastSeen: string;
    lat: number;
    lng: number;
    orgId: string;
  }[];
  salesChart: {
    day: { month: string; sales: number; payments: number }[];
    week: { month: string; sales: number; payments: number }[];
    month: { month: string; sales: number; payments: number }[];
  };
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  speed?: number;
  accuracy?: number;
  recordedAt: string;
}

export interface Client {
  id: string;
  code: string;
  onTradeId?: string | null;
  name: string;
  fullName?: string | null;
  phone?: string | null;
  address: string | null;
  companyId?: string | null;
  linkedCompanyIds?: string[];
  lineCode?: string | null;
  balance: string | number;
  /** Buyurtmalar soni (bekor/draftsiz) */
  ordersCount?: number;
  /** Savdo summasi (total - returned) */
  totalSales?: number;
  /** Oxirgi buyurtma vaqti (ISO) */
  lastOrderAt?: string | null;
  /** Tovar miqdori (qty sum) */
  goodsQty?: number;
  /** Tovar vazni (actualQuantity yoki qty) */
  goodsWeight?: number;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt?: string | null;
  locationUpdatedById?: string | null;
  locationUpdatedByName?: string | null;
  category?: string | null;
  distributorId?: string | null;
  inn?: string | null;
  contactPerson?: string | null;
  territory?: string | null;
  photoUrl?: string | null;
  clientClass?: string | null;
  priceCategory?: string | null;
  isActive?: boolean;
  canSeePromotions?: boolean;
  /** Manager belgi: green | yellow | red */
  markColor?: string | null;
  extraPhones?: { phone: string; note?: string }[];
  createdAt?: string;
  createdById?: string | null;
  createdByName?: string | null;
  deletedAt?: string | null;
  deletedById?: string | null;
  deletedByName?: string | null;
  updatedAt?: string;
  distributor?: {
    id: string;
    user?: { fullName: string };
  } | null;
}

export type BackendClient = Client;

export interface ClientStatsProduct {
  id: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
  total: number;
  trend: number;
  buyLevel: 'top' | 'avg' | 'none';
}

export interface ClientStatsCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  totalSum: number;
  totalKg: number;
  avgPrice: number;
  share: number;
  trend: number;
  weekly: { label: string; value: number }[];
  products: ClientStatsProduct[];
}

export interface ClientStatsResponse {
  clientId: string;
  period: string;
  from: string;
  to: string;
  totalSum: number;
  totalKg: number;
  monthlyTrend: { label: string; year: number; month: number; value: number }[];
  categories: ClientStatsCategory[];
}

export interface BackendOrderItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  unit: string;
  isFree?: boolean;
  promotionId?: string;
  actualQuantity?: number | null;
}

export interface BackendOrderItemChange {
  productId: string;
  productCode?: string;
  productName: string;
  change: 'added' | 'removed' | 'qty_changed';
  beforeQty?: number;
  afterQty?: number;
  beforePrice?: number;
  afterPrice?: number;
}

export interface BackendOrderAudit {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  summary?: string | null;
  itemChanges?: BackendOrderItemChange[];
  meta?: Record<string, unknown> | null;
  createdAt: string;
}

export interface BackendOrder {
  id: string;
  clientId: string;
  distributorId: string;
  deliveryDistributorId?: string | null;
  visitId?: string | null;
  status: string;
  source?: string;
  totalAmount: number;
  items: BackendOrderItem[];
  isOfflineCreated: boolean;
  isUrgent?: boolean;
  offlineId?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    code: string;
    name: string;
    companyId: string | null;
    lineCode: string | null;
    clientClass: string | null;
    category: string | null;
    address?: string | null;
    phone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  agentName?: string | null;
  deliveryName?: string | null;
  companyName?: string | null;
  audit?: BackendOrderAudit[];
}

export interface BankUsdRate {
  buy: number;
  sell: number;
}

export interface UsdExchangeRates {
  cbu: { rate: number; date: string };
  banks: {
    hamkorbank: BankUsdRate;
    ipoteka: BankUsdRate;
    agrobank: BankUsdRate;
  };
  fetchedAt: { date: string; time: string; timezone: 'Asia/Tashkent' };
  updatedAt: string;
}

export interface TashkentTimeInfo {
  timezone: 'Asia/Tashkent';
  date: string;
  time: string;
  timestamp: string;
}

function getToken(): string | null {
  return localStorage.getItem('api_access_token');
}

/** Access token only — refresh lives in HttpOnly cookie */
export function setTokens(access: string, _refresh?: string) {
  localStorage.setItem('api_access_token', access);
  localStorage.removeItem('api_refresh_token');
}

export function clearTokens() {
  localStorage.removeItem('api_access_token');
  localStorage.removeItem('api_refresh_token');
  localStorage.removeItem('api_user_id');
}

let unauthorizedNotified = false;
let refreshInFlight: Promise<boolean> | null = null;

/** Login muvaffaqiyatli bo‘lganda qayta ishlatish uchun */
export function resetUnauthorizedGuard() {
  unauthorizedNotified = false;
}

export function notifyUnauthorized() {
  if (unauthorizedNotified) return;
  unauthorizedNotified = true;
  clearTokens();
  window.dispatchEvent(new CustomEvent('lider:unauthorized'));
}

async function tryRefreshTokens(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as AuthResponse;
      if (!data.accessToken) return false;
      setTokens(data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  didRefresh = false,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'AbortError' || name === 'TimeoutError') {
      throw new Error('timeout');
    }
    throw new Error(`Backend ulanmagan (${API_BASE})`);
  }

  const isAuthPath =
    path.includes('/auth/login') || path.includes('/auth/refresh');

  if (res.status === 401 && !isAuthPath && !didRefresh) {
    const ok = await tryRefreshTokens();
    if (ok) {
      return request<T>(path, options, true);
    }
    notifyUnauthorized();
    throw new Error('HTTP 401: Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg = err.message;
    const text = Array.isArray(msg) ? msg.join(', ') : (msg || res.statusText);
    if (res.status === 401 && !isAuthPath) {
      notifyUnauthorized();
    }
    throw new Error(text ? `HTTP ${res.status}: ${text}` : `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const raw = await res.text();
  if (!raw.trim()) return undefined as T;
  return JSON.parse(raw) as T;
}

// ─── Auth ───
export const api = {
  login: (username: string, password: string, init?: RequestInit) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      ...init,
    }),

  logout: (all = false) =>
    request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ all }),
    }),

  getSessions: () =>
    request<
      Array<{
        id: string;
        brand: string | null;
        model: string | null;
        os: string | null;
        ip: string | null;
        userAgent: string | null;
        createdAt: string;
        lastSeenAt: string;
        current: boolean;
      }>
    >('/auth/sessions'),

  revokeSession: (id: string) =>
    request<void>(`/auth/sessions/${id}`, { method: 'DELETE' }),

  getUsdExchangeRates: () => request<UsdExchangeRates>('/exchange-rates/usd'),

  getTashkentTime: () => request<TashkentTimeInfo>('/health/time'),

  getCompanies: () => request<BackendCompany[]>('/companies'),

  getDepartments: () => request<BackendDepartment[]>('/departments'),

  createDepartment: (body: { code?: number; name: string }) =>
    request<BackendDepartment>('/departments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateDepartment: (id: string, body: { code?: number; name?: string; isActive?: boolean }) =>
    request<BackendDepartment>(`/departments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteDepartment: (id: string) =>
    request<{ ok: boolean }>(`/departments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getPositions: () => request<BackendStaffPosition[]>('/positions'),

  createPosition: (body: {
    code?: number;
    name: string;
    appAccess: PositionAppAccess;
  }) =>
    request<BackendStaffPosition>('/positions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updatePosition: (
    id: string,
    body: {
      code?: number;
      name?: string;
      appAccess?: PositionAppAccess;
      isActive?: boolean;
    },
  ) =>
    request<BackendStaffPosition>(`/positions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deletePosition: (id: string) =>
    request<{ ok: boolean }>(`/positions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  createCompany: (body: {
    name: string;
    shortName?: string;
    icon?: string;
    color?: string;
    imageUrl?: string | null;
    description?: string;
    productType?: 'kg_dona' | 'dona' | 'kg';
    agentsCanAddClients?: boolean;
    clientsAddWithoutApproval?: boolean;
  }) =>
    request<BackendCompany>('/companies', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateCompany: (
    id: string,
    body: {
      name?: string;
      shortName?: string;
      icon?: string;
      color?: string;
      imageUrl?: string | null;
      description?: string;
      productType?: 'kg_dona' | 'dona' | 'kg';
      warehouseName?: string | null;
      agentsCanAddClients?: boolean;
      clientsAddWithoutApproval?: boolean;
    },
  ) =>
    request<BackendCompany>(`/companies/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  uploadCompanyImage: (dataUrl: string) =>
    request<{ url: string; fullUrl: string; mimeType: string; fileSize: number }>(
      '/companies/upload-image',
      { method: 'POST', body: JSON.stringify({ dataUrl }) },
    ),

  // ─── App users (APK login) ───
  listAppUsers: () => request<AppUserRecord[]>('/users/app'),

  createAppUser: (body: {
    username: string;
    password: string;
    fullName: string;
    role?: string;
    companyName?: string;
    companyId?: string;
    companyIds?: string[];
    isActive?: boolean;
    phone?: string;
    position?: string;
    positionId?: string;
    department?: string;
    departmentId?: string;
    canAddClients?: boolean;
  }) =>
    request<AppUserRecord>('/users/app', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateAppUser: (id: string, body: {
    username?: string;
    password?: string;
    fullName?: string;
    role?: string;
    isActive?: boolean;
    companyName?: string;
    companyId?: string;
    companyIds?: string[];
    phone?: string;
    position?: string;
    positionId?: string;
    department?: string;
    departmentId?: string;
    canAddClients?: boolean;
  }) =>
    request<AppUserRecord>(`/users/app/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deactivateAppUser: (id: string) =>
    request<void>(`/users/app/${id}`, { method: 'DELETE' }),

  // ─── System users (admin panel) ───
  listSystemUsers: () => request<SystemUserRecord[]>('/users/system'),

  createSystemUser: (body: {
    username: string;
    password: string;
    fullName: string;
    position?: string;
    role?: string;
    permissions?: string[];
    isActive?: boolean;
  }) =>
    request<SystemUserRecord>('/users/system', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateSystemUser: (id: string, body: {
    username?: string;
    password?: string;
    fullName?: string;
    position?: string;
    role?: string;
    permissions?: string[];
    isActive?: boolean;
  }) =>
    request<SystemUserRecord>(`/users/system/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deactivateSystemUser: (id: string) =>
    request<void>(`/users/system/${id}`, { method: 'DELETE' }),

  // ─── Distributors ───
  getDistributors: (companyId?: string) =>
    request<Distributor[]>(`/distributors${companyId ? `?companyId=${companyId}` : ''}`),

  getOnlineDistributors: () => request<string[]>('/distributors/online'),

  updateDistributorStatus: (id: string, status: string) =>
    request<Distributor>(`/distributors/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updateDistributor: (id: string, body: { phone?: string; position?: string; lineCode?: string }) =>
    request<Distributor>(`/distributors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // ─── GPS ───
  getLastLocation: (distributorId: string) =>
    request<LocationPoint>(`/gps/location/last`),

  getRouteHistory: (distributorId: string, date?: string) =>
    request<{ points: LocationPoint[]; pointCount: number }>(
      `/gps/route/${distributorId}${date ? `?date=${date}` : ''}`,
    ),

  getDailyRoute: (distributorId: string, date: string) =>
    request<{
      date: string;
      distributorId: string;
      pointCount: number;
      stats: {
        totalDistanceKm: number;
        avgSpeed: number;
        maxSpeed: number;
        durationMinutes: number;
      };
      points: LocationPoint[];
    }>(`/routes/${distributorId}/daily?date=${date}`),

  getVisitsForDistributor: (distributorId: string, date: string) =>
    request<Array<{
      id: string;
      distributorId: string;
      clientId: string;
      visitedAt: string;
      checkInLatitude: number | null;
      checkInLongitude: number | null;
      orderTotal: number;
      notes: string | null;
      status: string;
      clientName: string;
      clientCode: string;
      clientAddress: string | null;
      clientLatitude: number | null;
      clientLongitude: number | null;
      fromClientOrder: boolean;
      orderSource?: string | null;
    }>>(`/visits/admin?distributorId=${encodeURIComponent(distributorId)}&date=${encodeURIComponent(date)}`),

  getVisitsForDistributorRange: (distributorId: string, from: string, to: string) =>
    request<Array<{
      id: string;
      distributorId: string;
      clientId: string;
      visitedAt: string;
      checkInLatitude: number | null;
      checkInLongitude: number | null;
      orderTotal: number;
      notes: string | null;
      status: string;
      clientName: string;
      clientCode: string;
      clientAddress: string | null;
      clientLatitude: number | null;
      clientLongitude: number | null;
      fromClientOrder: boolean;
      orderSource?: string | null;
    }>>(
      `/visits/admin?distributorId=${encodeURIComponent(distributorId)}` +
        `&from=${encodeURIComponent(`${from}T00:00:00+05:00`)}` +
        `&to=${encodeURIComponent(`${to}T23:59:59.999+05:00`)}`,
    ),

  getNearbyClients: (lat: number, lng: number, radius = 500) =>
    request<Client[]>(`/gps/nearby-clients?latitude=${lat}&longitude=${lng}&radiusMeters=${radius}`),

  // ─── Clients ───
  getClients: (companyId?: string, distributorId?: string, lineCode?: string) => {
    const q = new URLSearchParams();
    if (companyId) q.set('companyId', companyId);
    if (distributorId) q.set('distributorId', distributorId);
    if (lineCode) q.set('lineCode', lineCode);
    const qs = q.toString();
    return request<Client[]>(`/clients${qs ? `?${qs}` : ''}`);
  },

  getTrashClients: (companyId?: string) => {
    const q = new URLSearchParams();
    if (companyId) q.set('companyId', companyId);
    const qs = q.toString();
    return request<Client[]>(`/clients/trash${qs ? `?${qs}` : ''}`);
  },

  deleteClient: (id: string) =>
    request<{ ok: boolean; id: string }>(`/clients/${id}`, { method: 'DELETE' }),

  deleteClientsBulk: (clientIds: string[]) =>
    request<{ deletedCount: number; results: { id: string; ok: boolean }[] }>(
      '/clients/trash/bulk',
      { method: 'POST', body: JSON.stringify({ clientIds }) },
    ),

  restoreClient: (id: string) =>
    request<Client>(`/clients/${id}/restore`, { method: 'POST' }),

  getClient: (id: string) => request<Client>(`/clients/${id}`),

  searchClients: (q: string) => request<Client[]>(`/clients/search?q=${encodeURIComponent(q)}`),

  assignLineDistributor: (lineCode: string, distributorId: string | null) =>
    request<{ updated: number }>('/clients/assign-line-distributor', {
      method: 'POST',
      body: JSON.stringify({ lineCode, distributorId }),
    }),

  uploadClientPhoto: async (file: File | Blob, filename = 'photo.jpg'): Promise<{ url: string; fullUrl?: string }> => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file, filename);
    const res = await fetch(`${API_BASE.replace(/\/$/, '')}/clients/upload-photo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  createClient: (body: {
    code?: string;
    name: string;
    fullName?: string;
    phone?: string;
    address?: string;
    companyId?: string;
    companyIds?: string[];
    lineCode?: string;
    latitude?: number;
    longitude?: number;
    category?: string;
    distributorId?: string;
    inn?: string;
    contactPerson?: string;
    territory?: string;
    photoUrl?: string;
    clientClass?: string;
    priceCategory?: string;
    isActive?: boolean;
    extraPhones?: { phone: string; note?: string }[];
    onTradeId?: string;
    appUsername?: string;
    appPassword?: string;
  }) =>
    request<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateClient: (id: string, body: {
    code?: string;
    name?: string;
    fullName?: string;
    phone?: string;
    address?: string;
    companyId?: string;
    companyIds?: string[];
    lineCode?: string;
    latitude?: number;
    longitude?: number;
    category?: string;
    distributorId?: string | null;
    inn?: string;
    contactPerson?: string;
    territory?: string;
    photoUrl?: string;
    clientClass?: string;
    priceCategory?: string;
    isActive?: boolean;
    extraPhones?: { phone: string; note?: string }[];
    onTradeId?: string;
    appUsername?: string;
    appPassword?: string;
  }) =>
    request<Client>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getClientAppCredentials: (clientId: string) =>
    request<
      | { hasCredentials: false; suggestedUsername: string }
      | { hasCredentials: true; userId: string; username: string; clientId: string; isActive: boolean }
    >(`/clients/${clientId}/app-credentials`),

  getClientStats: (
    clientId: string,
    params?: { period?: 'hafta' | 'oy' | '6oy' | 'custom'; from?: string; to?: string },
  ) => {
    const q = new URLSearchParams();
    if (params?.period) q.set('period', params.period);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    const qs = q.toString();
    return request<ClientStatsResponse>(`/clients/${clientId}/stats${qs ? `?${qs}` : ''}`);
  },

  transferClients: (body: {
    targetCompanyId: string;
    sourceCompanyId?: string;
    clientIds?: string[];
    transferAll?: boolean;
  }) =>
    request<{
      targetCompanyId: string;
      transferredCount: number;
      skippedCount: number;
      transferred: { id: string; name: string; code: string }[];
      skipped: { id: string; name: string; code: string; inn: string | null; reason: string }[];
    }>('/clients/transfer', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  setClientAppCredentials: (clientId: string, body: { username: string; password: string; isActive?: boolean }) =>
    request<{ userId: string; username: string; clientId: string; created: boolean; isActive?: boolean }>(
      `/clients/${clientId}/app-credentials`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  setClientAppLoginActive: (clientId: string, isActive: boolean) =>
    request<
      | { hasCredentials: false; isActive: false }
      | { hasCredentials: true; userId: string; username: string; clientId: string; isActive: boolean }
    >(`/clients/${clientId}/app-credentials/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),

  checkClientAppUsername: (username: string, excludeClientId?: string) => {
    const q = new URLSearchParams({ username: username.trim().toLowerCase() });
    if (excludeClientId) q.set('excludeClientId', excludeClientId);
    return request<{
      available: boolean;
      username: string;
      reason?: string;
      takenBy?: {
        userId: string;
        clientId: string | null;
        clientName: string | null;
        clientCode: string | null;
      };
    }>(`/clients/app-username-available?${q.toString()}`);
  },

  // ─── Products ───
  getProducts: (category?: string, companyId?: string) => {
    const q = new URLSearchParams();
    if (category) q.set('category', category);
    if (companyId) q.set('companyId', companyId);
    const qs = q.toString();
    return request<Array<{
      id: string;
      code: string;
      name: string;
      companyId?: string | null;
      category: string | null;
      brand: string | null;
      price: number | string;
      unit: string;
      stockBalance: number | string;
      imageUrl?: string | null;
      isActive?: boolean;
    }>>(`/products${qs ? `?${qs}` : ''}`);
  },

  getProductCategories: (companyId?: string) =>
    request<Array<{ category: string }>>(
      `/products/categories${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`,
    ),

  getProductCategoryMeta: () =>
    request<Array<{
      id: string;
      name: string;
      color: string;
      emoji: string;
      imageUrl: string | null;
    }>>('/products/category-meta'),

  listAgentPlans: (params?: { year?: number; month?: number; companyId?: string }) => {
    const q = new URLSearchParams();
    if (params?.year) q.set('year', String(params.year));
    if (params?.month) q.set('month', String(params.month));
    if (params?.companyId) q.set('companyId', params.companyId);
    const qs = q.toString();
    return request<Array<{
      distributorId: string;
      agentName: string;
      year: number;
      month: number;
      totalPlan: number;
      totalDone: number;
      donePct: number;
      unit: 'som' | 'kg' | 'ton' | 'dona';
      categories: Array<{
        key: string;
        name: string;
        color: string;
        plan: number;
        done: number;
        pct: number;
        products?: Array<{
          productId: string;
          productName: string;
          plan: number;
          done: number;
          pct: number;
        }>;
      }>;
    }>>(`/plans${qs ? `?${qs}` : ''}`);
  },

  upsertAgentPlan: (body: {
    distributorId: string;
    monthType?: 'current' | 'next';
    year?: number;
    month?: number;
    total: number;
    unit?: 'som' | 'kg' | 'ton' | 'dona';
    categories: Record<string, number>;
    categoryNames?: Record<string, string>;
    products?: Array<{
      productId: string;
      productName: string;
      categoryKey: string;
      amount: number;
    }>;
  }) =>
    request<{
      id: string;
      distributorId: string;
      year: number;
      month: number;
      totalAmount: number;
      unit: string;
      categories: Array<{
        key: string;
        name: string;
        amount: number;
        products?: Array<{ productId: string; productName: string; amount: number }>;
      }>;
    }>('/plans', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  createProductCategoryMeta: (body: {
    name: string;
    color?: string;
    emoji?: string;
    imageUrl?: string | null;
  }) =>
    request<{
      id: string;
      name: string;
      color: string;
      emoji: string;
      imageUrl: string | null;
    }>('/products/category-meta', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateProductCategoryMeta: (metaId: string, body: {
    name?: string;
    color?: string;
    emoji?: string;
    imageUrl?: string | null;
  }) =>
    request<{
      id: string;
      name: string;
      color: string;
      emoji: string;
      imageUrl: string | null;
    }>(`/products/category-meta/${metaId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteProductCategoryMeta: (metaId: string) =>
    request<{ ok: boolean }>(`/products/category-meta/${metaId}`, { method: 'DELETE' }),

  createProduct: (body: {
    companyId?: string;
    code: string;
    name: string;
    category?: string;
    brand?: string;
    price: number;
    unit: string;
    stockBalance?: number;
    imageUrl?: string;
  }) =>
    request<{
      id: string;
      code: string;
      name: string;
      companyId?: string | null;
      category: string | null;
      brand: string | null;
      price: number | string;
      unit: string;
      stockBalance: number | string;
      imageUrl?: string | null;
    }>('/products', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateProduct: (id: string, body: {
    companyId?: string;
    code?: string;
    name?: string;
    category?: string;
    brand?: string;
    price?: number;
    unit?: string;
    stockBalance?: number;
    imageUrl?: string;
    isActive?: boolean;
  }) =>
    request<{
      id: string;
      code: string;
      name: string;
      companyId?: string | null;
      category: string | null;
      brand: string | null;
      price: number | string;
      unit: string;
      stockBalance: number | string;
      imageUrl?: string | null;
    }>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteProduct: (id: string) =>
    request<void>(`/products/${id}`, { method: 'DELETE' }),

  uploadProductImage: (dataUrl: string) =>
    request<{ url: string; fullUrl: string; mimeType: string; fileSize: number }>(
      '/products/upload-image',
      { method: 'POST', body: JSON.stringify({ dataUrl }) },
    ),

  // ─── Promotions (Aksiyalar) ───
  getPromotions: () =>
    request<Array<{
      id: string;
      title: string;
      subtitle: string | null;
      discountPercent: number | string;
      buyQuantity: number | string | null;
      freeQuantity: number | string | null;
      productId: string | null;
      productName: string | null;
      conditions?: Array<{ productId: string; productName: string; buyQuantity: number | string }>;
      rewards?: Array<{ productId: string; productName: string; quantity: number | string; price: number | string }>;
      rewardProductId?: string | null;
      rewardProductName?: string | null;
      rewardQuantity?: number | string | null;
      rewardPrice?: number | string | null;
      colorStart: string;
      colorEnd: string;
      emoji: string | null;
      validFrom: string | null;
      validTo: string | null;
      isActive: boolean;
      sortOrder: number;
      createdAt: string;
      updatedAt: string;
    }>>('/promotions'),

  createPromotion: (body: {
    title: string;
    subtitle?: string;
    discountPercent?: number;
    buyQuantity?: number | null;
    freeQuantity?: number | null;
    productId?: string | null;
    conditions?: Array<{ productId: string; productName?: string; buyQuantity: number }>;
    rewards?: Array<{ productId: string; productName?: string; quantity: number; price?: number }>;
    rewardProductId?: string | null;
    rewardQuantity?: number | null;
    rewardPrice?: number | null;
    colorStart?: string;
    colorEnd?: string;
    emoji?: string;
    validFrom?: string | null;
    validTo?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  }) =>
    request<{
      id: string;
      title: string;
      subtitle: string | null;
      discountPercent: number | string;
      buyQuantity: number | string | null;
      freeQuantity: number | string | null;
      productId: string | null;
      productName: string | null;
      conditions?: Array<{ productId: string; productName: string; buyQuantity: number | string }>;
      rewards?: Array<{ productId: string; productName: string; quantity: number | string; price: number | string }>;
      rewardProductId?: string | null;
      rewardProductName?: string | null;
      rewardQuantity?: number | string | null;
      rewardPrice?: number | string | null;
      colorStart: string;
      colorEnd: string;
      emoji: string | null;
      validFrom: string | null;
      validTo: string | null;
      isActive: boolean;
      sortOrder: number;
    }>('/promotions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updatePromotion: (id: string, body: {
    title?: string;
    subtitle?: string;
    discountPercent?: number;
    buyQuantity?: number | null;
    freeQuantity?: number | null;
    productId?: string | null;
    conditions?: Array<{ productId: string; productName?: string; buyQuantity: number }>;
    rewards?: Array<{ productId: string; productName?: string; quantity: number; price?: number }>;
    rewardProductId?: string | null;
    rewardQuantity?: number | null;
    rewardPrice?: number | null;
    colorStart?: string;
    colorEnd?: string;
    emoji?: string;
    validFrom?: string | null;
    validTo?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  }) =>
    request<{
      id: string;
      title: string;
      subtitle: string | null;
      discountPercent: number | string;
      buyQuantity: number | string | null;
      freeQuantity: number | string | null;
      productId: string | null;
      productName: string | null;
      conditions?: Array<{ productId: string; productName: string; buyQuantity: number | string }>;
      rewards?: Array<{ productId: string; productName: string; quantity: number | string; price: number | string }>;
      rewardProductId?: string | null;
      rewardProductName?: string | null;
      rewardQuantity?: number | string | null;
      rewardPrice?: number | string | null;
      colorStart: string;
      colorEnd: string;
      emoji: string | null;
      validFrom: string | null;
      validTo: string | null;
      isActive: boolean;
      sortOrder: number;
    }>(`/promotions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deletePromotion: (id: string) =>
    request<{ ok: boolean }>(`/promotions/${id}`, { method: 'DELETE' }),

  // ─── Client categories (От, Тт, Хорека, …) ───
  getClientCategories: (companyId?: string) =>
    request<Array<{
      id: string;
      name: string;
      companyId: string | null;
      isActive: boolean;
    }>>(`/client-categories${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`),

  // ─── Lines ───
  getLines: (companyId?: string) =>
    request<Array<{
      id: string;
      code: string;
      name: string;
      agentName: string | null;
      deliveryName: string | null;
      agentVisitDays: number[];
      deliveryVisitDays: number[];
      visitDays: number[];
      clientCount: number;
      companyId: string | null;
    }>>(`/lines${companyId ? `?companyId=${companyId}` : ''}`),

  createLine: (body: {
    code: string;
    name: string;
    agentName?: string;
    deliveryName?: string;
    agentVisitDays?: number[];
    deliveryVisitDays?: number[];
    visitDays?: number[];
    companyId?: string;
  }) =>
    request<{
      id: string;
      code: string;
      name: string;
      agentName: string | null;
      deliveryName: string | null;
      agentVisitDays: number[];
      deliveryVisitDays: number[];
      visitDays: number[];
      clientCount: number;
      companyId: string | null;
    }>('/lines', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateLine: (id: string, body: {
    code?: string;
    name?: string;
    agentName?: string | null;
    deliveryName?: string | null;
    agentVisitDays?: number[] | null;
    deliveryVisitDays?: number[] | null;
    visitDays?: number[] | null;
  }) =>
    request<{
      id: string;
      code: string;
      name: string;
      agentName: string | null;
      deliveryName: string | null;
      agentVisitDays: number[];
      deliveryVisitDays: number[];
      visitDays: number[];
      clientCount: number;
      companyId: string | null;
    }>(`/lines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteLine: (id: string) =>
    request<{ ok: boolean }>(`/lines/${id}`, { method: 'DELETE' }),

  // ─── Admin dashboard ───
  getAdminDashboard: (companyIds?: string[]) => {
    const qs = companyIds?.length
      ? `?${companyIds.map(id => `companyId=${encodeURIComponent(id)}`).join('&')}`
      : '';
    return request<AdminDashboardData>(`/dashboard/admin${qs}`);
  },

  // ─── Client requests (agent → admin approval) ───
  getClientRequests: (companyId?: string) =>
    request<Array<{
      id: string;
      status: string;
      requestType?: 'create' | 'update';
      targetClientId?: string | null;
      name: string;
      fullName?: string | null;
      phone?: string | null;
      address?: string | null;
      companyId?: string | null;
      lineCode?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      category?: string | null;
      inn?: string | null;
      contactPerson?: string | null;
      territory?: string | null;
      clientClass?: string | null;
      priceCategory?: string | null;
      photoUrl?: string | null;
      canSeePromotions?: boolean | null;
      agentName?: string | null;
      submitterPosition?: string | null;
      note?: string | null;
      previousSnapshot?: Record<string, unknown> | null;
      createdAt: string;
      distributor?: { id: string; user?: { fullName: string } } | null;
    }>>(`/client-requests${companyId ? `?companyId=${companyId}` : ''}`),

  approveClientRequest: (id: string) =>
    request<{ request: unknown; client: Client }>(`/client-requests/${id}/approve`, {
      method: 'POST',
    }),

  rejectClientRequest: (id: string) =>
    request<unknown>(`/client-requests/${id}/reject`, { method: 'POST' }),

  // ─── Orders (agent APK → admin Sotuvlar) ───
  getOrders: (companyId?: string) =>
    request<BackendOrder[]>(`/orders${companyId ? `?companyId=${companyId}` : ''}`),

  /** Admin tarix: agent yoki dostavka buyurtmalari (sana oralig‘i) */
  getOrdersHistory: (opts: {
    companyId?: string;
    distributorId?: string;
    deliveryDistributorId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (opts.companyId) q.set('companyId', opts.companyId);
    if (opts.distributorId) q.set('distributorId', opts.distributorId);
    if (opts.deliveryDistributorId) q.set('deliveryDistributorId', opts.deliveryDistributorId);
    if (opts.from) q.set('from', opts.from);
    if (opts.to) q.set('to', opts.to);
    if (opts.limit) q.set('limit', String(opts.limit));
    const qs = q.toString();
    return request<BackendOrder[]>(`/orders${qs ? `?${qs}` : ''}`);
  },

  /** Admin: buyurtma statusini yangilash (Tarozi → yuklashga tayyor va hokazo) */
  updateOrder: (id: string, body: {
    status?: string;
    deliveryDistributorId?: string | null;
    items?: Array<{
      productId: string;
      productCode: string;
      productName: string;
      quantity: number;
      price: number;
      unit: string;
      isFree?: boolean;
      promotionId?: string;
      actualQuantity?: number | null;
    }>;
  }) =>
    request<BackendOrder>(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // ─── Payment terminals ───
  getTerminals: (companyId?: string) =>
    request<
      Array<{
        id: string;
        name: string;
        code: string | null;
        companyId: string | null;
        assignedDistributorId: string | null;
        assignedName?: string | null;
        isActive: boolean;
      }>
    >(`/terminals${companyId ? `?companyId=${companyId}` : ''}`),

  createTerminal: (body: {
    name: string;
    code?: string | null;
    companyId?: string | null;
    assignedDistributorId?: string | null;
    isActive?: boolean;
  }) =>
    request('/terminals', { method: 'POST', body: JSON.stringify(body) }),

  updateTerminal: (
    id: string,
    body: {
      name?: string;
      code?: string | null;
      companyId?: string | null;
      assignedDistributorId?: string | null;
      isActive?: boolean;
    },
  ) =>
    request(`/terminals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteTerminal: (id: string) =>
    request(`/terminals/${id}`, { method: 'DELETE' }),

  getReturns: (status?: string) =>
    request<
      Array<{
        id: string;
        orderId: string;
        status: string;
        items: Array<{ productName: string; quantity: number; price: number }>;
        totalAmount: number;
        clientName?: string | null;
        clientCode?: string | null;
        note?: string | null;
        createdAt: string;
      }>
    >(`/returns${status ? `?status=${status}` : ''}`),

  acceptReturn: (id: string) =>
    request(`/returns/${id}/accept`, { method: 'PATCH' }),

  rejectReturn: (id: string) =>
    request(`/returns/${id}/reject`, { method: 'PATCH' }),

  // ─── Health ───
  health: (init?: RequestInit) => request<{ status: string }>('/health', init),

  // ─── Notifications (Push) ───
  getNotifications: () =>
    request<Array<{
      id: string;
      title: string;
      body: string;
      type: string;
      isRead: boolean;
      createdAt: string;
    }>>('/notifications'),

  sendPush: (body: {
    userId?: string;
    distributorId?: string;
    title: string;
    body: string;
    type?: string;
  }) =>
    request<{ sent: boolean; messageId?: string; error?: string }>('/notifications/send', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getPushDiagnostics: () =>
    request<{
      firebaseConfigured: boolean;
      myTokenRegistered: boolean;
      myDeviceCount?: number;
      byRole: { role: string; total: number; withToken: number }[];
    }>('/notifications/diagnostics'),

  registerFcmToken: (token: string) =>
    request<{ ok?: boolean }>('/notifications/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform: 'web' }),
    }),

  // ─── Goods receipts (prixod) / factory reconciliation ───
  getGoodsReceipts: (params?: { companyId?: string; ox?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.companyId) q.set('companyId', params.companyId);
    if (params?.ox !== undefined) q.set('ox', String(params.ox));
    const qs = q.toString();
    return request<Array<{
      id: string;
      legacyId?: string | null;
      companyId?: string | null;
      date: string;
      num: string;
      ox: boolean;
      supplier: string;
      org: string;
      warehouse: string;
      wagon: string;
      dir: string;
      invoice: string;
      sum: number;
      netto: number;
      type: 'opt' | 'chakana' | 'ishlab';
      author: string;
      authorId?: string | null;
      items?: Array<{
        productId?: string | null;
        tovar: string;
        artikul?: string | null;
        kolFakt: number;
        kolBrak: number;
        upakovka?: string | null;
        tsenaPost: number;
        skid?: number;
        tsenaPriv?: number;
        summa: number;
        ves: number;
        unit?: string | null;
      }>;
      reconciliationStatus?: string | null;
      reconciliationId?: string | null;
    }>>(`/goods-receipts${qs ? `?${qs}` : ''}`);
  },

  createGoodsReceipt: (body: Record<string, unknown>) =>
    request<{ id: string }>('/goods-receipts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  importGoodsReceipts: (rows: Record<string, unknown>[]) =>
    request<{ created: number; skipped: number }>('/goods-receipts/import', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }),

  broadcastPush: (body: {
    title: string;
    body: string;
    companyId?: string;
    type?: string;
    audience?: 'agents' | 'clients' | 'admins' | 'all';
  }) =>
    request<{ sent: number; failed?: number; total?: number; message?: string }>(
      '/notifications/broadcast',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  // ─── Messages (Chat) ───
  getContacts: (companyId?: string) =>
    request<ChatContact[]>(`/messages/contacts${companyId ? `?companyId=${companyId}` : ''}`),

  getClientContacts: (companyId?: string) =>
    request<ChatContact[]>(
      `/messages/client-contacts${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`,
    ),

  getConversations: () => request<ChatConversation[]>('/messages/conversations'),

  startConversation: (userId: string) =>
    request<ChatConversation>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  getMessages: (conversationId: string, limit = 50, before?: string) =>
    request<ChatMessage[]>(
      `/messages/conversations/${conversationId}/messages?limit=${limit}${before ? `&before=${before}` : ''}`,
    ),

  sendMessage: (
    conversationId: string,
    text?: string,
    attachment?: MessageAttachment,
  ) =>
    request<ChatMessage>(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: text ?? '', attachment }),
    }),

  uploadChatFile: async (file: File): Promise<MessageAttachment & { fullUrl: string }> => {
    const prepared = await compressChatImage(file);
    const token = getToken();
    const form = new FormData();
    form.append('file', prepared);
    const res = await fetch(`${API_BASE}/messages/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  markConversationRead: (conversationId: string) =>
    request<{ updated: number }>(`/messages/conversations/${conversationId}/read`, {
      method: 'PATCH',
    }),

  deleteMessages: (conversationId: string, messageIds: string[], forEveryone = false) =>
    request<{ deleted: string[] }>(`/messages/conversations/${conversationId}/messages/delete`, {
      method: 'POST',
      body: JSON.stringify({ messageIds, forEveryone }),
    }),

  // ─── Van Sales ───
  getVanLoads: (opts?: {
    companyId?: string;
    distributorId?: string;
    status?: string;
    loadDate?: string;
  }) => {
    const q = new URLSearchParams();
    if (opts?.companyId) q.set('companyId', opts.companyId);
    if (opts?.distributorId) q.set('distributorId', opts.distributorId);
    if (opts?.status) q.set('status', opts.status);
    if (opts?.loadDate) q.set('loadDate', opts.loadDate);
    const qs = q.toString();
    return request<VanLoadDto[]>(`/van-sales/loads${qs ? `?${qs}` : ''}`);
  },

  getVanLoad: (id: string) => request<VanLoadDto>(`/van-sales/loads/${id}`),

  createVanLoad: (body: {
    distributorId: string;
    loadDate: string;
    companyId?: string;
    notes?: string;
    items: Array<{ productId: string; quantity: number }>;
  }) =>
    request<VanLoadDto>('/van-sales/loads', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  confirmVanLoad: (id: string) =>
    request<VanLoadDto>(`/van-sales/loads/${id}/confirm`, { method: 'POST', body: '{}' }),

  submitVanReturn: (
    id: string,
    body?: {
      items?: Array<{ productId: string; quantity: number }>;
      submittedCash?: number;
      notes?: string;
    },
  ) =>
    request<VanLoadDto>(`/van-sales/loads/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),

  acceptVanReturn: (
    id: string,
    body?: {
      items?: Array<{ productId: string; quantity: number }>;
      submittedCash?: number;
      notes?: string;
    },
  ) =>
    request<VanLoadDto>(`/van-sales/loads/${id}/accept-return`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),

  getVanReport: (opts?: {
    companyId?: string;
    distributorId?: string;
    loadDate?: string;
  }) => {
    const q = new URLSearchParams();
    if (opts?.companyId) q.set('companyId', opts.companyId);
    if (opts?.distributorId) q.set('distributorId', opts.distributorId);
    if (opts?.loadDate) q.set('loadDate', opts.loadDate);
    const qs = q.toString();
    return request<{
      loadDate: string;
      loads: VanLoadDto[];
      summary: {
        loadsCount: number;
        ordersCount: number;
        clientsSold: number;
        totalSales: number;
        paidTotal: number;
        cash: number;
        terminal: number;
        debt: number;
        expectedCash: number;
        submittedCash: number;
      };
    }>(`/van-sales/report${qs ? `?${qs}` : ''}`);
  },
};

export interface VanLoadItemDto {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  price?: number;
  loadedQty: number;
  soldQty: number;
  returnedQty: number;
  acceptedQty: number;
  remainingQty: number;
  expectedReturnQty: number;
  shortageQty: number;
}

export interface VanLoadDto {
  id: string;
  companyId: string | null;
  distributorId: string;
  distributorName?: string | null;
  loadDate: string;
  status: string;
  loadedAt: string | null;
  returnSubmittedAt: string | null;
  closedAt: string | null;
  notes: string | null;
  expectedCash: number;
  submittedCash: number | null;
  cashDiff: number | null;
  items: VanLoadItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatContact {
  id: string;
  fullName: string;
  role: string;
  username: string;
}

export interface MessageAttachment {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  messageType: 'image' | 'document';
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  isRead: boolean;
  createdAt: string;
  messageType?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMime?: string | null;
  fileSize?: number | null;
}

export interface ChatConversation {
  id: string;
  otherUser: ChatContact;
  lastMessage: {
    id: string;
    text: string;
    senderId: string;
    createdAt: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

// ─── WebSocket tracking ───
export type TrackingLocationEvent = LocationPoint & {
  distributorId: string;
  receivedAt?: string;
};

export async function connectTracking(handlers: {
  onLocation: (data: TrackingLocationEvent) => void;
  onOnline?: (data: { distributorId?: string; timestamp?: string }) => void;
  onOffline?: (data: { distributorId?: string; timestamp?: string }) => void;
}) {
  const token = getToken();
  if (!token) return null;

  const { io } = await import('socket.io-client');
  const socket = io(`${WS_BASE}/tracking`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });
  socket.on('connect', () => {
    // room join serverda JWT orqali
  });
  socket.on('location:live', handlers.onLocation);
  if (handlers.onOnline) socket.on('distributor:online', handlers.onOnline);
  if (handlers.onOffline) socket.on('distributor:offline', handlers.onOffline);
  return socket;
}

// ─── WebSocket messages ───
export async function connectMessages(handlers: {
  onMessage: (payload: { message: ChatMessage; conversation?: ChatConversation }) => void;
  onDeleted?: (payload: {
    conversationId: string;
    messageIds: string[];
    forEveryone: boolean;
    conversation?: ChatConversation;
  }) => void;
  onRead?: (payload: { conversationId: string; messageIds: string[] }) => void;
}) {
  const token = getToken();
  if (!token) return null;

  const { io } = await import('socket.io-client');
  const socket = io(`${WS_BASE}/messages`, { auth: { token } });
  socket.on('message:new', handlers.onMessage);
  if (handlers.onDeleted) {
    socket.on('message:deleted', handlers.onDeleted);
  }
  if (handlers.onRead) {
    socket.on('message:read', handlers.onRead);
  }
  return socket;
}

export { API_BASE, WS_BASE };

/** Chat rasmlarini yuborishdan oldin kichraytirish (server joyini tejash) */
export async function compressChatImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  if (file.size <= 200 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1280;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.82,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

/** Chat / upload fayllari — API host bilan bir xil (mahsulot rasmlari kabi) */
export function getUploadsBase(): string {
  const explicit = import.meta.env.VITE_UPLOADS_URL as string | undefined;
  if (explicit) return explicit.replace(/\/$/, '');
  if (import.meta.env.VITE_WS_URL) {
    return String(import.meta.env.VITE_WS_URL).replace(/\/$/, '');
  }
  // VITE_API_URL: https://host/api/v1 → https://host; /api/v1 → same origin
  const fromApi = API_BASE.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '');
  if (fromApi) return fromApi;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

export const UPLOADS_BASE = getUploadsBase();

export function resolveFileUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${UPLOADS_BASE}${path}`;
}
