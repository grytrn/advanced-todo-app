import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodoItem } from '@/components/TodoItem';
import { Todo } from '@shared/types/todo';

// Mock todo data
const mockTodo: Todo = {
  id: '1',
  title: 'Test Todo',
  description: 'Test description',
  priority: 'high',
  status: 'pending',
  dueDate: new Date('2025-12-31'),
  tags: ['work', 'urgent'],
  userId: 'user1',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  completedAt: null,
};

const mockHandlers = {
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
  onToggleComplete: vi.fn(),
};

describe('TodoItem Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render todo details correctly', () => {
      render(<TodoItem todo={mockTodo} {...mockHandlers} />);

      expect(screen.getByText('Test Todo')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.getByText('work')).toBeInTheDocument();
      expect(screen.getByText('urgent')).toBeInTheDocument();
    });

    it('should show due date when present', () => {
      render(<TodoItem todo={mockTodo} {...mockHandlers} />);

      expect(screen.getByText(/Dec 31, 2025/)).toBeInTheDocument();
    });

    it('should not show description when absent', () => {
      const todoWithoutDesc = { ...mockTodo, description: undefined };
      render(<TodoItem todo={todoWithoutDesc} {...mockHandlers} />);

      expect(screen.queryByText('Test description')).not.toBeInTheDocument();
    });

    it('should apply completed styles when todo is completed', () => {
      const completedTodo = {
        ...mockTodo,
        status: 'completed' as const,
        completedAt: new Date(),
      };
      
      const { container } = render(<TodoItem todo={completedTodo} {...mockHandlers} />);
      
      const todoElement = container.querySelector('[data-testid="todo-item"]');
      expect(todoElement).toHaveClass('completed');
    });

    it('should show overdue indicator for past due dates', () => {
      const overdueTodo = {
        ...mockTodo,
        dueDate: new Date('2020-01-01'),
        status: 'pending' as const,
      };

      render(<TodoItem todo={overdueTodo} {...mockHandlers} />);

      expect(screen.getByText(/Overdue/)).toBeInTheDocument();
      expect(screen.getByText(/Overdue/)).toHaveClass('text-red-600');
    });
  });

  describe('Interactions', () => {
    it('should call onToggleComplete when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<TodoItem todo={mockTodo} {...mockHandlers} />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockHandlers.onToggleComplete).toHaveBeenCalledWith(mockTodo.id);
      expect(mockHandlers.onToggleComplete).toHaveBeenCalledTimes(1);
    });

    it('should call onUpdate when clicking todo title', async () => {
      const user = userEvent.setup();
      render(<TodoItem todo={mockTodo} {...mockHandlers} />);

      const title = screen.getByText('Test Todo');
      await user.click(title);

      expect(mockHandlers.onUpdate).toHaveBeenCalledWith(mockTodo);
      expect(mockHandlers.onUpdate).toHaveBeenCalledTimes(1);
    });

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<TodoItem todo={mockTodo} {...mockHandlers} />);

      const deleteButton = screen.getByTestId('delete-todo-button');
      await user.click(deleteButton);

      expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockTodo.id);
      expect(mockHandlers.onDelete).toHaveBeenCalledTimes(1);
    });

    it('should show confirmation before deleting', async () => {
      const user = userEvent.setup();
      render(<TodoItem todo={mockTodo} showDeleteConfirm {...mockHandlers} />);

      const deleteButton = screen.getByTestId('delete-todo-button');
      await user.click(deleteButton);

      // Should show confirmation dialog
      expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
      
      // Cancel deletion
      const cancelButton = screen.getByTestId('cancel-delete-button');
      await user.click(cancelButton);

      expect(mockHandlers.onDelete).not.toHaveBeenCalled();
    });
  });

  describe('Priority Rendering', () => {
    it.each([
      ['low', 'text-gray-600', 'Low Priority'],
      ['medium', 'text-yellow-600', 'Medium Priority'],
      ['high', 'text-red-600', 'High Priority'],
    ])('should render %s priority with correct styling', (priority, className, text) => {
      const todoWithPriority = { ...mockTodo, priority: priority as any };
      render(<TodoItem todo={todoWithPriority} {...mockHandlers} />);

      const priorityElement = screen.getByText(text);
      expect(priorityElement).toBeInTheDocument();
      expect(priorityElement).toHaveClass(className);
    });
  });

  describe('Status Rendering', () => {
    it.each([
      ['pending', 'Pending', false],
      ['in_progress', 'In Progress', false],
      ['completed', 'Completed', true],
    ])('should render %s status correctly', (status, text, isChecked) => {
      const todoWithStatus = { ...mockTodo, status: status as any };
      render(<TodoItem todo={todoWithStatus} {...mockHandlers} />);

      if (status !== 'pending') {
        expect(screen.getByText(text)).toBeInTheDocument();
      }

      const checkbox = screen.getByRole('checkbox');
      if (isChecked) {
        expect(checkbox).toBeChecked();
      } else {
        expect(checkbox).not.toBeChecked();
      }
    });
  });

  describe('Drag and Drop', () => {
    it('should be draggable when enabled', () => {
      const { container } = render(
        <TodoItem todo={mockTodo} draggable {...mockHandlers} />
      );

      const todoElement = container.querySelector('[data-testid="todo-item"]');
      expect(todoElement).toHaveAttribute('draggable', 'true');
      expect(screen.getByTestId('drag-handle')).toBeInTheDocument();
    });

    it('should not be draggable when disabled', () => {
      const { container } = render(
        <TodoItem todo={mockTodo} draggable={false} {...mockHandlers} />
      );

      const todoElement = container.querySelector('[data-testid="todo-item"]');
      expect(todoElement).not.toHaveAttribute('draggable', 'true');
      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument();
    });

    it('should handle drag events', () => {
      const onDragStart = vi.fn();
      const onDragEnd = vi.fn();

      const { container } = render(
        <TodoItem 
          todo={mockTodo} 
          draggable 
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          {...mockHandlers} 
        />
      );

      const todoElement = container.querySelector('[data-testid="todo-item"]')!;
      
      fireEvent.dragStart(todoElement);
      expect(onDragStart).toHaveBeenCalled();

      fireEvent.dragEnd(todoElement);
      expect(onDragEnd).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TodoItem todo={mockTodo} {...mockHandlers} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-label', `Mark "${mockTodo.title}" as complete`);

      const deleteButton = screen.getByTestId('delete-todo-button');
      expect(deleteButton).toHaveAttribute('aria-label', `Delete "${mockTodo.title}"`);
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<TodoItem todo={mockTodo} {...mockHandlers} />);

      // Tab to checkbox
      await user.tab();
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveFocus();

      // Space to toggle
      await user.keyboard(' ');
      expect(mockHandlers.onToggleComplete).toHaveBeenCalled();

      // Tab to delete button
      await user.tab();
      const deleteButton = screen.getByTestId('delete-todo-button');
      expect(deleteButton).toHaveFocus();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during async operations', async () => {
      const slowHandler = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <TodoItem 
          todo={mockTodo} 
          onToggleComplete={slowHandler}
          {...mockHandlers} 
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });

      // Should hide loading indicator after completion
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when operation fails', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Failed to update'));

      render(
        <TodoItem 
          todo={mockTodo} 
          onToggleComplete={errorHandler}
          {...mockHandlers} 
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(screen.getByText(/Failed to update/)).toBeInTheDocument();
      });
    });
  });
});