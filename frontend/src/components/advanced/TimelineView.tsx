import React, { useMemo } from 'react'
import { useTodoStore, Todo } from '../../store/todoStore'
import { motion } from 'framer-motion'
import { 
  ChartBarIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { format, differenceInDays, startOfDay, addDays, isSameDay } from 'date-fns'
import clsx from 'clsx'

interface TimelineTask {
  todo: Todo
  startDate: Date
  endDate: Date
  progress: number
}

const getTaskDates = (todo: Todo): { start: Date; end: Date } => {
  const created = new Date(todo.createdAt)
  const due = todo.dueDate ? new Date(todo.dueDate) : addDays(created, 7)
  
  return {
    start: created,
    end: due,
  }
}

const getPriorityColor = (priority: string, completed: boolean) => {
  if (completed) return 'bg-gray-400'
  
  switch (priority) {
    case 'high':
      return 'bg-red-500'
    case 'medium':
      return 'bg-amber-500'
    case 'low':
      return 'bg-green-500'
    default:
      return 'bg-blue-500'
  }
}

export const TimelineView: React.FC = () => {
  const { todos, categories } = useTodoStore()
  
  const { tasks, dateRange } = useMemo(() => {
    const tasksWithDates = todos
      .filter(todo => todo.dueDate || !todo.completed)
      .map(todo => {
        const { start, end } = getTaskDates(todo)
        const totalDays = Math.max(1, differenceInDays(end, start))
        const daysElapsed = differenceInDays(new Date(), start)
        const progress = todo.completed 
          ? 100 
          : Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100))
        
        return {
          todo,
          startDate: start,
          endDate: end,
          progress,
        }
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

    if (tasksWithDates.length === 0) {
      return { tasks: [], dateRange: [] }
    }

    // Calculate date range
    const minDate = tasksWithDates.reduce((min, task) => 
      task.startDate < min ? task.startDate : min, 
      tasksWithDates[0]?.startDate || new Date()
    )
    const maxDate = tasksWithDates.reduce((max, task) => 
      task.endDate > max ? task.endDate : max, 
      tasksWithDates[0]?.endDate || new Date()
    )

    const startDate = startOfDay(minDate)
    const endDate = startOfDay(addDays(maxDate, 1))
    const totalDays = differenceInDays(endDate, startDate)
    
    const dates = Array.from({ length: totalDays }, (_, i) => 
      addDays(startDate, i)
    )

    return {
      tasks: tasksWithDates,
      dateRange: dates,
    }
  }, [todos])

  const getTaskPosition = (task: TimelineTask) => {
    if (dateRange.length === 0) return { left: '0%', width: '100%' }
    
    const totalDays = dateRange.length
    const startOffset = differenceInDays(task.startDate, dateRange[0] || new Date())
    const duration = differenceInDays(task.endDate, task.startDate) + 1
    
    const left = (startOffset / totalDays) * 100
    const width = (duration / totalDays) * 100
    
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - left, width)}%`,
    }
  }

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return null
    const category = categories.find(c => c.id === categoryId)
    return category?.name
  }

  const today = new Date()

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No tasks with dates to display
          </p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Timeline View
          </h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">High Priority</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Medium Priority</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Low Priority</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto h-[calc(100%-4rem)]">
        <div className="min-w-[800px]">
          {/* Date header */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div className="w-48 flex-shrink-0 pr-4">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Task
              </span>
            </div>
            <div className="flex-1 relative">
              <div className="flex">
                {dateRange.map((date, index) => (
                  <div
                    key={index}
                    className={clsx(
                      'flex-1 text-center text-xs px-1',
                      isSameDay(date, today) && 'font-bold text-blue-600 dark:text-blue-400'
                    )}
                  >
                    <div>{format(date, 'd')}</div>
                    {date.getDate() === 1 && (
                      <div className="text-gray-500 dark:text-gray-400">
                        {format(date, 'MMM')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-3">
            {tasks.map((task) => {
              const position = getTaskPosition(task)
              const categoryName = getCategoryName(task.todo.categoryId)
              
              return (
                <div key={task.todo.id} className="flex items-center group">
                  <div className="w-48 flex-shrink-0 pr-4">
                    <div className="flex items-start gap-2">
                      {task.todo.completed ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <ClockIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={clsx(
                          'text-sm font-medium truncate',
                          task.todo.completed 
                            ? 'text-gray-500 dark:text-gray-400 line-through' 
                            : 'text-gray-900 dark:text-white'
                        )}>
                          {task.todo.title}
                        </p>
                        {categoryName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {categoryName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 relative h-10">
                    {/* Task bar */}
                    <div
                      className="absolute top-1 h-8 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-shadow"
                      style={position}
                    >
                      <div
                        className={clsx(
                          'h-full rounded-lg relative overflow-hidden',
                          getPriorityColor(task.todo.priority, task.todo.completed)
                        )}
                      >
                        {/* Progress bar */}
                        <div
                          className="absolute top-0 left-0 h-full bg-black bg-opacity-20"
                          style={{ width: `${task.progress}%` }}
                        />
                        
                        {/* Task info on hover */}
                        <div className="px-2 py-1 text-xs text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          {task.progress.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Today marker */}
                    {dateRange.length > 0 && (
                      <div
                        className="absolute top-0 w-0.5 h-full bg-blue-600 dark:bg-blue-400 z-20"
                        style={{
                          left: `${(differenceInDays(today, dateRange[0] || new Date()) / dateRange.length) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}