import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface TodoTemplate {
  id: string
  name: string
  description?: string
  icon?: string
  template: {
    title: string
    content?: string
    priority: 'low' | 'medium' | 'high'
    tags: string[]
    categoryId?: string
    dueDate?: string // relative date like "+1d", "+1w", "+1m"
  }
  usageCount: number
  lastUsed?: string
}

export interface PomodoroSession {
  id: string
  todoId?: string
  startTime: string
  endTime?: string
  duration: number // in seconds
  type: 'work' | 'shortBreak' | 'longBreak'
  completed: boolean
}

export interface TimeTrackingEntry {
  id: string
  todoId: string
  startTime: string
  endTime?: string
  duration?: number // in seconds
  description?: string
}

interface ProductivityState {
  // Focus Mode
  focusMode: boolean
  focusedTodoId?: string
  blockedSites: string[]
  
  // Pomodoro Timer
  pomodoroSettings: {
    workDuration: number // minutes
    shortBreakDuration: number
    longBreakDuration: number
    sessionsUntilLongBreak: number
    autoStartBreaks: boolean
    autoStartWork: boolean
    soundEnabled: boolean
  }
  currentPomodoro?: {
    type: 'work' | 'shortBreak' | 'longBreak'
    startTime: number
    duration: number
    isPaused: boolean
    pausedAt?: number
    totalPausedTime: number
  }
  pomodoroSessions: PomodoroSession[]
  completedSessions: number
  
  // Templates
  templates: TodoTemplate[]
  
  // Time Tracking
  timeEntries: TimeTrackingEntry[]
  activeTimeEntry?: TimeTrackingEntry
  
  // Bulk Operations
  selectedTodos: string[]
  
  // Actions
  toggleFocusMode: () => void
  setFocusedTodo: (todoId?: string) => void
  addBlockedSite: (site: string) => void
  removeBlockedSite: (site: string) => void
  
  // Pomodoro Actions
  startPomodoro: (type: 'work' | 'shortBreak' | 'longBreak') => void
  pausePomodoro: () => void
  resumePomodoro: () => void
  stopPomodoro: () => void
  updatePomodoroSettings: (settings: Partial<ProductivityState['pomodoroSettings']>) => void
  completePomodoro: () => void
  
  // Template Actions
  createTemplate: (template: Omit<TodoTemplate, 'id' | 'usageCount'>) => void
  updateTemplate: (id: string, updates: Partial<TodoTemplate>) => void
  deleteTemplate: (id: string) => void
  useTemplate: (id: string) => any
  
  // Time Tracking Actions
  startTimeTracking: (todoId: string, description?: string) => void
  stopTimeTracking: () => void
  updateTimeEntry: (id: string, updates: Partial<TimeTrackingEntry>) => void
  deleteTimeEntry: (id: string) => void
  
  // Bulk Actions
  toggleTodoSelection: (todoId: string) => void
  selectAllTodos: (todoIds: string[]) => void
  clearSelection: () => void
}

