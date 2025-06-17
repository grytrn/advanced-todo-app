import * as fs from 'fs/promises';
import * as path from 'path';
import { ExportOptions } from '@shared/types/export';
import { Todo, Priority, TodoStatus } from '@shared/types/todo';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('markdown-export-generator');

export class MarkdownExportGenerator {
  async generate(
    todos: Todo[],
    options: ExportOptions
  ): Promise<{ filePath: string; fileName: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `todos-export-${timestamp}.md`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Generate Markdown content
    const content = this.generateMarkdown(todos, options);

    // Write file
    await fs.writeFile(filePath, content, 'utf-8');

    logger.info({ filePath, todosCount: todos.length }, 'Markdown export generated');

    return { filePath, fileName };
  }

  private generateMarkdown(todos: Todo[], options: ExportOptions): string {
    const sections: string[] = [];

    // Header
    sections.push(this.generateHeader());

    // Metadata
    if (options.markdown?.includeMetadata !== false) {
      sections.push(this.generateMetadata(todos));
    }

    // Statistics
    sections.push(this.generateStatistics(todos));

    // Todos
    if (options.markdown?.groupBy) {
      sections.push(this.generateGroupedTodos(todos, options.markdown.groupBy));
    } else {
      sections.push(this.generateTodosList(todos, options));
    }

    return sections.join('\n\n');
  }

