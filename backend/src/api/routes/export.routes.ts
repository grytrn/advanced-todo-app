import { FastifyPluginAsync } from 'fastify';
import { ExportController } from '../controllers/export.controller';
import { ExportService } from '../../services/export/export.service';
import type {
  CreateExportRequest,
  ListExportJobsRequest,
  CreateExportScheduleRequest,
  UpdateExportScheduleRequest,
  CreateExportTemplateRequest,
  UpdateExportTemplateRequest,
  ListExportTemplatesRequest,
} from '@shared/types/export';
// Prisma will be accessed via app.prisma
import {
  createExportSchema,
  getExportJobSchema,
  listExportJobsSchema,
  downloadExportSchema,
  createExportScheduleSchema,
  updateExportScheduleSchema,
  deleteExportScheduleSchema,
  listExportSchedulesSchema,
  createExportTemplateSchema,
  updateExportTemplateSchema,
  deleteExportTemplateSchema,
  listExportTemplatesSchema,
} from '../schemas/export.schema';

const exportRoutes: FastifyPluginAsync = async (fastify) => {
  const exportService = new ExportService(fastify.prisma);
  const exportController = new ExportController(exportService);

  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // Export jobs
  fastify.post<{ Body: CreateExportRequest }>(
    '/',
    {
      schema: createExportSchema,
    },
    (request, reply) => exportController.createExport(request, reply)
  );

  fastify.get<{ Querystring: ListExportJobsRequest }>(
    '/',
    {
      schema: listExportJobsSchema,
    },
    (request, reply) => exportController.listExportJobs(request, reply)
  );

  fastify.get<{ Params: { jobId: string } }>(
    '/:jobId',
    {
      schema: getExportJobSchema,
    },
    (request, reply) => exportController.getExportJob(request, reply)
  );

  fastify.get<{ Params: { jobId: string } }>(
    '/:jobId/download',
    {
      schema: downloadExportSchema,
    },
    (request, reply) => exportController.downloadExport(request, reply)
  );

  fastify.get<{ Params: { jobId: string } }>(
    '/:jobId/progress',
    (request, reply) => exportController.getExportProgress(request, reply)
  );

  // Export schedules
  fastify.post<{ Body: CreateExportScheduleRequest }>(
    '/schedules',
    {
      schema: createExportScheduleSchema,
    },
    (request, reply) => exportController.createExportSchedule(request, reply)
  );

  fastify.get(
    '/schedules',
    {
      schema: listExportSchedulesSchema,
    },
    (request, reply) => exportController.listExportSchedules(request, reply)
  );

  fastify.patch<{ Params: { scheduleId: string }; Body: UpdateExportScheduleRequest }>(
    '/schedules/:scheduleId',
    {
      schema: updateExportScheduleSchema,
    },
    (request, reply) => exportController.updateExportSchedule(request, reply)
  );

  fastify.delete<{ Params: { scheduleId: string } }>(
    '/schedules/:scheduleId',
    {
      schema: deleteExportScheduleSchema,
    },
    (request, reply) => exportController.deleteExportSchedule(request, reply)
  );

  // Export templates
  fastify.post<{ Body: CreateExportTemplateRequest }>(
    '/templates',
    {
      schema: createExportTemplateSchema,
    },
    (request, reply) => exportController.createExportTemplate(request, reply)
  );

  fastify.get<{ Querystring: ListExportTemplatesRequest }>(
    '/templates',
    {
      schema: listExportTemplatesSchema,
    },
    (request, reply) => exportController.listExportTemplates(request, reply)
  );

  fastify.patch<{ Params: { templateId: string }; Body: UpdateExportTemplateRequest }>(
    '/templates/:templateId',
    {
      schema: updateExportTemplateSchema,
    },
    (request, reply) => exportController.updateExportTemplate(request, reply)
  );

  fastify.delete<{ Params: { templateId: string } }>(
    '/templates/:templateId',
    {
      schema: deleteExportTemplateSchema,
    },
    (request, reply) => exportController.deleteExportTemplate(request, reply)
  );
};

export default exportRoutes;