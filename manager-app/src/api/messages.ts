import { api, getAccessToken, getFreshAccessToken } from './client'
import { API_BASE_URL, WS_BASE_URL } from './config'

export interface ChatContact {
  id: string
  fullName: string
  role: string
  username: string
}

export interface MessageAttachment {
  url: string
  fileName: string
  mimeType: string
  fileSize: number
  messageType: 'image' | 'document'
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  text: string
  isRead: boolean
  createdAt: string
  messageType?: string
  fileUrl?: string | null
  fileName?: string | null
  fileMime?: string | null
  fileSize?: number | null
}

export interface ChatConversation {
  id: string
  otherUser: ChatContact
  lastMessage: {
    id: string
    text: string
    senderId: string
    createdAt: string
    isRead: boolean
    messageType?: string
    fileName?: string | null
  } | null
  unreadCount: number
  updatedAt: string
}

export type MessagesSocket = {
  connected: boolean
  emit: (event: string, data: unknown) => void
  disconnect: () => void
}

function apiOrigin(): string {
  const fromApi = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '')
  if (fromApi.startsWith('http://') || fromApi.startsWith('https://')) return fromApi
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://lider-navoiy.uz'
}

export function resolveChatFileUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  return `${apiOrigin()}${path}`
}

async function compressChatImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  if (file.size <= 200 * 1024) return file

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const maxDim = 1280
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.82,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

export function getContacts(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<ChatContact[]>(`messages/contacts${q}`)
}

export function getClientContacts() {
  return api<ChatContact[]>('messages/client-contacts')
}

export function getConversations() {
  return api<ChatConversation[]>('messages/conversations')
}

export function startConversation(userId: string) {
  return api<ChatConversation>('messages/conversations', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export function getMessages(conversationId: string, limit = 50, before?: string) {
  const q = `limit=${limit}${before ? `&before=${before}` : ''}`
  return api<ChatMessage[]>(`messages/conversations/${conversationId}/messages?${q}`)
}

export function sendMessage(
  conversationId: string,
  text?: string,
  attachment?: MessageAttachment,
) {
  return api<ChatMessage>(`messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text: text ?? '', attachment }),
  })
}

export function markConversationRead(conversationId: string) {
  return api<{ updated: number }>(`messages/conversations/${conversationId}/read`, {
    method: 'PATCH',
  })
}

export function deleteMessages(conversationId: string, messageIds: string[], forEveryone = false) {
  return api<{ deleted: string[] }>(`messages/conversations/${conversationId}/messages/delete`, {
    method: 'POST',
    body: JSON.stringify({ messageIds, forEveryone }),
  })
}

export async function uploadChatFile(file: File): Promise<MessageAttachment & { fullUrl: string }> {
  const prepared = await compressChatImage(file)
  const token = getAccessToken()
  const form = new FormData()
  form.append('file', prepared)

  const res = await fetch(`${API_BASE_URL}messages/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function connectMessages(handlers: {
  onMessage: (payload: { message: ChatMessage; conversation?: ChatConversation }) => void
  onDeleted?: (payload: {
    conversationId: string
    messageIds: string[]
    forEveryone: boolean
    conversation?: ChatConversation
  }) => void
  onRead?: (payload: { conversationId: string; messageIds: string[] }) => void
}): Promise<MessagesSocket | null> {
  const token = getAccessToken()
  if (!token) return null

  const { io } = await import('socket.io-client')
  const socket = io(`${WS_BASE_URL}/messages`, {
    // Har bir ulanish/qayta ulanishda yangi token — 4 soatdan keyin uzilmasin
    auth: (cb: (data: { token: string }) => void) => {
      void getFreshAccessToken().then(t => cb({ token: t || token }))
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
  })

  socket.on('message:new', handlers.onMessage)
  if (handlers.onDeleted) socket.on('message:deleted', handlers.onDeleted)
  if (handlers.onRead) socket.on('message:read', handlers.onRead)

  return {
    get connected() {
      return socket.connected
    },
    emit: (event, data) => {
      socket.emit(event, data)
    },
    disconnect: () => {
      socket.removeAllListeners()
      socket.disconnect()
    },
  }
}
