import { z } from 'zod';
import { Priority, TodoStatus, Recurrence } from '@shared/types/todo';

// Common schemas
const prioritySchema = z.nativeEnum(Priority);
const todoStatusSchema = z.nativeEnum(TodoStatus);
const recurrenceSchema = z.nativeEnum(Recurrence);

// Date string validation (ISO 8601)
const dateStringSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format. Use ISO 8601 format',
  })
  .transform((val) => new Date(val));

// Create todo schema
export const createTodoSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must not exceed 200 characters')
      .trim(),
    description: z
      .string()
      .max(5000, 'Description must not exceed 5000 characters')
      .optional(),
    dueDate: dateStringSchema.optional(),
    reminder: dateStringSchema.optional(),
    priority: prioritySchema.optional().default(Priority.MEDIUM),
    categoryId: z.string().uuid('Invalid category ID').optional(),
    tags: z
      .array(z.string().min(1).max(50))
      .max(10, 'Maximum 10 tags allowed')
      .optional(),
    isRecurring: z.boolean().optional().default(false),
    recurrence: recurrenceSchema.optional(),
  }).refine(
    (data) => {
      // If reminder is set, due date must also be set
      if (data.reminder && !data.dueDate) {
        return false;
      }
      // If reminder is set, it must be before due date
      if (data.reminder && data.dueDate && data.reminder >= data.dueDate) {
        return false;
      }
      // If recurring, recurrence type must be specified
      if (data.isRecurring && !data.recurrence) {
        return false;
      }
      return true;
    },
    {
      message: 'Invalid date configuration',
      path: ['reminder'],
    }
  ),
});

export type CreateTodoSchema = z.infer<typeof createTodoSchema>;

// Update todo schema
export const updateTodoSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid todo ID'),
  }),
  body: z.object({
    title: z
      .string()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title must not exceed 200 characters')
      .trim()
      .optional(),
    description: z
      .string()
      .max(5000, 'Description must not exceed 5000 characters')
      .nullable()
      .optional(),
    dueDate: dateStringSchema.nullable().optional(),
    reminder: dateStringSchema.nullable().optional(),
    priority: prioritySchema.optional(),
    status: todoStatusSchema.optional(),
    categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
    tags: z
      .array(z.string().min(1).max(50))
      .max(10, 'Maximum 10 tags allowed')
      .optional(),
    position: z.number().int().min(0).optional(),
    isRecurring: z.boolean().optional(),
    recurrence: recurrenceSchema.nullable().optional(),
  }).refine(
    (data) => {
      // Similar validation as create
      if (data.reminder && data.dueDate && data.reminder >= data.dueDate) {
        return false;
      }
      if (data.isRecurring === true && !data.recurrence) {
        return false;
      }
      return true;
    },
    {
      message: 'Invalid date or recurrence configuration',
    }
  ),
});

export type UpdateTodoSchema = z.infer<typeof updateTodoSchema>;

// Get todo schema
export const getTodoSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid todo ID'),
  }),
});

export type GetTodoSchema = z.infer<typeof getTodoSchema>;

// Delete todo schema
export const deleteTodoSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid todo ID'),
  }),
});

export type DeleteTodoSchema = z.infer<typeof deleteTodoSchema>;

// List todos schema
export const listTodosSchema = z.object({
  query: z.object({
    page: z.string().transform(Number).pipe(z.number().int().min(1)).optional().default('1'),
    limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional().default('20'),
    sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'position']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    categoryId: z.string().uuid().optional(),
    tag: z.string().optional(),
    search: z.string().optional(),
    status: z.union([todoStatusSchema, z.literal('all')]).optional().default('all'),
    priority: prioritySchema.optional(),
    hasDueDate: z.string().transform((val) => val === 'true').optional(),
    isOverdue: z.string().transform((val) => val === 'true').optional(),
  }),
});

export type ListTodosSchema = z.infer<typeof listTodosSchema>;

// Complete todo schema
export const completeTodoSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid todo ID'),
  }),
});

export type CompleteTodoSchema = z.infer<typeof completeTodoSchema>;

// Reorder todos schema
export const reorderTodosSchema = z.object({
  body: z.object({
    todoIds: z
      .array(z.string().uuid())
      .min(1, 'At least one todo ID is required')
      .max(100, 'Maximum 100 todos can be reordered at once'),
  }),
});

export type ReorderTodosSchema = z.infer<typeof reorderTodosSchema>;