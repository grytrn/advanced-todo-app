import { useOfflineStore } from './offlineStore'
import { useTodoStore } from '../../store/todoStore'
import { todoService } from '../../services'
import toast from 'react-hot-toast'

class OfflineService {
  private db: IDBDatabase | null = null
  private syncInProgress = false

  async init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js')
        console.log('Service Worker registered:', registration)
        
        // Request background sync permission
        if ('sync' in registration) {
          await registration.sync.register('sync-queue')
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    // Initialize IndexedDB
    await this.initDB()

    // Set up online/offline listeners
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    // Check initial connection status
    this.updateOnlineStatus()
  }

  private async initDB() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('todo-offline-db', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains('todos')) {
          const todoStore = db.createObjectStore('todos', { keyPath: 'id' })
          todoStore.createIndex('updatedAt', 'updatedAt')
        }

        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('sync-queue')) {
          db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true })
        }

        if (!db.objectStoreNames.contains('conflicts')) {
          db.createObjectStore('conflicts', { keyPath: 'id' })
        }
      }
    })
  }

  private handleOnline = async () => {
    useOfflineStore.getState().setOnlineStatus(true)
    toast.success('Back online! Syncing changes...')
    await this.syncOfflineChanges()
  }

  private handleOffline = () => {
    useOfflineStore.getState().setOnlineStatus(false)
    toast.error('You are offline. Changes will be synced when connection returns.')
  }

  private updateOnlineStatus() {
    useOfflineStore.getState().setOnlineStatus(navigator.onLine)
  }

  // Save data to IndexedDB for offline access
  async saveToOfflineStorage(storeName: string, data: any[]) {
    if (!this.db) return

    const transaction = this.db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)

    // Clear existing data
    await store.clear()

    // Add new data
    for (const item of data) {
      await store.add(item)
    }
  }

  // Get data from offline storage
  async getFromOfflineStorage(storeName: string): Promise<any[]> {
    if (!this.db) return []

    const transaction = this.db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Queue an action for sync when online
  async queueAction(action: any) {
    const { addToSyncQueue } = useOfflineStore.getState()
    
    const queueItem = {
      id: crypto.randomUUID(),
      ...action,
      timestamp: new Date().toISOString(),
      retryCount: 0
    }

    addToSyncQueue(queueItem)

    // Save to IndexedDB
    if (this.db) {
      const transaction = this.db.transaction(['sync-queue'], 'readwrite')
      const store = transaction.objectStore('sync-queue')
      await store.add(queueItem)
    }

    // Trigger background sync if available
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready
      await registration.sync.register('sync-queue')
    }
  }

  // Sync offline changes when back online
  async syncOfflineChanges() {
    if (this.syncInProgress || !navigator.onLine) return

    this.syncInProgress = true
    const { syncQueue, removeFromSyncQueue, setLastSyncTime } = useOfflineStore.getState()

    try {
      for (const item of syncQueue) {
        try {
          await this.processSyncItem(item)
          removeFromSyncQueue(item.id)
        } catch (error) {
          console.error('Failed to sync item:', item, error)
          
          // Handle conflicts
          if (error instanceof ConflictError) {
            await this.handleConflict(error.conflict)
          } else if (item.retryCount < 3) {
            // Retry later
            item.retryCount++
          } else {
            // Give up after 3 retries
            removeFromSyncQueue(item.id)
            toast.error(`Failed to sync ${item.resource} after multiple attempts`)
          }
        }
      }

      setLastSyncTime(new Date().toISOString())
      toast.success('All changes synced!')
    } finally {
      this.syncInProgress = false
    }
  }

  private async processSyncItem(item: any) {
    const { type, resource, data } = item

    switch (resource) {
      case 'todo':
        switch (type) {
          case 'create':
            await todoService.createTodo(data)
            break
          case 'update':
            await todoService.updateTodo(data.id, data)
            break
          case 'delete':
            await todoService.deleteTodo(data.id)
            break
        }
        break
      case 'category':
        switch (type) {
          case 'create':
            await todoService.createCategory(data)
            break
          case 'update':
            await todoService.updateCategory(data.id, data)
            break
          case 'delete':
            await todoService.deleteCategory(data.id)
            break
        }
        break
    }
  }

  private async handleConflict(conflict: any) {
    const { addConflictResolution } = useOfflineStore.getState()
    
    addConflictResolution({
      id: crypto.randomUUID(),
      localData: conflict.localData,
      remoteData: conflict.remoteData,
      resource: conflict.resource,
      timestamp: new Date().toISOString(),
      resolved: false
    })

    toast.error('Conflict detected! Please resolve in settings.')
  }

  // Check if we have offline data
  async hasOfflineData(): Promise<boolean> {
    const { syncQueue } = useOfflineStore.getState()
    return syncQueue.length > 0
  }

  // Clear all offline data
  async clearOfflineData() {
    if (!this.db) return

    const stores = ['todos', 'categories', 'sync-queue', 'conflicts']
    const transaction = this.db.transaction(stores, 'readwrite')

    for (const storeName of stores) {
      await transaction.objectStore(storeName).clear()
    }

    useOfflineStore.getState().clearSyncQueue()
  }
}

// Custom error for conflicts
class ConflictError extends Error {
  constructor(public conflict: any) {
    super('Conflict detected')
    this.name = 'ConflictError'
  }
}

export const offlineService = new OfflineService()