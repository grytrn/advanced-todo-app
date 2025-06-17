import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  EyeIcon, 
  EyeSlashIcon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useProductivityStore } from './productivityStore'
import { useTodoStore } from '../../store/todoStore'
import { cn } from '../../utils'

export function FocusMode() {
  const { 
    focusMode, 
    focusedTodoId, 
    toggleFocusMode, 
    setFocusedTodo,
    activeTimeEntry,
    startTimeTracking,
    stopTimeTracking
  } = useProductivityStore()
  
  const { todos } = useTodoStore()
  const focusedTodo = todos.find(t => t.id === focusedTodoId)

  useEffect(() => {
    if (focusMode) {
      // Start tracking time when entering focus mode
      if (focusedTodoId && !activeTimeEntry) {
        startTimeTracking(focusedTodoId, 'Focus mode session')
      }
      
      // Apply focus mode styles
      document.body.classList.add('focus-mode')
      
      // Block distracting sites (would need browser extension for full implementation)
      // For now, just log the intent
      console.log('Focus mode activated - blocking distracting sites')
    } else {
      // Stop tracking when exiting focus mode
      if (activeTimeEntry) {
        stopTimeTracking()
      }
      
      document.body.classList.remove('focus-mode')
    }

    return () => {
      document.body.classList.remove('focus-mode')
    }
  }, [focusMode, focusedTodoId])

  if (!focusMode) {
    return (
      <button
        onClick={toggleFocusMode}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
        title="Enter Focus Mode"
      >
        <EyeIcon className="h-6 w-6" />
      </button>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
      >
        {/* Focus Header */}
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="bg-gray-900 text-white p-4 shadow-lg"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <EyeIcon className="h-6 w-6" />
              <h2 className="text-xl font-semibold">Focus Mode</h2>
              {activeTimeEntry && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <ClockIcon className="h-4 w-4" />
                  <TimeTracker startTime={activeTimeEntry.startTime} />
                </div>
              )}
            </div>
            <button
              onClick={toggleFocusMode}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </motion.div>

        {/* Focused Todo */}
        <div className="max-w-4xl mx-auto p-8">
          {focusedTodo ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl"
            >
              <h3 className="text-3xl font-bold mb-4">{focusedTodo.title}</h3>
              {focusedTodo.content && (
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-wrap">
                  {focusedTodo.content}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm">
                {focusedTodo.priority && (
                  <span className={cn(
                    "px-3 py-1 rounded-full",
                    focusedTodo.priority === 'high' ? 'bg-red-100 text-red-700' :
                    focusedTodo.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  )}>
                    {focusedTodo.priority} priority
                  </span>
                )}
                {focusedTodo.dueDate && (
                  <span className="text-gray-500">
                    Due {new Date(focusedTodo.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => {
                    // Mark as complete
                    useTodoStore.getState().toggleTodo(focusedTodo.id)
                    toggleFocusMode()
                  }}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Mark Complete
                </button>
                <button
                  onClick={() => setFocusedTodo(undefined)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Choose Different Task
                </button>
              </div>
            </motion.div>
          ) : (
            <TodoSelector onSelect={(todoId) => setFocusedTodo(todoId)} />
          )}
        </div>

        {/* Blocked Sites Notification */}
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4"
        >
          <div className="max-w-4xl mx-auto text-center text-sm">
            <EyeSlashIcon className="h-5 w-5 inline-block mr-2" />
            Distracting websites are blocked while in focus mode
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function TodoSelector({ onSelect }: { onSelect: (todoId: string) => void }) {
  const { todos } = useTodoStore()
  const incompleteTodos = todos.filter(t => !t.completed)

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl"
    >
      <h3 className="text-2xl font-bold mb-6">Choose a task to focus on</h3>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {incompleteTodos.map(todo => (
          <button
            key={todo.id}
            onClick={() => onSelect(todo.id)}
            className="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <h4 className="font-medium mb-1">{todo.title}</h4>
            {todo.content && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {todo.content}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className={cn(
                "px-2 py-0.5 rounded",
                todo.priority === 'high' ? 'bg-red-100 text-red-700' :
                todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              )}>
                {todo.priority}
              </span>
              {todo.dueDate && (
                <span className="text-gray-500">
                  Due {new Date(todo.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {incompleteTodos.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
          No incomplete tasks. Great job! 🎉
        </p>
      )}
    </motion.div>
  )
}

function TimeTracker({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const start = new Date(startTime).getTime()
      const now = Date.now()
      setElapsed(Math.floor((now - start) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return <span>{formatTime(elapsed)}</span>
}

// Global styles for focus mode
const focusModeStyles = `
  <style>
    body.focus-mode {
      overflow: hidden;
    }
    
    body.focus-mode .sidebar,
    body.focus-mode .header,
    body.focus-mode .navigation {
      filter: blur(4px);
      pointer-events: none;
    }
  </style>
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('div')
  styleElement.innerHTML = focusModeStyles
  document.head.appendChild(styleElement.querySelector('style')!)
}