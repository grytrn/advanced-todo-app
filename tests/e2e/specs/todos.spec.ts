import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { TodoHelper } from '../helpers/todo.helper';
import { testUsers } from '../../fixtures/users';
import { testTodos } from '../../fixtures/todos';

test.describe('TODO Management', () => {
  let authHelper: AuthHelper;
  let todoHelper: TodoHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    todoHelper = new TodoHelper(page);

    // Register and login
    const uniqueUser = {
      ...testUsers.alice,
      email: `todo-test${Date.now()}@example.com`,
    };
    await authHelper.register(uniqueUser);
    await authHelper.login(uniqueUser);
  });

  test.describe('Creating TODOs', () => {
    test('should create a new TODO successfully', async ({ page }) => {
      const todo = testTodos.personal[0];
      
      await todoHelper.createTodo(todo);

      // Should show the new todo
      await todoHelper.expectTodoVisible(todo.title);

      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.click('[data-testid="add-todo-button"]');

      // Try to submit empty form
      await page.click('[data-testid="save-todo-button"]');

      // Should show validation error
      await expect(page.locator('text=Title is required')).toBeVisible();
    });

    test('should create TODO with all fields', async ({ page }) => {
      const todo = {
        title: 'Complete TODO with all fields',
        description: 'This is a detailed description',
        priority: 'high' as const,
        dueDate: '2025-12-31',
        tags: ['important', 'work', 'urgent'],
      };

      await todoHelper.createTodo(todo);

      // Verify all fields are displayed
      const todoItem = page.locator('[data-testid="todo-item"]', { hasText: todo.title });
      await expect(todoItem).toBeVisible();
      await expect(todoItem.locator('text=High Priority')).toBeVisible();
      await expect(todoItem.locator('text=important')).toBeVisible();
      await expect(todoItem.locator('text=work')).toBeVisible();
      await expect(todoItem.locator('text=urgent')).toBeVisible();
    });
  });

  test.describe('Viewing TODOs', () => {
    test.beforeEach(async () => {
      // Create some test todos
      for (const todo of testTodos.personal) {
        await todoHelper.createTodo(todo);
      }
    });

    test('should display all user TODOs', async () => {
      const count = await todoHelper.getTodoCount();
      expect(count).toBe(testTodos.personal.length);
    });

    test('should search TODOs by title', async () => {
      await todoHelper.searchTodos('groceries');

      // Should show only matching todo
      await todoHelper.expectTodoVisible('Buy groceries');
      await todoHelper.expectTodoNotVisible('Workout');
      await todoHelper.expectTodoNotVisible('Read book');
    });

    test('should filter TODOs by priority', async () => {
      await todoHelper.filterByPriority('high');

      // Should show only high priority todos
      const count = await todoHelper.getTodoCount();
      const highPriorityCount = testTodos.personal.filter(t => t.priority === 'high').length;
      expect(count).toBe(highPriorityCount);
    });

    test('should filter TODOs by status', async () => {
      await todoHelper.filterByStatus('completed');

      // Should show only completed todos
      const count = await todoHelper.getTodoCount();
      const completedCount = testTodos.personal.filter(t => t.status === 'completed').length;
      expect(count).toBe(completedCount);
    });

    test('should sort TODOs', async ({ page }) => {
      await todoHelper.sortTodos('priority');

      // Verify high priority todos appear first
      const firstTodo = page.locator('[data-testid="todo-item"]').first();
      await expect(firstTodo.locator('text=High Priority')).toBeVisible();
    });
  });

  test.describe('Updating TODOs', () => {
    test('should update TODO details', async ({ page }) => {
      const todo = testTodos.personal[0];
      await todoHelper.createTodo(todo);

      // Update the todo
      await todoHelper.updateTodo(todo.title, {
        title: 'Updated Title',
        description: 'Updated description',
        priority: 'low',
      });

      // Should show updated todo
      await todoHelper.expectTodoVisible('Updated Title');
      await todoHelper.expectTodoNotVisible(todo.title);

      // Should show updated priority
      const todoItem = page.locator('[data-testid="todo-item"]', { hasText: 'Updated Title' });
      await expect(todoItem.locator('text=Low Priority')).toBeVisible();
    });

    test('should toggle TODO completion', async ({ page }) => {
      const todo = testTodos.personal[0];
      await todoHelper.createTodo(todo);

      // Toggle completion
      await todoHelper.toggleTodoComplete(todo.title);

      // Should show as completed
      const todoItem = page.locator('[data-testid="todo-item"]', { hasText: todo.title });
      await expect(todoItem.locator('[data-testid="todo-checkbox"]')).toBeChecked();
      await expect(todoItem).toHaveClass(/completed/);
    });

    test('should update TODO status', async ({ page }) => {
      const todo = testTodos.personal[0];
      await todoHelper.createTodo(todo);

      // Update status
      await todoHelper.updateTodo(todo.title, {
        status: 'in_progress',
      });

      // Should show updated status
      const todoItem = page.locator('[data-testid="todo-item"]', { hasText: todo.title });
      await expect(todoItem.locator('text=In Progress')).toBeVisible();
    });
  });

  test.describe('Deleting TODOs', () => {
    test('should delete TODO with confirmation', async ({ page }) => {
      const todo = testTodos.personal[0];
      await todoHelper.createTodo(todo);

      // Delete the todo
      await todoHelper.deleteTodo(todo.title);

      // Should not show the deleted todo
      await todoHelper.expectTodoNotVisible(todo.title);

      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should cancel deletion', async ({ page }) => {
      const todo = testTodos.personal[0];
      await todoHelper.createTodo(todo);

      // Start deletion
      const todoItem = page.locator('[data-testid="todo-item"]', { hasText: todo.title });
      await todoItem.locator('[data-testid="delete-todo-button"]').click();

      // Cancel deletion
      await page.click('[data-testid="cancel-delete-button"]');

      // Todo should still be visible
      await todoHelper.expectTodoVisible(todo.title);
    });
  });

  test.describe('Drag and Drop', () => {
    test('should reorder TODOs using drag and drop', async ({ page }) => {
      // Create multiple todos
      for (const todo of testTodos.personal) {
        await todoHelper.createTodo(todo);
      }

      // Get initial order
      const initialFirst = await page.locator('[data-testid="todo-item"]').first().textContent();

      // Drag first todo to bottom
      await todoHelper.dragAndDropTodo(testTodos.personal[0].title, 'bottom');

      // Verify order changed
      const newFirst = await page.locator('[data-testid="todo-item"]').first().textContent();
      expect(newFirst).not.toBe(initialFirst);
    });
  });

  test.describe('Bulk Operations', () => {
    test('should select multiple TODOs', async ({ page }) => {
      // Create multiple todos
      for (const todo of testTodos.personal) {
        await todoHelper.createTodo(todo);
      }

      // Enable bulk selection mode
      await page.click('[data-testid="bulk-select-button"]');

      // Select all todos
      await page.click('[data-testid="select-all-checkbox"]');

      // Should show bulk action toolbar
      await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();

      // Should show count of selected items
      const count = testTodos.personal.length;
      await expect(page.locator(`text=${count} items selected`)).toBeVisible();
    });

    test('should bulk delete TODOs', async ({ page }) => {
      // Create multiple todos
      for (const todo of testTodos.personal) {
        await todoHelper.createTodo(todo);
      }

      // Enable bulk selection and select all
      await page.click('[data-testid="bulk-select-button"]');
      await page.click('[data-testid="select-all-checkbox"]');

      // Click bulk delete
      await page.click('[data-testid="bulk-delete-button"]');

      // Confirm deletion
      await page.click('[data-testid="confirm-bulk-delete-button"]');

      // All todos should be deleted
      const count = await todoHelper.getTodoCount();
      expect(count).toBe(0);
    });

    test('should bulk update status', async ({ page }) => {
      // Create multiple pending todos
      const pendingTodos = testTodos.personal.filter(t => t.status === 'pending');
      for (const todo of pendingTodos) {
        await todoHelper.createTodo(todo);
      }

      // Enable bulk selection and select all
      await page.click('[data-testid="bulk-select-button"]');
      await page.click('[data-testid="select-all-checkbox"]');

      // Bulk mark as completed
      await page.click('[data-testid="bulk-complete-button"]');

      // All todos should be completed
      for (const todo of pendingTodos) {
        const todoItem = page.locator('[data-testid="todo-item"]', { hasText: todo.title });
        await expect(todoItem.locator('[data-testid="todo-checkbox"]')).toBeChecked();
      }
    });
  });
});