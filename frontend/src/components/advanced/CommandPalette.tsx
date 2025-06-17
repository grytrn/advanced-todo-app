import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'
import { 
  MagnifyingGlassIcon,
  XMarkIcon,
  PlusIcon,
  CheckIcon,
  TrashIcon,
  PencilIcon,
  HashtagIcon,
  FolderIcon,
  ClockIcon,
  ChartBarIcon,
  ViewColumnsIcon,
  CalendarIcon,
  Cog6ToothIcon,
  ArrowRightIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline'
import { useTodoStore } from '../../store/todoStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type CommandType = 'action' | 'navigation' | 'search' | 'settings'

interface Command {
  id: string
  type: CommandType
  title: string
  description?: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void | Promise<void>
  keywords?: string[]
}

interface CommandGroup {
  title: string
  commands: Command[]
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  
  const navigate = useNavigate()
  const { 
    todos, 
    addTodo, 
    toggleTodo, 
    deleteTodo,
    categories,
    setSearchQuery,
    setFilterBy,
    setSortBy,
  } = useTodoStore()

  // Open/close with cmd+k
  useHotkeys('cmd+k, ctrl+k', (e) => {
    e.preventDefault()
    setIsOpen(!isOpen)
  }, [isOpen])

  // Close on escape
  useHotkeys('escape', () => {
    if (isOpen) {
      setIsOpen(false)
    }
  }, { enableOnFormTags: true }, [isOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setSearch('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Command definitions
  const commands = useMemo<CommandGroup[]>(() => [
    {
      title: 'Actions',
      commands: [
        {
          id: 'add-todo',
          type: 'action',
          title: 'Add New Task',
          description: 'Create a new todo item',
          icon: <PlusIcon className="w-5 h-5" />,
          shortcut: 'Ctrl+N',
          action: async () => {
            await addTodo({
              title: 'New Task',
              content: '',
              completed: false,
              priority: 'medium',
              tags: [],
            })
            setIsOpen(false)
            toast.success('Task added!')
          },
        },
        {
          id: 'toggle-theme',
          type: 'action',
          title: 'Toggle Theme',
          description: 'Switch between light and dark mode',
          icon: <Cog6ToothIcon className="w-5 h-5" />,
          action: () => {
            document.documentElement.classList.toggle('dark')
            setIsOpen(false)
            toast.success('Theme toggled!')
          },
        },
        {
          id: 'clear-completed',
          type: 'action',
          title: 'Clear Completed Tasks',
          description: 'Delete all completed todos',
          icon: <TrashIcon className="w-5 h-5" />,
          action: async () => {
            const completedTodos = todos.filter(t => t.completed)
            for (const todo of completedTodos) {
              await deleteTodo(todo.id)
            }
            setIsOpen(false)
            toast.success(`Cleared ${completedTodos.length} completed tasks`)
          },
        },
      ],
    },
    {
      title: 'Navigation',
      commands: [
        {
          id: 'nav-dashboard',
          type: 'navigation',
          title: 'Go to Dashboard',
          icon: <ChartBarIcon className="w-5 h-5" />,
          action: () => {
            navigate('/dashboard')
            setIsOpen(false)
          },
        },
        {
          id: 'nav-todos',
          type: 'navigation',
          title: 'Go to Tasks',
          icon: <CheckIcon className="w-5 h-5" />,
          action: () => {
            navigate('/todos')
            setIsOpen(false)
          },
        },
        {
          id: 'nav-calendar',
          type: 'navigation',
          title: 'View Calendar',
          icon: <CalendarIcon className="w-5 h-5" />,
          action: () => {
            navigate('/todos?view=calendar')
            setIsOpen(false)
          },
        },
        {
          id: 'nav-kanban',
          type: 'navigation',
          title: 'View Kanban Board',
          icon: <ViewColumnsIcon className="w-5 h-5" />,
          action: () => {
            navigate('/todos?view=kanban')
            setIsOpen(false)
          },
        },
        {
          id: 'nav-timeline',
          type: 'navigation',
          title: 'View Timeline',
          icon: <ClockIcon className="w-5 h-5" />,
          action: () => {
            navigate('/todos?view=timeline')
            setIsOpen(false)
          },
        },
        {
          id: 'nav-settings',
          type: 'navigation',
          title: 'Go to Settings',
          icon: <Cog6ToothIcon className="w-5 h-5" />,
          action: () => {
            navigate('/settings')
            setIsOpen(false)
          },
        },
      ],
    },
    {
      title: 'Filters & Sort',
      commands: [
        {
          id: 'filter-all',
          type: 'settings',
          title: 'Show All Tasks',
          icon: <HashtagIcon className="w-5 h-5" />,
          action: () => {
            setFilterBy('all')
            setIsOpen(false)
          },
        },
        {
          id: 'filter-active',
          type: 'settings',
          title: 'Show Active Tasks',
          icon: <ClockIcon className="w-5 h-5" />,
          action: () => {
            setFilterBy('active')
            setIsOpen(false)
          },
        },
        {
          id: 'filter-completed',
          type: 'settings',
          title: 'Show Completed Tasks',
          icon: <CheckIcon className="w-5 h-5" />,
          action: () => {
            setFilterBy('completed')
            setIsOpen(false)
          },
        },
        {
          id: 'sort-date',
          type: 'settings',
          title: 'Sort by Date',
          icon: <CalendarIcon className="w-5 h-5" />,
          action: () => {
            setSortBy('date')
            setIsOpen(false)
          },
        },
        {
          id: 'sort-priority',
          type: 'settings',
          title: 'Sort by Priority',
          icon: <HashtagIcon className="w-5 h-5" />,
          action: () => {
            setSortBy('priority')
            setIsOpen(false)
          },
        },
        {
          id: 'sort-title',
          type: 'settings',
          title: 'Sort by Title',
          icon: <HashtagIcon className="w-5 h-5" />,
          action: () => {
            setSortBy('title')
            setIsOpen(false)
          },
        },
      ],
    },
    {
      title: 'Tasks',
      commands: todos.slice(0, 5).map(todo => ({
        id: `todo-${todo.id}`,
        type: 'search' as CommandType,
        title: todo.title,
        description: todo.completed ? 'Completed' : 'Active',
        icon: todo.completed ? <CheckIcon className="w-5 h-5" /> : <PencilIcon className="w-5 h-5" />,
        action: () => {
          toggleTodo(todo.id)
          setIsOpen(false)
          toast.success(todo.completed ? 'Task uncompleted' : 'Task completed!')
        },
      })),
    },
    ...(categories.length > 0 ? [{
      title: 'Categories',
      commands: categories.map(cat => ({
        id: `cat-${cat.id}`,
        type: 'search' as CommandType,
        title: cat.name,
        icon: <FolderIcon className="w-5 h-5" />,
        action: () => {
          navigate(`/todos?category=${cat.id}`)
          setIsOpen(false)
        },
      })),
    }] : []),
  ], [todos, categories, navigate, addTodo, toggleTodo, deleteTodo, setFilterBy, setSortBy])

  // Filter commands based on search
  const filteredGroups = useMemo(() => {
    if (!search) return commands

    return commands
      .map(group => ({
        ...group,
        commands: group.commands.filter(cmd => {
          const searchLower = search.toLowerCase()
          return (
            cmd.title.toLowerCase().includes(searchLower) ||
            cmd.description?.toLowerCase().includes(searchLower) ||
            cmd.keywords?.some(k => k.toLowerCase().includes(searchLower))
          )
        }),
      }))
      .filter(group => group.commands.length > 0)
  }, [commands, search])

  // Flatten commands for keyboard navigation
  const allFilteredCommands = useMemo(() => 
    filteredGroups.flatMap(g => g.commands),
    [filteredGroups]
  )

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, allFilteredCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (allFilteredCommands[selectedIndex]) {
          allFilteredCommands[selectedIndex].action()
        }
        break
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('[data-command-item]')
      items[selectedIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  return (
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

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-x-4 top-20 mx-auto max-w-2xl z-50"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 mr-3" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setSelectedIndex(0)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500"
                />
                <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                  ESC
                </kbd>
              </div>

              {/* Command List */}
              <div 
                ref={listRef}
                className="max-h-96 overflow-y-auto py-2"
              >
                {filteredGroups.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <CommandLineIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No commands found</p>
                  </div>
                ) : (
                  filteredGroups.map((group, groupIndex) => (
                    <div key={group.title}>
                      {groupIndex > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                      )}
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        {group.title}
                      </div>
                      {group.commands.map((cmd, cmdIndex) => {
                        const globalIndex = allFilteredCommands.findIndex(c => c.id === cmd.id)
                        const isSelected = globalIndex === selectedIndex
                        
                        return (
                          <button
                            key={cmd.id}
                            data-command-item
                            onClick={() => cmd.action()}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={clsx(
                              'w-full px-4 py-2 flex items-center gap-3 text-left transition-colors',
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            )}
                          >
                            <div className={clsx(
                              'flex-shrink-0',
                              isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                            )}>
                              {cmd.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {cmd.title}
                              </div>
                              {cmd.description && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {cmd.description}
                                </div>
                              )}
                            </div>
                            {cmd.shortcut && (
                              <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                {cmd.shortcut}
                              </kbd>
                            )}
                            {isSelected && (
                              <ArrowRightIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd>
                    Select
                  </span>
                </div>
                <span>Press Cmd+K to toggle</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}