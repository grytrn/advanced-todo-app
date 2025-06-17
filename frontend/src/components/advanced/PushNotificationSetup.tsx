import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BellIcon,
  BellAlertIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { showToast } from './ToastNotification'

export const PushNotificationSetup: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if browser supports notifications
    if ('Notification' in window) {
      setPermission(Notification.permission)
      
      // Show prompt if not yet decided
      if (Notification.permission === 'default') {
        // Delay showing prompt for better UX
        const timer = setTimeout(() => {
          setShowPrompt(true)
        }, 5000)
        
        return () => clearTimeout(timer)
      }
    }
    return () => {} // Ensure all code paths return
  }, [])

  const requestPermission = async () => {
    setIsLoading(true)
    
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      
      if (result === 'granted') {
        // Show test notification
        new Notification('Notifications Enabled!', {
          body: 'You\'ll receive important updates about your tasks.',
          icon: '/favicon.ico',
          tag: 'welcome',
        })
        
        showToast({
          type: 'success',
          title: 'Notifications enabled',
          message: 'You\'ll receive updates about your tasks',
        })
        
        // Save preference
        localStorage.setItem('push-notifications-enabled', 'true')
      } else if (result === 'denied') {
        showToast({
          type: 'error',
          title: 'Notifications blocked',
          message: 'You can enable them in your browser settings',
        })
      }
      
      setShowPrompt(false)
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to setup notifications',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const dismissPrompt = () => {
    setShowPrompt(false)
    localStorage.setItem('push-notifications-dismissed', 'true')
  }

  // Don't show if already dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('push-notifications-dismissed')
    if (dismissed === 'true') {
      setShowPrompt(false)
    }
  }, [])

  return (
    <>
      {/* Floating prompt */}
      <AnimatePresence>
        {showPrompt && permission === 'default' && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-20 right-6 max-w-sm z-40"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <BellAlertIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Enable Push Notifications
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Get notified about due dates, reminders, and task updates
                    </p>
                  </div>
                  <button
                    onClick={dismissPrompt}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={requestPermission}
                    disabled={isLoading}
                    className={clsx(
                      'flex-1 px-4 py-2 rounded-lg font-medium transition-all',
                      'bg-blue-600 hover:bg-blue-700 text-white',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isLoading ? 'Setting up...' : 'Enable Notifications'}
                  </button>
                  <button
                    onClick={dismissPrompt}
                    className="px-4 py-2 rounded-lg font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings indicator */}
      {permission === 'granted' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-4 right-4 z-30"
        >
          <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckIcon className="w-3 h-3" />
            Notifications enabled
          </div>
        </motion.div>
      )}
    </>
  )
}

// Notification preferences component for settings page
export const NotificationPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState({
    dueDateReminders: true,
    dailySummary: false,
    taskUpdates: true,
    soundEnabled: true,
  })

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
    
    // Save to localStorage
    localStorage.setItem('notification-preferences', JSON.stringify({
      ...preferences,
      [key]: !preferences[key],
    }))
    
    showToast({
      type: 'success',
      message: 'Notification preferences updated',
    })
  }

  useEffect(() => {
    const saved = localStorage.getItem('notification-preferences')
    if (saved) {
      setPreferences(JSON.parse(saved))
    }
  }, [])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <BellIcon className="w-6 h-6 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notification Preferences
        </h3>
      </div>

      <div className="space-y-4">
        {[
          {
            key: 'dueDateReminders' as const,
            label: 'Due Date Reminders',
            description: 'Get notified when tasks are due',
          },
          {
            key: 'dailySummary' as const,
            label: 'Daily Summary',
            description: 'Receive a daily overview of your tasks',
          },
          {
            key: 'taskUpdates' as const,
            label: 'Task Updates',
            description: 'Notifications for task changes',
          },
          {
            key: 'soundEnabled' as const,
            label: 'Sound Effects',
            description: 'Play sounds for notifications',
          },
        ].map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {label}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            </div>
            <button
              onClick={() => handleToggle(key)}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                preferences[key]
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  preferences[key] ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}