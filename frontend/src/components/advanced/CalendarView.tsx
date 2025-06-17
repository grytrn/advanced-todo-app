import React, { useMemo } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useTodoStore, Todo } from '../../store/todoStore'
import { useThemeStore } from '../../store/themeStore'
import { motion } from 'framer-motion'
import { CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Todo
}

export const CalendarView: React.FC = () => {
  const { todos, toggleTodo } = useTodoStore()
  const { theme } = useThemeStore()
  const [view, setView] = React.useState<View>('month')
  const [date, setDate] = React.useState(new Date())

  const events = useMemo<CalendarEvent[]>(() => {
    return todos
      .filter(todo => todo.dueDate)
      .map(todo => ({
        id: todo.id,
        title: todo.title,
        start: new Date(todo.dueDate!),
        end: new Date(todo.dueDate!),
        resource: todo,
      }))
  }, [todos])

  const handleSelectEvent = (event: CalendarEvent) => {
    // Toggle completion status when clicking on an event
    toggleTodo(event.resource.id)
  }

  // Removed drag-and-drop support as it's not available in react-big-calendar types

  const eventStyleGetter = (event: CalendarEvent) => {
    const todo = event.resource
    const isCompleted = todo.completed
    const isPastDue = new Date(todo.dueDate!) < new Date() && !isCompleted

    let backgroundColor = '#3B82F6' // default blue
    if (todo.priority === 'high') backgroundColor = '#EF4444' // red
    else if (todo.priority === 'medium') backgroundColor = '#F59E0B' // amber
    else if (todo.priority === 'low') backgroundColor = '#10B981' // green

    if (isCompleted) backgroundColor = '#6B7280' // gray
    if (isPastDue) backgroundColor = '#DC2626' // dark red

    return {
      style: {
        backgroundColor,
        opacity: isCompleted ? 0.6 : 1,
        textDecoration: isCompleted ? 'line-through' : 'none',
        border: 'none',
        borderRadius: '6px',
        color: 'white',
        padding: '2px 8px',
        fontSize: '0.875rem',
      },
    }
  }

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const todo = event.resource
    return (
      <div className="flex items-center gap-1">
        {todo.completed && <CheckCircleIcon className="w-3 h-3" />}
        <span className="truncate">{event.title}</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Calendar View
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span className="text-gray-600 dark:text-gray-400">High</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
            <span className="text-gray-600 dark:text-gray-400">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-gray-600 dark:text-gray-400">Low</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
            <span className="text-gray-600 dark:text-gray-400">Completed</span>
          </div>
        </div>
      </div>

      <div className={`calendar-container ${theme === 'dark' ? 'dark-calendar' : ''}`}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          components={{
            event: CustomEvent,
          }}
          style={{ height: 'calc(100vh - 200px)' }}
          popup
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .dark-calendar {
          filter: invert(0.9) hue-rotate(180deg);
        }
        
        .dark-calendar .rbc-event {
          filter: invert(1) hue-rotate(180deg);
        }

        .rbc-calendar {
          font-family: inherit;
        }

        .rbc-toolbar button {
          color: inherit;
          font-size: 0.875rem;
          padding: 0.25rem 0.75rem;
          border-radius: 0.375rem;
          transition: all 0.2s;
        }

        .rbc-toolbar button:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .dark .rbc-toolbar button:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .rbc-toolbar button.rbc-active {
          background-color: #3B82F6;
          color: white;
        }

        .rbc-month-view,
        .rbc-time-view,
        .rbc-agenda-view {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .dark .rbc-month-view,
        .dark .rbc-time-view,
        .dark .rbc-agenda-view {
          border-color: #374151;
        }

        .rbc-header {
          background-color: #f9fafb;
          font-weight: 600;
          font-size: 0.875rem;
          color: #374151;
        }

        .dark .rbc-header {
          background-color: #1f2937;
          color: #d1d5db;
        }

        .rbc-today {
          background-color: #eff6ff;
        }

        .dark .rbc-today {
          background-color: #1e3a8a;
        }
      ` }} />
    </motion.div>
  )
}