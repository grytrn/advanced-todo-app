import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  MicrophoneIcon,
  XMarkIcon,
  PlusIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline'
import { useSearchStore, SearchFilter, applySearchFilters } from './searchStore'
import { useTodoStore } from '../../store/todoStore'
import { cn } from '../../utils'
import toast from 'react-hot-toast'

export function AdvancedSearch() {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const {
    searchQuery,
    filters,
    isAdvancedMode,
    showSuggestions,
    searchHistory,
    savedSearches,
    isListening,
    voiceTranscript,
    setSearchQuery,
    toggleAdvancedMode,
    addFilter,
    removeFilter,
    saveSearch,
    loadSavedSearch,
    addToHistory,
    setListening,
    setVoiceTranscript
  } = useSearchStore()

  const { todos, categories } = useTodoStore()
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Apply search and filters
  useEffect(() => {
    let results = todos

    // Apply text search
    if (searchQuery) {
      results = results.filter(todo => 
        todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        todo.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        todo.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Apply filters
    results = applySearchFilters(results, filters)
    
    setSearchResults(results)
    
    // Add to history
    if (searchQuery || filters.length > 0) {
      addToHistory(results.length)
    }
  }, [searchQuery, filters, todos])

  // Voice search
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error('Voice search is not supported in your browser')
      return
    }

    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => {
      setListening(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')
      
      setVoiceTranscript(transcript)
    }

    recognition.onend = () => {
      setListening(false)
      if (voiceTranscript) {
        setSearchQuery(voiceTranscript)
        setVoiceTranscript('')
      }
    }

    recognition.start()
  }

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search todos, tags, categories..."
          className={cn(
            "block w-full pl-10 pr-24 py-3 border border-gray-300 rounded-lg",
            "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "dark:bg-gray-800 dark:border-gray-700 dark:text-white",
            isListening && "animate-pulse"
          )}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-2">
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          )}
          
          <button
            onClick={startVoiceSearch}
            className={cn(
              "p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded",
              isListening && "text-red-500 animate-pulse"
            )}
          >
            <MicrophoneIcon className="h-5 w-5" />
          </button>
          
          <button
            onClick={toggleAdvancedMode}
            className={cn(
              "p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded",
              isAdvancedMode && "text-blue-500"
            )}
          >
            <FunnelIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Voice Transcript */}
      <AnimatePresence>
        {isListening && voiceTranscript && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Listening: "{voiceTranscript}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Suggestions */}
      <AnimatePresence>
        {showSuggestions && searchQuery.length > 0 && (
          <SearchSuggestions 
            query={searchQuery}
            history={searchHistory}
            onSelect={setSearchQuery}
          />
        )}
      </AnimatePresence>

      {/* Advanced Filters */}
      <AnimatePresence>
        {isAdvancedMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-3"
          >
            <FilterBuilder 
              filters={filters}
              categories={categories}
              onAddFilter={addFilter}
              onRemoveFilter={removeFilter}
            />
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <BookmarkIcon className="h-4 w-4" />
                Save Search
              </button>
              
              {savedSearches.length > 0 && (
                <SavedSearchDropdown 
                  searches={savedSearches}
                  onLoad={loadSavedSearch}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Search Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <SaveSearchDialog
            onSave={(name, isSmartFolder) => {
              saveSearch(name, isSmartFolder)
              setShowSaveDialog(false)
              toast.success(`Search saved as ${isSmartFolder ? 'smart folder' : 'saved search'}`)
            }}
            onClose={() => setShowSaveDialog(false)}
          />
        )}
      </AnimatePresence>

      {/* Search Results Summary */}
      {(searchQuery || filters.length > 0) && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Found {searchResults.length} results
          {filters.length > 0 && ` with ${filters.length} filter${filters.length > 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  )
}

function FilterBuilder({ 
  filters, 
  categories, 
  onAddFilter, 
  onRemoveFilter 
}: {
  filters: SearchFilter[]
  categories: any[]
  onAddFilter: (filter: SearchFilter) => void
  onRemoveFilter: (id: string) => void
}) {
  const [newFilter, setNewFilter] = useState<Partial<SearchFilter>>({
    field: 'title',
    operator: 'contains',
    value: ''
  })

  const addFilter = () => {
    if (newFilter.field && newFilter.operator && newFilter.value) {
      onAddFilter({
        id: crypto.randomUUID(),
        ...newFilter as SearchFilter
      })
      setNewFilter({ field: 'title', operator: 'contains', value: '' })
    }
  }

  return (
    <div className="space-y-3">
      {/* Existing Filters */}
      {filters.map((filter, index) => (
        <div key={filter.id} className="flex items-center gap-2">
          {index > 0 && (
            <select
              value={filter.conjunction || 'and'}
              onChange={(e) => {
                // Update conjunction logic
              }}
              className="px-2 py-1 border rounded dark:bg-gray-800"
            >
              <option value="and">AND</option>
              <option value="or">OR</option>
            </select>
          )}
          
          <div className="flex-1 flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <span className="font-medium">{filter.field}</span>
            <span className="text-gray-500">{filter.operator}</span>
            <span className="font-medium">{String(filter.value)}</span>
            
            <button
              onClick={() => onRemoveFilter(filter.id)}
              className="ml-auto p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {/* New Filter */}
      <div className="flex items-center gap-2">
        <select
          value={newFilter.field}
          onChange={(e) => setNewFilter({ ...newFilter, field: e.target.value as any })}
          className="px-3 py-2 border rounded-lg dark:bg-gray-800"
        >
          <option value="title">Title</option>
          <option value="content">Content</option>
          <option value="tags">Tags</option>
          <option value="category">Category</option>
          <option value="priority">Priority</option>
          <option value="dueDate">Due Date</option>
          <option value="completed">Status</option>
        </select>
        
        <select
          value={newFilter.operator}
          onChange={(e) => setNewFilter({ ...newFilter, operator: e.target.value as any })}
          className="px-3 py-2 border rounded-lg dark:bg-gray-800"
        >
          <option value="contains">Contains</option>
          <option value="equals">Equals</option>
          <option value="startsWith">Starts with</option>
          <option value="endsWith">Ends with</option>
          {(newFilter.field === 'dueDate') && (
            <>
              <option value="before">Before</option>
              <option value="after">After</option>
              <option value="between">Between</option>
            </>
          )}
        </select>
        
        <input
          type={newFilter.field === 'dueDate' ? 'date' : 'text'}
          value={String(newFilter.value || '')}
          onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
          placeholder="Value"
          className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800"
        />
        
        <button
          onClick={addFilter}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

function SearchSuggestions({ 
  query, 
  history, 
  onSelect 
}: {
  query: string
  history: any[]
  onSelect: (query: string) => void
}) {
  const recentSearches = history
    .filter(h => h.query.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden z-50"
    >
      {recentSearches.length > 0 && (
        <>
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
            Recent Searches
          </div>
          {recentSearches.map(search => (
            <button
              key={search.id}
              onClick={() => onSelect(search.query)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
            >
              <span>{search.query}</span>
              <span className="text-xs text-gray-500">{search.resultCount} results</span>
            </button>
          ))}
        </>
      )}
    </motion.div>
  )
}

function SavedSearchDropdown({ 
  searches, 
  onLoad 
}: {
  searches: any[]
  onLoad: (id: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        Saved Searches ({searches.length})
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden z-50"
          >
            {searches.map(search => (
              <button
                key={search.id}
                onClick={() => {
                  onLoad(search.id)
                  setIsOpen(false)
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  {search.isSmartFolder && <BookmarkIcon className="h-4 w-4 text-blue-500" />}
                  {search.name}
                </span>
                <span className="text-xs text-gray-500">{search.filters.length} filters</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SaveSearchDialog({ 
  onSave, 
  onClose 
}: {
  onSave: (name: string, isSmartFolder: boolean) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [isSmartFolder, setIsSmartFolder] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Save Search</h3>
        
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Search name"
          className="w-full px-3 py-2 border rounded-lg mb-4 dark:bg-gray-700"
          autoFocus
        />
        
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={isSmartFolder}
            onChange={(e) => setIsSmartFolder(e.target.checked)}
            className="rounded"
          />
          <span>Save as Smart Folder</span>
        </label>
        
        <div className="flex gap-2">
          <button
            onClick={() => onSave(name, isSmartFolder)}
            disabled={!name}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}