// Shared type definitions for Export functionality

export enum ExportFormat {
  PDF = 'PDF',
  CSV = 'CSV',
  JSON = 'JSON',
  MARKDOWN = 'MARKDOWN',
  ICAL = 'ICAL',
}

export enum ExportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum ExportFrequency {
  ONCE = 'ONCE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export interface ExportOptions {
  // Common options
  format: ExportFormat;
  includeCompleted?: boolean;
  includeArchived?: boolean;
  includeTags?: boolean;
  includeAttachments?: boolean;
  includeComments?: boolean;
  
  // Filter options
  categoryIds?: string[];
  tagNames?: string[];
  priorities?: string[];
  dateRange?: {
    from?: string; // ISO 8601
    to?: string; // ISO 8601
  };
  
  // Format-specific options
  csv?: {
    columns?: string[];
    delimiter?: ',' | ';' | '\t';
    includeHeaders?: boolean;
  };
  pdf?: {
    templateId?: string;
    includeCharts?: boolean;
    pageSize?: 'A4' | 'Letter' | 'Legal';
    orientation?: 'portrait' | 'landscape';
    branding?: {
      logo?: string; // Base64 or URL
      primaryColor?: string;
      fontFamily?: string;
    };
  };
  markdown?: {
    includeMetadata?: boolean;
    groupBy?: 'category' | 'priority' | 'dueDate';
  };
  ical?: {
    includeReminders?: boolean;
    calendarName?: string;
  };
}

export interface ExportJob {
  id: string;
  userId: string;
  format: ExportFormat;
  status: ExportStatus;
  options: ExportOptions;
  emailDelivery?: EmailDeliveryOptions;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
  progress?: number;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailDeliveryOptions {
  enabled: boolean;
  recipients: string[];
  subject?: string;
  message?: string;
}

export interface ExportSchedule {
  id: string;
  userId: string;
  name: string;
  frequency: ExportFrequency;
  format: ExportFormat;
  options: ExportOptions;
  emailDelivery?: EmailDeliveryOptions;
  nextRunAt: Date;
  lastRunAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  format: ExportFormat;
  isDefault: boolean;
  isPublic: boolean;
  userId?: string; // null for system templates
  content: string; // Template content (HTML for PDF, etc.)
  previewUrl?: string;
  variables: string[]; // Available template variables
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response types
export interface CreateExportRequest {
  format: ExportFormat;
  options?: ExportOptions;
  sendEmail?: boolean;
  emailRecipients?: string[];
}

export interface CreateExportResponse {
  success: true;
  data: {
    jobId: string;
    status: ExportStatus;
    estimatedTime?: number; // in seconds
  };
}

export interface GetExportJobResponse {
  success: true;
  data: {
    job: ExportJob;
  };
}

export interface ListExportJobsRequest {
  page?: number;
  limit?: number;
  status?: ExportStatus;
  format?: ExportFormat;
}

export interface ListExportJobsResponse {
  success: true;
  data: {
    items: ExportJob[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface CreateExportScheduleRequest {
  name: string;
  frequency: ExportFrequency;
  format: ExportFormat;
  options: ExportOptions;
  emailDelivery?: {
    enabled: boolean;
    recipients: string[];
    subject?: string;
    message?: string;
  };
}

export interface UpdateExportScheduleRequest {
  name?: string;
  frequency?: ExportFrequency;
  format?: ExportFormat;
  options?: ExportOptions;
  emailDelivery?: {
    enabled: boolean;
    recipients: string[];
    subject?: string;
    message?: string;
  };
  isActive?: boolean;
}

export interface ExportScheduleResponse {
  success: true;
  data: {
    schedule: ExportSchedule;
  };
}

export interface ListExportSchedulesResponse {
  success: true;
  data: {
    items: ExportSchedule[];
  };
}

export interface ListExportTemplatesRequest {
  format?: ExportFormat;
  includePublic?: boolean;
  includePrivate?: boolean;
}

export interface ListExportTemplatesResponse {
  success: true;
  data: {
    items: ExportTemplate[];
  };
}

export interface CreateExportTemplateRequest {
  name: string;
  description?: string;
  format: ExportFormat;
  content: string;
  isPublic?: boolean;
}

export interface UpdateExportTemplateRequest {
  name?: string;
  description?: string;
  content?: string;
  isPublic?: boolean;
}

export interface ExportTemplateResponse {
  success: true;
  data: {
    template: ExportTemplate;
  };
}

export interface ExportError {
  success: false;
  error: {
    code: 'INVALID_FORMAT' | 'JOB_NOT_FOUND' | 'EXPORT_FAILED' | 'TEMPLATE_NOT_FOUND' | 'SCHEDULE_NOT_FOUND' | 'PERMISSION_DENIED';
    message: string;
  };
}