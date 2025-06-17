import { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../../middleware/auth/authenticate';
import { ExportService } from '../../services/export/export.service';
import {
  CreateExportRequest,
  CreateExportResponse,
  GetExportJobResponse,
  ListExportJobsRequest,
  ListExportJobsResponse,
  CreateExportScheduleRequest,
  UpdateExportScheduleRequest,
  ExportScheduleResponse,
  ListExportSchedulesResponse,
  CreateExportTemplateRequest,
  UpdateExportTemplateRequest,
  ExportTemplateResponse,
  ListExportTemplatesRequest,
  ListExportTemplatesResponse,
  ExportStatus,
  ExportFormat,
} from '@shared/types/export';
import { createLogger } from '../../utils/logger';
import * as fs from 'fs';

const logger = createLogger('export-controller');

export class ExportController {
  constructor(private exportService: ExportService) {}

  /**
   * Create a new export job
   * POST /api/v1/exports
   */
  async createExport(
    request: FastifyRequest<{ Body: CreateExportRequest }>,
    __reply: FastifyReply
  ): Promise<CreateExportResponse> {
    const userId = (request as AuthenticatedRequest).userId;
    const { format, options, sendEmail, emailRecipients } = request.body;

    try {
      const result = await this.exportService.createExport(userId, {
        format,
        options,
        sendEmail,
        emailRecipients,
      });

      return {
        success: true,
        data: {
          jobId: result.jobId,
          status: result.status,
          estimatedTime: this.estimateExportTime(format),
        },
      };
    } catch (error) {
      logger.error({ error, userId, format }, 'Failed to create export');
      throw error;
    }
  }

  /**
   * Get export job status
   * GET /api/v1/exports/:jobId
   */
  async getExportJob(
    request: FastifyRequest<{ Params: { jobId: string } }>,
    __reply: FastifyReply
  ): Promise<GetExportJobResponse> {
    const userId = (request as AuthenticatedRequest).userId;
    const { jobId } = request.params;

    try {
      const job = await this.exportService.getExportJob(userId, jobId);

      return {
        success: true,
        data: { job },
      };
    } catch (error) {
      logger.error({ error, userId, jobId }, 'Failed to get export job');
      throw error;
    }
  }

  /**
   * List export jobs
   * GET /api/v1/exports
   */
  async listExportJobs(
    request: FastifyRequest<{ Querystring: ListExportJobsRequest }>,
    __reply: FastifyReply
  ): Promise<ListExportJobsResponse> {
    const userId = (request as AuthenticatedRequest).userId;
    const { page, limit, status, format } = request.query;

    try {
      const result = await this.exportService.listExportJobs(
        userId,
        page,
        limit,
        status,
        format
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to list export jobs');
      throw error;
    }
  }

  /**
   * Download export file
   * GET /api/v1/exports/:jobId/download
   */
  async downloadExport(
    request: FastifyRequest<{ Params: { jobId: string } }>,
    _reply: FastifyReply
  ): Promise<void> {
    const userId = (request as AuthenticatedRequest).userId;
    const { jobId } = request.params;

    try {
      const { path, filename, mimeType } = await this.exportService.downloadExport(
        userId,
        jobId
      );

      // Set headers
      _reply.header('Content-Type', mimeType);
      _reply.header('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream file
      const stream = fs.createReadStream(path);
      return _reply.send(stream);
    } catch (error) {
      logger.error({ error, userId, jobId }, 'Failed to download export');
      throw error;
    }
  }

  /**
   * Get export job progress (SSE endpoint)
   * GET /api/v1/exports/:jobId/progress
   */
  async getExportProgress(
    request: FastifyRequest<{ Params: { jobId: string } }>,
    _reply: FastifyReply
  ): Promise<void> {
    const userId = (request as AuthenticatedRequest).userId;
    const { jobId } = request.params;

    // Set SSE headers
    _reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send initial status
    const job = await this.exportService.getExportJob(userId, jobId);
    _reply.raw.write(`data: ${JSON.stringify({ 
      status: job.status, 
      progress: job.progress || 0 
    })}\n\n`);

    // Poll for updates
    const interval = setInterval(async () => {
      try {
        const updatedJob = await this.exportService.getExportJob(userId, jobId);
        
        _reply.raw.write(`data: ${JSON.stringify({ 
          status: updatedJob.status, 
          progress: updatedJob.progress || 0,
          fileUrl: updatedJob.fileUrl,
          error: updatedJob.error,
        })}\n\n`);

        // Stop polling if job is complete or failed
        if ([ExportStatus.COMPLETED, ExportStatus.FAILED, ExportStatus.EXPIRED].includes(updatedJob.status as ExportStatus)) {
          clearInterval(interval);
          _reply.raw.end();
        }
      } catch (error) {
        logger.error({ error, userId, jobId }, 'Error in progress stream');
        clearInterval(interval);
        _reply.raw.end();
      }
    }, 1000); // Poll every second

    // Clean up on disconnect
    request.raw.on('close', () => {
      clearInterval(interval);
    });
  }

  /**
   * Create export schedule
   * POST /api/v1/exports/schedules
   */
  async createExportSchedule(
    request: FastifyRequest<{ Body: CreateExportScheduleRequest }>,
    _reply: FastifyReply
  ): Promise<ExportScheduleResponse> {
    const userId = (request as AuthenticatedRequest).userId;

    try {
      const schedule = await this.exportService.createExportSchedule(
        userId,
        request.body
      );

      return {
        success: true,
        data: { schedule },
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to create export schedule');
      throw error;
    }
  }

  /**
   * Update export schedule
   * PATCH /api/v1/exports/schedules/:scheduleId
   */
  async updateExportSchedule(
    request: FastifyRequest<{
      Params: { scheduleId: string };
      Body: UpdateExportScheduleRequest;
    }>,
    _reply: FastifyReply
  ): Promise<ExportScheduleResponse> {
    const userId = (request as AuthenticatedRequest).userId;
    const { scheduleId } = request.params;

    try {
      const schedule = await this.exportService.updateExportSchedule(
        userId,
        scheduleId,
        request.body
      );

      return {
        success: true,
        data: { schedule },
      };
    } catch (error) {
      logger.error({ error, userId, scheduleId }, 'Failed to update export schedule');
      throw error;
    }
  }

  /**
   * Delete export schedule
   * DELETE /api/v1/exports/schedules/:scheduleId
   */
  async deleteExportSchedule(
    request: FastifyRequest<{ Params: { scheduleId: string } }>,
    _reply: FastifyReply
  ): Promise<{ success: true }> {
    const userId = (request as AuthenticatedRequest).userId;
    const { scheduleId } = request.params;

    try {
      await this.exportService.deleteExportSchedule(userId, scheduleId);

      return { success: true };
    } catch (error) {
      logger.error({ error, userId, scheduleId }, 'Failed to delete export schedule');
      throw error;
    }
  }

  /**
   * List export schedules
   * GET /api/v1/exports/schedules
   */
  async listExportSchedules(
    request: FastifyRequest,
    _reply: FastifyReply
  ): Promise<ListExportSchedulesResponse> {
    const userId = (request as AuthenticatedRequest).userId;

    try {
      const schedules = await this.exportService.listExportSchedules(userId);

      return {
        success: true,
        data: { items: schedules },
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to list export schedules');
      throw error;
    }
  }

  /**
   * Create export template
   * POST /api/v1/exports/templates
   */
  async createExportTemplate(
    request: FastifyRequest<{ Body: CreateExportTemplateRequest }>,
    _reply: FastifyReply
  ): Promise<ExportTemplateResponse> {
    const userId = (request as AuthenticatedRequest).userId;

    try {
      const template = await this.exportService.createExportTemplate(
        userId,
        request.body
      );

      return {
        success: true,
        data: { template },
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to create export template');
      throw error;
    }
  }

  /**
   * Update export template
   * PATCH /api/v1/exports/templates/:templateId
   */
  async updateExportTemplate(
    request: FastifyRequest<{
      Params: { templateId: string };
      Body: UpdateExportTemplateRequest;
    }>,
    _reply: FastifyReply
  ): Promise<ExportTemplateResponse> {
    const userId = (request as AuthenticatedRequest).userId;
    const { templateId } = request.params;

    try {
      const template = await this.exportService.updateExportTemplate(
        userId,
        templateId,
        request.body
      );

      return {
        success: true,
        data: { template },
      };
    } catch (error) {
      logger.error({ error, userId, templateId }, 'Failed to update export template');
      throw error;
    }
  }

  /**
   * Delete export template
   * DELETE /api/v1/exports/templates/:templateId
   */
  async deleteExportTemplate(
    request: FastifyRequest<{ Params: { templateId: string } }>,
    _reply: FastifyReply
  ): Promise<{ success: true }> {
    const userId = (request as AuthenticatedRequest).userId;
    const { templateId } = request.params;

    try {
      await this.exportService.deleteExportTemplate(userId, templateId);

      return { success: true };
    } catch (error) {
      logger.error({ error, userId, templateId }, 'Failed to delete export template');
      throw error;
    }
  }

  /**
   * List export templates
   * GET /api/v1/exports/templates
   */
  async listExportTemplates(
    request: FastifyRequest<{ Querystring: ListExportTemplatesRequest }>,
    _reply: FastifyReply
  ): Promise<ListExportTemplatesResponse> {
    const userId = (request as AuthenticatedRequest).userId;
    const { format, includePublic = true } = request.query;

    try {
      const templates = await this.exportService.listExportTemplates(
        userId,
        format,
        includePublic
      );

      return {
        success: true,
        data: { items: templates },
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to list export templates');
      throw error;
    }
  }

  /**
   * Estimate export time based on format
   */
  private estimateExportTime(format: ExportFormat): number {
    const estimates: Record<ExportFormat, number> = {
      [ExportFormat.PDF]: 30,
      [ExportFormat.CSV]: 5,
      [ExportFormat.JSON]: 3,
      [ExportFormat.MARKDOWN]: 5,
      [ExportFormat.ICAL]: 10,
    };
    return estimates[format] || 10;
  }
}