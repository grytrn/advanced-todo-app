import * as fs from 'fs/promises';
import * as path from 'path';
import ical, { ICalCalendar, ICalEventData, ICalAlarmType } from 'ical-generator';
import { ExportOptions } from '@shared/types/export';
import { Todo, Priority, TodoStatus, Recurrence } from '@shared/types/todo';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('ical-export-generator');

export class IcalExportGenerator {
  async generate(
    todos: Todo[],
    options: ExportOptions
  ): Promise<{ filePath: string; fileName: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `todos-export-${timestamp}.ics`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Create calendar
    const calendar = this.createCalendar(todos, options);

    // Write file
    await fs.writeFile(filePath, calendar.toString(), 'utf-8');

    logger.info({ filePath, todosCount: todos.length }, 'iCal export generated');

    return { filePath, fileName };
  }

  private createCalendar(todos: Todo[], options: ExportOptions): ICalCalendar {
    const calendar = ical({
      name: options.ical?.calendarName || 'My Todos',
      description: 'Exported todo items',
      prodId: {
        company: 'Todo App',
        product: 'Todo Export',
      },
      timezone: 'UTC',
    });

    // Add todos as events
    todos.forEach(todo => {
      if (todo.dueDate || todo.reminder) {
        this.addTodoAsEvent(calendar, todo, options);
      }
    });

    return calendar;
  }

  private addTodoAsEvent(calendar: ICalCalendar, todo: Todo, options: ExportOptions): void {
    const eventData: ICalEventData = {
      id: todo.id,
      summary: this.formatSummary(todo),
      description: this.formatDescription(todo),
      categories: this.getCategories(todo),
      status: this.mapStatus(todo.status),
    };

    // Set timing
    if (todo.dueDate) {
      const dueDate = new Date(todo.dueDate);
      
      // If it's an all-day task (no specific time)
      if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0) {
        eventData.start = dueDate;
        eventData.allDay = true;
      } else {
        eventData.start = dueDate;
        eventData.end = new Date(dueDate.getTime() + 60 * 60 * 1000); // 1 hour duration
      }
    } else if (todo.reminder) {
      // If only reminder is set, use it as the event time
      const reminderDate = new Date(todo.reminder);
      eventData.start = reminderDate;
      eventData.end = new Date(reminderDate.getTime() + 30 * 60 * 1000); // 30 min duration
    }

    // Set recurrence
    if (todo.isRecurring && todo.recurrence) {
      eventData.repeating = this.mapRecurrence(todo.recurrence);
    }

    // Set priority
    eventData.priority = this.mapPriority(todo.priority);

    // Add alarms/reminders
    if (options.ical?.includeReminders !== false && todo.reminder) {
      eventData.alarms = [{
        type: ICalAlarmType.display,
        trigger: new Date(todo.reminder),
        description: `Reminder: ${todo.title}`,
      }];
    }

    // Add the event
    const event = calendar.createEvent(eventData);

    // Set completion status if completed
    if (todo.completedAt) {
      event.status('COMPLETED' as any);
      event.completed(new Date(todo.completedAt));
    }

    // Add location if category has an icon (could represent a location metaphor)
    if (todo.category?.name) {
      event.location(todo.category.name);
    }
  }

  private formatSummary(todo: Todo): string {
    const priorityEmoji = this.getPriorityEmoji(todo.priority);
    const statusEmoji = todo.status === TodoStatus.COMPLETED ? '✅' : '';
    return `${priorityEmoji}${statusEmoji} ${todo.title}`.trim();
  }

  private formatDescription(todo: Todo): string {
    const parts: string[] = [];

    if (todo.description) {
      parts.push(todo.description);
      parts.push(''); // Empty line
    }

    // Add metadata
    parts.push('--- Todo Details ---');
    parts.push(`Status: ${todo.status}`);
    parts.push(`Priority: ${todo.priority}`);

    if (todo.category) {
      parts.push(`Category: ${todo.category.name}`);
    }

    if (todo.tags && todo.tags.length > 0) {
      parts.push(`Tags: ${todo.tags.map(t => t.name).join(', ')}`);
    }

    if (todo.createdAt) {
      parts.push(`Created: ${new Date(todo.createdAt).toLocaleString()}`);
    }

    if (todo.completedAt) {
      parts.push(`Completed: ${new Date(todo.completedAt).toLocaleString()}`);
    }

    return parts.join('\n');
  }

  private getCategories(todo: Todo): string[] {
    const categories: string[] = [];

    // Add category
    if (todo.category) {
      categories.push(todo.category.name);
    }

    // Add tags
    if (todo.tags) {
      categories.push(...todo.tags.map(t => t.name));
    }

    // Add priority as category
    categories.push(todo.priority);

    return categories;
  }

  private mapStatus(status: TodoStatus): 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED' {
    switch (status) {
      case TodoStatus.COMPLETED:
      case TodoStatus.IN_PROGRESS:
        return 'CONFIRMED';
      case TodoStatus.CANCELLED:
        return 'CANCELLED';
      case TodoStatus.PENDING:
      case TodoStatus.ARCHIVED:
      default:
        return 'TENTATIVE';
    }
  }

  private mapPriority(priority: Priority): number {
    switch (priority) {
      case Priority.URGENT:
        return 1; // Highest
      case Priority.HIGH:
        return 3;
      case Priority.MEDIUM:
        return 5;
      case Priority.LOW:
        return 7;
      default:
        return 5;
    }
  }

  private mapRecurrence(recurrence: Recurrence): any {
    switch (recurrence) {
      case Recurrence.DAILY:
        return {
          freq: 'DAILY',
          interval: 1,
        };
      case Recurrence.WEEKLY:
        return {
          freq: 'WEEKLY',
          interval: 1,
        };
      case Recurrence.MONTHLY:
        return {
          freq: 'MONTHLY',
          interval: 1,
        };
      case Recurrence.YEARLY:
        return {
          freq: 'YEARLY',
          interval: 1,
        };
      case Recurrence.CUSTOM:
        // For custom, default to weekly
        return {
          freq: 'WEEKLY',
          interval: 1,
        };
      default:
        return null;
    }
  }

  private getPriorityEmoji(priority: Priority): string {
    switch (priority) {
      case Priority.URGENT:
        return '🔴 ';
      case Priority.HIGH:
        return '🟠 ';
      case Priority.MEDIUM:
        return '🟡 ';
      case Priority.LOW:
        return '🟢 ';
      default:
        return '';
    }
  }
}