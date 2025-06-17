import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import toast, { Toaster } from 'react-hot-toast'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastAction {
  label: string
  action: () => void
}

interface ToastOptions {
  type?: ToastType
  title?: string
  message: string
  duration?: number
  actions?: ToastAction[]
}

const toastIcons = {
  success: <CheckCircleIcon className="w-6 h-6 text-green-500" />,
  error: <XCircleIcon className="w-6 h-6 text-red-500" />,
  warning: <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />,
  info: <InformationCircleIcon className="w-6 h-6 text-blue-500" />,
}

const toastStyles = {
  success: 'border-green-500',
  error: 'border-red-500',
  warning: 'border-amber-500',
  info: 'border-blue-500',
}

export const showToast = (options: ToastOptions) => {
  const { type = 'info', title, message, actions, duration = 4000 } = options

  toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={clsx(
              'max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto',
              'border-l-4 overflow-hidden',
              toastStyles[type]
            )}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {toastIcons[type]}
                </div>
                <div className="ml-3 flex-1">
                  {title && (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {title}
                    </p>
                  )}
                  <p className={clsx(
                    'text-sm text-gray-600 dark:text-gray-400',
                    title && 'mt-1'
                  )}>
                    {message}
                  </p>
                  {actions && actions.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      {actions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            action.action()
                            toast.dismiss(t.id)
                          }}
                          className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    { duration }
  )
}

interface ToastProviderProps {
  children?: React.ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        containerStyle={{
          top: 20,
          right: 20,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
          },
        }}
      />
    </>
  )
}