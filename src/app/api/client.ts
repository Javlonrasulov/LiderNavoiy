/**
 * Backend API client for Admin Panel
 * Set VITE_API_URL in .env (default: http://localhost:3000/api/v1)
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const WS_BASE = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

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
  isActive: boolean;
  lastLoginAt?: string | null;
  lastActiveAt?: string | null;
  isOnline?: boolean;
  lastDeviceBrand?: string | null;
  lastDeviceModel?: string | null;
  lastDeviceOs?: string | null;
  devices?: AppUserDeviceRecord[];
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
  description: string | null;
  productType?: 'kg_dona' | 'dona' | 'kg' | null;
  warehouseName?: string | null;
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
  lineCode?: string | null;
  balance: string | number;
  latitude: number | null;
  longitude: number | null;
  category?: string | null;
  distributorId?: string | null;
  inn?: string | null;
  contactPerson?: string | null;
  territory?: string | null;
  clientClass?: string | null;
  priceCategory?: string | null;
  isActive?: boolean;
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

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('api_access_token', access);
  localStorage.setItem('api_refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('api_access_token');
  localStorage.removeItem('api_refresh_token');
  localStorage.removeItem('api_user_id');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'AbortError' || name === 'TimeoutError') {
      throw new Error('timeout');
    }
    throw new Error(`Backend ulanmagan (${API_BASE})`);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg = err.message;
    const text = Array.isArray(msg) ? msg.join(', ') : (msg || res.statusText);
    throw new Error(text ? `HTTP ${res.status}: ${text}` : `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ───
export const api = {
  login: (username: string, password: string, init?: RequestInit) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      ...init,
    }),

  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  getUsdExchangeRates: () => request<UsdExchangeRates>('/exchange-rates/usd'),

  getTashkentTime: () => request<TashkentTimeInfo>('/health/time'),

  getCompanies: () => request<BackendCompany[]>('/companies'),

  createCompany: (body: {
    name: string;
    shortName?: string;
    icon?: string;
    color?: string;
    description?: string;
    productType?: 'kg_dona' | 'dona' | 'kg';
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
      description?: string;
      productType?: 'kg_dona' | 'dona' | 'kg';
      warehouseName?: string | null;
    },
  ) =>
    request<BackendCompany>(`/companies/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // ─── App users (APK login) ───
  listAppUsers: () => request<AppUserRecord[]>('/users/app'),

  createAppUser: (body: {
    username: string;
    password: string;
    fullName: string;
    role?: string;
    companyName?: string;
    companyId?: string;
    isActive?: boolean;
    phone?: string;
    position?: string;
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
    phone?: string;
    position?: string;
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
  getClients: (companyId?: string, distributorId?: string) => {
    const q = new URLSearchParams();
    if (companyId) q.set('companyId', companyId);
    if (distributorId) q.set('distributorId', distributorId);
    const qs = q.toString();
    return request<Client[]>(`/clients${qs ? `?${qs}` : ''}`);
  },

  getClient: (id: string) => request<Client>(`/clients/${id}`),

  searchClients: (q: string) => request<Client[]>(`/clients/search?q=${encodeURIComponent(q)}`),

  createClient: (body: {
    code: string;
    name: string;
    fullName?: string;
    phone?: string;
    address?: string;
    companyId?: string;
    lineCode?: string;
    latitude?: number;
    longitude?: number;
    category?: string;
    distributorId?: string;
    inn?: string;
    contactPerson?: string;
    territory?: string;
    clientClass?: string;
    priceCategory?: string;
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
    lineCode?: string;
    latitude?: number;
    longitude?: number;
    category?: string;
    distributorId?: string | null;
    inn?: string;
    contactPerson?: string;
    territory?: string;
    clientClass?: string;
    priceCategory?: string;
    isActive?: boolean;
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

  setClientAppCredentials: (clientId: string, body: { username: string; password: string }) =>
    request<{ userId: string; username: string; clientId: string; created: boolean }>(
      `/clients/${clientId}/app-credentials`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

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
  getProducts: (category?: string) =>
    request<Array<{
      id: string;
      code: string;
      name: string;
      category: string | null;
      brand: string | null;
      price: number | string;
      unit: string;
      stockBalance: number | string;
      imageUrl?: string | null;
      isActive?: boolean;
    }>>(`/products${category ? `?category=${encodeURIComponent(category)}` : ''}`),

  getProductCategories: () =>
    request<Array<{ category: string }>>('/products/categories'),

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
      categories: Array<{
        key: string;
        name: string;
        color: string;
        plan: number;
        done: number;
        pct: number;
      }>;
    }>>(`/plans${qs ? `?${qs}` : ''}`);
  },

  upsertAgentPlan: (body: {
    distributorId: string;
    monthType?: 'current' | 'next';
    year?: number;
    month?: number;
    total: number;
    categories: Record<string, number>;
    categoryNames?: Record<string, string>;
  }) =>
    request<{
      id: string;
      distributorId: string;
      year: number;
      month: number;
      totalAmount: number;
      categories: Array<{ key: string; name: string; amount: number }>;
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

  // ─── Lines ───
  getLines: (companyId?: string) =>
    request<Array<{
      id: string;
      code: string;
      name: string;
      agentName: string | null;
      clientCount: number;
      companyId: string | null;
    }>>(`/lines${companyId ? `?companyId=${companyId}` : ''}`),

  createLine: (body: {
    code: string;
    name: string;
    agentName?: string;
    companyId?: string;
  }) =>
    request<{
      id: string;
      code: string;
      name: string;
      agentName: string | null;
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
  }) =>
    request<{
      id: string;
      code: string;
      name: string;
      agentName: string | null;
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
      agentName?: string | null;
      note?: string | null;
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
  updateOrder: (id: string, body: { status?: string; deliveryDistributorId?: string | null }) =>
    request<BackendOrder>(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

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

  registerFcmToken: (token: string) =>
    request<{ ok?: boolean }>('/notifications/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
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
};

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
  // VITE_API_URL: https://host/api/v1 → https://host
  return API_BASE.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '') || 'http://localhost:3000';
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
