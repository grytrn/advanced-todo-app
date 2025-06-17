import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface SearchFilter {
  id: string
  field: 'title' | 'content' | 'tags' | 'category' | 'priority' | 'dueDate' | 'completed'
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'before' | 'after' | 'between'
  value: string | string[] | boolean | Date
  conjunction?: 'and' | 'or'
}

export interface SavedSearch {
  id: string
  name: string
  filters: SearchFilter[]
  createdAt: string
  isSmartFolder: boolean
  icon?: string
  color?: string
}

export interface SearchHistory {
  id: string
  query: string
  filters: SearchFilter[]
  timestamp: string
  resultCount: number
}

interface SearchState {
  // Current search
  searchQuery: string
  filters: SearchFilter[]
  isAdvancedMode: boolean
  showSuggestions: boolean
  
  // Saved searches
  savedSearches: SavedSearch[]
  searchHistory: SearchHistory[]
  
  // Voice search
  isListening: boolean
  voiceTranscript: string
  
  // Actions
  setSearchQuery: (query: string) => void
  addFilter: (filter: SearchFilter) => void
  updateFilter: (id: string, updates: Partial<SearchFilter>) => void
  removeFilter: (id: string) => void
  clearFilters: () => void
  toggleAdvancedMode: () => void
  
  // Saved searches
  saveSearch: (name: string, isSmartFolder?: boolean) => void
  deleteSavedSearch: (id: string) => void
  loadSavedSearch: (id: string) => void
  
  // History
  addToHistory: (resultCount: number) => void
  clearHistory: () => void
  
  // Voice search
  setListening: (isListening: boolean) => void
  setVoiceTranscript: (transcript: string) => void
}

export const useSearchStore = create<SearchState>()(
  persist(
    immer((set, get) => ({
      searchQuery: '',
      filters: [],
      isAdvancedMode: false,
      showSuggestions: false,
      savedSearches: [],
      searchHistory: [],
      isListening: false,
      voiceTranscript: '',

      setSearchQuery: (query) => set((state) => {
        state.searchQuery = query
        state.showSuggestions = query.length > 0
      }),

      addFilter: (filter) => set((state) => {
        state.filters.push({
          ...filter,
          id: filter.id || crypto.randomUUID()
        })
      }),

      updateFilter: (id, updates) => set((state) => {
        const filter = state.filters.find(f => f.id === id)
        if (filter) {
          Object.assign(filter, updates)
        }
      }),

      removeFilter: (id) => set((state) => {
        state.filters = state.filters.filter(f => f.id !== id)
      }),

      clearFilters: () => set((state) => {
        state.filters = []
        state.searchQuery = ''
      }),

      toggleAdvancedMode: () => set((state) => {
        state.isAdvancedMode = !state.isAdvancedMode
      }),

      saveSearch: (name, isSmartFolder = false) => set((state) => {
        const savedSearch: SavedSearch = {
          id: crypto.randomUUID(),
          name,
          filters: [...state.filters],
          createdAt: new Date().toISOString(),
          isSmartFolder
        }
        state.savedSearches.push(savedSearch)
      }),

      deleteSavedSearch: (id) => set((state) => {
        state.savedSearches = state.savedSearches.filter(s => s.id !== id)
      }),

      loadSavedSearch: (id) => set((state) => {
        const savedSearch = state.savedSearches.find(s => s.id === id)
        if (savedSearch) {
          state.filters = [...savedSearch.filters]
        }
      }),

      addToHistory: (resultCount) => {
        const { searchQuery, filters } = get()
        if (!searchQuery && filters.length === 0) return

        set((state) => {
          const historyItem: SearchHistory = {
            id: crypto.randomUUID(),
            query: searchQuery,
            filters: [...filters],
            timestamp: new Date().toISOString(),
            resultCount
          }
          
          // Keep only last 20 items
          state.searchHistory = [historyItem, ...state.searchHistory].slice(0, 20)
        })
      },

      clearHistory: () => set((state) => {
        state.searchHistory = []
      }),

      setListening: (isListening) => set((state) => {
        state.isListening = isListening
      }),

      setVoiceTranscript: (transcript) => set((state) => {
        state.voiceTranscript = transcript
      }),
    })),
    {
      name: 'search-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        savedSearches: state.savedSearches,
        searchHistory: state.searchHistory
      })
    }
  )
)

// Search utilities
export function applySearchFilters(items: any[], filters: SearchFilter[]): any[] {
  if (filters.length === 0) return items

  return items.filter(item => {
    let result = true
    let previousConjunction = 'and'

    for (const filter of filters) {
      const filterResult = evaluateFilter(item, filter)
      
      if (previousConjunction === 'and') {
        result = result && filterResult
      } else {
        result = result || filterResult
      }
      
      previousConjunction = filter.conjunction || 'and'
    }

    return result
  })
}

function evaluateFilter(item: any, filter: SearchFilter): boolean {
  const value = item[filter.field]
  const filterValue = filter.value

  switch (filter.operator) {
    case 'contains':
      return String(value).toLowerCase().includes(String(filterValue).toLowerCase())
    
    case 'equals':
      return value === filterValue
    
    case 'startsWith':
      return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase())
    
    case 'endsWith':
      return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase())
    
    case 'before':
      return new Date(value) < new Date(filterValue as string)
    
    case 'after':
      return new Date(value) > new Date(filterValue as string)
    
    case 'between':
      if (Array.isArray(filterValue) && filterValue.length === 2) {
        const date = new Date(value)
        return date >= new Date(filterValue[0] as string) && date <= new Date(filterValue[1] as string)
      }
      return false
    
    default:
      return true
  }
}