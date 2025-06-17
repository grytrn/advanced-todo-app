import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  PaintBrushIcon,
  SwatchIcon,
  SunIcon,
  MoonIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useCustomizationStore, CustomTheme } from './customizationStore'
import { cn } from '../../utils'
import toast from 'react-hot-toast'

export function ThemeCreator() {
  const { 
    themes, 
    activeThemeId, 
    createTheme, 
    updateTheme, 
    deleteTheme, 
    setActiveTheme 
  } = useCustomizationStore()
  
  const [isCreating, setIsCreating] = useState(false)
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null)

  const activeTheme = themes.find(t => t.id === activeThemeId)

  return (
    <div className="space-y-6">
      {/* Theme Selector */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Themes</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {themes.map(theme => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={theme.id === activeThemeId}
              onSelect={() => {
                setActiveTheme(theme.id)
                toast.success(`Applied ${theme.name} theme`)
              }}
              onEdit={() => setEditingTheme(theme)}
              onDelete={() => {
                if (confirm(`Delete ${theme.name} theme?`)) {
                  deleteTheme(theme.id)
                  toast.success('Theme deleted')
                }
              }}
              canDelete={!theme.id.startsWith('default-')}
            />
          ))}
          
          {/* Create New Theme Card */}
          <button
            onClick={() => setIsCreating(true)}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex flex-col items-center justify-center gap-2"
          >
            <PaintBrushIcon className="h-8 w-8 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Create Theme</span>
          </button>
        </div>
      </div>

      {/* Theme Editor */}
      {(isCreating || editingTheme) && (
        <ThemeEditor
          theme={editingTheme}
          onSave={(theme) => {
            if (editingTheme) {
              updateTheme(editingTheme.id, theme)
              toast.success('Theme updated')
            } else {
              createTheme(theme)
              toast.success('Theme created')
            }
            setIsCreating(false)
            setEditingTheme(null)
          }}
          onCancel={() => {
            setIsCreating(false)
            setEditingTheme(null)
          }}
        />
      )}

      {/* Live Preview */}
      {activeTheme && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          <ThemePreview theme={activeTheme} />
        </div>
      )}
    </div>
  )
}

