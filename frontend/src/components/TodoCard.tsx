import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import {
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  TagIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'
import { Todo, useTodoStore } from '../store'
import { cn } from '../utils'
import { format } from 'date-fns'

interface TodoCardProps {
  todo: Todo
  onEdit: () => void
}

export function TodoCard({ todo, onEdit }: TodoCardProps) {
  const { toggleTodo, deleteTodo, categories } = useTodoStore()
  
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

  const category = categories.find(cat => cat.id === todo.categoryId)

  const handleToggle = async () => {
    await toggleTodo(todo.id)
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTodo(todo.id)
    }
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        'glass-card p-4 transition-all duration-200',
        isDragging && 'shadow-2xl z-50',
        todo.completed && 'opacity-75'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={cn(
            'mt-0.5 transition-colors',
            todo.completed ? 'text-green-500' : 'text-muted-foreground hover:text-primary'
          )}
        >
          {todo.completed ? (
            <CheckCircleIconSolid className="h-6 w-6" />
          ) : (
            <CheckCircleIcon className="h-6 w-6" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'font-medium text-lg',
            todo.completed && 'line-through text-muted-foreground'
          )}>
            {todo.title}
          </h3>
          
          {todo.content && (
            <div 
              className="text-sm text-muted-foreground mt-1 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: todo.content }}
            />
          )}

          {/* Meta Info */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            {/* Priority */}
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              todo.priority === 'high' && 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
              todo.priority === 'medium' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
              todo.priority === 'low' && 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            )}>
              {todo.priority}
            </span>

            {/* Category */}
            {category && (
              <div className="flex items-center gap-1">
                <div 
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-muted-foreground">{category.name}</span>
              </div>
            )}

            {/* Due Date */}
            {todo.dueDate && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>{format(new Date(todo.dueDate), 'MMM d')}</span>
              </div>
            )}

            {/* Tags */}
            {todo.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <TagIcon className="h-4 w-4 text-muted-foreground" />
                {todo.tags.slice(0, 2).map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-0.5 bg-secondary rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
                {todo.tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{todo.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onEdit}
            className="p-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <PencilIcon className="h-4 w-4" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDelete}
            className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}