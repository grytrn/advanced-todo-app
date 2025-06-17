import * as fs from 'fs/promises';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { ExportOptions } from '@shared/types/export';
import { Todo } from '@shared/types/todo';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('csv-export-generator');

export class CsvExportGenerator {
  async generate(
    todos: Todo[],
    options: ExportOptions
  ): Promise<{ filePath: string; fileName: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `todos-export-${timestamp}.csv`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Prepare CSV data
    const csvData = this.prepareCsvData(todos, options);

    // Define columns
    const columns = this.getColumns(options);

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: columns,
      fieldDelimiter: options.csv?.delimiter || ',',
    });

    // Write data
    await csvWriter.writeRecords(csvData);

    logger.info({ filePath, todosCount: todos.length }, 'CSV export generated');

    return { filePath, fileName };
  }

  private getColumns(options: ExportOptions): any[] {
    const defaultColumns = [
      { id: 'id', title: 'ID' },
      { id: 'title', title: 'Title' },
      { id: 'description', title: 'Description' },
      { id: 'status', title: 'Status' },
      { id: 'priority', title: 'Priority' },
      { id: 'category', title: 'Category' },
      { id: 'tags', title: 'Tags' },
      { id: 'dueDate', title: 'Due Date' },
      { id: 'reminder', title: 'Reminder' },
      { id: 'createdAt', title: 'Created At' },
      { id: 'completedAt', title: 'Completed At' },
    ];

    // If custom columns are specified, filter and reorder
    if (options.csv?.columns && options.csv.columns.length > 0) {
      const customColumns = options.csv.columns;
      return defaultColumns.filter(col => customColumns.includes(col.id));
    }

    // Add optional columns based on options
    const columns = [...defaultColumns];

    if (options.includeAttachments) {
      columns.push({ id: 'attachmentsCount', title: 'Attachments' });
    }

    if (options.includeComments) {
      columns.push({ id: 'commentsCount', title: 'Comments' });
    }

    if (options.includeCompleted) {
      columns.push({ id: 'completionDuration', title: 'Time to Complete (days)' });
    }

    return columns;
  }

  private prepareCsvData(todos: Todo[], options: ExportOptions): any[] {
    return todos.map(todo => {
      const data: any = {
        id: todo.id,
        title: this.escapeCsvValue(todo.title),
        description: this.escapeCsvValue(todo.description || ''),
        status: todo.status,
        priority: todo.priority,
        category: todo.category?.name || '',
        tags: todo.tags?.map(t => t.name).join('; ') || '',
        dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '',
        reminder: todo.reminder ? new Date(todo.reminder).toISOString() : '',
        createdAt: new Date(todo.createdAt).toISOString(),
        completedAt: todo.completedAt ? new Date(todo.completedAt).toISOString() : '',
      };

      // Add optional fields
      if (options.includeAttachments) {
        data.attachmentsCount = todo.attachments?.length || 0;
      }

      if (options.includeComments) {
        data.commentsCount = todo.commentsCount || 0;
      }

      if (options.includeCompleted && todo.completedAt) {
        const created = new Date(todo.createdAt);
        const completed = new Date(todo.completedAt);
        const durationMs = completed.getTime() - created.getTime();
        data.completionDuration = Math.round(durationMs / (1000 * 60 * 60 * 24)); // Days
      }

      // Add custom fields if needed
      if (todo.isRecurring) {
        data.recurrence = todo.recurrence || '';
      }

      return data;
    });
  }

  private escapeCsvValue(value: string): string {
    if (!value) return '';
    
    // Escape quotes by doubling them
    value = value.replace(/"/g, '""');
    
    // Wrap in quotes if contains delimiter, newline, or quotes
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      value = `"${value}"`;
    }
    
    return value;
  }
}