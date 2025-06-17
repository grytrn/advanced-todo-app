import { PrismaClient } from '@prisma/client';
import { CronJob } from 'cron';
import { ExportService } from './export.service';
import { createLogger } from '../../utils/logger';
import { ExportFrequency, ExportStatus } from '@shared/types/export';
import { TodoStatus } from '@shared/types/todo';
import { env } from '../../config/env';

const logger = createLogger('scheduled-export-processor');

export class ScheduledExportProcessor {
  private cronJobs: Map<string, CronJob> = new Map();
  
  constructor(
    private prisma: PrismaClient,
    private exportService: ExportService
  ) {}

  /**
   * Start processing scheduled exports
   */
  async start(): Promise<void> {
    logger.info('Starting scheduled export processor');

    // Load all active schedules
    const schedules = await this.prisma.exportSchedule.findMany({
      where: { isActive: true },
    });

    // Start cron jobs for each schedule
    for (const schedule of schedules) {
      this.scheduleExport(schedule);
    }

    // Check for schedules that should have run
    await this.processOverdueSchedules();

    logger.info({ count: schedules.length }, 'Scheduled export processor started');
  }

  /**
   * Stop all scheduled exports
   */
  stop(): void {
    logger.info('Stopping scheduled export processor');

    // Stop all cron jobs
    for (const [scheduleId, job] of this.cronJobs) {
      job.stop();
      logger.info({ scheduleId }, 'Stopped cron job');
    }

    this.cronJobs.clear();
  }

  /**
   * Add or update a scheduled export
   */
  scheduleExport(schedule: any): void {
    // Remove existing job if exists
    if (this.cronJobs.has(schedule.id)) {
      this.cronJobs.get(schedule.id)!.stop();
      this.cronJobs.delete(schedule.id);
    }

    if (!schedule.isActive) {
      return;
    }

    // Create cron pattern based on frequency
    const cronPattern = this.getCronPattern(schedule.frequency);
    if (!cronPattern) {
      logger.warn({ scheduleId: schedule.id, frequency: schedule.frequency }, 'Invalid frequency');
      return;
    }

    // Create cron job
    const job = new CronJob(
      cronPattern,
      async () => {
        await this.runScheduledExport(schedule.id);
      },
      null,
      true,
      'UTC'
    );

    this.cronJobs.set(schedule.id, job);
    logger.info({ scheduleId: schedule.id, pattern: cronPattern }, 'Scheduled export job created');
  }

  /**
   * Remove a scheduled export
   */
  removeSchedule(scheduleId: string): void {
    if (this.cronJobs.has(scheduleId)) {
      this.cronJobs.get(scheduleId)!.stop();
      this.cronJobs.delete(scheduleId);
      logger.info({ scheduleId }, 'Scheduled export job removed');
    }
  }

  /**
   * Run a scheduled export
   */
  private async runScheduledExport(scheduleId: string): Promise<void> {
    try {
      logger.info({ scheduleId }, 'Running scheduled export');

      // Get schedule details
      const schedule = await this.prisma.exportSchedule.findUnique({
        where: { id: scheduleId },
        include: { user: true },
      });

      if (!schedule || !schedule.isActive) {
        logger.warn({ scheduleId }, 'Schedule not found or inactive');
        return;
      }

      // Create export job
      const { jobId } = await this.exportService.createExport(
        schedule.userId,
        {
          format: schedule.format as any,
          options: schedule.options as any,
          sendEmail: schedule.emailDelivery?.enabled || false,
          emailRecipients: schedule.emailDelivery?.recipients || [],
        }
      );

      // Update schedule
      await this.prisma.exportSchedule.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          nextRunAt: this.calculateNextRunAt(schedule.frequency as any),
        },
      });

      // If email delivery is enabled, wait for job completion and send summary
      if (schedule.emailDelivery?.enabled && schedule.emailDelivery?.recipients?.length > 0) {
        await this.waitForJobAndSendSummary(jobId, schedule);
      }

      logger.info({ scheduleId, jobId }, 'Scheduled export completed');
    } catch (error) {
      logger.error({ scheduleId, error }, 'Failed to run scheduled export');
    }
  }

  /**
   * Wait for export job to complete and send summary email
   */
  private async waitForJobAndSendSummary(jobId: string, schedule: any): Promise<void> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      const job = await this.prisma.exportJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        logger.error({ jobId }, 'Export job not found');
        return;
      }

      if (job.status === ExportStatus.COMPLETED) {
        // Calculate summary statistics
        const summary = await this.calculateExportSummary(schedule.userId);

        // Send email with summary
        await this.exportService['emailService'].sendScheduledExportEmail(
          schedule.emailDelivery.recipients,
          {
            scheduleName: schedule.name,
            format: schedule.format,
            fileName: job.fileName!,
            downloadUrl: `${env.APP_URL}/api/v1/exports/${jobId}/download`,
            summary,
            subject: schedule.emailDelivery.subject,
            message: schedule.emailDelivery.message,
          }
        );

        logger.info({ jobId, scheduleId: schedule.id }, 'Summary email sent');
        return;
      }

      if (job.status === ExportStatus.FAILED) {
        logger.error({ jobId, error: job.error }, 'Export job failed');
        return;
      }

      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    logger.warn({ jobId }, 'Timeout waiting for export job completion');
  }

  /**
   * Calculate summary statistics for export
   */
  private async calculateExportSummary(userId: string): Promise<any> {
    const todos = await this.prisma.todo.findMany({
      where: {
        userId,
        deletedAt: null,
      },
    });

    const completed = todos.filter(t => t.status === TodoStatus.COMPLETED).length;
    const pending = todos.filter(t => t.status === TodoStatus.PENDING).length;
    const overdue = todos.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < new Date() && 
      t.status !== TodoStatus.COMPLETED
    ).length;

    return {
      totalTodos: todos.length,
      completed,
      pending,
      overdue,
    };
  }

  /**
   * Process overdue schedules
   */
  private async processOverdueSchedules(): Promise<void> {
    const now = new Date();
    
    const overdueSchedules = await this.prisma.exportSchedule.findMany({
      where: {
        isActive: true,
        nextRunAt: {
          lt: now,
        },
      },
    });

    for (const schedule of overdueSchedules) {
      logger.info({ scheduleId: schedule.id }, 'Processing overdue schedule');
      await this.runScheduledExport(schedule.id);
    }
  }

  /**
   * Get cron pattern for frequency
   */
  private getCronPattern(frequency: string): string | null {
    switch (frequency) {
      case ExportFrequency.DAILY:
        return '0 9 * * *'; // 9 AM daily
      case ExportFrequency.WEEKLY:
        return '0 9 * * 1'; // 9 AM every Monday
      case ExportFrequency.MONTHLY:
        return '0 9 1 * *'; // 9 AM first day of month
      default:
        return null;
    }
  }

  /**
   * Calculate next run time
   */
  private calculateNextRunAt(frequency: ExportFrequency): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case ExportFrequency.DAILY:
        next.setDate(next.getDate() + 1);
        next.setHours(9, 0, 0, 0);
        break;
      case ExportFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        next.setHours(9, 0, 0, 0);
        break;
      case ExportFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(9, 0, 0, 0);
        break;
      default:
        next.setHours(next.getHours() + 1);
    }

    return next;
  }
}