import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CustomTheme {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textMuted: string
    border: string
    error: string
    warning: string
    success: string
  }
  font: {
    family: string
    size: 'small' | 'medium' | 'large'
  }
  borderRadius: 'none' | 'small' | 'medium' | 'large'
  isDark: boolean
}

export interface Widget {
  id: string
  type: 'stats' | 'calendar' | 'pomodoro' | 'recent' | 'categories' | 'analytics' | 'weather' | 'quote'
  position: { x: number; y: number }
  size: { width: number; height: number }
  settings?: Record<string, any>
  enabled: boolean
}

export interface CustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'url'
  options?: string[] // for select/multiselect
  required?: boolean
  defaultValue?: any
  showInList?: boolean
  showInCard?: boolean
}

export interface Layout {
  id: string
  name: string
  type: 'grid' | 'list' | 'kanban' | 'calendar'
  columns?: number // for grid
  groupBy?: string // for kanban
  settings?: Record<string, any>
}

interface CustomizationState {
  // Themes
  themes: CustomTheme[]
  activeThemeId: string
  
  // Widgets
  widgets: Widget[]
  dashboardLayout: 'default' | 'custom'
  
  // Custom Fields
  customFields: CustomField[]
  
  // Layouts
  layouts: Layout[]
  activeLayoutId: string
  
  // Preferences
  preferences: {
    showCompletedTodos: boolean
    defaultTodoView: 'all' | 'today' | 'week' | 'month'
    startWeekOn: 'sunday' | 'monday'
    dateFormat: string
    timeFormat: '12h' | '24h'
    language: string
    animations: boolean
    compactMode: boolean
  }
  
  // Actions
  createTheme: (theme: Omit<CustomTheme, 'id'>) => void
  updateTheme: (id: string, updates: Partial<CustomTheme>) => void
  deleteTheme: (id: string) => void
  setActiveTheme: (id: string) => void
  
  // Widget Actions
  addWidget: (widget: Omit<Widget, 'id'>) => void
  updateWidget: (id: string, updates: Partial<Widget>) => void
  removeWidget: (id: string) => void
  toggleWidget: (id: string) => void
  setDashboardLayout: (layout: 'default' | 'custom') => void
  
  // Custom Field Actions
  addCustomField: (field: Omit<CustomField, 'id'>) => void
  updateCustomField: (id: string, updates: Partial<CustomField>) => void
  deleteCustomField: (id: string) => void
  
  // Layout Actions
  createLayout: (layout: Omit<Layout, 'id'>) => void
  updateLayout: (id: string, updates: Partial<Layout>) => void
  deleteLayout: (id: string) => void
  setActiveLayout: (id: string) => void
  
  // Preference Actions
  updatePreferences: (preferences: Partial<CustomizationState['preferences']>) => void
}

// Default themes
const defaultThemes: CustomTheme[] = [
  {
    id: 'default-light',
    name: 'Default Light',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      accent: '#10b981',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      textMuted: '#6b7280',
      border: '#e5e7eb',
      error: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981'
    },
    font: {
      family: 'Inter, system-ui, sans-serif',
      size: 'medium'
    },
    borderRadius: 'medium',
    isDark: false
  },
  {
    id: 'default-dark',
    name: 'Default Dark',
    colors: {
      primary: '#60a5fa',
      secondary: '#a78bfa',
      accent: '#34d399',
      background: '#111827',
      surface: '#1f2937',
      text: '#f9fafb',
      textMuted: '#9ca3af',
      border: '#374151',
      error: '#f87171',
      warning: '#fbbf24',
      success: '#34d399'
    },
    font: {
      family: 'Inter, system-ui, sans-serif',
      size: 'medium'
    },
    borderRadius: 'medium',
    isDark: true
  }
]

// Default widgets
const defaultWidgets: Widget[] = [
  {
    id: 'stats-widget',
    type: 'stats',
    position: { x: 0, y: 0 },
    size: { width: 4, height: 2 },
    enabled: true
  },
  {
    id: 'pomodoro-widget',
    type: 'pomodoro',
    position: { x: 4, y: 0 },
    size: { width: 2, height: 2 },
    enabled: true
  },
  {
    id: 'recent-widget',
    type: 'recent',
    position: { x: 0, y: 2 },
    size: { width: 3, height: 3 },
    enabled: true
  },
  {
    id: 'categories-widget',
    type: 'categories',
    position: { x: 3, y: 2 },
    size: { width: 3, height: 3 },
    enabled: true
  }
]

