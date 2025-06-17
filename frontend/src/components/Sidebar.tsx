import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  TagIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  ClipboardDocumentListIcon as ClipboardIconSolid,
  Cog6ToothIcon as CogIconSolid,
} from '@heroicons/react/24/solid'
import { useTodoStore } from '../store'
import { cn } from '../utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, activeIcon: HomeIconSolid },
  { name: 'Todos', href: '/todos', icon: ClipboardDocumentListIcon, activeIcon: ClipboardIconSolid },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, activeIcon: CogIconSolid },
]

const stats = [
  { name: 'Today', icon: CalendarIcon, color: 'text-blue-500' },
  { name: 'Important', icon: TagIcon, color: 'text-red-500' },
  { name: 'Stats', icon: ChartBarIcon, color: 'text-green-500' },
]

export function Sidebar() {
  const { categories } = useTodoStore()

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="flex h-full w-64 flex-col bg-card glass-card border-r border-border"
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <h1 className="text-2xl font-bold text-gradient">TODO App</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <item.activeIcon className="mr-3 h-5 w-5" />
                  ) : (
                    <item.icon className="mr-3 h-5 w-5" />
                  )}
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Access
          </h3>
          <div className="mt-2 space-y-1">
            {stats.map((stat) => (
              <button
                key={stat.name}
                className="group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"
              >
                <stat.icon className={cn('mr-3 h-5 w-5', stat.color)} />
                {stat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mt-8">
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Categories
            </h3>
            <div className="mt-2 space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className="group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"
                >
                  <div
                    className="mr-3 h-3 w-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-4">
        <div className="flex items-center rounded-lg p-2 hover:bg-secondary">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent" />
          <div className="ml-3">
            <p className="text-sm font-medium">User Name</p>
            <p className="text-xs text-muted-foreground">user@example.com</p>
          </div>
        </div>
      </div>
    </motion.aside>
  )
}