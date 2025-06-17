import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiIcon, CloudArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useOfflineStore } from './offlineStore'
import { offlineService } from './offlineService'
import { cn } from '../../utils'

export function NetworkStatus() {
  const { isOnline, syncQueue, lastSyncTime } = useOfflineStore()

  useEffect(() => {
    offlineService.init()
  }, [])

  const hasPendingChanges = syncQueue.length > 0

  return (
    <AnimatePresence>
      {(!isOnline || hasPendingChanges) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50"
        >
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg backdrop-blur-md',
              isOnline
                ? 'bg-blue-500/90 text-white'
                : 'bg-red-500/90 text-white'
            )}
          >
            {isOnline ? (
              <>
                {hasPendingChanges ? (
                  <>
                    <CloudArrowUpIcon className="h-5 w-5 animate-pulse" />
                    <span className="text-sm font-medium">
                      Syncing {syncQueue.length} changes...
                    </span>
                  </>
                ) : (
                  <>
                    <WifiIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Online</span>
                  </>
                )}
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Offline - {syncQueue.length} changes pending
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function DetailedNetworkStatus() {
  const { isOnline, syncQueue, lastSyncTime, conflictResolutions } = useOfflineStore()
  const unresolvedConflicts = conflictResolutions.filter(c => !c.resolved)
  const hasPendingChanges = syncQueue.length > 0

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Network Status</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Connection</span>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isOnline ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Pending Changes</span>
            <span className="font-medium">{syncQueue.length}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Unresolved Conflicts</span>
            <span className="font-medium text-red-600">{unresolvedConflicts.length}</span>
          </div>

          {lastSyncTime && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Last Sync</span>
              <span className="font-medium">
                {new Date(lastSyncTime).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {hasPendingChanges && (
          <button
            onClick={() => offlineService.syncOfflineChanges()}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sync Now
          </button>
        )}
      </div>

      {unresolvedConflicts.length > 0 && (
        <ConflictResolution conflicts={unresolvedConflicts} />
      )}
    </div>
  )
}

function ConflictResolution({ conflicts }: { conflicts: any[] }) {
  const { resolveConflict } = useOfflineStore()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-red-600">Resolve Conflicts</h3>
      
      <div className="space-y-4">
        {conflicts.map(conflict => (
          <div key={conflict.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {conflict.resource} conflict from {new Date(conflict.timestamp).toLocaleString()}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-medium mb-1">Local Version</h4>
                <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                  {JSON.stringify(conflict.localData, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-1">Remote Version</h4>
                <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                  {JSON.stringify(conflict.remoteData, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => resolveConflict(conflict.id, 'local')}
                className="flex-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Keep Local
              </button>
              <button
                onClick={() => resolveConflict(conflict.id, 'remote')}
                className="flex-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Keep Remote
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}