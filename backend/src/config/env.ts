import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the environment schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('8000'),
  API_VERSION: z.string().default('v1'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  
  // Database
  DATABASE_URL: z.string().url(),
  DB_POOL_MIN: z.string().transform(Number).default('2'),
  DB_POOL_MAX: z.string().transform(Number).default('10'),
  
  // Redis
  REDIS_URL: z.string().url(),
  REDIS_TTL: z.string().transform(Number).default('900'),
  
  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('10'),
  
  // Email
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.string().transform(Number).default('1025'),
  SMTP_SECURE: z.string().transform((val) => val === 'true').default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@example.com'),
  EMAIL_FROM_NAME: z.string().default('Todo App'),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('5242880'), // 5MB
  ALLOWED_FILE_TYPES: z.string().transform((val) => val.split(',')).default('image/jpeg,image/png,image/webp'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z.string().transform((val) => val === 'true').default('true'),
  
  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('debug'),
  LOG_PRETTY: z.string().transform((val) => val === 'true').default('true'),
  
  // WebSocket
  WS_PORT: z.string().transform(Number).default('8001'),
  
  // Export
  PDF_SERVICE_URL: z.string().url().optional(),
  APP_URL: z.string().url().default('http://localhost:8000'),
  
  // Redis (for Bull queue)
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  
  // External Services (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  
  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
      throw new Error(`Environment validation failed:\n${missingVars}`);
    }
    throw error;
  }
};

// Export validated environment variables
export const env = parseEnv();

// Export type for use in other modules
export type Env = z.infer<typeof envSchema>;

// Helper to check if we're in production
export const isProduction = () => env.NODE_ENV === 'production';

// Helper to check if we're in development
export const isDevelopment = () => env.NODE_ENV === 'development';

// Helper to check if we're in test
export const isTest = () => env.NODE_ENV === 'test';