export const useProductivityStore = create<ProductivityState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      focusMode: false,
      blockedSites: ['facebook.com', 'twitter.com', 'reddit.com', 'youtube.com'],
      pomodoroSettings: {
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessionsUntilLongBreak: 4,
        autoStartBreaks: false,
        autoStartWork: false,
        soundEnabled: true
      },
      pomodoroSessions: [],
      completedSessions: 0,
      templates: [],
      timeEntries: [],
      selectedTodos: [],

      // Focus Mode Actions
      toggleFocusMode: () => set((state) => {
        state.focusMode = !state.focusMode
        if (!state.focusMode) {
          state.focusedTodoId = undefined
        }
      }),

      setFocusedTodo: (todoId) => set((state) => {
        state.focusedTodoId = todoId
        if (todoId) {
          state.focusMode = true
        }
      }),

      addBlockedSite: (site) => set((state) => {
        if (!state.blockedSites.includes(site)) {
          state.blockedSites.push(site)
        }
      }),

      removeBlockedSite: (site) => set((state) => {
        state.blockedSites = state.blockedSites.filter(s => s !== site)
      }),

      // Pomodoro Actions
      startPomodoro: (type) => set((state) => {
        const duration = type === 'work' 
          ? state.pomodoroSettings.workDuration
          : type === 'shortBreak'
          ? state.pomodoroSettings.shortBreakDuration
          : state.pomodoroSettings.longBreakDuration

        state.currentPomodoro = {
          type,
          startTime: Date.now(),
          duration: duration * 60 * 1000, // Convert to milliseconds
          isPaused: false,
          totalPausedTime: 0
        }
      }),

      pausePomodoro: () => set((state) => {
        if (state.currentPomodoro && !state.currentPomodoro.isPaused) {
          state.currentPomodoro.isPaused = true
          state.currentPomodoro.pausedAt = Date.now()
        }
      }),

      resumePomodoro: () => set((state) => {
        if (state.currentPomodoro && state.currentPomodoro.isPaused && state.currentPomodoro.pausedAt) {
          state.currentPomodoro.totalPausedTime += Date.now() - state.currentPomodoro.pausedAt
          state.currentPomodoro.isPaused = false
          state.currentPomodoro.pausedAt = undefined
        }
      }),

      stopPomodoro: () => set((state) => {
        state.currentPomodoro = undefined
      }),

      updatePomodoroSettings: (settings) => set((state) => {
        Object.assign(state.pomodoroSettings, settings)
      }),

      completePomodoro: () => {
        const current = get().currentPomodoro
        if (!current) return

        const session: PomodoroSession = {
          id: crypto.randomUUID(),
          todoId: get().focusedTodoId,
          startTime: new Date(current.startTime).toISOString(),
          endTime: new Date().toISOString(),
          duration: Math.floor((Date.now() - current.startTime - current.totalPausedTime) / 1000),
          type: current.type,
          completed: true
        }

        set((state) => {
          state.pomodoroSessions.push(session)
          if (current.type === 'work') {
            state.completedSessions++
          }
          state.currentPomodoro = undefined
        })

        // Auto-start next session if enabled
        const settings = get().pomodoroSettings
        if (current.type === 'work' && settings.autoStartBreaks) {
          const isLongBreak = get().completedSessions % settings.sessionsUntilLongBreak === 0
          get().startPomodoro(isLongBreak ? 'longBreak' : 'shortBreak')
        } else if (current.type !== 'work' && settings.autoStartWork) {
          get().startPomodoro('work')
        }
      },

      // Template Actions
      createTemplate: (template) => set((state) => {
        state.templates.push({
          ...template,
          id: crypto.randomUUID(),
          usageCount: 0
        })
      }),

      updateTemplate: (id, updates) => set((state) => {
        const template = state.templates.find(t => t.id === id)
        if (template) {
          Object.assign(template, updates)
        }
      }),

      deleteTemplate: (id) => set((state) => {
        state.templates = state.templates.filter(t => t.id !== id)
      }),

      useTemplate: (id) => {
        const template = get().templates.find(t => t.id === id)
        if (!template) return null

        set((state) => {
          const t = state.templates.find(t => t.id === id)
          if (t) {
            t.usageCount++
            t.lastUsed = new Date().toISOString()
          }
        })

        // Process relative dates
        const todoData = { ...template.template }
        if (todoData.dueDate) {
          todoData.dueDate = processRelativeDate(todoData.dueDate)
        }

        return todoData
      },

      // Time Tracking Actions
      startTimeTracking: (todoId, description) => set((state) => {
        // Stop any active tracking
        if (state.activeTimeEntry) {
          const entry = state.timeEntries.find(e => e.id === state.activeTimeEntry!.id)
          if (entry && !entry.endTime) {
            entry.endTime = new Date().toISOString()
            entry.duration = Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000)
          }
        }

        const newEntry: TimeTrackingEntry = {
          id: crypto.randomUUID(),
          todoId,
          startTime: new Date().toISOString(),
          description
        }

        state.timeEntries.push(newEntry)
        state.activeTimeEntry = newEntry
      }),

      stopTimeTracking: () => set((state) => {
        if (state.activeTimeEntry) {
          const entry = state.timeEntries.find(e => e.id === state.activeTimeEntry!.id)
          if (entry && !entry.endTime) {
            entry.endTime = new Date().toISOString()
            entry.duration = Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000)
          }
          state.activeTimeEntry = undefined
        }
      }),

      updateTimeEntry: (id, updates) => set((state) => {
        const entry = state.timeEntries.find(e => e.id === id)
        if (entry) {
          Object.assign(entry, updates)
        }
      }),

      deleteTimeEntry: (id) => set((state) => {
        state.timeEntries = state.timeEntries.filter(e => e.id !== id)
      }),

      // Bulk Actions
      toggleTodoSelection: (todoId) => set((state) => {
        const index = state.selectedTodos.indexOf(todoId)
        if (index === -1) {
          state.selectedTodos.push(todoId)
        } else {
          state.selectedTodos.splice(index, 1)
        }
      }),

      selectAllTodos: (todoIds) => set((state) => {
        state.selectedTodos = todoIds
      }),

      clearSelection: () => set((state) => {
        state.selectedTodos = []
      }),
    })),
    {
      name: 'productivity-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pomodoroSettings: state.pomodoroSettings,
        pomodoroSessions: state.pomodoroSessions,
        completedSessions: state.completedSessions,
        templates: state.templates,
        timeEntries: state.timeEntries,
        blockedSites: state.blockedSites
      })
    }
  )
)

// Helper function to process relative dates
function processRelativeDate(relativeDate: string): string {
  const now = new Date()
  const matches = relativeDate.match(/^([+-])(\d+)([dDwWmMyY])$/)
  
  if (!matches) return relativeDate
  
  const [, sign, amount, unit] = matches
  const value = parseInt(amount || '0') * (sign === '+' ? 1 : -1)
  
  switch (unit?.toLowerCase()) {
    case 'd':
      now.setDate(now.getDate() + value)
      break
    case 'w':
      now.setDate(now.getDate() + value * 7)
      break
    case 'm':
      now.setMonth(now.getMonth() + value)
      break
    case 'y':
      now.setFullYear(now.getFullYear() + value)
      break
  }
  
  return now.toISOString()
}