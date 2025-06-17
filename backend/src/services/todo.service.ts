import { PrismaClient, Prisma } from '@prisma/client';
import { createLogger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';
import type {
  Todo,
  CreateTodoRequest,
  UpdateTodoRequest,
  TodoListRequest,
} from '@shared/types/todo';
import { Priority, TodoStatus } from '@shared/types/todo';

const logger = createLogger('todo-service');

export class TodoService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new todo
   */
  async create(userId: string, data: CreateTodoRequest): Promise<Todo> {
    // Validate category if provided
    if (data.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: data.categoryId,
          userId,
        },
      });

      if (!category) {
        throw new NotFoundError('Category not found');
      }
    }

    // Get the highest position for the user's todos
    const highestPosition = await this.prisma.todo.findFirst({
      where: { userId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = (highestPosition?.position ?? -1) + 1;

    // Create todo with tags
    const todo = await this.prisma.todo.create({
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        reminder: data.reminder ? new Date(data.reminder) : undefined,
        priority: data.priority || Priority.MEDIUM,
        categoryId: data.categoryId,
        userId,
        position,
        isRecurring: data.isRecurring || false,
        recurrence: data.recurrence,
        tags: data.tags && data.tags.length > 0 ? {
          create: data.tags.map(tagName => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: {
                  name: tagName,
                  color: this.generateTagColor(tagName),
                },
              },
            },
          })),
        } : undefined,
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        todoId: todo.id,
        userId,
        action: 'CREATED',
        details: {
          title: todo.title,
          priority: todo.priority,
          categoryId: todo.categoryId,
        },
      },
    });

    logger.info({ todoId: todo.id, userId }, 'Todo created successfully');

    return this.formatTodo(todo);
  }

  /**
   * Get a single todo by ID
   */
  async getById(userId: string, todoId: string): Promise<Todo> {
    const todo = await this.prisma.todo.findFirst({
      where: {
        id: todoId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        attachments: true,
        _count: {
          select: {
            comments: true,
            shares: true,
          },
        },
      },
    });

    if (!todo) {
      throw new NotFoundError('Todo not found');
    }

    return this.formatTodo(todo);
  }

  /**
   * Update a todo
   */
  async update(userId: string, todoId: string, data: UpdateTodoRequest): Promise<Todo> {
    // Check if user owns the todo
    const existingTodo = await this.prisma.todo.findFirst({
      where: {
        id: todoId,
        userId,
      },
      include: {
        tags: true,
      },
    });

    if (!existingTodo) {
      throw new NotFoundError('Todo not found');
    }

    // Validate category if provided
    if (data.categoryId !== undefined && data.categoryId !== null) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: data.categoryId,
          userId,
        },
      });

      if (!category) {
        throw new NotFoundError('Category not found');
      }
    }

    // Prepare update data
    const updateData: Prisma.TodoUpdateInput = {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
      reminder: data.reminder !== undefined ? (data.reminder ? new Date(data.reminder) : null) : undefined,
      priority: data.priority,
      status: data.status,
      category: data.categoryId ? { connect: { id: data.categoryId } } : undefined,
      position: data.position,
      isRecurring: data.isRecurring,
      recurrence: data.recurrence,
      completedAt: data.status === TodoStatus.COMPLETED && existingTodo.status !== TodoStatus.COMPLETED
        ? new Date()
        : data.status !== TodoStatus.COMPLETED && existingTodo.status === TodoStatus.COMPLETED
        ? null
        : undefined,
    };

    // Update tags if provided
    if (data.tags !== undefined) {
      // Remove all existing tags
      await this.prisma.todoTag.deleteMany({
        where: { todoId },
      });

      // Add new tags
      if (data.tags.length > 0) {
        updateData.tags = {
          create: data.tags.map(tagName => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: {
                  name: tagName,
                  color: this.generateTagColor(tagName),
                },
              },
            },
          })),
        };
      }
    }

    // Update todo
    const updatedTodo = await this.prisma.todo.update({
      where: { id: todoId },
      data: updateData,
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Log activity
    const changes: any = {};
    if (data.status && data.status !== existingTodo.status) {
      changes.statusChange = { from: existingTodo.status, to: data.status };
    }
    if (data.priority && data.priority !== existingTodo.priority) {
      changes.priorityChange = { from: existingTodo.priority, to: data.priority };
    }

    await this.prisma.activity.create({
      data: {
        todoId,
        userId,
        action: 'UPDATED',
        details: changes,
      },
    });

    logger.info({ todoId, userId }, 'Todo updated successfully');

    return this.formatTodo(updatedTodo);
  }

  /**
   * Delete a todo
   */
  async delete(userId: string, todoId: string): Promise<void> {
    const todo = await this.prisma.todo.findFirst({
      where: {
        id: todoId,
        userId,
      },
    });

    if (!todo) {
      throw new NotFoundError('Todo not found');
    }

    // Soft delete
    await this.prisma.todo.update({
      where: { id: todoId },
      data: { deletedAt: new Date() },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        todoId,
        userId,
        action: 'DELETED',
        details: { title: todo.title },
      },
    });

    logger.info({ todoId, userId }, 'Todo deleted successfully');
  }

  /**
   * List todos with filtering and pagination
   */
  async list(userId: string, query: TodoListRequest): Promise<{
    items: Todo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.TodoWhereInput = {
      userId,
      deletedAt: null,
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.tag) {
      where.tags = {
        some: {
          tag: {
            name: query.tag,
          },
        },
      };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.hasDueDate !== undefined) {
      where.dueDate = query.hasDueDate ? { not: null } : null;
    }

    if (query.isOverdue) {
      where.AND = [
        { dueDate: { not: null } },
        { dueDate: { lt: new Date() } },
        { status: { not: TodoStatus.COMPLETED } },
      ];
    }

    // Build order by
    const orderBy: Prisma.TodoOrderByWithRelationInput = {};
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    if (sortBy === 'priority') {
      // Custom priority ordering
      orderBy.priority = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Execute query
    const [todos, total] = await Promise.all([
      this.prisma.todo.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              attachments: true,
              comments: true,
              shares: true,
            },
          },
        },
      }),
      this.prisma.todo.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      items: todos.map(todo => this.formatTodo(todo)),
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  /**
   * Complete a todo
   */
  async complete(userId: string, todoId: string): Promise<Todo> {
    const todo = await this.prisma.todo.findFirst({
      where: {
        id: todoId,
        userId,
      },
    });

    if (!todo) {
      throw new NotFoundError('Todo not found');
    }

    if (todo.status === TodoStatus.COMPLETED) {
      throw new ValidationError('Todo is already completed');
    }

    const updatedTodo = await this.prisma.todo.update({
      where: { id: todoId },
      data: {
        status: TodoStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        todoId,
        userId,
        action: 'COMPLETED',
      },
    });

    logger.info({ todoId, userId }, 'Todo completed successfully');

    return this.formatTodo(updatedTodo);
  }

  /**
   * Uncomplete a todo
   */
  async uncomplete(userId: string, todoId: string): Promise<Todo> {
    const todo = await this.prisma.todo.findFirst({
      where: {
        id: todoId,
        userId,
      },
    });

    if (!todo) {
      throw new NotFoundError('Todo not found');
    }

    if (todo.status !== TodoStatus.COMPLETED) {
      throw new ValidationError('Todo is not completed');
    }

    const updatedTodo = await this.prisma.todo.update({
      where: { id: todoId },
      data: {
        status: TodoStatus.PENDING,
        completedAt: null,
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        todoId,
        userId,
        action: 'STATUS_CHANGED',
        details: { from: TodoStatus.COMPLETED, to: TodoStatus.PENDING },
      },
    });

    logger.info({ todoId, userId }, 'Todo uncompleted successfully');

    return this.formatTodo(updatedTodo);
  }

  /**
   * Reorder todos
   */
  async reorder(userId: string, todoIds: string[]): Promise<Todo[]> {
    // Verify all todos belong to the user
    const todos = await this.prisma.todo.findMany({
      where: {
        id: { in: todoIds },
        userId,
        deletedAt: null,
      },
    });

    if (todos.length !== todoIds.length) {
      throw new ValidationError('Some todos not found or do not belong to the user');
    }

    // Update positions
    const updates = todoIds.map((id, index) =>
      this.prisma.todo.update({
        where: { id },
        data: { position: index },
        include: {
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      })
    );

    const updatedTodos = await this.prisma.$transaction(updates);

    logger.info({ userId, count: todoIds.length }, 'Todos reordered successfully');

    return updatedTodos.map(todo => this.formatTodo(todo));
  }

  /**
   * Format todo for response
   */
  private formatTodo(todo: any): Todo {
    return {
      id: todo.id,
      title: todo.title,
      description: todo.description,
      dueDate: todo.dueDate,
      reminder: todo.reminder,
      priority: todo.priority,
      status: todo.status,
      isRecurring: todo.isRecurring,
      recurrence: todo.recurrence,
      userId: todo.userId,
      categoryId: todo.categoryId,
      position: todo.position,
      completedAt: todo.completedAt,
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
      deletedAt: todo.deletedAt,
      user: todo.user,
      category: todo.category,
      tags: todo.tags?.map((t: any) => t.tag) || [],
      attachments: todo.attachments || [],
      commentsCount: todo._count?.comments || 0,
      isShared: (todo._count?.shares || 0) > 0,
    };
  }

  /**
   * Generate a color for a tag based on its name
   */
  private generateTagColor(tagName: string): string {
    const colors = [
      '#ef4444', // red
      '#f97316', // orange
      '#f59e0b', // amber
      '#eab308', // yellow
      '#84cc16', // lime
      '#22c55e', // green
      '#10b981', // emerald
      '#14b8a6', // teal
      '#06b6d4', // cyan
      '#0ea5e9', // sky
      '#3b82f6', // blue
      '#6366f1', // indigo
      '#8b5cf6', // violet
      '#a855f7', // purple
      '#d946ef', // fuchsia
      '#ec4899', // pink
      '#f43f5e', // rose
    ];

    // Simple hash function to get consistent color for same tag name
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length] || '#6b7280';
  }
}