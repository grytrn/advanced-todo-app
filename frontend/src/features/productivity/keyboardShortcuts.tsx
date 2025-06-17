import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router-dom'
import { useTodoStore } from '../../store/todoStore'
import { useSearchStore } from '../search/searchStore'
import toast from 'react-hot-toast'

export interface KeyboardShortcut {
  id: string
  keys: string
  description: string
  category: 'navigation' | 'todos' | 'search' | 'productivity'
  action: () => void
  enabled?: boolean
}

// Default keyboard shortcuts
export const defaultShortcuts: Omit<KeyboardShortcut, 'action'>[] = [
  // Navigation
  { id: 'home', keys: 'g h', description: 'Go to home', category: 'navigation' },
  { id: 'todos', keys: 'g t', description: 'Go to todos', category: 'navigation' },
  { id: 'settings', keys: 'g s', description: 'Go to settings', category: 'navigation' },
  
  // Todos
  { id: 'new-todo', keys: 'n', description: 'Create new todo', category: 'todos' },
  { id: 'toggle-complete', keys: 'x', description: 'Toggle todo complete', category: 'todos' },
  { id: 'delete-todo', keys: 'd', description: 'Delete selected todo', category: 'todos' },
  { id: 'edit-todo', keys: 'e', description: 'Edit selected todo', category: 'todos' },
  { id: 'select-next', keys: 'j', description: 'Select next todo', category: 'todos' },
  { id: 'select-prev', keys: 'k', description: 'Select previous todo', category: 'todos' },
  
  // Search
  { id: 'search', keys: '/', description: 'Focus search', category: 'search' },
  { id: 'clear-search', keys: 'esc', description: 'Clear search', category: 'search' },
  { id: 'advanced-search', keys: 'cmd+shift+f', description: 'Toggle advanced search', category: 'search' },
  
  // Productivity
  { id: 'toggle-focus', keys: 'f', description: 'Toggle focus mode', category: 'productivity' },
  { id: 'start-timer', keys: 'space', description: 'Start/stop timer', category: 'productivity' },
  { id: 'show-shortcuts', keys: '?', description: 'Show keyboard shortcuts', category: 'productivity' },
  { id: 'quick-add', keys: 'cmd+enter', description: 'Quick add todo', category: 'productivity' },
]

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const todoStore = useTodoStore()
  const searchStore = useSearchStore()

  // Navigation shortcuts
  useHotkeys('g h', () => navigate('/'), { preventDefault: true })
  useHotkeys('g t', () => navigate('/todos'), { preventDefault: true })
  useHotkeys('g s', () => navigate('/settings'), { preventDefault: true })

  // Todo shortcuts
  useHotkeys('n', () => {
    // Trigger new todo modal
    window.dispatchEvent(new CustomEvent('openNewTodo'))
  }, { preventDefault: true })

  // Search shortcuts
  useHotkeys('/', (e) => {
    e.preventDefault()
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement
    searchInput?.focus()
  })

  useHotkeys('esc', () => {
    searchStore.setSearchQuery('')
  })

  useHotkeys('cmd+shift+f, ctrl+shift+f', () => {
    searchStore.toggleAdvancedMode()
  }, { preventDefault: true })

  // Productivity shortcuts
  useHotkeys('?', () => {
    window.dispatchEvent(new CustomEvent('showShortcuts'))
  })

  // Custom hook for components to register shortcuts
  const registerShortcut = (keys: string, callback: () => void, options?: any) => {
    useHotkeys(keys, callback, options)
  }

  return { registerShortcut }
}

// Keyboard shortcuts modal component
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleShowShortcuts = () => setIsOpen(true)
    window.addEventListener('showShortcuts', handleShowShortcuts)
    return () => window.removeEventListener('showShortcuts', handleShowShortcuts)
  }, [])

  const shortcutsByCategory = defaultShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, typeof defaultShortcuts>)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3 capitalize">
                    {category.replace('-', ' ')}
                  </h3>
                  <div className="space-y-2">
                    {shortcuts.map(shortcut => (
                      <div key={shortcut.id} className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          {shortcut.description}
                        </span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                          {shortcut.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">?</kbd> at any time to show this help
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}