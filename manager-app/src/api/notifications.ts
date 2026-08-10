import { api } from './client'

export type AppNotification = {
  id: string
  title: string
  body: string
  type: string
  data: Record<string, string> | null
  isRead: boolean
  createdAt: string
}

export function fetchNotifications() {
  return api<AppNotification[]>('notifications')
}

export function fetchNotificationUnreadCount() {
  return api<{ count: number }>('notifications/unread-count')
}

export function markNotificationRead(id: string) {
  return api<{ success: boolean }>(`notifications/${id}/read`, { method: 'PATCH' })
}

export function markAllNotificationsRead() {
  return api<{ success: boolean }>('notifications/read-all', { method: 'PATCH' })
}
