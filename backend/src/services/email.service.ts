import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import { env } from '../config/env';
import { ExportFormat } from '@shared/types/export';

const logger = createLogger('email-service');

export class EmailService {
  private transporter: nodemailer.Transporter;
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(process.cwd(), 'src/services/email-templates');
    
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  /**
   * Send export email with download link
   */
  async sendExportEmail(
    recipients: string[],
    data: {
      jobId: string;
      format: ExportFormat;
      fileName: string;
      downloadUrl: string;
    }
  ): Promise<void> {
    try {
      const template = await this.loadTemplate('export-ready');
      const html = template({
        ...data,
        formatName: this.getFormatName(data.format),
        expiresIn: '7 days',
      });

      const mailOptions = {
        from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
        to: recipients.join(', '),
        subject: `Your ${this.getFormatName(data.format)} export is ready`,
        html,
        text: this.generateTextVersion(html),
      };

      await this.transporter.sendMail(mailOptions);

      logger.info(
        { recipients, jobId: data.jobId },
        'Export email sent successfully'
      );
    } catch (error) {
      logger.error({ error, recipients }, 'Failed to send export email');
      throw error;
    }
  }

  /**
   * Send scheduled export summary
   */
  async sendScheduledExportEmail(
    recipients: string[],
    data: {
      scheduleName: string;
      format: ExportFormat;
      fileName: string;
      downloadUrl: string;
      summary: {
        totalTodos: number;
        completed: number;
        pending: number;
        overdue: number;
      };
      subject?: string;
      message?: string;
    }
  ): Promise<void> {
    try {
      const template = await this.loadTemplate('scheduled-export');
      const html = template({
        ...data,
        formatName: this.getFormatName(data.format),
        completionRate: data.summary.totalTodos > 0
          ? Math.round((data.summary.completed / data.summary.totalTodos) * 100)
          : 0,
      });

      const mailOptions = {
        from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
        to: recipients.join(', '),
        subject: data.subject || `${data.scheduleName} - Todo Export`,
        html,
        text: this.generateTextVersion(html),
      };

      await this.transporter.sendMail(mailOptions);

      logger.info(
        { recipients, scheduleName: data.scheduleName },
        'Scheduled export email sent successfully'
      );
    } catch (error) {
      logger.error({ error, recipients }, 'Failed to send scheduled export email');
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      const template = await this.loadTemplate('welcome');
      const html = template({ name, appUrl: env.APP_URL });

      const mailOptions = {
        from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
        to: email,
        subject: 'Welcome to Todo App',
        html,
        text: this.generateTextVersion(html),
      };

      await this.transporter.sendMail(mailOptions);

      logger.info({ email }, 'Welcome email sent successfully');
    } catch (error) {
      logger.error({ error, email }, 'Failed to send welcome email');
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    data: { name: string; resetUrl: string }
  ): Promise<void> {
    try {
      const template = await this.loadTemplate('password-reset');
      const html = template(data);

      const mailOptions = {
        from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
        to: email,
        subject: 'Reset Your Password',
        html,
        text: this.generateTextVersion(html),
      };

      await this.transporter.sendMail(mailOptions);

      logger.info({ email }, 'Password reset email sent successfully');
    } catch (error) {
      logger.error({ error, email }, 'Failed to send password reset email');
      throw error;
    }
  }

  /**
   * Load email template
   */
  private async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    
    try {
      const content = await fs.readFile(templatePath, 'utf-8');
      return handlebars.compile(content);
    } catch (error) {
      // Fallback to default templates
      return handlebars.compile(this.getDefaultTemplate(templateName));
    }
  }

  /**
   * Get default template
   */
  private getDefaultTemplate(templateName: string): string {
    const templates: Record<string, string> = {
      'export-ready': `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f3f4f6; padding: 30px; margin-top: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Export is Ready!</h1>
    </div>
    <div class="content">
      <p>Your {{formatName}} export has been generated successfully.</p>
      <p><strong>File:</strong> {{fileName}}</p>
      <p>Your export will be available for download for the next {{expiresIn}}.</p>
      <a href="{{downloadUrl}}" class="button">Download Export</a>
    </div>
    <div class="footer">
      <p>If you have any questions, please contact support.</p>
    </div>
  </div>
</body>
</html>
      `,
      'scheduled-export': `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f3f4f6; padding: 30px; margin-top: 20px; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .stat { background: white; padding: 15px; border-radius: 5px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .stat-label { color: #666; font-size: 14px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{scheduleName}}</h1>
    </div>
    <div class="content">
      {{#if message}}
      <p>{{message}}</p>
      {{/if}}
      
      <h2>Summary</h2>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">{{summary.totalTodos}}</div>
          <div class="stat-label">Total Todos</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{completionRate}}%</div>
          <div class="stat-label">Completion Rate</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{summary.pending}}</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat">
          <div class="stat-value">{{summary.overdue}}</div>
          <div class="stat-label">Overdue</div>
        </div>
      </div>
      
      <p>Your {{formatName}} export is attached to this email.</p>
      <a href="{{downloadUrl}}" class="button">Download Export</a>
    </div>
    <div class="footer">
      <p>This is an automated email from your scheduled export.</p>
    </div>
  </div>
</body>
</html>
      `,
      'welcome': `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Todo App!</h1>
    </div>
    <div class="content">
      <p>Hi {{name}},</p>
      <p>Welcome to Todo App! We're excited to have you on board.</p>
      <p>Get started by creating your first todo and organizing your tasks efficiently.</p>
      <a href="{{appUrl}}" class="button">Get Started</a>
    </div>
  </div>
</body>
</html>
      `,
      'password-reset': `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .warning { background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; margin-top: 20px; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hi {{name}},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <a href="{{resetUrl}}" class="button">Reset Password</a>
      <div class="warning">
        <p><strong>Note:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    };

    return templates[templateName] || '';
  }

  /**
   * Generate text version from HTML
   */
  private generateTextVersion(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get human-readable format name
   */
  private getFormatName(format: ExportFormat): string {
    const names: Record<ExportFormat, string> = {
      [ExportFormat.PDF]: 'PDF',
      [ExportFormat.CSV]: 'CSV',
      [ExportFormat.JSON]: 'JSON',
      [ExportFormat.MARKDOWN]: 'Markdown',
      [ExportFormat.ICAL]: 'iCalendar',
    };
    return names[format] || format;
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error({ error }, 'Email service connection failed');
      return false;
    }
  }

  /**
   * Send verification email (stub for auth service)
   */
  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    // Using password reset template as a workaround
    const resetUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    await this.sendPasswordResetEmail(email, { name, resetUrl });
  }

  /**
   * Send suspicious activity email (stub)
   */
  async sendSuspiciousActivityEmail(
    email: string,
    _name: string,
    details: {
      ipAddress: string;
      userAgent: string;
      timestamp: Date;
      reason: string;
    }
  ): Promise<void> {
    logger.info({ email, details }, 'Suspicious activity detected');
    // TODO: Implement suspicious activity email template
  }

  /**
   * Send 2FA enabled email (stub)
   */
  async send2FAEnabledEmail(email: string, _name: string, backupCodes: string[]): Promise<void> {
    logger.info({ email, backupCodes: backupCodes.length }, '2FA enabled');
    // TODO: Implement 2FA enabled email template
  }
}