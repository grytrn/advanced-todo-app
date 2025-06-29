import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'

interface OfflineState {
  isOnline: boolean
  syncQueue: SyncQueueItem[]
  syncPending: boolean
  lastSyncTime: string | null
  conflictResolutions: ConflictResolution[]
  
  // Actions
  setOnlineStatus: (isOnline: boolean) => void
  addToSyncQueue: (item: SyncQueueItem) => void
  removeFromSyncQueue: (id: string) => void
  clearSyncQueue: () => void
  setSyncPending: (pending: boolean) => void
  setLastSyncTime: (time: string) => void
  addConflictResolution: (resolution: ConflictResolution) => void
  resolveConflict: (id: string, resolution: 'local' | 'remote') => void
}

export interface SyncQueueItem {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: 'todo' | 'category' | 'tag'
  data: any
  timestamp: string
  retryCount: number
}

export interface ConflictResolution {
  id: string
  localData: any
  remoteData: any
  resource: string
  timestamp: string
  resolved: boolean
  resolution?: 'local' | 'remote'
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    immer((set) => ({
      isOnline: navigator.onLine,
      syncQueue: [],
      syncPending: false,
      lastSyncTime: null,
      conflictResolutions: [],

      setOnlineStatus: (isOnline) => set((state) => {
        state.isOnline = isOnline
      }),

      addToSyncQueue: (item) => set((state) => {
        state.syncQueue.push(item)
        state.syncPending = true
      }),

      removeFromSyncQueue: (id) => set((state) => {
        state.syncQueue = state.syncQueue.filter(item => item.id !== id)
        if (state.syncQueue.length === 0) {
          state.syncPending = false
        }
      }),

      clearSyncQueue: () => set((state) => {
        state.syncQueue = []
        state.syncPending = false
      }),

      setSyncPending: (pending) => set((state) => {
        state.syncPending = pending
      }),

      setLastSyncTime: (time) => set((state) => {
        state.lastSyncTime = time
      }),

      addConflictResolution: (resolution) => set((state) => {
        state.conflictResolutions.push(resolution)
      }),

      resolveConflict: (id, resolution) => set((state) => {
        const conflict = state.conflictResolutions.find(c => c.id === id)
        if (conflict) {
          conflict.resolved = true
          conflict.resolution = resolution
        }
      }),
    })),
    {
      name: 'offline-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)