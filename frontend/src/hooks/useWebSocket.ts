import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store'
import { showToast } from '../components/advanced'
import { setupWebSocketHandlers } from '../services/websocket'

interface UseWebSocketOptions {
  enabled?: boolean
  userId?: string
}

interface WebSocketHook {
  socket: Socket | null
  isConnected: boolean
  emit: (event: string, data: any) => void
  on: (event: string, handler: (data: any) => void) => void
  off: (event: string, handler?: (data: any) => void) => void
}

export function useWebSocket({ enabled = true, userId }: UseWebSocketOptions = {}): WebSocketHook {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { token } = useAuthStore()

  useEffect(() => {
    if (!enabled || !token) {
      return
    }

    // Initialize socket connection
    const socket = io(import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:8000', {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    // Connection event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      
      // Join user room if userId provided
      if (userId) {
        socket.emit('user:join', { userId })
      }
    })

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      showToast('Connection error. Some features may be unavailable.', 'error')
    })

    // Set up WebSocket handlers for real-time updates
    const cleanup = setupWebSocketHandlers(socket)

    // Additional event handlers
    socket.on('presence:update', (data: { userId: string; status: string }) => {
      console.log('User presence update:', data)
      // Could be handled by a presence store if needed
    })

    socket.on('notification', (data: any) => {
      console.log('Notification received:', data)
      showToast(data.message, data.type || 'info')
    })

    return () => {
      cleanup()
      if (userId) {
        socket.emit('user:leave', { userId })
      }
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled, token, userId])

  const emit = (event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    } else {
      console.warn('Socket not connected. Cannot emit event:', event)
    }
  }

  const on = (event: string, handler: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler)
    }
  }

  const off = (event: string, handler?: (data: any) => void) => {
    if (socketRef.current) {
      if (handler) {
        socketRef.current.off(event, handler)
      } else {
        socketRef.current.off(event)
      }
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    emit,
    on,
    off,
  }
}