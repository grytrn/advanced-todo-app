import pino from 'pino';
import { config } from '../config';

// Create logger instance
export const logger = pino({
  level: config.logging.level,
  transport: config.logging.pretty && config.app.env !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  } : undefined,
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      },
      remoteAddress: req.ip,
      remotePort: req.socket?.remotePort,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
});

// Create child loggers for specific modules
export const createLogger = (module: string) => logger.child({ module });