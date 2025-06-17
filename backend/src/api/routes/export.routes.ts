import { FastifyPluginAsync } from 'fastify';
import { ExportController } from '../controllers/export.controller';
import { ExportService } from '../../services/export/export.service';
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
  fastify.post(
    '/',
    {
      schema: createExportSchema,
    },
    (request, reply) => exportController.createExport(request, reply)
  );

  fastify.get(
    '/',
    {
      schema: listExportJobsSchema,
    },
    (request, reply) => exportController.listExportJobs(request, reply)
  );

  fastify.get(
    '/:jobId',
    {
      schema: getExportJobSchema,
    },
    (request, reply) => exportController.getExportJob(request, reply)
  );

  fastify.get(
    '/:jobId/download',
    {
      schema: downloadExportSchema,
    },
    (request, reply) => exportController.downloadExport(request, reply)
  );

  fastify.get(
    '/:jobId/progress',
    (request, reply) => exportController.getExportProgress(request, reply)
  );

  // Export schedules
  fastify.post(
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

  fastify.patch(
    '/schedules/:scheduleId',
    {
      schema: updateExportScheduleSchema,
    },
    (request, reply) => exportController.updateExportSchedule(request, reply)
  );

  fastify.delete(
    '/schedules/:scheduleId',
    {
      schema: deleteExportScheduleSchema,
    },
    (request, reply) => exportController.deleteExportSchedule(request, reply)
  );

  // Export templates
  fastify.post(
    '/templates',
    {
      schema: createExportTemplateSchema,
    },
    (request, reply) => exportController.createExportTemplate(request, reply)
  );

  fastify.get(
    '/templates',
    {
      schema: listExportTemplatesSchema,
    },
    (request, reply) => exportController.listExportTemplates(request, reply)
  );

  fastify.patch(
    '/templates/:templateId',
    {
      schema: updateExportTemplateSchema,
    },
    (request, reply) => exportController.updateExportTemplate(request, reply)
  );

  fastify.delete(
    '/templates/:templateId',
    {
      schema: deleteExportTemplateSchema,
    },
    (request, reply) => exportController.deleteExportTemplate(request, reply)
  );
};

export default exportRoutes;