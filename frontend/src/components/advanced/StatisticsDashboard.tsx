import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { useTodoStore } from '../../store/todoStore'
import { motion } from 'framer-motion'
import {
  ChartBarSquareIcon,
  TrophyIcon,
  FireIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, isWithinInterval } from 'date-fns'
import clsx from 'clsx'

interface StatCard {
  title: string
  value: number | string
  subtitle: string
  icon: React.ReactNode
  color: string
}

export const StatisticsDashboard: React.FC = () => {
  const { todos, categories } = useTodoStore()

  const stats = useMemo(() => {
    const completedTodos = todos.filter(t => t.completed)
    const activeTodos = todos.filter(t => !t.completed)
    const overdueTodos = activeTodos.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date()
    )

    // Calculate completion rate
    const completionRate = todos.length > 0 
      ? Math.round((completedTodos.length / todos.length) * 100) 
      : 0

    // Calculate streak (consecutive days with completed tasks)
    const today = new Date()
    const sortedCompleted = completedTodos
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    
    let streak = 0
    let currentDate = today
    
    while (true) {
      const dayStart = new Date(currentDate.setHours(0, 0, 0, 0))
      const dayEnd = new Date(currentDate.setHours(23, 59, 59, 999))
      
      const hasCompletedTask = sortedCompleted.some(todo => {
        const completedDate = new Date(todo.updatedAt)
        return completedDate >= dayStart && completedDate <= dayEnd
      })
      
      if (hasCompletedTask) {
        streak++
        currentDate = subDays(currentDate, 1)
      } else {
        break
      }
    }

    // Priority breakdown
    const priorityData = [
      { name: 'High', value: todos.filter(t => t.priority === 'high').length, color: '#EF4444' },
      { name: 'Medium', value: todos.filter(t => t.priority === 'medium').length, color: '#F59E0B' },
      { name: 'Low', value: todos.filter(t => t.priority === 'low').length, color: '#10B981' },
    ]

    // Category breakdown
    const categoryData = categories.map(cat => ({
      name: cat.name,
      total: todos.filter(t => t.categoryId === cat.id).length,
      completed: todos.filter(t => t.categoryId === cat.id && t.completed).length,
      color: cat.color,
    })).filter(cat => cat.total > 0)

    // Weekly activity
    const weekStart = startOfWeek(today)
    const weekEnd = endOfWeek(today)
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
    
    const weeklyActivity = weekDays.map(day => {
      const dayTodos = todos.filter(todo => {
        const createdDate = new Date(todo.createdAt)
        return format(createdDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      })
      
      const completedOnDay = todos.filter(todo => {
        if (!todo.completed) return false
        const updatedDate = new Date(todo.updatedAt)
        return format(updatedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      })

      return {
        day: format(day, 'EEE'),
        created: dayTodos.length,
        completed: completedOnDay.length,
      }
    })

    // Productivity trend (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => subDays(today, 29 - i))
    const productivityTrend = last30Days.map(day => {
      const dayStart = new Date(day.setHours(0, 0, 0, 0))
      const dayEnd = new Date(day.setHours(23, 59, 59, 999))
      
      const completedOnDay = todos.filter(todo => {
        if (!todo.completed) return false
        const updatedDate = new Date(todo.updatedAt)
        return isWithinInterval(updatedDate, { start: dayStart, end: dayEnd })
      }).length

      return {
        date: format(day, 'MMM d'),
        completed: completedOnDay,
      }
    })

    return {
      statCards: [
        {
          title: 'Total Tasks',
          value: todos.length,
          subtitle: `${activeTodos.length} active`,
          icon: <ChartBarSquareIcon className="w-6 h-6" />,
          color: 'bg-blue-500',
        },
        {
          title: 'Completion Rate',
          value: `${completionRate}%`,
          subtitle: `${completedTodos.length} completed`,
          icon: <CheckCircleIcon className="w-6 h-6" />,
          color: 'bg-green-500',
        },
        {
          title: 'Current Streak',
          value: streak,
          subtitle: 'days',
          icon: <FireIcon className="w-6 h-6" />,
          color: 'bg-orange-500',
        },
        {
          title: 'Overdue',
          value: overdueTodos.length,
          subtitle: 'tasks',
          icon: <ClockIcon className="w-6 h-6" />,
          color: 'bg-red-500',
        },
      ] as StatCard[],
      priorityData,
      categoryData,
      weeklyActivity,
      productivityTrend,
    }
  }, [todos, categories])

  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <ChartBarSquareIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Statistics Dashboard
        </h2>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={clsx('p-2 rounded-lg text-white', stat.color)}>
                {stat.icon}
              </div>
              {stat.title === 'Current Streak' && stats.statCards[2].value > 3 && (
                <TrophyIcon className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stat.subtitle}
              </p>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {stat.title}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Weekly Activity
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                dataKey="day" 
                className="text-gray-600 dark:text-gray-400"
                tick={{ fill: 'currentColor', fontSize: 12 }}
              />
              <YAxis 
                className="text-gray-600 dark:text-gray-400"
                tick={{ fill: 'currentColor', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                }}
              />
              <Legend />
              <Bar dataKey="created" fill="#3B82F6" name="Created" />
              <Bar dataKey="completed" fill="#10B981" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Priority Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Priority Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stats.priorityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Productivity Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm lg:col-span-2"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            30-Day Productivity Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats.productivityTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                dataKey="date" 
                className="text-gray-600 dark:text-gray-400"
                tick={{ fill: 'currentColor', fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                className="text-gray-600 dark:text-gray-400"
                tick={{ fill: 'currentColor', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="completed" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Performance */}
        {stats.categoryData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm lg:col-span-2"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Category Performance
            </h3>
            <div className="space-y-4">
              {stats.categoryData.map((category) => {
                const completionRate = category.total > 0 
                  ? (category.completed / category.total) * 100 
                  : 0
                
                return (
                  <div key={category.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {category.name}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {category.completed}/{category.total} ({completionRate.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${completionRate}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}