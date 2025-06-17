import { env } from './env';

export const config = {
  app: {
    name: 'Todo API',
    version: env.API_VERSION,
    port: env.PORT,
    env: env.NODE_ENV,
    frontendUrl: env.FRONTEND_URL,
  },
  
  database: {
    url: env.DATABASE_URL,
    pool: {
      min: env.DB_POOL_MIN,
      max: env.DB_POOL_MAX,
    },
  },
  
  redis: {
    url: env.REDIS_URL,
    ttl: env.REDIS_TTL,
  },
  
  auth: {
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    },
    refresh: {
      secret: env.REFRESH_TOKEN_SECRET,
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
    },
    bcryptRounds: env.BCRYPT_ROUNDS,
  },
  
  email: {
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: env.SMTP_USER && env.SMTP_PASS ? {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      } : undefined,
    },
    from: env.EMAIL_FROM,
  },
  
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    allowedMimeTypes: env.ALLOWED_FILE_TYPES,
  },
  
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: env.CORS_CREDENTIALS,
  },
  
  logging: {
    level: env.LOG_LEVEL,
    pretty: env.LOG_PRETTY,
  },
  
  websocket: {
    port: env.WS_PORT,
  },
  
  aws: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    s3Bucket: env.S3_BUCKET,
  },
  
  monitoring: {
    sentryDsn: env.SENTRY_DSN,
  },
  
  export: {
    pdfServiceUrl: env.PDF_SERVICE_URL,
  },
};

export { env, isProduction, isDevelopment, isTest } from './env';