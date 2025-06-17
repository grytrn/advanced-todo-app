import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';
import { ExportFormat, ExportStatus, ExportFrequency } from '@shared/types/export';

// Export options schema
const exportOptionsSchema = z.object({
  format: z.nativeEnum(ExportFormat),
  includeCompleted: z.boolean().optional(),
  includeArchived: z.boolean().optional(),
  includeTags: z.boolean().optional(),
  includeAttachments: z.boolean().optional(),
  includeComments: z.boolean().optional(),
  categoryIds: z.array(z.string()).optional(),
  tagNames: z.array(z.string()).optional(),
  priorities: z.array(z.string()).optional(),
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional(),
  csv: z.object({
    columns: z.array(z.string()).optional(),
    delimiter: z.enum([',', ';', '\t']).optional(),
    includeHeaders: z.boolean().optional(),
  }).optional(),
  pdf: z.object({
    templateId: z.string().optional(),
    includeCharts: z.boolean().optional(),
    pageSize: z.enum(['A4', 'Letter', 'Legal']).optional(),
    orientation: z.enum(['portrait', 'landscape']).optional(),
    branding: z.object({
      logo: z.string().optional(),
      primaryColor: z.string().optional(),
      fontFamily: z.string().optional(),
    }).optional(),
  }).optional(),
  markdown: z.object({
    includeMetadata: z.boolean().optional(),
    groupBy: z.enum(['category', 'priority', 'dueDate']).optional(),
  }).optional(),
  ical: z.object({
    includeReminders: z.boolean().optional(),
    calendarName: z.string().optional(),
  }).optional(),
});

// Create export request
const createExportBody = z.object({
  format: z.nativeEnum(ExportFormat),
  options: exportOptionsSchema.optional(),
  sendEmail: z.boolean().optional(),
  emailRecipients: z.array(z.string().email()).optional(),
});

const createExportResponse = z.object({
  success: z.literal(true),
  data: z.object({
    jobId: z.string(),
    status: z.nativeEnum(ExportStatus),
    estimatedTime: z.number().optional(),
  }),
});

// Get export job
const getExportJobParams = z.object({
  jobId: z.string(),
});

const exportJobSchema = z.object({
  id: z.string(),
  userId: z.string(),
  format: z.nativeEnum(ExportFormat),
  status: z.nativeEnum(ExportStatus),
  options: z.any(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  error: z.string().optional(),
  progress: z.number().optional(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const getExportJobResponse = z.object({
  success: z.literal(true),
  data: z.object({
    job: exportJobSchema,
  }),
});

// List export jobs
const listExportJobsQuery = z.object({
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
  status: z.nativeEnum(ExportStatus).optional(),
  format: z.nativeEnum(ExportFormat).optional(),
});

const listExportJobsResponse = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(exportJobSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      pages: z.number(),
    }),
  }),
});

// Export schedule schemas
const emailDeliverySchema = z.object({
  enabled: z.boolean(),
  recipients: z.array(z.string().email()),
  subject: z.string().optional(),
  message: z.string().optional(),
});

const createExportScheduleBody = z.object({
  name: z.string().min(1).max(100),
  frequency: z.nativeEnum(ExportFrequency),
  format: z.nativeEnum(ExportFormat),
  options: exportOptionsSchema,
  emailDelivery: emailDeliverySchema.optional(),
});

const updateExportScheduleBody = z.object({
  name: z.string().min(1).max(100).optional(),
  frequency: z.nativeEnum(ExportFrequency).optional(),
  format: z.nativeEnum(ExportFormat).optional(),
  options: exportOptionsSchema.optional(),
  emailDelivery: emailDeliverySchema.optional(),
  isActive: z.boolean().optional(),
});

const exportScheduleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  frequency: z.nativeEnum(ExportFrequency),
  format: z.nativeEnum(ExportFormat),
  options: z.any(),
  emailDelivery: z.any(),
  nextRunAt: z.coerce.date(),
  lastRunAt: z.coerce.date().optional(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const exportScheduleResponse = z.object({
  success: z.literal(true),
  data: z.object({
    schedule: exportScheduleSchema,
  }),
});

const listExportSchedulesResponse = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(exportScheduleSchema),
  }),
});

