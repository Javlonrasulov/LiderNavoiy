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
    distributorId?: string;
    companyName?: string;
  };
}

export interface AppUserRecord {
  id: string;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  lastActiveAt?: string | null;
  isOnline?: boolean;
}

export interface Distributor {
  id: string;
  userId: string;
  companyId: string | null;
  companyName: string | null;
  lineCode: string | null;
  phone: string | null;
  status: string;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastLocationAt: string | null;
  isOnline: boolean;
  user?: { fullName: string; username: string; isActive?: boolean };
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

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg = err.message;
    const text = Array.isArray(msg) ? msg.join(', ') : (msg || res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ───
export const api = {
  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request<void>('/auth/logout', { method: 'POST' }),

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
  }) =>
    request<AppUserRecord>(`/users/app/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deactivateAppUser: (id: string) =>
    request<void>(`/users/app/${id}`, { method: 'DELETE' }),

  // ─── Distributors ───
  getDistributors: (companyId?: string) =>
    request<Distributor[]>(`/distributors${companyId ? `?companyId=${companyId}` : ''}`),

  getOnlineDistributors: () => request<string[]>('/distributors/online'),

  updateDistributorStatus: (id: string, status: string) =>
    request<Distributor>(`/distributors/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // ─── GPS ───
  getLastLocation: (distributorId: string) =>
    request<LocationPoint>(`/gps/location/last`),

  getRouteHistory: (distributorId: string, date?: string) =>
    request<{ points: LocationPoint[]; pointCount: number }>(
      `/gps/route/${distributorId}${date ? `?date=${date}` : ''}`,
    ),

  getDailyRoute: (distributorId: string, date: string) =>
    request<{ points: LocationPoint[]; stats: Record<string, number> }>(
      `/routes/${distributorId}/daily?date=${date}`,
    ),

  getNearbyClients: (lat: number, lng: number, radius = 500) =>
    request<Client[]>(`/gps/nearby-clients?latitude=${lat}&longitude=${lng}&radiusMeters=${radius}`),

  // ─── Clients ───
  getClients: (companyId?: string) =>
    request<Client[]>(`/clients${companyId ? `?companyId=${companyId}` : ''}`),

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
  }) =>
    request<Client>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // ─── Health ───
  health: () => request<{ status: string }>('/health'),

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

  broadcastPush: (body: { title: string; body: string; companyId?: string; type?: string }) =>
    request<{ sent: number; failed?: number; total?: number }>('/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

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
export function connectTracking(onLocation: (data: LocationPoint & { distributorId: string }) => void) {
  const token = getToken();
  if (!token) return null;

  // Dynamic import to avoid bundling issues when socket.io not needed
  import('socket.io-client').then(({ io }) => {
    const socket = io(`${WS_BASE}/tracking`, { auth: { token } });
    socket.on('location:live', onLocation);
    socket.on('distributor:online', (d) => console.log('Online:', d));
    socket.on('distributor:offline', (d) => console.log('Offline:', d));
    return socket;
  });
  return null;
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

export const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_URL || WS_BASE;

export function resolveFileUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${UPLOADS_BASE}${url}`;
}
