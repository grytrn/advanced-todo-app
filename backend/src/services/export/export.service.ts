import { PrismaClient } from '@prisma/client';
import Bull, { Job, Queue } from 'bull';
import * as fs from 'fs/promises';
import * as path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { createLogger } from '../../utils/logger';
import { NotFoundError, ValidationError } from '../../utils/errors';
import type {
  ExportOptions,
  ExportJob,
  CreateExportRequest,
  ExportSchedule,
  ExportTemplate,
  CreateExportScheduleRequest,
  UpdateExportScheduleRequest,
  CreateExportTemplateRequest,
  UpdateExportTemplateRequest,
  EmailDeliveryOptions,
} from '@shared/types/export';
import { ExportFormat, ExportStatus } from '@shared/types/export';
import type { TodoListRequest } from '@shared/types/todo';
import { TodoService } from '../todo.service';
import { PdfExportGenerator } from './generators/pdf.generator';
import { CsvExportGenerator } from './generators/csv.generator';
import { JsonExportGenerator } from './generators/json.generator';
import { MarkdownExportGenerator } from './generators/markdown.generator';
import { IcalExportGenerator } from './generators/ical.generator';
import { EmailService } from '../email.service';
import { env } from '../../config/env';

const logger = createLogger('export-service');

export class ExportService {
  private exportQueue: Queue<ExportJobData>;
  private todoService: TodoService;
  private emailService: EmailService;
  // private exportDir: string; // Unused variable

  constructor(private prisma: PrismaClient) {
    this.todoService = new TodoService(prisma);
    this.emailService = new EmailService();
    // this.exportDir = path.join(process.cwd(), 'exports'); // Unused
    
    // Initialize Bull queue
    this.exportQueue = new Bull('export-queue', {
      redis: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
      },
    });

    // Process export jobs
    this.exportQueue.process(async (job: Job<ExportJobData>) => {
      await this.processExportJob(job);
    });