// Export template schemas
const createExportTemplateBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  format: z.nativeEnum(ExportFormat),
  content: z.string(),
  isPublic: z.boolean().optional(),
});

const updateExportTemplateBody = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  content: z.string().optional(),
  isPublic: z.boolean().optional(),
});

const exportTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  format: z.nativeEnum(ExportFormat),
  isDefault: z.boolean(),
  isPublic: z.boolean(),
  userId: z.string().optional(),
  content: z.string(),
  previewUrl: z.string().optional(),
  variables: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const exportTemplateResponse = z.object({
  success: z.literal(true),
  data: z.object({
    template: exportTemplateSchema,
  }),
});

const listExportTemplatesQuery = z.object({
  format: z.nativeEnum(ExportFormat).optional(),
  includePublic: z.coerce.boolean().default(true).optional(),
  includePrivate: z.coerce.boolean().default(true).optional(),
});

const listExportTemplatesResponse = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(exportTemplateSchema),
  }),
});

// Error response
const exportErrorResponse = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(['INVALID_FORMAT', 'JOB_NOT_FOUND', 'EXPORT_FAILED', 'TEMPLATE_NOT_FOUND', 'SCHEDULE_NOT_FOUND', 'PERMISSION_DENIED']),
    message: z.string(),
  }),
});

// Build schemas for Fastify
export const {
  schemas: exportSchemas,
  $ref,
} = buildJsonSchemas({
  createExportBody,
  createExportResponse,
  getExportJobParams,
  getExportJobResponse,
  listExportJobsQuery,
  listExportJobsResponse,
  createExportScheduleBody,
  updateExportScheduleBody,
  exportScheduleResponse,
  listExportSchedulesResponse,
  createExportTemplateBody,
  updateExportTemplateBody,
  exportTemplateResponse,
  listExportTemplatesQuery,
  listExportTemplatesResponse,
  exportErrorResponse,
}, {
  $id: 'export',
});

// Export individual schemas for routes
export const createExportSchema = {
  body: $ref('createExportBody'),
  response: {
    200: $ref('createExportResponse'),
    400: $ref('exportErrorResponse'),
  },
};

export const getExportJobSchema = {
  params: $ref('getExportJobParams'),
  response: {
    200: $ref('getExportJobResponse'),
    404: $ref('exportErrorResponse'),
  },
};

export const listExportJobsSchema = {
  querystring: $ref('listExportJobsQuery'),
  response: {
    200: $ref('listExportJobsResponse'),
  },
};

export const downloadExportSchema = {
  params: $ref('getExportJobParams'),
};

export const createExportScheduleSchema = {
  body: $ref('createExportScheduleBody'),
  response: {
    200: $ref('exportScheduleResponse'),
    400: $ref('exportErrorResponse'),
  },
};

export const updateExportScheduleSchema = {
  params: z.object({ scheduleId: z.string() }),
  body: $ref('updateExportScheduleBody'),
  response: {
    200: $ref('exportScheduleResponse'),
    404: $ref('exportErrorResponse'),
  },
};

export const deleteExportScheduleSchema = {
  params: z.object({ scheduleId: z.string() }),
  response: {
    200: z.object({ success: z.literal(true) }),
    404: $ref('exportErrorResponse'),
  },
};

export const listExportSchedulesSchema = {
  response: {
    200: $ref('listExportSchedulesResponse'),
  },
};

export const createExportTemplateSchema = {
  body: $ref('createExportTemplateBody'),
  response: {
    200: $ref('exportTemplateResponse'),
    400: $ref('exportErrorResponse'),
  },
};

export const updateExportTemplateSchema = {
  params: z.object({ templateId: z.string() }),
  body: $ref('updateExportTemplateBody'),
  response: {
    200: $ref('exportTemplateResponse'),
    404: $ref('exportErrorResponse'),
  },
};

export const deleteExportTemplateSchema = {
  params: z.object({ templateId: z.string() }),
  response: {
    200: z.object({ success: z.literal(true) }),
    404: $ref('exportErrorResponse'),
  },
};

export const listExportTemplatesSchema = {
  querystring: $ref('listExportTemplatesQuery'),
  response: {
    200: $ref('listExportTemplatesResponse'),
  },
};