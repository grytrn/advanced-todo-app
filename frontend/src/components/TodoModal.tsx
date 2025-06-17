import { useEffect, useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useTodoStore } from '../store'
import { cn } from '../utils'

const todoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  dueDate: z.string().optional(),
})

type TodoFormData = z.infer<typeof todoSchema>

interface TodoModalProps {
  isOpen: boolean
  onClose: () => void
  todoId?: string | null
}

export function TodoModal({ isOpen, onClose, todoId }: TodoModalProps) {
  const { todos, categories, addTodo, updateTodo } = useTodoStore()
  const [tagInput, setTagInput] = useState('')
  
  const todo = todoId ? todos.find(t => t.id === todoId) : null
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema) as any,
    defaultValues: {
      title: '',
      priority: 'medium',
      categoryId: '',
      tags: [],
      dueDate: '',
    },
  })

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write a description...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-3',
      },
    },
  })

  const watchedTags = watch('tags')

  useEffect(() => {
    if (todo) {
      reset({
        title: todo.title,
        priority: todo.priority,
        categoryId: todo.categoryId || '',
        tags: todo.tags,
        dueDate: todo.dueDate || '',
      })
      editor?.commands.setContent(todo.content)
    } else {
      reset({
        title: '',
        priority: 'medium',
        categoryId: '',
        tags: [],
        dueDate: '',
      })
      editor?.commands.clearContent()
    }
  }, [todo, reset, editor])

  const onSubmit = async (data: TodoFormData) => {
    const content = editor?.getHTML() || ''
    
    try {
      if (todoId && todo) {
        await updateTodo(todoId, {
          ...data,
          content,
          categoryId: data.categoryId || undefined,
          dueDate: data.dueDate || undefined,
        })
      } else {
        await addTodo({
          ...data,
          content,
          completed: false,
        })
      }
      onClose()
      reset()
      editor?.commands.clearContent()
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
      setValue('tags', [...watchedTags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter(tag => tag !== tagToRemove))
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden glass-card p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-2xl font-bold">
                    {todoId ? 'Edit Task' : 'Create New Task'}
                  </Dialog.Title>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </motion.button>
                </div>

                <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium mb-2">
                      Title
                    </label>
                    <input
                      {...register('title')}
                      type="text"
                      id="title"
                      className={cn(
                        'input',
                        errors.title && 'border-red-500 focus:ring-red-500'
                      )}
                      placeholder="Enter task title..."
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <div className="border border-input rounded-lg overflow-hidden bg-background">
                      <EditorContent editor={editor} />
                    </div>
                  </div>

                  {/* Priority, Category, Due Date */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Priority */}
                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium mb-2">
                        Priority
                      </label>
                      <select
                        {...register('priority')}
                        id="priority"
                        className="input"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    {/* Category */}
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium mb-2">
                        Category
                      </label>
                      <select
                        {...register('categoryId')}
                        id="category"
                        className="input"
                      >
                        <option value="">None</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Due Date */}
                    <div>
                      <label htmlFor="dueDate" className="block text-sm font-medium mb-2">
                        Due Date
                      </label>
                      <input
                        {...register('dueDate')}
                        type="date"
                        id="dueDate"
                        className="input"
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tags
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddTag()
                            }
                          }}
                          className="input flex-1"
                          placeholder="Add a tag..."
                        />
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleAddTag}
                          className="btn-secondary"
                        >
                          Add
                        </motion.button>
                      </div>
                      
                      {watchedTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {watchedTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-sm"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onClose}
                      className="btn-ghost"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isSubmitting}
                      className="btn-primary"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                          Saving...
                        </div>
                      ) : (
                        todoId ? 'Update Task' : 'Create Task'
                      )}
                    </motion.button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}