// Default layouts
const defaultLayouts: Layout[] = [
  {
    id: 'grid-layout',
    name: 'Grid View',
    type: 'grid',
    columns: 3
  },
  {
    id: 'list-layout',
    name: 'List View',
    type: 'list'
  },
  {
    id: 'kanban-layout',
    name: 'Kanban Board',
    type: 'kanban',
    groupBy: 'status'
  },
  {
    id: 'calendar-layout',
    name: 'Calendar View',
    type: 'calendar'
  }
]

export const useCustomizationStore = create<CustomizationState>()(
  persist(
    immer((set, get) => ({
      themes: defaultThemes,
      activeThemeId: 'default-light',
      widgets: defaultWidgets,
      dashboardLayout: 'default',
      customFields: [],
      layouts: defaultLayouts,
      activeLayoutId: 'list-layout',
      preferences: {
        showCompletedTodos: true,
        defaultTodoView: 'all',
        startWeekOn: 'monday',
        dateFormat: 'MM/dd/yyyy',
        timeFormat: '12h',
        language: 'en',
        animations: true,
        compactMode: false
      },

      // Theme Actions
      createTheme: (theme) => set((state) => {
        const newTheme = {
          ...theme,
          id: crypto.randomUUID()
        }
        state.themes.push(newTheme)
      }),

      updateTheme: (id, updates) => set((state) => {
        const theme = state.themes.find(t => t.id === id)
        if (theme) {
          Object.assign(theme, updates)
        }
      }),

      deleteTheme: (id) => set((state) => {
        // Can't delete default themes
        if (id.startsWith('default-')) return
        
        state.themes = state.themes.filter(t => t.id !== id)
        
        // Switch to default theme if active theme was deleted
        if (state.activeThemeId === id) {
          state.activeThemeId = 'default-light'
        }
      }),

      setActiveTheme: (id) => set((state) => {
        const theme = state.themes.find(t => t.id === id)
        if (theme) {
          state.activeThemeId = id
          
          // Apply theme to document
          const root = document.documentElement
          Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value)
          })
          root.style.setProperty('--font-family', theme.font.family)
          root.style.setProperty('--font-size', 
            theme.font.size === 'small' ? '14px' : 
            theme.font.size === 'large' ? '18px' : '16px'
          )
          root.style.setProperty('--border-radius',
            theme.borderRadius === 'none' ? '0' :
            theme.borderRadius === 'small' ? '0.25rem' :
            theme.borderRadius === 'large' ? '1rem' : '0.5rem'
          )
          
          // Toggle dark mode class
          if (theme.isDark) {
            root.classList.add('dark')
          } else {
            root.classList.remove('dark')
          }
        }
      }),

      // Widget Actions
      addWidget: (widget) => set((state) => {
        state.widgets.push({
          ...widget,
          id: crypto.randomUUID()
        })
      }),

      updateWidget: (id, updates) => set((state) => {
        const widget = state.widgets.find(w => w.id === id)
        if (widget) {
          Object.assign(widget, updates)
        }
      }),

      removeWidget: (id) => set((state) => {
        state.widgets = state.widgets.filter(w => w.id !== id)
      }),

      toggleWidget: (id) => set((state) => {
        const widget = state.widgets.find(w => w.id === id)
        if (widget) {
          widget.enabled = !widget.enabled
        }
      }),

      setDashboardLayout: (layout) => set((state) => {
        state.dashboardLayout = layout
      }),

      // Custom Field Actions
      addCustomField: (field) => set((state) => {
        state.customFields.push({
          ...field,
          id: crypto.randomUUID()
        })
      }),

      updateCustomField: (id, updates) => set((state) => {
        const field = state.customFields.find(f => f.id === id)
        if (field) {
          Object.assign(field, updates)
        }
      }),

      deleteCustomField: (id) => set((state) => {
        state.customFields = state.customFields.filter(f => f.id !== id)
      }),

      // Layout Actions
      createLayout: (layout) => set((state) => {
        state.layouts.push({
          ...layout,
          id: crypto.randomUUID()
        })
      }),

      updateLayout: (id, updates) => set((state) => {
        const layout = state.layouts.find(l => l.id === id)
        if (layout) {
          Object.assign(layout, updates)
        }
      }),

      deleteLayout: (id) => set((state) => {
        // Can't delete default layouts
        if (['grid-layout', 'list-layout', 'kanban-layout', 'calendar-layout'].includes(id)) return
        
        state.layouts = state.layouts.filter(l => l.id !== id)
        
        // Switch to list layout if active layout was deleted
        if (state.activeLayoutId === id) {
          state.activeLayoutId = 'list-layout'
        }
      }),

      setActiveLayout: (id) => set((state) => {
        state.activeLayoutId = id
      }),

      // Preference Actions
      updatePreferences: (preferences) => set((state) => {
        Object.assign(state.preferences, preferences)
      }),
    })),
    {
      name: 'customization-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)