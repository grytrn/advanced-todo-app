import { useMemo } from 'react'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from 'date-fns'
import { useProductivityStore } from './productivityStore'
import { useTodoStore } from '../../store/todoStore'

export function ProductivityAnalytics() {
  const { pomodoroSessions, timeEntries, templates } = useProductivityStore()
  const { todos } = useTodoStore()

  // Calculate analytics data
  const analytics = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now)
    const weekEnd = endOfWeek(now)
    const last7Days = eachDayOfInterval({
      start: subDays(now, 6),
      end: now
    })

    // Completed todos per day
    const completedPerDay = last7Days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const completed = todos.filter(todo => 
        todo.completed && 
        format(new Date(todo.updatedAt), 'yyyy-MM-dd') === dayStr
      ).length

      return {
        date: format(day, 'EEE'),
        completed
      }
    })

    // Pomodoro sessions per day
    const pomodorosPerDay = last7Days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const sessions = pomodoroSessions.filter(session =>
        session.type === 'work' &&
        format(new Date(session.startTime), 'yyyy-MM-dd') === dayStr
      ).length

      return {
        date: format(day, 'EEE'),
        sessions
      }
    })

    // Time spent per category
    const timeByCategory = todos.reduce((acc, todo) => {
      const todoTimeEntries = timeEntries.filter(entry => entry.todoId === todo.id)
      const totalTime = todoTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
      
      const category = todo.categoryId || 'Uncategorized'
      acc[category] = (acc[category] || 0) + totalTime

      return acc
    }, {} as Record<string, number>)

    const categoryTimeData = Object.entries(timeByCategory).map(([category, seconds]) => ({
      name: category,
      value: Math.round(seconds / 60), // Convert to minutes
      hours: (seconds / 3600).toFixed(1)
    }))

    // Productivity score (simple calculation)
    const todayCompleted = todos.filter(todo => 
      todo.completed && 
      format(new Date(todo.updatedAt), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
    ).length

    const todayPomodoros = pomodoroSessions.filter(session =>
      session.type === 'work' &&
      format(new Date(session.startTime), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
    ).length

    const productivityScore = Math.min(100, (todayCompleted * 10 + todayPomodoros * 15))

    // Most used templates
    const templateUsage = templates
      .filter(t => t.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)

    return {
      completedPerDay,
      pomodorosPerDay,
      categoryTimeData,
      productivityScore,
      todayCompleted,
      todayPomodoros,
      totalTimeToday: timeEntries
        .filter(entry => 
          format(new Date(entry.startTime), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
        )
        .reduce((sum, entry) => sum + (entry.duration || 0), 0),
      templateUsage
    }
  }, [todos, pomodoroSessions, timeEntries, templates])

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Progress</h4>
          <div className="mt-2 flex items-baseline">
            <span className="text-3xl font-bold">{analytics.todayCompleted}</span>
            <span className="ml-2 text-sm text-gray-500">tasks completed</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Focus Sessions</h4>
          <div className="mt-2 flex items-baseline">
            <span className="text-3xl font-bold">{analytics.todayPomodoros}</span>
            <span className="ml-2 text-sm text-gray-500">pomodoros</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Tracked</h4>
          <div className="mt-2 flex items-baseline">
            <span className="text-3xl font-bold">
              {Math.floor(analytics.totalTimeToday / 3600)}h {Math.floor((analytics.totalTimeToday % 3600) / 60)}m
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Productivity Score</h4>
          <div className="mt-2 flex items-baseline">
            <span className="text-3xl font-bold">{analytics.productivityScore}%</span>
          </div>
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analytics.productivityScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Completed Tasks Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Tasks Completed (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.completedPerDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completed" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pomodoro Sessions Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Focus Sessions (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analytics.pomodorosPerDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sessions" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Time by Category */}
        {analytics.categoryTimeData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Time by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.categoryTimeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.hours}h`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.categoryTimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Template Usage */}
        {analytics.templateUsage.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Most Used Templates</h3>
            <div className="space-y-3">
              {analytics.templateUsage.map((template, index) => (
                <div key={template.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{index + 1}</span>
                    {template.icon && <span>{template.icon}</span>}
                    <span className="font-medium">{template.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{template.usageCount} uses</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Productivity Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InsightCard
            title="Most Productive Day"
            value={getMostProductiveDay(analytics.completedPerDay)}
            icon="📅"
          />
          <InsightCard
            title="Average Daily Tasks"
            value={`${getAverageDailyTasks(analytics.completedPerDay)} tasks`}
            icon="📊"
          />
          <InsightCard
            title="Focus Time Trend"
            value={getFocusTrend(analytics.pomodorosPerDay)}
            icon="🎯"
          />
          <InsightCard
            title="Completion Rate"
            value={`${getCompletionRate(todos)}%`}
            icon="✅"
          />
        </div>
      </div>
    </div>
  )
}

function InsightCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <h4 className="font-medium text-gray-900 dark:text-gray-100">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">{value}</p>
      </div>
    </div>
  )
}

// Helper functions
function getMostProductiveDay(data: { date: string; completed: number }[]) {
  const max = data.reduce((prev, current) => 
    current.completed > prev.completed ? current : prev
  )
  return `${max.date} (${max.completed} tasks)`
}

function getAverageDailyTasks(data: { date: string; completed: number }[]) {
  const total = data.reduce((sum, day) => sum + day.completed, 0)
  return (total / data.length).toFixed(1)
}

function getFocusTrend(data: { date: string; sessions: number }[]) {
  const recent = data.slice(-3)
  const trend = recent[2].sessions - recent[0].sessions
  if (trend > 0) return `📈 Up ${trend} sessions`
  if (trend < 0) return `📉 Down ${Math.abs(trend)} sessions`
  return '➡️ Stable'
}

function getCompletionRate(todos: any[]) {
  if (todos.length === 0) return 0
  const completed = todos.filter(t => t.completed).length
  return Math.round((completed / todos.length) * 100)
}