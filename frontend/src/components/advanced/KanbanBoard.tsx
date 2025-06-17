import React, { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTodoStore, Todo } from '../../store/todoStore'
import { motion } from 'framer-motion'
import { 
  ViewColumnsIcon, 
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import clsx from 'clsx'

type KanbanColumn = 'todo' | 'in-progress' | 'done'

interface KanbanColumnData {
  id: KanbanColumn
  title: string
  color: string
  icon: React.ReactNode
}

const columns: KanbanColumnData[] = [
  {
    id: 'todo',
    title: 'To Do',
    color: 'bg-gray-100 dark:bg-gray-700',
    icon: <ViewColumnsIcon className="w-5 h-5" />,
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    color: 'bg-blue-50 dark:bg-blue-900/20',
    icon: <ClockIcon className="w-5 h-5" />,
  },
  {
    id: 'done',
    title: 'Done',
    color: 'bg-green-50 dark:bg-green-900/20',
    icon: <CheckCircleIcon className="w-5 h-5" />,
  },
]

const SortableCard: React.FC<{ todo: Todo }> = ({ todo }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityColors = {
    high: 'border-red-400 bg-red-50 dark:bg-red-900/10',
    medium: 'border-amber-400 bg-amber-50 dark:bg-amber-900/10',
    low: 'border-green-400 bg-green-50 dark:bg-green-900/10',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-2',
        'hover:shadow-md transition-all cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50',
        priorityColors[todo.priority]
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white flex-1 pr-2">
          {todo.title}
        </h4>
        {todo.priority === 'high' && (
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
        )}
      </div>
      
      {todo.content && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {todo.content}
        </p>
      )}

      <div className="flex items-center justify-between text-xs">
        {todo.dueDate && (
          <span className="text-gray-500 dark:text-gray-400">
            Due {format(new Date(todo.dueDate), 'MMM d')}
          </span>
        )}
        {todo.tags.length > 0 && (
          <div className="flex gap-1">
            {todo.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
            {todo.tags.length > 2 && (
              <span className="px-2 py-1 text-gray-500">
                +{todo.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const DroppableColumn: React.FC<{
  column: KanbanColumnData
  todos: Todo[]
  onAddTodo: () => void
}> = ({ column, todos, onAddTodo }) => {
  const todoIds = todos.map(t => t.id)

  return (
    <div className={clsx(
      'flex-1 rounded-lg p-4',
      column.color
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {column.icon}
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {column.title}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {todos.length}
          </span>
        </div>
        <button
          onClick={onAddTodo}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <PlusIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px]">
          {todos.map((todo) => (
            <SortableCard key={todo.id} todo={todo} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

export const KanbanBoard: React.FC = () => {
  const { todos, updateTodo, addTodo } = useTodoStore()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Group todos by status (using completed and a custom status field)
  const getTodosByColumn = (columnId: KanbanColumn): Todo[] => {
    switch (columnId) {
      case 'todo':
        return todos.filter(t => !t.completed && (!t.status || t.status === 'todo'))
      case 'in-progress':
        return todos.filter(t => !t.completed && t.status === 'in-progress')
      case 'done':
        return todos.filter(t => t.completed)
      default:
        return []
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find which column the item was dropped into
    let targetColumn: KanbanColumn | null = null
    for (const column of columns) {
      const columnTodos = getTodosByColumn(column.id)
      if (column.id === overId || columnTodos.some(t => t.id === overId)) {
        targetColumn = column.id
        break
      }
    }

    if (targetColumn) {
      // Update todo status based on column
      const updates: Partial<Todo> & { status?: string } = {}
      
      switch (targetColumn) {
        case 'todo':
          updates.completed = false
          updates.status = 'todo'
          break
        case 'in-progress':
          updates.completed = false
          updates.status = 'in-progress'
          break
        case 'done':
          updates.completed = true
          updates.status = 'done'
          break
      }

      updateTodo(activeId, updates)
    }

    setActiveId(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // Handle reordering within the same column
    const activeColumn = columns.find(col => 
      getTodosByColumn(col.id).some(t => t.id === activeId)
    )
    const overColumn = columns.find(col =>
      getTodosByColumn(col.id).some(t => t.id === overId)
    )

    if (activeColumn && overColumn && activeColumn.id === overColumn.id) {
      const columnTodos = getTodosByColumn(activeColumn.id)
      const activeIndex = columnTodos.findIndex(t => t.id === activeId)
      const overIndex = columnTodos.findIndex(t => t.id === overId)

      if (activeIndex !== -1 && overIndex !== -1) {
        const reorderedTodos = arrayMove(columnTodos, activeIndex, overIndex)
        // Update order in store
        reorderedTodos.forEach((todo, index) => {
          updateTodo(todo.id, { order: index })
        })
      }
    }
  }

  const handleAddTodo = (columnId: KanbanColumn) => {
    const newTodo = {
      title: 'New Task',
      content: '',
      completed: columnId === 'done',
      priority: 'medium' as const,
      tags: [],
      status: columnId,
    }

    addTodo(newTodo)
  }

  const activeTodo = activeId ? todos.find(t => t.id === activeId) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full"
    >
      <div className="flex items-center gap-2 mb-6">
        <ViewColumnsIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Kanban Board
        </h2>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
          {columns.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              todos={getTodosByColumn(column.id)}
              onAddTodo={() => handleAddTodo(column.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTodo && <SortableCard todo={activeTodo} />}
        </DragOverlay>
      </DndContext>
    </motion.div>
  )
}