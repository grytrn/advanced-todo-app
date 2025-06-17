import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PlusIcon, 
  XMarkIcon,
  MicrophoneIcon,
  PhotoIcon,
  CalendarIcon,
  TagIcon,
  FlagIcon,
} from '@heroicons/react/24/outline'
import { useTodoStore } from '../../store/todoStore'
import { useHotkeys } from 'react-hotkeys-hook'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface QuickAction {
  icon: React.ReactNode
  label: string
  action: () => void
  color: string
}

export const QuickAddWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [quickText, setQuickText] = useState('')
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { addTodo, categories } = useTodoStore()

  // Keyboard shortcut to open quick add
  useHotkeys('ctrl+n, cmd+n', (e) => {
    e.preventDefault()
    setIsOpen(true)
  })

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleQuickAdd = async () => {
    if (!quickText.trim()) {
      toast.error('Please enter a task title')
      return
    }

    try {
      await addTodo({
        title: quickText,
        content: '',
        completed: false,
        priority: selectedPriority,
        tags: [],
        dueDate: selectedDate || undefined,
      })
      
      // Reset form
      setQuickText('')
      setSelectedPriority('medium')
      setSelectedDate('')
      setIsOpen(false)
      
      toast.success('Task added!')
    } catch (error) {
      toast.error('Failed to add task')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleQuickAdd()
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const quickActions: QuickAction[] = [
    {
      icon: <MicrophoneIcon className="w-5 h-5" />,
      label: 'Voice Note',
      action: () => {
        toast('Voice notes coming soon!', { icon: '🎤' })
      },
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      icon: <PhotoIcon className="w-5 h-5" />,
      label: 'Add Image',
      action: () => {
        toast('Image upload coming soon!', { icon: '📷' })
      },
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      icon: <CalendarIcon className="w-5 h-5" />,
      label: 'Set Date',
      action: () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setSelectedDate(tomorrow.toISOString().split('T')[0] as string)
      },
      color: 'bg-green-500 hover:bg-green-600',
    },
  ]

  const priorityColors = {
    low: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    medium: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    high: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={clsx(
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 bg-blue-600 hover:bg-blue-700',
          'rounded-full shadow-lg hover:shadow-xl',
          'flex items-center justify-center',
          'text-white transition-all duration-200',
          'group'
        )}
      >
        <PlusIcon className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
        
        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Quick Add (Ctrl+N)
        </span>
      </motion.button>

      {/* Quick Add Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed bottom-20 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Quick Add Task
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                  {/* Task Input */}
                  <div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={quickText}
                      onChange={(e) => setQuickText(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="What needs to be done?"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Priority Selection */}
                  <div className="flex items-center gap-2">
                    <FlagIcon className="w-5 h-5 text-gray-400" />
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map((priority) => (
                        <button
                          key={priority}
                          onClick={() => setSelectedPriority(priority)}
                          className={clsx(
                            'px-3 py-1 rounded-full text-sm font-medium capitalize transition-all',
                            selectedPriority === priority
                              ? priorityColors[priority]
                              : 'text-gray-500 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          )}
                        >
                          {priority}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Due Date */}
                  {selectedDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="w-5 h-5 text-gray-400" />
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                      />
                      <button
                        onClick={() => setSelectedDate('')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    {quickActions.map((action, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={action.action}
                        className={clsx(
                          'p-2 rounded-lg text-white transition-all',
                          action.color
                        )}
                        title={action.label}
                      >
                        {action.icon}
                      </motion.button>
                    ))}
                  </div>

                  {/* Category Selection */}
                  {categories.length > 0 && (
                    <div className="flex items-center gap-2">
                      <TagIcon className="w-5 h-5 text-gray-400" />
                      <select className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <option value="">No category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 bg-gray-50 dark:bg-gray-900">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuickAdd}
                    disabled={!quickText.trim()}
                    className={clsx(
                      'px-4 py-2 rounded-lg font-medium transition-all',
                      quickText.trim()
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    Add Task
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mini Actions (when FAB is hovered) */}
      <AnimatePresence>
        {false && ( // Disabled for now, can be enabled later
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 right-6 space-y-2"
          >
            {quickActions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={action.action}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-full text-white shadow-lg',
                  action.color
                )}
              >
                {action.icon}
                <span className="text-sm">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}