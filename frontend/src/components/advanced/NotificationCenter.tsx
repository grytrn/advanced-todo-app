import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  ClockIcon,
  CalendarIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { format, formatDistanceToNow } from 'date-fns'

export interface Notification {
  id: string
  type: 'task-due' | 'task-completed' | 'reminder' | 'system'
  title: string
  message: string
  timestamp: Date
  read: boolean
  taskId?: string
  actionUrl?: string
}

interface NotificationCenterProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const unreadCount = notifications.filter(n => !n.read).length
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task-due':
        return <ClockIcon className="w-5 h-5 text-amber-500" />
      case 'task-completed':
        return <CheckIcon className="w-5 h-5 text-green-500" />
      case 'reminder':
        return <BellIcon className="w-5 h-5 text-blue-500" />
      case 'system':
        return <InformationCircleIcon className="w-5 h-5 text-gray-500" />
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
    
    if (notification.actionUrl) {
      // Navigate to the relevant page
      window.location.href = notification.actionUrl
    }
    
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        {unreadCount > 0 ? (
          <BellIconSolid className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        ) : (
          <BellIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            />

            {/* Notification Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={clsx(
                'absolute right-0 mt-2 z-50',
                'w-96 max-w-[calc(100vw-2rem)]',
                'bg-white dark:bg-gray-800 rounded-lg shadow-2xl',
                'max-h-[80vh] flex flex-col'
              )}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkAllAsRead}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Mark all as read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={onClearAll}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2">
                  {(['all', 'unread'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilter(tab)}
                      className={clsx(
                        'px-3 py-1 rounded-lg text-sm font-medium capitalize transition-colors',
                        filter === tab
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      {tab}
                      {tab === 'unread' && unreadCount > 0 && (
                        <span className="ml-1">({unreadCount})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <BellIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredNotifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={clsx(
                          'p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors',
                          !notification.read && 'bg-blue-50/50 dark:bg-blue-900/10'
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className={clsx(
                                  'text-sm font-medium',
                                  notification.read
                                    ? 'text-gray-900 dark:text-white'
                                    : 'text-gray-900 dark:text-white'
                                )}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                </p>
                              </div>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDelete(notification.id)
                                }}
                                className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                              >
                                <TrashIcon className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 5 && (
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
                  <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                    View all notifications
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Notification badge for minimal display
export const NotificationBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="fixed top-4 right-4 z-30"
    >
      <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
        <BellIcon className="w-4 h-4" />
        {count > 99 ? '99+' : count}
      </div>
    </motion.div>
  )
}