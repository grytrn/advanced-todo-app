import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { createLogger } from '../../utils/logger';

const logger = createLogger('redis-adapter');

export class RedisAdapter {
  private pubClient: Redis;
  private subClient: Redis;
  
  constructor(private redisUrl: string) {
    this.pubClient = new Redis(this.redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
    
    this.subClient = this.pubClient.duplicate();
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    this.pubClient.on('error', (err) => {
      logger.error({ error: err }, 'Redis pub client error');
    });
    
    this.subClient.on('error', (err) => {
      logger.error({ error: err }, 'Redis sub client error');
    });
    
    this.pubClient.on('connect', () => {
      logger.info('Redis pub client connected');
    });
    
    this.subClient.on('connect', () => {
      logger.info('Redis sub client connected');
    });
  }
  
  async connect(): Promise<void> {
    await Promise.all([
      this.pubClient.ping(),
      this.subClient.ping(),
    ]);
  }
  
  createIOAdapter() {
    return createAdapter(this.pubClient, this.subClient);
  }
  
  async disconnect(): Promise<void> {
    await Promise.all([
      this.pubClient.quit(),
      this.subClient.quit(),
    ]);
  }
}