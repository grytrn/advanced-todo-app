import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowMessage(true)
      setTimeout(() => setShowMessage(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowMessage(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {showMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={clsx(
            'fixed top-4 left-1/2 -translate-x-1/2 z-50',
            'px-4 py-2 rounded-lg shadow-lg',
            'flex items-center gap-2',
            isOnline
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          )}
        >
          {isOnline ? (
            <>
              <WifiIcon className="w-5 h-5" />
              <span className="font-medium">Back online</span>
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span className="font-medium">You're offline</span>
            </>
          )}
        </motion.div>
      )}

      {/* Persistent offline banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="bg-amber-500 text-white overflow-hidden"
          >
            <div className="px-4 py-2 flex items-center justify-center gap-2 text-sm">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span>Working offline - changes will sync when reconnected</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  )
}