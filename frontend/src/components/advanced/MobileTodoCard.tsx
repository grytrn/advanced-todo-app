import React, { useState } from 'react'
import { motion, PanInfo, AnimatePresence } from 'framer-motion'
import { Todo } from '../../store/todoStore'
import {
  CheckCircleIcon,
  TrashIcon,
  ArchiveBoxIcon,
  ClockIcon,
  FlagIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { format } from 'date-fns'

interface MobileTodoCardProps {
  todo: Todo
  onToggle: () => void
  onDelete: () => void
  onArchive: () => void
  onEdit: () => void
}

export const MobileTodoCard: React.FC<MobileTodoCardProps> = ({
  todo,
  onToggle,
  onDelete,
  onArchive,
  onEdit,
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100
    
    if (info.offset.x > threshold) {
      // Swipe right - complete/uncomplete
      onToggle()
      setSwipeOffset(0)
    } else if (info.offset.x < -threshold) {
      // Swipe left - show actions
      setSwipeOffset(-150)
    } else {
      // Snap back
      setSwipeOffset(0)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    await new Promise(resolve => setTimeout(resolve, 300))
    onDelete()
  }

  const priorityColors = {
    high: 'border-l-red-500',
    medium: 'border-l-amber-500',
    low: 'border-l-green-500',
  }

  const priorityIcons = {
    high: '🔴',
    medium: '🟡',
    low: '🟢',
  }

  return (
    <AnimatePresence>
      {!isDeleting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -300 }}
          className="relative overflow-hidden touch-pan-y"
        >
          {/* Background actions */}
          <div className="absolute inset-0 flex items-center justify-end px-4 bg-gradient-to-l from-red-500 to-red-600">
            <div className="flex items-center gap-4 text-white">
              <button
                onClick={onArchive}
                className="p-3 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArchiveBoxIcon className="w-6 h-6" />
              </button>
              <button
                onClick={handleDelete}
                className="p-3 hover:bg-white/20 rounded-lg transition-colors"
              >
                <TrashIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Main card */}
          <motion.div
            drag="x"
            dragConstraints={{ left: -150, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            animate={{ x: swipeOffset }}
            whileTap={{ scale: 0.98 }}
            onClick={() => swipeOffset === 0 && onEdit()}
            className={clsx(
              'relative bg-white dark:bg-gray-800 rounded-lg shadow-sm',
              'border-l-4 cursor-pointer select-none',
              priorityColors[todo.priority],
              todo.completed && 'opacity-75'
            )}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggle()
                  }}
                  className="mt-0.5 flex-shrink-0"
                >
                  {todo.completed ? (
                    <CheckCircleIconSolid className="w-6 h-6 text-green-500" />
                  ) : (
                    <CheckCircleIcon className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={clsx(
                    'text-base font-medium text-gray-900 dark:text-white',
                    todo.completed && 'line-through text-gray-500'
                  )}>
                    {todo.title}
                  </h3>
                  
                  {todo.content && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {todo.content}
                    </p>
                  )}

                  {/* Meta info */}
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <FlagIcon className="w-3 h-3" />
                      {priorityIcons[todo.priority]}
                    </span>
                    
                    {todo.dueDate && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {format(new Date(todo.dueDate), 'MMM d')}
                      </span>
                    )}
                    
                    {todo.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        {todo.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Swipe indicator */}
            <AnimatePresence>
              {swipeOffset < -50 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <div className="flex items-center gap-1 text-gray-400">
                    <span className="text-xs">Swipe for actions</span>
                    <motion.div
                      animate={{ x: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      ←
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}