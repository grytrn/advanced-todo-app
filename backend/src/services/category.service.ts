import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@shared/types/category';

const logger = createLogger('category-service');

export class CategoryService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new category
   */
  async create(userId: string, data: CreateCategoryRequest): Promise<Category> {
    // Check if category with same name already exists for this user
    const existing = await this.prisma.category.findFirst({
      where: {
        name: data.name,
        userId,
      },
    });

    if (existing) {
      throw new ConflictError('Category with this name already exists');
    }

    const category = await this.prisma.category.create({
      data: {
        name: data.name,
        color: data.color || '#6366f1',
        icon: data.icon,
        userId,
      },
      include: {
        _count: {
          select: {
            todos: true,
          },
        },
      },
    });

    logger.info({ categoryId: category.id, userId }, 'Category created successfully');

    return this.formatCategory(category);
  }

  /**
   * Get all categories for a user
   */
  async list(userId: string): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        userId,
      },
      include: {
        _count: {
          select: {
            todos: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return categories.map(category => this.formatCategory(category));
  }

  /**
   * Get a single category by ID
   */
  async getById(userId: string, categoryId: string): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
      include: {
        _count: {
          select: {
            todos: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return this.formatCategory(category);
  }

  /**
   * Update a category
   */
  async update(
    userId: string,
    categoryId: string,
    data: UpdateCategoryRequest
  ): Promise<Category> {
    // Check if category exists and belongs to user
    const existing = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Category not found');
    }

    // If renaming, check if new name already exists
    if (data.name && data.name !== existing.name) {
      const duplicate = await this.prisma.category.findFirst({
        where: {
          name: data.name,
          userId,
          NOT: {
            id: categoryId,
          },
        },
      });

      if (duplicate) {
        throw new ConflictError('Category with this name already exists');
      }
    }

    const updated = await this.prisma.category.update({
      where: {
        id: categoryId,
      },
      data: {
        name: data.name,
        color: data.color,
        icon: data.icon,
      },
      include: {
        _count: {
          select: {
            todos: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    logger.info({ categoryId, userId }, 'Category updated successfully');

    return this.formatCategory(updated);
  }

  /**
   * Delete a category
   */
  async delete(userId: string, categoryId: string): Promise<void> {
    // Check if category exists and belongs to user
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
      include: {
        _count: {
          select: {
            todos: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Check if category has todos
    if (category._count.todos > 0) {
      throw new ValidationError(
        `Cannot delete category with ${category._count.todos} active todos. Please reassign or delete the todos first.`
      );
    }

    // Delete the category
    await this.prisma.category.delete({
      where: {
        id: categoryId,
      },
    });

    logger.info({ categoryId, userId }, 'Category deleted successfully');
  }

  /**
   * Format category for response
   */
  private formatCategory(category: any): Category {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      userId: category.userId,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      todosCount: category._count?.todos || 0,
    };
  }
}