  private generateHeader(): string {
    const now = new Date();
    return `# Todo Export

**Generated:** ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
  }

  private generateMetadata(todos: Todo[]): string {
    const categories = new Set(todos.map(t => t.category?.name).filter(Boolean));
    const tags = new Set(todos.flatMap(t => t.tags?.map(tag => tag.name) || []));

    return `## Export Information

- **Total Todos:** ${todos.length}
- **Categories:** ${categories.size > 0 ? Array.from(categories).join(', ') : 'None'}
- **Tags:** ${tags.size > 0 ? Array.from(tags).join(', ') : 'None'}`;
  }

  private generateStatistics(todos: Todo[]): string {
    const stats = this.calculateStats(todos);

    return `## Statistics

### Status Breakdown
- ✅ **Completed:** ${stats.completed} (${stats.completionRate}%)
- 🔄 **In Progress:** ${stats.inProgress}
- ⏳ **Pending:** ${stats.pending}
- ❌ **Cancelled:** ${stats.cancelled}
- 🗄️ **Archived:** ${stats.archived}

### Priority Distribution
- 🔴 **Urgent:** ${stats.byPriority.urgent}
- 🟠 **High:** ${stats.byPriority.high}
- 🟡 **Medium:** ${stats.byPriority.medium}
- 🟢 **Low:** ${stats.byPriority.low}

### Time Analysis
- ⚠️ **Overdue:** ${stats.overdue}
- 📅 **With Due Date:** ${stats.withDueDate}
- 🔁 **Recurring:** ${stats.recurring}`;
  }

  private generateTodosList(todos: Todo[], options: ExportOptions): string {
    const lines = ['## Todos\n'];

    todos.forEach((todo, index) => {
      lines.push(this.formatTodo(todo, index + 1, options));
    });

    return lines.join('\n');
  }

  private generateGroupedTodos(todos: Todo[], groupBy: 'category' | 'priority' | 'dueDate'): string {
    const sections: string[] = ['## Todos\n'];
    const groups = this.groupTodos(todos, groupBy);

    Object.entries(groups).forEach(([groupName, groupTodos]) => {
      sections.push(`### ${groupName}`);
      sections.push('');
      
      groupTodos.forEach((todo, index) => {
        sections.push(this.formatTodo(todo, index + 1));
      });
      
      sections.push('');
    });

    return sections.join('\n');
  }

  private groupTodos(todos: Todo[], groupBy: 'category' | 'priority' | 'dueDate'): Record<string, Todo[]> {
    const groups: Record<string, Todo[]> = {};

    todos.forEach(todo => {
      let groupKey: string;

      switch (groupBy) {
        case 'category':
          groupKey = todo.category?.name || 'Uncategorized';
          break;
        case 'priority':
          groupKey = this.formatPriority(todo.priority);
          break;
        case 'dueDate':
          if (!todo.dueDate) {
            groupKey = 'No Due Date';
          } else {
            const dueDate = new Date(todo.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);

            if (dueDate < today) {
              groupKey = '⚠️ Overdue';
            } else if (dueDate < tomorrow) {
              groupKey = '📅 Today';
            } else if (dueDate < nextWeek) {
              groupKey = '📆 This Week';
            } else {
              groupKey = '📅 Future';
            }
          }
          break;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(todo);
    });

    // Sort groups
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (groupBy === 'priority') {
        const priorityOrder = ['🔴 Urgent', '🟠 High', '🟡 Medium', '🟢 Low'];
        return priorityOrder.indexOf(a) - priorityOrder.indexOf(b);
      }
      if (groupBy === 'dueDate') {
        const dateOrder = ['⚠️ Overdue', '📅 Today', '📆 This Week', '📅 Future', 'No Due Date'];
        return dateOrder.indexOf(a) - dateOrder.indexOf(b);
      }
      return a.localeCompare(b);
    });

    const sortedGroups: Record<string, Todo[]> = {};
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }

  private formatTodo(todo: Todo, index: number, options?: ExportOptions): string {
    const lines: string[] = [];
    
    // Title with checkbox
    const checkbox = todo.status === TodoStatus.COMPLETED ? '[x]' : '[ ]';
    const priority = this.formatPriorityBadge(todo.priority);
    lines.push(`${index}. ${checkbox} **${todo.title}** ${priority}`);

    // Description
    if (todo.description) {
      lines.push(`   > ${todo.description.replace(/\n/g, '\n   > ')}`);
    }

    // Metadata
    const metadata: string[] = [];

    if (todo.category) {
      metadata.push(`📁 ${todo.category.name}`);
    }

    if (todo.dueDate) {
      const dueDate = new Date(todo.dueDate);
      const isOverdue = dueDate < new Date() && todo.status !== TodoStatus.COMPLETED;
      metadata.push(`📅 ${isOverdue ? '⚠️ ' : ''}${dueDate.toLocaleDateString()}`);
    }

    if (todo.tags && todo.tags.length > 0) {
      metadata.push(`🏷️ ${todo.tags.map(t => t.name).join(', ')}`);
    }

    if (todo.isRecurring) {
      metadata.push(`🔁 ${todo.recurrence}`);
    }

    if (options?.includeAttachments && todo.attachments && todo.attachments.length > 0) {
      metadata.push(`📎 ${todo.attachments.length} attachment(s)`);
    }

    if (options?.includeComments && todo.commentsCount && todo.commentsCount > 0) {
      metadata.push(`💬 ${todo.commentsCount} comment(s)`);
    }

    if (todo.completedAt) {
      metadata.push(`✅ ${new Date(todo.completedAt).toLocaleDateString()}`);
    }

    if (metadata.length > 0) {
      lines.push(`   ${metadata.join(' | ')}`);
    }

    lines.push('');

    return lines.join('\n');
  }

  private formatPriority(priority: Priority): string {
    const priorities: Record<Priority, string> = {
      [Priority.URGENT]: '🔴 Urgent',
      [Priority.HIGH]: '🟠 High',
      [Priority.MEDIUM]: '🟡 Medium',
      [Priority.LOW]: '🟢 Low',
    };
    return priorities[priority];
  }

  private formatPriorityBadge(priority: Priority): string {
    const badges: Record<Priority, string> = {
      [Priority.URGENT]: '`🔴 URGENT`',
      [Priority.HIGH]: '`🟠 HIGH`',
      [Priority.MEDIUM]: '`🟡 MEDIUM`',
      [Priority.LOW]: '`🟢 LOW`',
    };
    return badges[priority];
  }

  private calculateStats(todos: Todo[]): any {
    const stats = {
      completed: 0,
      pending: 0,
      inProgress: 0,
      cancelled: 0,
      archived: 0,
      overdue: 0,
      withDueDate: 0,
      recurring: 0,
      completionRate: 0,
      byPriority: {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    };

    todos.forEach(todo => {
      // Status
      switch (todo.status) {
        case TodoStatus.COMPLETED:
          stats.completed++;
          break;
        case TodoStatus.PENDING:
          stats.pending++;
          break;
        case TodoStatus.IN_PROGRESS:
          stats.inProgress++;
          break;
        case TodoStatus.CANCELLED:
          stats.cancelled++;
          break;
        case TodoStatus.ARCHIVED:
          stats.archived++;
          break;
      }

      // Priority
      switch (todo.priority) {
        case Priority.URGENT:
          stats.byPriority.urgent++;
          break;
        case Priority.HIGH:
          stats.byPriority.high++;
          break;
        case Priority.MEDIUM:
          stats.byPriority.medium++;
          break;
        case Priority.LOW:
          stats.byPriority.low++;
          break;
      }

      // Other stats
      if (todo.dueDate) {
        stats.withDueDate++;
        if (new Date(todo.dueDate) < new Date() && todo.status !== TodoStatus.COMPLETED) {
          stats.overdue++;
        }
      }

      if (todo.isRecurring) {
        stats.recurring++;
      }
    });

    stats.completionRate = todos.length > 0 
      ? Math.round((stats.completed / todos.length) * 100)
      : 0;

    return stats;
  }
}