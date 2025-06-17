import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckIcon,
  TrashIcon,
  TagIcon,
  FolderIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useProductivityStore } from './productivityStore'
import { useTodoStore } from '../../store/todoStore'
import { cn } from '../../utils'
import toast from 'react-hot-toast'

export function BulkOperations() {
  const { selectedTodos, clearSelection } = useProductivityStore()
  const { todos, categories, updateTodo, deleteTodo } = useTodoStore()
  const [showActions, setShowActions] = useState(false)
  const [bulkAction, setBulkAction] = useState<string | null>(null)

  const selectedItems = todos.filter(t => selectedTodos.includes(t.id))
  const count = selectedItems.length

  if (count === 0) return null

  const handleBulkComplete = async () => {
    try {
      await Promise.all(
        selectedItems.map(todo => updateTodo(todo.id, { completed: true }))
      )
      clearSelection()
      toast.success(`Marked ${count} todos as complete`)
    } catch (error) {
      toast.error('Failed to complete todos')
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${count} todos? This cannot be undone.`)) return

    try {
      await Promise.all(
        selectedItems.map(todo => deleteTodo(todo.id))
      )
      clearSelection()
      toast.success(`Deleted ${count} todos`)
    } catch (error) {
      toast.error('Failed to delete todos')
    }
  }

  const handleBulkPriority = async (priority: 'low' | 'medium' | 'high') => {
    try {
      await Promise.all(
        selectedItems.map(todo => updateTodo(todo.id, { priority }))
      )
      clearSelection()
      toast.success(`Updated priority for ${count} todos`)
    } catch (error) {
      toast.error('Failed to update priority')
    }
  }

  return (
    <>
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white rounded-lg shadow-2xl p-4 z-40"
          >
            <div className="flex items-center gap-4">
              <span className="font-medium">{count} selected</span>
              
              <div className="h-6 w-px bg-gray-600" />
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkComplete}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Mark as complete"
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
                
                <button
                  onClick={() => setBulkAction('priority')}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Change priority"
                >
                  <ArrowUpIcon className="h-5 w-5" />
                </button>
                
                <button
                  onClick={() => setBulkAction('category')}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Change category"
                >
                  <FolderIcon className="h-5 w-5" />
                </button>
                
                <button
                  onClick={() => setBulkAction('tags')}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Add tags"
                >
                  <TagIcon className="h-5 w-5" />
                </button>
                
                <button
                  onClick={() => setBulkAction('dueDate')}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Set due date"
                >
                  <CalendarIcon className="h-5 w-5" />
                </button>
                
                <div className="h-6 w-px bg-gray-600" />
                
                <button
                  onClick={handleBulkDelete}
                  className="p-2 hover:bg-red-600 rounded-lg transition-colors text-red-400"
                  title="Delete selected"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="h-6 w-px bg-gray-600" />
              
              <button
                onClick={clearSelection}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Action Dialogs */}
      <AnimatePresence>
        {bulkAction === 'priority' && (
          <BulkPriorityDialog
            onSelect={handleBulkPriority}
            onClose={() => setBulkAction(null)}
          />
        )}
        
        {bulkAction === 'category' && (
          <BulkCategoryDialog
            categories={categories}
            onSelect={async (categoryId) => {
              try {
                await Promise.all(
                  selectedItems.map(todo => updateTodo(todo.id, { categoryId }))
                )
                clearSelection()
                toast.success(`Updated category for ${count} todos`)
              } catch (error) {
                toast.error('Failed to update category')
              }
              setBulkAction(null)
            }}
            onClose={() => setBulkAction(null)}
          />
        )}
        
        {bulkAction === 'tags' && (
          <BulkTagsDialog
            onApply={async (tags) => {
              try {
                await Promise.all(
                  selectedItems.map(todo => updateTodo(todo.id, { 
                    tags: [...new Set([...todo.tags, ...tags])] 
                  }))
                )
                clearSelection()
                toast.success(`Added tags to ${count} todos`)
              } catch (error) {
                toast.error('Failed to add tags')
              }
              setBulkAction(null)
            }}
            onClose={() => setBulkAction(null)}
          />
        )}
        
        {bulkAction === 'dueDate' && (
          <BulkDueDateDialog
            onSelect={async (dueDate) => {
              try {
                await Promise.all(
                  selectedItems.map(todo => updateTodo(todo.id, { dueDate }))
                )
                clearSelection()
                toast.success(`Updated due date for ${count} todos`)
              } catch (error) {
                toast.error('Failed to update due date')
              }
              setBulkAction(null)
            }}
            onClose={() => setBulkAction(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function BulkPriorityDialog({ 
  onSelect, 
  onClose 
}: {
  onSelect: (priority: 'low' | 'medium' | 'high') => void
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Set Priority</h3>
        
        <div className="space-y-2">
          <button
            onClick={() => onSelect('high')}
            className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-3"
          >
            <div className="w-4 h-4 bg-red-500 rounded-full" />
            <span>High Priority</span>
          </button>
          
          <button
            onClick={() => onSelect('medium')}
            className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-3"
          >
            <div className="w-4 h-4 bg-yellow-500 rounded-full" />
            <span>Medium Priority</span>
          </button>
          
          <button
            onClick={() => onSelect('low')}
            className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-3"
          >
            <div className="w-4 h-4 bg-gray-500 rounded-full" />
            <span>Low Priority</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function BulkCategoryDialog({ 
  categories, 
  onSelect, 
  onClose 
}: {
  categories: any[]
  onSelect: (categoryId: string) => void
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Set Category</h3>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <button
            onClick={() => onSelect('')}
            className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            No Category
          </button>
          
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-3"
            >
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: category.color }}
              />
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

function BulkTagsDialog({ 
  onApply, 
  onClose 
}: {
  onApply: (tags: string[]) => void
  onClose: () => void
}) {
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const addTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput])
      setTagInput('')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Add Tags</h3>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Enter tag"
            className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700"
            autoFocus
          />
          <button
            onClick={addTag}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Add
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map(tag => (
            <span
              key={tag}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm flex items-center gap-1"
            >
              {tag}
              <button
                onClick={() => setTags(tags.filter(t => t !== tag))}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onApply(tags)}
            disabled={tags.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Apply Tags
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function BulkDueDateDialog({ 
  onSelect, 
  onClose 
}: {
  onSelect: (dueDate: string) => void
  onClose: () => void
}) {
  const [dueDate, setDueDate] = useState('')

  const quickDates = [
    { label: 'Today', value: new Date().toISOString().split('T')[0] },
    { label: 'Tomorrow', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
    { label: 'Next Week', value: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] },
    { label: 'Next Month', value: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Set Due Date</h3>
        
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 mb-4"
        />
        
        <div className="space-y-2 mb-4">
          {quickDates.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setDueDate(value)}
              className={cn(
                "w-full p-2 text-left rounded-lg transition-colors",
                dueDate === value
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              {label} ({new Date(value).toLocaleDateString()})
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onSelect(dueDate)}
            disabled={!dueDate}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Set Due Date
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}