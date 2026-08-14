import { getAccessToken, getFreshAccessToken } from './client'
import { WS_BASE_URL } from './config'

export type TrackingLocationEvent = {
  distributorId: string
  latitude: number
  longitude: number
  receivedAt?: string
}

export type TrackingSocket = {
  disconnect: () => void
}

/** Admin ish stolidagi kabi jonli GPS WebSocket */
export async function connectTracking(handlers: {
  onLocation: (data: TrackingLocationEvent) => void
  onOnline?: (data: { distributorId?: string; timestamp?: string }) => void
  onOffline?: (data: { distributorId?: string; timestamp?: string }) => void
}): Promise<TrackingSocket | null> {
  const token = getAccessToken()
  if (!token) return null

  const { io } = await import('socket.io-client')
  const socket = io(`${WS_BASE_URL}/tracking`, {
    // Har bir ulanish/qayta ulanishda yangi token — 4 soatdan keyin uzilmasin
    auth: (cb: (data: { token: string }) => void) => {
      void getFreshAccessToken().then(t => cb({ token: t || token }))
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  })

  socket.on('location:live', handlers.onLocation)
  if (handlers.onOnline) socket.on('distributor:online', handlers.onOnline)
  if (handlers.onOffline) socket.on('distributor:offline', handlers.onOffline)

  return {
    disconnect: () => {
      socket.removeAllListeners()
      socket.disconnect()
    },
  }
}
