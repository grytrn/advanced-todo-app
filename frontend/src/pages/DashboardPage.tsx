import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
} from '@heroicons/react/24/outline'
import { useTodoStore, useAuthStore } from '../store'
import { cn } from '../utils'

export function DashboardPage() {
  const { todos, fetchTodos, fetchCategories } = useTodoStore()
  const { user } = useAuthStore()

  useEffect(() => {
    fetchTodos()
    fetchCategories()
  }, [fetchTodos, fetchCategories])

  // Calculate statistics
  const totalTodos = todos.length
  const completedTodos = todos.filter(todo => todo.completed).length
  const activeTodos = totalTodos - completedTodos
  const highPriorityTodos = todos.filter(todo => todo.priority === 'high' && !todo.completed).length
  const todayTodos = todos.filter(todo => {
    const today = new Date().toDateString()
    const todoDate = new Date(todo.createdAt).toDateString()
    return todoDate === today
  }).length

  const stats = [
    {
      name: 'Total Tasks',
      value: totalTodos,
      icon: ClipboardDocumentListIcon,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      name: 'Completed',
      value: completedTodos,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      lightColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      name: 'Active',
      value: activeTodos,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      lightColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    },
    {
      name: 'High Priority',
      value: highPriorityTodos,
      icon: FireIcon,
      color: 'bg-red-500',
      lightColor: 'bg-red-100 dark:bg-red-900/20',
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8"
      >
        <h1 className="text-3xl font-bold">
          Welcome back, <span className="text-gradient">{user?.name || 'User'}</span>!
        </h1>
        <p className="mt-2 text-muted-foreground">
          You have {activeTodos} active tasks to complete today.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.name}
            variants={item}
            whileHover={{ scale: 1.05 }}
            className="glass-card p-6 card-hover"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p className="mt-2 text-3xl font-bold">{stat.value}</p>
              </div>
              <div className={cn('p-3 rounded-lg', stat.lightColor)}>
                <stat.icon className={cn('h-6 w-6', stat.color.replace('bg-', 'text-'))} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <ChartBarIcon className="h-5 w-5 text-muted-foreground" />
        </div>

        {todos.slice(0, 5).length > 0 ? (
          <div className="space-y-4">
            {todos.slice(0, 5).map((todo) => (
              <div
                key={todo.id}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={cn(
                      'h-3 w-3 rounded-full',
                      todo.completed ? 'bg-green-500' : 'bg-yellow-500'
                    )}
                  />
                  <div>
                    <p className={cn(
                      'font-medium',
                      todo.completed && 'line-through text-muted-foreground'
                    )}>
                      {todo.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(todo.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  'text-xs font-medium px-2.5 py-0.5 rounded-full',
                  todo.priority === 'high' && 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
                  todo.priority === 'medium' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
                  todo.priority === 'low' && 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                )}>
                  {todo.priority}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No tasks yet. Create your first task to get started!
          </p>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <button className="glass-card p-6 text-left hover:scale-105 transition-transform">
          <h3 className="font-semibold mb-2">Create New Task</h3>
          <p className="text-sm text-muted-foreground">
            Add a new task to your todo list
          </p>
        </button>
        <button className="glass-card p-6 text-left hover:scale-105 transition-transform">
          <h3 className="font-semibold mb-2">View Calendar</h3>
          <p className="text-sm text-muted-foreground">
            See your tasks in calendar view
          </p>
        </button>
        <button className="glass-card p-6 text-left hover:scale-105 transition-transform">
          <h3 className="font-semibold mb-2">Export Tasks</h3>
          <p className="text-sm text-muted-foreground">
            Export your tasks as PDF or CSV
          </p>
        </button>
      </motion.div>
    </div>
  )
}