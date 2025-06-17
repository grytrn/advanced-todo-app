import { apiClient, type ApiResponse } from './api'
import type { Todo, Category } from '../store'

interface CreateTodoRequest {
  title: string
  content: string
  priority: 'low' | 'medium' | 'high'
  categoryId?: string
  tags?: string[]
  dueDate?: string
}

interface UpdateTodoRequest {
  title?: string
  content?: string
  completed?: boolean
  priority?: 'low' | 'medium' | 'high'
  categoryId?: string | null
  tags?: string[]
  dueDate?: string | null
}

interface ReorderTodoRequest {
  id: string
  order: number
}

export const todoService = {
  async getTodos(): Promise<Todo[]> {
    const response = await apiClient.get<ApiResponse<Todo[]>>('/todos')
    return response.data.data
  },

  async getTodoById(id: string): Promise<Todo> {
    const response = await apiClient.get<ApiResponse<Todo>>(`/todos/${id}`)
    return response.data.data
  },

  async createTodo(data: CreateTodoRequest): Promise<Todo> {
    const response = await apiClient.post<ApiResponse<Todo>>('/todos', data)
    return response.data.data
  },

  async updateTodo(id: string, data: UpdateTodoRequest): Promise<Todo> {
    const response = await apiClient.patch<ApiResponse<Todo>>(`/todos/${id}`, data)
    return response.data.data
  },

  async deleteTodo(id: string): Promise<void> {
    await apiClient.delete(`/todos/${id}`)
  },

  async reorderTodos(todos: ReorderTodoRequest[]): Promise<void> {
    await apiClient.post('/todos/reorder', { todos })
  },

  // Category methods
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get<ApiResponse<Category[]>>('/categories')
    return response.data.data
  },

  async createCategory(data: Omit<Category, 'id'>): Promise<Category> {
    const response = await apiClient.post<ApiResponse<Category>>('/categories', data)
    return response.data.data
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const response = await apiClient.patch<ApiResponse<Category>>(`/categories/${id}`, data)
    return response.data.data
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`)
  },

  // Bulk operations
  async bulkUpdateTodos(ids: string[], data: UpdateTodoRequest): Promise<Todo[]> {
    const response = await apiClient.patch<ApiResponse<Todo[]>>('/todos/bulk', {
      ids,
      updates: data,
    })
    return response.data.data
  },

  async bulkDeleteTodos(ids: string[]): Promise<void> {
    await apiClient.delete('/todos/bulk', { data: { ids } })
  },

  // Export
  async exportTodos(format: 'json' | 'csv' | 'markdown'): Promise<Blob> {
    const response = await apiClient.get(`/todos/export`, {
      params: { format },
      responseType: 'blob',
    })
    return response.data
  },
}