    // Clean up old exports
    this.scheduleCleanup();
  }

  /**
   * Create a new export job
   */
  async createExport(userId: string, request: CreateExportRequest): Promise<{ jobId: string; status: ExportStatus }> {
    // Create export job record
    const job = await this.prisma.exportJob.create({
      data: {
        userId,
        format: request.format,
        status: ExportStatus.PENDING,
        options: JSON.parse(JSON.stringify(request.options || {})),
      },
    });

    // Add to queue
    await this.exportQueue.add({
      jobId: job.id,
      userId,
      format: request.format,
      options: (request.options || {}) as ExportOptions,
      sendEmail: request.sendEmail || false,
      emailRecipients: request.emailRecipients || [],
    });

    logger.info({ jobId: job.id, userId, format: request.format }, 'Export job created');

    return {
      jobId: job.id,
      status: ExportStatus.PENDING,
    };
  }

  /**
   * Get export job status
   */
  async getExportJob(userId: string, jobId: string): Promise<ExportJob> {
    const job = await this.prisma.exportJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!job) {
      throw new NotFoundError('Export job not found');
    }

    return {
      ...job,
      options: job.options as unknown as ExportOptions,
      emailDelivery: job.emailDelivery as unknown as EmailDeliveryOptions | undefined,
    } as ExportJob;
  }

  /**
   * List export jobs
   */
  async listExportJobs(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: ExportStatus,
    format?: ExportFormat
  ): Promise<{ items: ExportJob[]; pagination: any }> {
    const skip = (page - 1) * limit;
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (format) {
      where.format = format;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.exportJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exportJob.count({ where }),
    ]);

    return {
      items: jobs.map(job => ({
        ...job,
        options: job.options as unknown as ExportOptions,
        emailDelivery: job.emailDelivery as unknown as EmailDeliveryOptions | undefined,
      })) as ExportJob[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Download export file
   */
  async downloadExport(userId: string, jobId: string): Promise<{ path: string; filename: string; mimeType: string }> {
    const job = await this.getExportJob(userId, jobId);

    if (job.status !== ExportStatus.COMPLETED) {
      throw new ValidationError('Export is not ready for download');
    }

    if (!job.fileUrl) {
      throw new NotFoundError('Export file not found');
    }

    const mimeTypes: Record<ExportFormat, string> = {
      [ExportFormat.PDF]: 'application/pdf',
      [ExportFormat.CSV]: 'text/csv',
      [ExportFormat.JSON]: 'application/json',
      [ExportFormat.MARKDOWN]: 'text/markdown',
      [ExportFormat.ICAL]: 'text/calendar',
    };

    return {
      path: job.fileUrl,
      filename: job.fileName || `export-${jobId}.${job.format.toLowerCase()}`,
      mimeType: mimeTypes[job.format],
    };
  }

  /**
   * Process export job
   */
  private async processExportJob(job: Job<ExportJobData>): Promise<void> {
    const { jobId, userId, format, options, sendEmail, emailRecipients } = job.data;

    try {
      // Update job status
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: ExportStatus.PROCESSING,
          startedAt: new Date(),
        },
      });

      // Fetch todos based on options
      const todos = await this.fetchTodosForExport(userId, options);

      // Generate export file
      let filePath: string;
      let fileName: string;

      switch (format) {
        case ExportFormat.PDF:
          const pdfGenerator = new PdfExportGenerator();
          ({ filePath, fileName } = await pdfGenerator.generate(todos, options, userId));
          break;
        case ExportFormat.CSV:
          const csvGenerator = new CsvExportGenerator();
          ({ filePath, fileName } = await csvGenerator.generate(todos, options));
          break;
        case ExportFormat.JSON:
          const jsonGenerator = new JsonExportGenerator();
          ({ filePath, fileName } = await jsonGenerator.generate(todos, options));
          break;
        case ExportFormat.MARKDOWN:
          const markdownGenerator = new MarkdownExportGenerator();
          ({ filePath, fileName } = await markdownGenerator.generate(todos, options));
          break;
        case ExportFormat.ICAL:
          const icalGenerator = new IcalExportGenerator();
          ({ filePath, fileName } = await icalGenerator.generate(todos, options));
          break;
        default:
          throw new ValidationError(`Unsupported export format: ${format}`);
      }

      // Get file size
      const stats = await fs.stat(filePath);

      // Compress if file is larger than 10MB
      let finalFilePath = filePath;
      let finalFileName = fileName;
      let finalFileSize = stats.size;

      if (stats.size > 10 * 1024 * 1024) { // 10MB
        const compressedResult = await this.compressFile(filePath, fileName);
        finalFilePath = compressedResult.filePath;
        finalFileName = compressedResult.fileName;
        finalFileSize = compressedResult.fileSize;

        // Delete original file
        await fs.unlink(filePath);
      }

      // Update job with file info
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: ExportStatus.COMPLETED,
          fileUrl: finalFilePath,
          fileName: finalFileName,
          fileSize: finalFileSize,
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Send email if requested
      if (sendEmail && emailRecipients.length > 0) {
        await this.emailService.sendExportEmail(emailRecipients, {
          jobId,
          format,
          fileName,
          downloadUrl: `${env.APP_URL}/api/v1/exports/${jobId}/download`,
        });
      }

      // Report progress
      job.progress(100);

      logger.info({ jobId, userId, format }, 'Export job completed successfully');
    } catch (error) {
      logger.error({ jobId, error }, 'Export job failed');

      // Update job status
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: ExportStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Fetch todos for export based on options
   */
  private async fetchTodosForExport(userId: string, options: ExportOptions): Promise<any[]> {
    const query: TodoListRequest = {
      limit: 1000, // Export all todos
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    // Apply filters
    if (options.categoryIds && options.categoryIds.length > 0) {
      // We'll need to handle multiple categories
      // For now, we'll use the first one
      query.categoryId = options.categoryIds[0];
    }

    if (options.priorities && options.priorities.length > 0) {
      // Use the first priority for now
      query.priority = options.priorities[0] as any;
    }

    if (options.tagNames && options.tagNames.length > 0) {
      query.tag = options.tagNames[0];
    }

    if (!options.includeCompleted) {
      query.status = 'PENDING' as any;
    }

    const result = await this.todoService.list(userId, query);
    let todos = result.items;

    // Apply date range filter if specified
    if (options.dateRange) {
      todos = todos.filter(todo => {
        if (options.dateRange!.from && todo.createdAt < new Date(options.dateRange!.from)) {
          return false;
        }
        if (options.dateRange!.to && todo.createdAt > new Date(options.dateRange!.to)) {
          return false;
        }
        return true;
      });
    }

    return todos;
  }

  /**
   * Create export schedule
   */
  async createExportSchedule(userId: string, request: CreateExportScheduleRequest): Promise<ExportSchedule> {
    const nextRunAt = this.calculateNextRunAt(request.frequency);

    const schedule = await this.prisma.exportSchedule.create({
      data: {
        userId,
        name: request.name,
        frequency: request.frequency,
        format: request.format,
        options: request.options as any,
        emailDelivery: (request.emailDelivery || { enabled: false, recipients: [] }) as any,
        nextRunAt,
        isActive: true,
      },
    });

    logger.info({ scheduleId: schedule.id, userId }, 'Export schedule created');

    return {
      ...schedule,
      options: schedule.options as unknown as ExportOptions,
      emailDelivery: schedule.emailDelivery as unknown as EmailDeliveryOptions,
    } as ExportSchedule;
  }

  /**
   * Update export schedule
   */
  async updateExportSchedule(
    userId: string,
    scheduleId: string,
    request: UpdateExportScheduleRequest
  ): Promise<ExportSchedule> {
    const schedule = await this.prisma.exportSchedule.findFirst({
      where: {
        id: scheduleId,
        userId,
      },
    });

    if (!schedule) {
      throw new NotFoundError('Export schedule not found');
    }

    const updateData: any = { ...request };

    if (request.frequency) {
      updateData.nextRunAt = this.calculateNextRunAt(request.frequency);
    }

    const updated = await this.prisma.exportSchedule.update({
      where: { id: scheduleId },
      data: updateData,
    });

    logger.info({ scheduleId, userId }, 'Export schedule updated');

    return {
      ...updated,
      options: updated.options as unknown as ExportOptions,
      emailDelivery: updated.emailDelivery as unknown as EmailDeliveryOptions,
    } as ExportSchedule;
  }

  /**
   * Delete export schedule
   */
  async deleteExportSchedule(userId: string, scheduleId: string): Promise<void> {
    const schedule = await this.prisma.exportSchedule.findFirst({
      where: {
        id: scheduleId,
        userId,
      },
    });

    if (!schedule) {
      throw new NotFoundError('Export schedule not found');
    }

    await this.prisma.exportSchedule.delete({
      where: { id: scheduleId },
    });

    logger.info({ scheduleId, userId }, 'Export schedule deleted');
  }

  /**
   * List export schedules
   */
  async listExportSchedules(userId: string): Promise<ExportSchedule[]> {
    const schedules = await this.prisma.exportSchedule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return schedules.map(schedule => ({
      ...schedule,
      options: schedule.options as unknown as ExportOptions,
      emailDelivery: schedule.emailDelivery as unknown as EmailDeliveryOptions,
    })) as ExportSchedule[];
  }

  /**
   * Create export template
   */
  async createExportTemplate(
    userId: string,
    request: CreateExportTemplateRequest
  ): Promise<ExportTemplate> {
    const template = await this.prisma.exportTemplate.create({
      data: {
        userId,
        name: request.name,
        description: request.description,
        format: request.format,
        content: request.content,
        isPublic: request.isPublic || false,
        isDefault: false,
        variables: this.extractTemplateVariables(request.content),
      },
    });

    logger.info({ templateId: template.id, userId }, 'Export template created');

    return template as ExportTemplate;
  }

  /**
   * Update export template
   */
  async updateExportTemplate(
    userId: string,
    templateId: string,
    request: UpdateExportTemplateRequest
  ): Promise<ExportTemplate> {
    const template = await this.prisma.exportTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!template) {
      throw new NotFoundError('Export template not found');
    }

    const updateData: any = { ...request };

    if (request.content) {
      updateData.variables = this.extractTemplateVariables(request.content);
    }

    const updated = await this.prisma.exportTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    logger.info({ templateId, userId }, 'Export template updated');

    return updated as ExportTemplate;
  }

  /**
   * Delete export template
   */
  async deleteExportTemplate(userId: string, templateId: string): Promise<void> {
    const template = await this.prisma.exportTemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!template) {
      throw new NotFoundError('Export template not found');
    }

    await this.prisma.exportTemplate.delete({
      where: { id: templateId },
    });

    logger.info({ templateId, userId }, 'Export template deleted');
  }

  /**
   * List export templates
   */
  async listExportTemplates(
    userId: string,
    format?: ExportFormat,
    includePublic: boolean = true
  ): Promise<ExportTemplate[]> {
    const where: any = {
      OR: [
        { userId },
        ...(includePublic ? [{ isPublic: true }] : []),
        { isDefault: true },
      ],
    };

    if (format) {
      where.format = format;
    }

    const templates = await this.prisma.exportTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return templates as ExportTemplate[];
  }

  /**
   * Calculate next run time for scheduled export
   */
  private calculateNextRunAt(frequency: string): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        next.setHours(9, 0, 0, 0); // 9 AM
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        next.setHours(9, 0, 0, 0);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(9, 0, 0, 0);
        break;
      default:
        next.setHours(next.getHours() + 1);
    }

    return next;
  }

  /**
   * Extract template variables from content
   */
  private extractTemplateVariables(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        variables.add(match[1].trim());
      }
    }

    return Array.from(variables);
  }

  /**
   * Schedule cleanup of old export files
   */
  private scheduleCleanup(): void {
    setInterval(async () => {
      try {
        await this.cleanupOldExports();
      } catch (error) {
        logger.error({ error }, 'Failed to clean up old exports');
      }
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Clean up expired export files
   */
  private async cleanupOldExports(): Promise<void> {
    const expiredJobs = await this.prisma.exportJob.findMany({
      where: {
        status: ExportStatus.COMPLETED,
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    for (const job of expiredJobs) {
      if (job.fileUrl) {
        try {
          await fs.unlink(job.fileUrl);
          logger.info({ jobId: job.id }, 'Deleted expired export file');
        } catch (error) {
          logger.error({ jobId: job.id, error }, 'Failed to delete export file');
        }
      }

      await this.prisma.exportJob.update({
        where: { id: job.id },
        data: {
          status: ExportStatus.EXPIRED,
          fileUrl: null,
        },
      });
    }

    logger.info({ count: expiredJobs.length }, 'Cleaned up expired exports');
  }

  /**
   * Compress a file using ZIP
   */
  private async compressFile(
    filePath: string,
    fileName: string
  ): Promise<{ filePath: string; fileName: string; fileSize: number }> {
    const zipFileName = fileName.replace(/\.[^.]+$/, '.zip');
    const zipFilePath = path.join(path.dirname(filePath), zipFileName);

    return new Promise((resolve, reject) => {
      const output = createWriteStream(zipFilePath);
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      });

      output.on('close', async () => {
        const stats = await fs.stat(zipFilePath);
        logger.info(
          {
            originalSize: (await fs.stat(filePath)).size,
            compressedSize: stats.size,
            compressionRatio: ((1 - stats.size / (await fs.stat(filePath)).size) * 100).toFixed(2) + '%',
          },
          'File compressed successfully'
        );
        resolve({
          filePath: zipFilePath,
          fileName: zipFileName,
          fileSize: stats.size,
        });
      });

      archive.on('error', (err) => {
        logger.error({ error: err }, 'Compression failed');
        reject(err);
      });

      archive.pipe(output);
      archive.file(filePath, { name: fileName });
      archive.finalize();
    });
  }
}

interface ExportJobData {
  jobId: string;
  userId: string;
  format: ExportFormat;
  options: ExportOptions;
  sendEmail: boolean;
  emailRecipients: string[];
}