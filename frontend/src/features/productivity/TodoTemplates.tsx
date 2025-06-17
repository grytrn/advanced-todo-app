import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PlusIcon, 
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useProductivityStore, TodoTemplate } from './productivityStore'
import { useTodoStore } from '../../store/todoStore'
import { cn } from '../../utils'
import toast from 'react-hot-toast'

export function TodoTemplates() {
  const { templates, createTemplate, updateTemplate, deleteTemplate, useTemplate } = useProductivityStore()
  const { addTodo, categories } = useTodoStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TodoTemplate | null>(null)

  const handleUseTemplate = async (templateId: string) => {
    const todoData = useTemplate(templateId)
    if (todoData) {
      try {
        await addTodo(todoData)
        toast.success('Todo created from template!')
      } catch (error) {
        toast.error('Failed to create todo')
      }
    }
  }

  const sortedTemplates = [...templates].sort((a, b) => {
    // Sort by usage count, then by last used
    if (b.usageCount !== a.usageCount) {
      return b.usageCount - a.usageCount
    }
    if (a.lastUsed && b.lastUsed) {
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    }
    return 0
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Todo Templates</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No templates yet. Create templates for recurring tasks!
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first template
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={() => handleUseTemplate(template.id)}
              onEdit={() => setEditingTemplate(template)}
              onDelete={() => {
                if (confirm('Delete this template?')) {
                  deleteTemplate(template.id)
                  toast.success('Template deleted')
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Form */}
      <AnimatePresence>
        {(showCreateForm || editingTemplate) && (
          <TemplateForm
            template={editingTemplate}
            categories={categories}
            onSave={(templateData) => {
              if (editingTemplate) {
                updateTemplate(editingTemplate.id, templateData)
                toast.success('Template updated')
              } else {
                createTemplate(templateData)
                toast.success('Template created')
              }
              setShowCreateForm(false)
              setEditingTemplate(null)
            }}
            onClose={() => {
              setShowCreateForm(false)
              setEditingTemplate(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TemplateCard({ 
  template, 
  onUse, 
  onEdit, 
  onDelete 
}: {
  template: TodoTemplate
  onUse: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const priorityColors = {
    low: 'text-gray-500',
    medium: 'text-yellow-500',
    high: 'text-red-500'
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium flex items-center gap-2">
            {template.icon && <span>{template.icon}</span>}
            {template.name}
          </h4>
          {template.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {template.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onUse}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Use template"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Edit template"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-red-600"
            title="Delete template"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Title:</span>
          <span className="font-medium">{template.template.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Priority:</span>
          <span className={cn("font-medium", priorityColors[template.template.priority])}>
            {template.template.priority}
          </span>
        </div>
        {template.template.tags.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Tags:</span>
            <div className="flex gap-1">
              {template.template.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        {template.template.dueDate && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Due:</span>
            <span className="font-medium">{template.template.dueDate}</span>
          </div>
        )}
      </div>

      {template.usageCount > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
          Used {template.usageCount} times
          {template.lastUsed && ` • Last used ${new Date(template.lastUsed).toLocaleDateString()}`}
        </div>
      )}
    </div>
  )
}

function TemplateForm({ 
  template, 
  categories,
  onSave, 
  onClose 
}: {
  template?: TodoTemplate | null
  categories: any[]
  onSave: (template: Omit<TodoTemplate, 'id' | 'usageCount'>) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    icon: template?.icon || '',
    template: {
      title: template?.template.title || '',
      content: template?.template.content || '',
      priority: template?.template.priority || 'medium' as const,
      tags: template?.template.tags || [],
      categoryId: template?.template.categoryId || '',
      dueDate: template?.template.dueDate || ''
    }
  })

  const [tagInput, setTagInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const addTag = () => {
    if (tagInput && !formData.template.tags.includes(tagInput)) {
      setFormData({
        ...formData,
        template: {
          ...formData.template,
          tags: [...formData.template.tags, tagInput]
        }
      })
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      template: {
        ...formData.template,
        tags: formData.template.tags.filter(t => t !== tag)
      }
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 className="text-lg font-semibold mb-4">
          {template ? 'Edit Template' : 'Create Template'}
        </h3>

        <div className="space-y-4">
          {/* Template Info */}
          <div>
            <label className="block text-sm font-medium mb-1">Template Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Icon (optional)</label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="📝 or any emoji"
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            />
          </div>

          <hr className="my-4" />

          {/* Todo Template */}
          <div>
            <label className="block text-sm font-medium mb-1">Todo Title</label>
            <input
              type="text"
              value={formData.template.title}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template, title: e.target.value }
              })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Content (optional)</label>
            <textarea
              value={formData.template.content}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template, content: e.target.value }
              })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={formData.template.priority}
                onChange={(e) => setFormData({
                  ...formData,
                  template: { ...formData.template, priority: e.target.value as any }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.template.categoryId}
                onChange={(e) => setFormData({
                  ...formData,
                  template: { ...formData.template, categoryId: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
              >
                <option value="">No category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="text"
              value={formData.template.dueDate}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template, dueDate: e.target.value }
              })}
              placeholder="+1d, +1w, +1m, or specific date"
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use relative dates: +1d (tomorrow), +1w (next week), +1m (next month)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag"
                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.template.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {template ? 'Update Template' : 'Create Template'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}