import * as fs from 'fs/promises';
import * as path from 'path';
import { ExportOptions } from '@shared/types/export';
import { Todo } from '@shared/types/todo';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('json-export-generator');

export class JsonExportGenerator {
  async generate(
    todos: Todo[],
    options: ExportOptions
  ): Promise<{ filePath: string; fileName: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `todos-export-${timestamp}.json`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Prepare JSON data
    const exportData = this.prepareJsonData(todos, options);

    // Write JSON file
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

    logger.info({ filePath, todosCount: todos.length }, 'JSON export generated');

    return { filePath, fileName };
  }

  private prepareJsonData(todos: Todo[], options: ExportOptions): any {
    const metadata = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      totalTodos: todos.length,
      filters: this.getAppliedFilters(options),
      statistics: this.calculateStatistics(todos),
    };

    // Prepare todos data
    const todosData = todos.map(todo => {
      const data: any = {
        id: todo.id,
        title: todo.title,
        description: todo.description,
        status: todo.status,
        priority: todo.priority,
        isRecurring: todo.isRecurring,
        recurrence: todo.recurrence,
        position: todo.position,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      };

      // Optional fields
      if (todo.dueDate) {
        data.dueDate = todo.dueDate;
      }

      if (todo.reminder) {
        data.reminder = todo.reminder;
      }

      if (todo.completedAt) {
        data.completedAt = todo.completedAt;
      }

      if (todo.deletedAt) {
        data.deletedAt = todo.deletedAt;
      }

      // Relations
      if (todo.category) {
        data.category = {
          id: todo.category.id,
          name: todo.category.name,
          color: todo.category.color,
          icon: todo.category.icon,
        };
      }

      if (options.includeTags && todo.tags && todo.tags.length > 0) {
        data.tags = todo.tags.map(tag => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
        }));
      }

      if (options.includeAttachments && todo.attachments && todo.attachments.length > 0) {
        data.attachments = todo.attachments.map(att => ({
          id: att.id,
          filename: att.filename,
          mimeType: att.mimeType,
          size: att.size,
          uploadedAt: att.uploadedAt,
          // Don't include URL for security/privacy
        }));
      }

      // Metadata
      if (options.includeComments) {
        data.commentsCount = todo.commentsCount || 0;
      }

      data.isShared = todo.isShared || false;

      return data;
    });

    return {
      metadata,
      todos: todosData,
    };
  }

  private getAppliedFilters(options: ExportOptions): any {
    const filters: any = {};

    if (options.categoryIds && options.categoryIds.length > 0) {
      filters.categories = options.categoryIds;
    }

    if (options.tagNames && options.tagNames.length > 0) {
      filters.tags = options.tagNames;
    }

    if (options.priorities && options.priorities.length > 0) {
      filters.priorities = options.priorities;
    }

    if (options.dateRange) {
      filters.dateRange = options.dateRange;
    }

    filters.includeCompleted = options.includeCompleted || false;
    filters.includeArchived = options.includeArchived || false;

    return filters;
  }

  private calculateStatistics(todos: Todo[]): any {
    const stats: any = {
      total: todos.length,
      byStatus: {},
      byPriority: {},
      byCategory: {},
      completionRate: 0,
      averageCompletionTime: null,
    };

    // Count by status
    todos.forEach(todo => {
      stats.byStatus[todo.status] = (stats.byStatus[todo.status] || 0) + 1;
      stats.byPriority[todo.priority] = (stats.byPriority[todo.priority] || 0) + 1;
      
      if (todo.category) {
        const categoryName = todo.category.name;
        stats.byCategory[categoryName] = (stats.byCategory[categoryName] || 0) + 1;
      }
    });

    // Calculate completion rate
    const completed = stats.byStatus['COMPLETED'] || 0;
    stats.completionRate = todos.length > 0 ? (completed / todos.length) * 100 : 0;

    // Calculate average completion time
    const completionTimes: number[] = [];
    todos.forEach(todo => {
      if (todo.completedAt && todo.createdAt) {
        const created = new Date(todo.createdAt).getTime();
        const completed = new Date(todo.completedAt).getTime();
        completionTimes.push(completed - created);
      }
    });

    if (completionTimes.length > 0) {
      const avgMs = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
      stats.averageCompletionTime = {
        milliseconds: avgMs,
        hours: Math.round(avgMs / (1000 * 60 * 60)),
        days: Math.round(avgMs / (1000 * 60 * 60 * 24)),
      };
    }

    return stats;
  }
}