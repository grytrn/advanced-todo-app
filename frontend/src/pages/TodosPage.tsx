import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { PlusIcon, FunnelIcon, ClipboardDocumentListIcon, ViewColumnsIcon, CalendarIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { useTodoStore } from '../store'
import { TodoCard, TodoModal, FilterBar } from '../components'
import { CalendarView, KanbanBoard, TimelineView, QuickAddWidget } from '../components/advanced'
import { BulkOperations, FocusMode, PomodoroTimer } from '../features'
import { cn } from '../utils'

type ViewType = 'list' | 'kanban' | 'calendar' | 'timeline'

export function TodosPage() {
  const {
    todos,
    fetchTodos,
    fetchCategories,
    reorderTodos,
    selectedCategory,
    searchQuery,
    sortBy,
    filterBy,
  } = useTodoStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [viewType, setViewType] = useState<ViewType>('list')
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [focusModeEnabled, setFocusModeEnabled] = useState(false)
  const [selectedTodos, setSelectedTodos] = useState<string[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchTodos()
    fetchCategories()
  }, [fetchTodos, fetchCategories])

  // Filter and sort todos
  const filteredTodos = todos.filter((todo) => {
    // Apply category filter
    if (selectedCategory && todo.categoryId !== selectedCategory) {
      return false
    }

    // Apply search filter
    if (searchQuery && !todo.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Apply status filter
    if (filterBy === 'active' && todo.completed) {
      return false
    }
    if (filterBy === 'completed' && !todo.completed) {
      return false
    }

    return true
  })

  // Sort todos
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      case 'title':
        return a.title.localeCompare(b.title)
      case 'date':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = sortedTodos.findIndex((todo) => todo.id === active.id)
      const newIndex = sortedTodos.findIndex((todo) => todo.id === over?.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderTodos(oldIndex, newIndex)
      }
    }
  }

  const handleCreateTodo = () => {
    setEditingTodo(null)
    setIsModalOpen(true)
  }

  const handleEditTodo = (todoId: string) => {
    setEditingTodo(todoId)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Tasks</h1>
          <p className="text-muted-foreground mt-1">
            {filteredTodos.length} {filteredTodos.length === 1 ? 'task' : 'tasks'} found
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Type Selector */}
          <div className="flex items-center space-x-1 bg-secondary/20 rounded-lg p-1">
            <button
              onClick={() => setViewType('list')}
              className={cn(
                'p-2 rounded transition-colors',
                viewType === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/50'
              )}
              title="List View"
            >
              <ChartBarIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewType('kanban')}
              className={cn(
                'p-2 rounded transition-colors',
                viewType === 'kanban' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/50'
              )}
              title="Kanban Board"
            >
              <ViewColumnsIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewType('calendar')}
              className={cn(
                'p-2 rounded transition-colors',
                viewType === 'calendar' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/50'
              )}
              title="Calendar View"
            >
              <CalendarIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewType('timeline')}
              className={cn(
                'p-2 rounded transition-colors',
                viewType === 'timeline' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/50'
              )}
              title="Timeline View"
            >
              <ChartBarIcon className="h-5 w-5 rotate-90" />
            </button>
          </div>

          {/* Productivity Tools */}
          <FocusMode />
          <PomodoroTimer />
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'btn-outline',
              showFilters && 'bg-primary text-primary-foreground'
            )}
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateTodo}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Task
          </motion.button>
        </div>
      </div>

      {/* Filter Bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FilterBar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Operations */}
      {selectedTodos.length > 0 && (
        <BulkOperations />
      )}

      {/* Quick Add Widget */}
      {showQuickAdd && (
        <QuickAddWidget />
      )}

      {/* Content based on view type */}
      {viewType === 'list' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedTodos.map(todo => todo.id)}
            strategy={verticalListSortingStrategy}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {sortedTodos.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  onEdit={() => handleEditTodo(todo.id)}
                />
              ))}
            </motion.div>
          </SortableContext>
        </DndContext>
      )}
      
      {viewType === 'kanban' && (
        <KanbanBoard />
      )}
      
      {viewType === 'calendar' && (
        <CalendarView />
      )}
      
      {viewType === 'timeline' && (
        <TimelineView />
      )}
      
      {sortedTodos.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center"
        >
          <div className="max-w-md mx-auto">
            <ClipboardDocumentListIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || selectedCategory
                ? 'Try adjusting your filters or search query'
                : 'Create your first task to get started'}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateTodo}
              className="btn-primary mx-auto"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Task
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Todo Modal */}
      <TodoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        todoId={editingTodo}
      />
    </div>
  )
}