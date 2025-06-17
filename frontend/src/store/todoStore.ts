import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { todoService } from '../services'
import toast from 'react-hot-toast'

export interface Todo {
  id: string
  title: string
  content: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  categoryId?: string
  tags: string[]
  dueDate?: string
  createdAt: string
  updatedAt: string
  order: number
  status?: 'todo' | 'in-progress' | 'done'
}

export interface Category {
  id: string
  name: string
  color: string
  icon?: string
}

interface TodoState {
  todos: Todo[]
  categories: Category[]
  selectedCategory: string | null
  searchQuery: string
  sortBy: 'date' | 'priority' | 'title'
  filterBy: 'all' | 'active' | 'completed'
  isLoading: boolean
  
  // WebSocket handlers
  handleTodoCreated: (todo: Todo) => void
  handleTodoUpdated: (todo: Todo) => void
  handleTodoDeleted: (todoId: string) => void
  
  // Actions
  fetchTodos: () => Promise<void>
  fetchCategories: () => Promise<void>
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => Promise<void>
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  toggleTodo: (id: string) => Promise<void>
  reorderTodos: (startIndex: number, endIndex: number) => void
  
  // Category actions
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  
  // Filters and search
  setSelectedCategory: (categoryId: string | null) => void
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: 'date' | 'priority' | 'title') => void
  setFilterBy: (filterBy: 'all' | 'active' | 'completed') => void
}

export const useTodoStore = create<TodoState>()(
  immer((set, get) => ({
    todos: [],
    categories: [],
    selectedCategory: null,
    searchQuery: '',
    sortBy: 'date',
    filterBy: 'all',
    isLoading: false,

    fetchTodos: async () => {
      set((state) => {
        state.isLoading = true
      })
      try {
        const todos = await todoService.getTodos()
        set((state) => {
          state.todos = todos
          state.isLoading = false
        })
      } catch (error) {
        set((state) => {
          state.isLoading = false
        })
        toast.error('Failed to fetch todos')
      }
    },

    fetchCategories: async () => {
      try {
        const categories = await todoService.getCategories()
        set((state) => {
          state.categories = categories
        })
      } catch (error) {
        toast.error('Failed to fetch categories')
      }
    },

    addTodo: async (todoData) => {
      try {
        const newTodo = await todoService.createTodo(todoData)
        set((state) => {
          state.todos.unshift(newTodo)
        })
        toast.success('Todo added!')
      } catch (error) {
        toast.error('Failed to add todo')
        throw error
      }
    },

    updateTodo: async (id, updates) => {
      try {
        const updatedTodo = await todoService.updateTodo(id, updates)
        set((state) => {
          const index = state.todos.findIndex(todo => todo.id === id)
          if (index !== -1) {
            state.todos[index] = updatedTodo
          }
        })
        toast.success('Todo updated!')
      } catch (error) {
        toast.error('Failed to update todo')
        throw error
      }
    },

    deleteTodo: async (id) => {
      try {
        await todoService.deleteTodo(id)
        set((state) => {
          state.todos = state.todos.filter(todo => todo.id !== id)
        })
        toast.success('Todo deleted!')
      } catch (error) {
        toast.error('Failed to delete todo')
        throw error
      }
    },

    toggleTodo: async (id) => {
      const todo = get().todos.find(t => t.id === id)
      if (!todo) return

      try {
        await get().updateTodo(id, { completed: !todo.completed })
      } catch (error) {
        // Error already handled in updateTodo
      }
    },

    reorderTodos: (startIndex, endIndex) => {
      set((state) => {
        const [removed] = state.todos.splice(startIndex, 1)
        if (removed) {
          state.todos.splice(endIndex, 0, removed)
          
          // Update order property
          state.todos.forEach((todo, index) => {
            todo.order = index
          })
        }
      })
      
      // Persist new order to backend
      const todos = get().todos
      todoService.reorderTodos(todos.map(t => ({ id: t.id, order: t.order })))
        .catch(() => toast.error('Failed to save order'))
    },

    addCategory: async (categoryData) => {
      try {
        const newCategory = await todoService.createCategory(categoryData)
        set((state) => {
          state.categories.push(newCategory)
        })
        toast.success('Category added!')
      } catch (error) {
        toast.error('Failed to add category')
        throw error
      }
    },

    updateCategory: async (id, updates) => {
      try {
        const updatedCategory = await todoService.updateCategory(id, updates)
        set((state) => {
          const index = state.categories.findIndex(cat => cat.id === id)
          if (index !== -1) {
            state.categories[index] = updatedCategory
          }
        })
        toast.success('Category updated!')
      } catch (error) {
        toast.error('Failed to update category')
        throw error
      }
    },

    deleteCategory: async (id) => {
      try {
        await todoService.deleteCategory(id)
        set((state) => {
          state.categories = state.categories.filter(cat => cat.id !== id)
          // Reset selected category if it was deleted
          if (state.selectedCategory === id) {
            state.selectedCategory = null
          }
        })
        toast.success('Category deleted!')
      } catch (error) {
        toast.error('Failed to delete category')
        throw error
      }
    },

    setSelectedCategory: (categoryId) => set((state) => {
      state.selectedCategory = categoryId
    }),

    setSearchQuery: (query) => set((state) => {
      state.searchQuery = query
    }),

    setSortBy: (sortBy) => set((state) => {
      state.sortBy = sortBy
    }),

    setFilterBy: (filterBy) => set((state) => {
      state.filterBy = filterBy
    }),
    
    // WebSocket handlers for real-time updates
    handleTodoCreated: (todo) => set((state) => {
      // Check if todo already exists (avoid duplicates)
      if (!state.todos.find(t => t.id === todo.id)) {
        state.todos.unshift(todo)
        toast.success('New todo received!', { duration: 2000 })
      }
    }),
    
    handleTodoUpdated: (todo) => set((state) => {
      const index = state.todos.findIndex(t => t.id === todo.id)
      if (index !== -1) {
        state.todos[index] = todo
      }
    }),
    
    handleTodoDeleted: (todoId) => set((state) => {
      state.todos = state.todos.filter(t => t.id !== todoId)
    }),
  }))
)