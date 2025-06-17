import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import handlebars from 'handlebars';
import { ExportOptions, ExportFormat } from '@shared/types/export';
import { Todo, Priority, TodoStatus } from '@shared/types/todo';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('pdf-export-generator');

export class PdfExportGenerator {
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(process.cwd(), 'src/services/export/templates');
    this.registerHelpers();
  }

  async generate(
    todos: Todo[],
    options: ExportOptions,
    userId: string
  ): Promise<{ filePath: string; fileName: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `todos-export-${timestamp}.pdf`;
    const filePath = path.join(process.cwd(), 'exports', userId, fileName);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Load template
    const templateContent = await this.loadTemplate(options.pdf?.templateId);
    const template = handlebars.compile(templateContent);

    // Prepare data
    const data = this.prepareTemplateData(todos, options);

    // Generate HTML
    const html = template(data);

    // Generate PDF
    await this.generatePdfFromHtml(html, filePath, options);

    logger.info({ filePath, todosCount: todos.length }, 'PDF export generated');

    return { filePath, fileName };
  }

  private async loadTemplate(templateId?: string): Promise<string> {
    const templatePath = templateId
      ? path.join(this.templatesDir, `${templateId}.hbs`)
      : path.join(this.templatesDir, 'default.hbs');

    try {
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      // Fallback to default template
      return this.getDefaultTemplate();
    }
  }

  private prepareTemplateData(todos: Todo[], options: ExportOptions): any {
    const now = new Date();
    const stats = this.calculateStats(todos);

    // Group todos if requested
    let groupedTodos: any = {};
    if (options.pdf?.includeCharts) {
      groupedTodos = this.groupTodos(todos);
    }

    return {
      title: 'Todo Export',
      generatedAt: now.toISOString(),
      generatedDate: now.toLocaleDateString(),
      generatedTime: now.toLocaleTimeString(),
      todosCount: todos.length,
      todos: todos.map(todo => ({
        ...todo,
        dueDateFormatted: todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : null,
        reminderFormatted: todo.reminder ? new Date(todo.reminder).toLocaleString() : null,
        createdAtFormatted: new Date(todo.createdAt).toLocaleDateString(),
        priorityColor: this.getPriorityColor(todo.priority),
        statusIcon: this.getStatusIcon(todo.status),
        tagsString: todo.tags?.map(t => t.name).join(', ') || '',
      })),
      stats,
      groupedTodos,
      includeCharts: options.pdf?.includeCharts || false,
      branding: options.pdf?.branding || {},
      chartData: options.pdf?.includeCharts ? this.prepareChartData(todos) : null,
    };
  }

  private calculateStats(todos: Todo[]): any {
    const completed = todos.filter(t => t.status === TodoStatus.COMPLETED).length;
    const pending = todos.filter(t => t.status === TodoStatus.PENDING).length;
    const inProgress = todos.filter(t => t.status === TodoStatus.IN_PROGRESS).length;
    const overdue = todos.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < new Date() && 
      t.status !== TodoStatus.COMPLETED
    ).length;

    return {
      total: todos.length,
      completed,
      pending,
      inProgress,
      overdue,
      completionRate: todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0,
      byPriority: {
        urgent: todos.filter(t => t.priority === Priority.URGENT).length,
        high: todos.filter(t => t.priority === Priority.HIGH).length,
        medium: todos.filter(t => t.priority === Priority.MEDIUM).length,
        low: todos.filter(t => t.priority === Priority.LOW).length,
      },
    };
  }

  private groupTodos(todos: Todo[]): any {
    const byCategory: Record<string, Todo[]> = {};
    const byPriority: Record<string, Todo[]> = {};
    const byStatus: Record<string, Todo[]> = {};

    todos.forEach(todo => {
      // By category
      const categoryName = todo.category?.name || 'Uncategorized';
      if (!byCategory[categoryName]) byCategory[categoryName] = [];
      byCategory[categoryName].push(todo);

      // By priority
      if (!byPriority[todo.priority]) byPriority[todo.priority] = [];
      byPriority[todo.priority].push(todo);

      // By status
      if (!byStatus[todo.status]) byStatus[todo.status] = [];
      byStatus[todo.status].push(todo);
    });

    return { byCategory, byPriority, byStatus };
  }

  private prepareChartData(todos: Todo[]): any {
    const stats = this.calculateStats(todos);

    return {
      statusChart: {
        labels: ['Completed', 'Pending', 'In Progress'],
        data: [stats.completed, stats.pending, stats.inProgress],
        colors: ['#10b981', '#f59e0b', '#3b82f6'],
      },
      priorityChart: {
        labels: ['Urgent', 'High', 'Medium', 'Low'],
        data: [
          stats.byPriority.urgent,
          stats.byPriority.high,
          stats.byPriority.medium,
          stats.byPriority.low,
        ],
        colors: ['#ef4444', '#f97316', '#f59e0b', '#84cc16'],
      },
    };
  }

  private async generatePdfFromHtml(html: string, outputPath: string, options: ExportOptions): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      
      // Set content
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      await page.pdf({
        path: outputPath,
        format: options.pdf?.pageSize || 'A4',
        landscape: options.pdf?.orientation === 'landscape',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });
    } finally {
      await browser.close();
    }
  }

  private registerHelpers(): void {
    handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    handlebars.registerHelper('gte', (a: any, b: any) => a >= b);
    handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    handlebars.registerHelper('lte', (a: any, b: any) => a <= b);
    handlebars.registerHelper('and', (a: any, b: any) => a && b);
    handlebars.registerHelper('or', (a: any, b: any) => a || b);
    handlebars.registerHelper('not', (a: any) => !a);
    handlebars.registerHelper('formatDate', (date: any) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString();
    });
    handlebars.registerHelper('formatDateTime', (date: any) => {
      if (!date) return '';
      return new Date(date).toLocaleString();
    });
    handlebars.registerHelper('json', (context: any) => JSON.stringify(context));
  }

  private getPriorityColor(priority: Priority): string {
    const colors: Record<Priority, string> = {
      [Priority.URGENT]: '#ef4444',
      [Priority.HIGH]: '#f97316',
      [Priority.MEDIUM]: '#f59e0b',
      [Priority.LOW]: '#84cc16',
    };
    return colors[priority] || '#6b7280';
  }

  private getStatusIcon(status: TodoStatus): string {
    const icons: Record<TodoStatus, string> = {
      [TodoStatus.COMPLETED]: '✓',
      [TodoStatus.IN_PROGRESS]: '→',
      [TodoStatus.PENDING]: '○',
      [TodoStatus.CANCELLED]: '✗',
      [TodoStatus.ARCHIVED]: '☰',
    };
    return icons[status] || '○';
  }

  private getDefaultTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{title}}</title>
  <style>
    body {
      font-family: {{#if branding.fontFamily}}{{branding.fontFamily}}{{else}}-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif{{/if}};
      color: #1f2937;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid {{#if branding.primaryColor}}{{branding.primaryColor}}{{else}}#3b82f6{{/if}};
      padding-bottom: 20px;
    }
    .logo {
      max-height: 60px;
      margin-bottom: 20px;
    }
    h1 {
      color: {{#if branding.primaryColor}}{{branding.primaryColor}}{{else}}#3b82f6{{/if}};
      margin: 0 0 10px 0;
    }
    .meta {
      color: #6b7280;
      font-size: 14px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin: 40px 0;
    }
    .stat-card {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: {{#if branding.primaryColor}}{{branding.primaryColor}}{{else}}#3b82f6{{/if}};
    }
    .stat-label {
      color: #6b7280;
      font-size: 14px;
      margin-top: 5px;
    }
    .todos-section {
      margin-top: 40px;
    }
    .todo-item {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .todo-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 10px;
    }
    .todo-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      flex: 1;
    }
    .todo-status {
      font-size: 24px;
      margin-right: 10px;
    }
    .todo-priority {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }
    .priority-urgent { background-color: #ef4444; }
    .priority-high { background-color: #f97316; }
    .priority-medium { background-color: #f59e0b; }
    .priority-low { background-color: #84cc16; }
    .todo-description {
      color: #4b5563;
      margin: 10px 0;
    }
    .todo-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-top: 10px;
      font-size: 14px;
      color: #6b7280;
    }
    .todo-meta-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .tag {
      display: inline-block;
      padding: 2px 8px;
      background: #e5e7eb;
      border-radius: 4px;
      font-size: 12px;
      margin-right: 5px;
    }
    .chart-container {
      margin: 40px 0;
      text-align: center;
    }
    .chart {
      max-width: 400px;
      margin: 0 auto;
    }
    @media print {
      .todo-item {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if branding.logo}}
        <img src="{{branding.logo}}" alt="Logo" class="logo">
      {{/if}}
      <h1>{{title}}</h1>
      <div class="meta">
        Generated on {{generatedDate}} at {{generatedTime}}<br>
        Total Todos: {{todosCount}}
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">{{stats.completed}}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{stats.pending}}</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{stats.inProgress}}</div>
        <div class="stat-label">In Progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{stats.overdue}}</div>
        <div class="stat-label">Overdue</div>
      </div>
    </div>

    {{#if includeCharts}}
    <div class="chart-container">
      <h2>Todo Statistics</h2>
      <!-- Charts would be rendered here using Chart.js or similar -->
    </div>
    {{/if}}

    <div class="todos-section">
      <h2>Todos</h2>
      {{#each todos}}
      <div class="todo-item">
        <div class="todo-header">
          <div style="display: flex; align-items: start; flex: 1;">
            <span class="todo-status">{{statusIcon}}</span>
            <div class="todo-title">{{title}}</div>
          </div>
          <span class="todo-priority priority-{{../priority}}">{{priority}}</span>
        </div>
        
        {{#if description}}
        <div class="todo-description">{{description}}</div>
        {{/if}}
        
        <div class="todo-meta">
          {{#if category}}
          <div class="todo-meta-item">
            📁 {{category.name}}
          </div>
          {{/if}}
          
          {{#if dueDateFormatted}}
          <div class="todo-meta-item">
            📅 Due: {{dueDateFormatted}}
          </div>
          {{/if}}
          
          {{#if tagsString}}
          <div class="todo-meta-item">
            🏷️ {{tagsString}}
          </div>
          {{/if}}
          
          <div class="todo-meta-item">
            📝 Created: {{createdAtFormatted}}
          </div>
        </div>
      </div>
      {{/each}}
    </div>
  </div>
</body>
</html>
    `;
  }
}