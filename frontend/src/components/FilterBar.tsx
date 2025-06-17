import { motion } from 'framer-motion'
import { useTodoStore } from '../store'
import { cn } from '../utils'

export function FilterBar() {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    filterBy,
    setFilterBy,
  } = useTodoStore()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card p-4 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="input"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium mb-2">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input"
          >
            <option value="date">Date Created</option>
            <option value="priority">Priority</option>
            <option value="title">Title</option>
          </select>
        </div>

        {/* Filter By Status */}
        <div>
          <label className="block text-sm font-medium mb-2">Status</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterBy('all')}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                filterBy === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilterBy('active')}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                filterBy === 'active'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              )}
            >
              Active
            </button>
            <button
              onClick={() => setFilterBy('completed')}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                filterBy === 'completed'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              )}
            >
              Completed
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}