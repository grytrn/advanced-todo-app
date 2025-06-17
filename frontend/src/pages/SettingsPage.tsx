import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  UserIcon,
  BellIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore, useThemeStore, useTodoStore } from '../store'
import { cn } from '../utils'
import toast from 'react-hot-toast'

const settingsSections = [
  { id: 'profile', name: 'Profile', icon: UserIcon },
  { id: 'notifications', name: 'Notifications', icon: BellIcon },
  { id: 'appearance', name: 'Appearance', icon: PaintBrushIcon },
  { id: 'privacy', name: 'Privacy & Security', icon: ShieldCheckIcon },
  { id: 'data', name: 'Data Management', icon: DocumentArrowDownIcon },
  { id: 'danger', name: 'Danger Zone', icon: TrashIcon },
]

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile')
  const { user } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { todos } = useTodoStore()

  const handleExport = async (format: 'json' | 'csv' | 'markdown') => {
    try {
      const { todoService } = await import('../services')
      const blob = await todoService.exportTodos(format)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `todos-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Exported todos as ${format.toUpperCase()}`)
    } catch (error) {
      toast.error('Failed to export todos')
    }
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Profile Settings</h2>
            
            <div className="glass-card p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  defaultValue={user?.name}
                  className="input"
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  defaultValue={user?.email}
                  className="input"
                  placeholder="your@email.com"
                  disabled
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <textarea
                  className="input min-h-[100px]"
                  placeholder="Tell us about yourself..."
                />
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary"
              >
                Save Changes
              </motion.button>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Notification Preferences</h2>
            
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your tasks
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get push notifications on your device
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Due Date Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Get reminded before tasks are due
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Appearance Settings</h2>
            
            <div className="glass-card p-6 space-y-6">
              <div>
                <p className="font-medium mb-4">Theme</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => theme === 'dark' && toggleTheme()}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all',
                      theme === 'light'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <SunIcon className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">Light</p>
                  </button>
                  
                  <button
                    onClick={() => theme === 'light' && toggleTheme()}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all',
                      theme === 'dark'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <MoonIcon className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">Dark</p>
                  </button>
                </div>
              </div>
              
              <div>
                <p className="font-medium mb-4">Accent Color</p>
                <div className="flex space-x-4">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map((color) => (
                    <button
                      key={color}
                      className="h-10 w-10 rounded-full ring-2 ring-offset-2 ring-offset-background hover:ring-4"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case 'privacy':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Privacy & Security</h2>
            
            <div className="glass-card p-6 space-y-4">
              <div>
                <p className="font-medium mb-2">Change Password</p>
                <button className="btn-outline">Update Password</button>
              </div>
              
              <div>
                <p className="font-medium mb-2">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Add an extra layer of security to your account
                </p>
                <button className="btn-outline">Enable 2FA</button>
              </div>
              
              <div>
                <p className="font-medium mb-2">Active Sessions</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Manage your active sessions across devices
                </p>
                <button className="btn-outline">View Sessions</button>
              </div>
            </div>
          </div>
        )

      case 'data':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Data Management</h2>
            
            <div className="glass-card p-6 space-y-6">
              <div>
                <p className="font-medium mb-2">Export Your Data</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Download all your todos in various formats
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleExport('json')}
                    className="btn-outline"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="btn-outline"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleExport('markdown')}
                    className="btn-outline"
                  >
                    Export as Markdown
                  </button>
                </div>
              </div>
              
              <div>
                <p className="font-medium mb-2">Storage Usage</p>
                <div className="bg-secondary rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min((todos.length / 100) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {todos.length} tasks stored
                </p>
              </div>
            </div>
          </div>
        )

      case 'danger':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-red-500">Danger Zone</h2>
            
            <div className="glass-card p-6 border-red-500/20 space-y-4">
              <div>
                <p className="font-medium mb-2">Delete All Tasks</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Permanently delete all your tasks. This action cannot be undone.
                </p>
                <button className="btn-outline border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
                  Delete All Tasks
                </button>
              </div>
              
              <div className="pt-4 border-t">
                <p className="font-medium mb-2">Delete Account</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Permanently delete your account and all associated data.
                </p>
                <button className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <nav className="glass-card p-4 space-y-1">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all',
                activeSection === section.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              <section.icon className="h-5 w-5" />
              <span className="font-medium">{section.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <motion.div
        key={activeSection}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="lg:col-span-3"
      >
        {renderSection()}
      </motion.div>
    </div>
  )
}

// Import icons that were used in the appearance section
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'