import { FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
import { UnauthorizedError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('request-signing-middleware');

interface SignatureOptions {
  secret: string;
  algorithm?: string;
  header?: string;
  maxAge?: number; // Maximum age of signature in seconds
  includeQuery?: boolean;
}

/**
 * Generate request signature
 */
export function generateRequestSignature(
  method: string,
  path: string,
  body: any,
  timestamp: number,
  secret: string,
  algorithm: string = 'sha256'
): string {
  const payload = [
    method.toUpperCase(),
    path,
    timestamp,
    typeof body === 'string' ? body : JSON.stringify(body),
  ].join('\n');

  return createHmac(algorithm, secret)
    .update(payload)
    .digest('hex');
}

/**
 * Request signing middleware for sensitive operations
 */
export function requireRequestSignature(options: SignatureOptions) {
  const {
    secret,
    algorithm = 'sha256',
    header = 'x-signature',
    maxAge = 300, // 5 minutes
    includeQuery = true,
  } = options;

  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const signature = request.headers[header] as string;
    const timestamp = request.headers['x-timestamp'] as string;

    if (!signature) {
      logger.warn({ 
        method: request.method, 
        url: request.url,
        ip: request.ip,
      }, 'Request signature missing');
      
      throw new UnauthorizedError('Request signature required');
    }

    if (!timestamp) {
      logger.warn({ 
        method: request.method, 
        url: request.url,
        ip: request.ip,
      }, 'Request timestamp missing');
      
      throw new UnauthorizedError('Request timestamp required');
    }

    // Validate timestamp
    const requestTime = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);

    if (isNaN(requestTime)) {
      throw new UnauthorizedError('Invalid timestamp format');
    }

    if (Math.abs(now - requestTime) > maxAge) {
      logger.warn({ 
        method: request.method, 
        url: request.url,
        requestTime,
        now,
        maxAge,
      }, 'Request signature expired');
      
      throw new UnauthorizedError('Request signature expired');
    }

    // Generate expected signature
    const path = includeQuery ? request.url : request.url.split('?')[0] || '';
    const expectedSignature = generateRequestSignature(
      request.method,
      path,
      request.body,
      requestTime,
      secret,
      algorithm
    );

    // Compare signatures using timing-safe comparison
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      logger.warn({ 
        method: request.method, 
        url: request.url,
        ip: request.ip,
      }, 'Request signature length mismatch');
      
      throw new UnauthorizedError('Invalid request signature');
    }

    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      logger.warn({ 
        method: request.method, 
        url: request.url,
        ip: request.ip,
        expected: expectedSignature,
        received: signature,
      }, 'Request signature mismatch');
      
      throw new UnauthorizedError('Invalid request signature');
    }

    // Add signature info to request for logging
    (request as any).signatureVerified = true;
    (request as any).signatureTimestamp = requestTime;
  };
}

/**
 * Webhook signature verification
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  const expectedSignature = createHmac(algorithm, secret)
    .update(payload)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

/**
 * Webhook verification middleware
 */
export function requireWebhookSignature(options: {
  secret: string;
  header?: string;
  algorithm?: string;
}) {
  const {
    secret,
    header = 'x-webhook-signature',
    algorithm = 'sha256',
  } = options;

  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const signature = request.headers[header] as string;

    if (!signature) {
      logger.warn({ 
        method: request.method, 
        url: request.url,
        ip: request.ip,
      }, 'Webhook signature missing');
      
      throw new UnauthorizedError('Webhook signature required');
    }

    // Get raw body for signature verification
    const payload = (request as any).rawBody || JSON.stringify(request.body);

    if (!verifyWebhookSignature(payload, signature, secret, algorithm)) {
      logger.warn({ 
        method: request.method, 
        url: request.url,
        ip: request.ip,
      }, 'Webhook signature verification failed');
      
      throw new UnauthorizedError('Invalid webhook signature');
    }

    // Add verification info to request
    (request as any).webhookVerified = true;
  };
}