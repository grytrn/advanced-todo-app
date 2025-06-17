import { Page, expect } from '@playwright/test';

export class TodoHelper {
  constructor(private page: Page) {}

  async createTodo(todo: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
    tags?: string[];
  }) {
    // Click add todo button
    await this.page.click('[data-testid="add-todo-button"]');
    
    // Fill in the form
    await this.page.fill('[name="title"]', todo.title);
    
    if (todo.description) {
      await this.page.fill('[name="description"]', todo.description);
    }
    
    if (todo.priority) {
      await this.page.selectOption('[name="priority"]', todo.priority);
    }
    
    if (todo.dueDate) {
      await this.page.fill('[name="dueDate"]', todo.dueDate);
    }
    
    if (todo.tags) {
      for (const tag of todo.tags) {
        await this.page.fill('[name="tags"]', tag);
        await this.page.press('[name="tags"]', 'Enter');
      }
    }
    
    // Submit form
    await this.page.click('[data-testid="save-todo-button"]');
    
    // Wait for modal to close
    await this.page.waitForSelector('[data-testid="todo-modal"]', { state: 'hidden' });
  }

  async updateTodo(title: string, updates: Partial<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'completed';
  }>) {
    // Find and click the todo
    const todoItem = this.page.locator(`[data-testid="todo-item"]`, { hasText: title });
    await todoItem.click();
    
    // Update fields
    if (updates.title) {
      await this.page.fill('[name="title"]', updates.title);
    }
    
    if (updates.description) {
      await this.page.fill('[name="description"]', updates.description);
    }
    
    if (updates.priority) {
      await this.page.selectOption('[name="priority"]', updates.priority);
    }
    
    if (updates.status) {
      await this.page.selectOption('[name="status"]', updates.status);
    }
    
    // Save changes
    await this.page.click('[data-testid="save-todo-button"]');
    
    // Wait for modal to close
    await this.page.waitForSelector('[data-testid="todo-modal"]', { state: 'hidden' });
  }

  async deleteTodo(title: string) {
    // Find the todo item
    const todoItem = this.page.locator(`[data-testid="todo-item"]`, { hasText: title });
    
    // Click delete button
    await todoItem.locator('[data-testid="delete-todo-button"]').click();
    
    // Confirm deletion
    await this.page.click('[data-testid="confirm-delete-button"]');
    
    // Wait for todo to be removed
    await expect(todoItem).toBeHidden();
  }

  async toggleTodoComplete(title: string) {
    const todoItem = this.page.locator(`[data-testid="todo-item"]`, { hasText: title });
    const checkbox = todoItem.locator('[data-testid="todo-checkbox"]');
    
    await checkbox.click();
  }

  async searchTodos(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.press('[data-testid="search-input"]', 'Enter');
    
    // Wait for search results
    await this.page.waitForLoadState('networkidle');
  }

  async filterByPriority(priority: 'all' | 'low' | 'medium' | 'high') {
    await this.page.selectOption('[data-testid="priority-filter"]', priority);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByStatus(status: 'all' | 'pending' | 'in_progress' | 'completed') {
    await this.page.selectOption('[data-testid="status-filter"]', status);
    await this.page.waitForLoadState('networkidle');
  }

  async sortTodos(sortBy: 'date' | 'priority' | 'title' | 'status') {
    await this.page.selectOption('[data-testid="sort-select"]', sortBy);
    await this.page.waitForLoadState('networkidle');
  }

  async getTodoCount(): Promise<number> {
    const todos = await this.page.locator('[data-testid="todo-item"]').count();
    return todos;
  }

  async expectTodoVisible(title: string) {
    await expect(this.page.locator(`[data-testid="todo-item"]`, { hasText: title })).toBeVisible();
  }

  async expectTodoNotVisible(title: string) {
    await expect(this.page.locator(`[data-testid="todo-item"]`, { hasText: title })).toBeHidden();
  }

  async dragAndDropTodo(todoTitle: string, targetPosition: 'top' | 'bottom' | number) {
    const todo = this.page.locator(`[data-testid="todo-item"]`, { hasText: todoTitle });
    
    if (targetPosition === 'top') {
      const firstTodo = this.page.locator('[data-testid="todo-item"]').first();
      await todo.dragTo(firstTodo);
    } else if (targetPosition === 'bottom') {
      const lastTodo = this.page.locator('[data-testid="todo-item"]').last();
      await todo.dragTo(lastTodo);
    } else {
      const targetTodo = this.page.locator('[data-testid="todo-item"]').nth(targetPosition);
      await todo.dragTo(targetTodo);
    }
    
    // Wait for reorder animation
    await this.page.waitForTimeout(500);
  }
}