function ThemeCard({ 
  theme, 
  isActive, 
  onSelect, 
  onEdit, 
  onDelete,
  canDelete 
}: {
  theme: CustomTheme
  isActive: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  return (
    <div
      className={cn(
        "relative border-2 rounded-lg p-4 cursor-pointer transition-all",
        isActive 
          ? "border-blue-500 shadow-lg" 
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      )}
      onClick={onSelect}
    >
      {isActive && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <CheckIcon className="h-4 w-4 text-white" />
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        {theme.isDark ? (
          <MoonIcon className="h-5 w-5" />
        ) : (
          <SunIcon className="h-5 w-5" />
        )}
        <h4 className="font-medium">{theme.name}</h4>
      </div>

      {/* Color Preview */}
      <div className="grid grid-cols-6 gap-1 mb-3">
        <div 
          className="aspect-square rounded"
          style={{ backgroundColor: theme.colors.primary }}
          title="Primary"
        />
        <div 
          className="aspect-square rounded"
          style={{ backgroundColor: theme.colors.secondary }}
          title="Secondary"
        />
        <div 
          className="aspect-square rounded"
          style={{ backgroundColor: theme.colors.accent }}
          title="Accent"
        />
        <div 
          className="aspect-square rounded border"
          style={{ backgroundColor: theme.colors.background }}
          title="Background"
        />
        <div 
          className="aspect-square rounded"
          style={{ backgroundColor: theme.colors.surface }}
          title="Surface"
        />
        <div 
          className="aspect-square rounded"
          style={{ backgroundColor: theme.colors.text }}
          title="Text"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Edit
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            className="flex-1 px-3 py-1 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 rounded hover:bg-red-200 dark:hover:bg-red-900/40"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

function ThemeEditor({ 
  theme, 
  onSave, 
  onCancel 
}: {
  theme?: CustomTheme | null
  onSave: (theme: Omit<CustomTheme, 'id'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<Omit<CustomTheme, 'id'>>({
    name: theme?.name || 'My Theme',
    colors: theme?.colors || {
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
    font: theme?.font || {
      family: 'Inter, system-ui, sans-serif',
      size: 'medium'
    },
    borderRadius: theme?.borderRadius || 'medium',
    isDark: theme?.isDark || false
  })

  const updateColor = (key: keyof typeof formData.colors, value: string) => {
    setFormData({
      ...formData,
      colors: {
        ...formData.colors,
        [key]: value
      }
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold mb-4">
        {theme ? 'Edit Theme' : 'Create New Theme'}
      </h3>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Theme Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mode</label>
            <select
              value={formData.isDark ? 'dark' : 'light'}
              onChange={(e) => setFormData({ ...formData, isDark: e.target.value === 'dark' })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        {/* Colors */}
        <div>
          <h4 className="font-medium mb-3">Colors</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(formData.colors).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => updateColor(key as any, e.target.value)}
                    className="h-10 w-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateColor(key as any, e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 font-mono text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div>
          <h4 className="font-medium mb-3">Typography</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Font Family</label>
              <select
                value={formData.font.family}
                onChange={(e) => setFormData({
                  ...formData,
                  font: { ...formData.font, family: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
              >
                <option value="Inter, system-ui, sans-serif">Inter (Default)</option>
                <option value="system-ui, sans-serif">System</option>
                <option value="'SF Pro Display', system-ui, sans-serif">SF Pro</option>
                <option value="'Segoe UI', system-ui, sans-serif">Segoe UI</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Monaco', 'Consolas', monospace">Monospace</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Font Size</label>
              <select
                value={formData.font.size}
                onChange={(e) => setFormData({
                  ...formData,
                  font: { ...formData.font, size: e.target.value as any }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        </div>

        {/* Border Radius */}
        <div>
          <label className="block text-sm font-medium mb-1">Border Radius</label>
          <select
            value={formData.borderRadius}
            onChange={(e) => setFormData({ ...formData, borderRadius: e.target.value as any })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
          >
            <option value="none">None (Sharp)</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onSave(formData)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {theme ? 'Update Theme' : 'Create Theme'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function ThemePreview({ theme }: { theme: CustomTheme }) {
  return (
    <div 
      className="rounded-lg p-6 space-y-4"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.font.family,
        fontSize: theme.font.size === 'small' ? '14px' : theme.font.size === 'large' ? '18px' : '16px'
      }}
    >
      <div 
        className="p-4 rounded"
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius === 'none' ? '0' : theme.borderRadius === 'small' ? '0.25rem' : theme.borderRadius === 'large' ? '1rem' : '0.5rem'
        }}
      >
        <h4 className="font-semibold mb-2" style={{ color: theme.colors.text }}>
          Sample Todo Card
        </h4>
        <p style={{ color: theme.colors.textMuted }}>
          This is how your todos will look with this theme.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            className="px-3 py-1 rounded text-white text-sm"
            style={{ 
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius === 'none' ? '0' : theme.borderRadius === 'small' ? '0.25rem' : theme.borderRadius === 'large' ? '0.5rem' : '0.375rem'
            }}
          >
            Primary
          </button>
          <button
            className="px-3 py-1 rounded text-white text-sm"
            style={{ 
              backgroundColor: theme.colors.secondary,
              borderRadius: theme.borderRadius === 'none' ? '0' : theme.borderRadius === 'small' ? '0.25rem' : theme.borderRadius === 'large' ? '0.5rem' : '0.375rem'
            }}
          >
            Secondary
          </button>
          <button
            className="px-3 py-1 rounded text-white text-sm"
            style={{ 
              backgroundColor: theme.colors.accent,
              borderRadius: theme.borderRadius === 'none' ? '0' : theme.borderRadius === 'small' ? '0.25rem' : theme.borderRadius === 'large' ? '0.5rem' : '0.375rem'
            }}
          >
            Accent
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.success }} />
          <span style={{ color: theme.colors.textMuted }}>Success</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.warning }} />
          <span style={{ color: theme.colors.textMuted }}>Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.error }} />
          <span style={{ color: theme.colors.textMuted }}>Error</span>
        </div>
      </div>
    </div>
  )
}