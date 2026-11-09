import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import { REDIS_PUB_CLIENT } from '../redis/redis.constants';

export interface RateLimitOptions {
  limit: number; // Max requests allowed
  ttlSeconds: number; // Sliding window in seconds
}

export const RATE_LIMIT_KEY = 'ai_rate_limit';
export const ThrottleAi = (options: RateLimitOptions) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    Reflector.createDecorator<RateLimitOptions>()(options)(target, propertyKey, descriptor);
    Reflect.defineMetadata(RATE_LIMIT_KEY, options, descriptor ? descriptor.value : target);
  };
};

interface MemoryRateLimitBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AiRateLimitGuard.name);
  private readonly memoryBuckets = new Map<string, MemoryRateLimitBucket>();

  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(REDIS_PUB_CLIENT) private readonly redisClient?: Redis
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    const options: RateLimitOptions =
      this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, handler) ||
      this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, classRef) || {
        limit: 10,
        ttlSeconds: 60,
      };

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Key on authenticated userId, dev header, or client IP
    const userId =
      request.user?.userId ||
      request.headers['x-user-id'] ||
      request.ip ||
      request.socket?.remoteAddress ||
      'anonymous';

    const routeKey = handler.name || 'default';
    const rateLimitKey = `ratelimit:ai:${userId}:${routeKey}`;

    let currentCount = 0;
    let ttlRemaining = options.ttlSeconds;

    // 1. Try distributed Redis rate limiting first
    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const pipeline = this.redisClient.pipeline();
        pipeline.incr(rateLimitKey);
        pipeline.ttl(rateLimitKey);
        const results = await pipeline.exec();

        if (results && results[0] && !results[0][0]) {
          currentCount = Number(results[0][1]);
        }
        if (results && results[1] && !results[1][0]) {
          const ttl = Number(results[1][1]);
          if (ttl === -1) {
            // First increment; assign TTL
            await this.redisClient.expire(rateLimitKey, options.ttlSeconds);
            ttlRemaining = options.ttlSeconds;
          } else {
            ttlRemaining = ttl > 0 ? ttl : options.ttlSeconds;
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `[AiRateLimitGuard] Redis rate check failed (${err?.message}); falling back to memory store`
        );
        currentCount = this.checkMemoryRateLimit(rateLimitKey, options);
      }
    } else {
      // 2. In-memory fallback
      currentCount = this.checkMemoryRateLimit(rateLimitKey, options);
    }

    if (response?.setHeader) {
      response.setHeader('X-RateLimit-Limit', options.limit);
      response.setHeader('X-RateLimit-Remaining', Math.max(0, options.limit - currentCount));
      response.setHeader('X-RateLimit-Reset', ttlRemaining);
    }

    if (currentCount > options.limit) {
      if (response?.setHeader) {
        response.setHeader('Retry-After', ttlRemaining);
      }
      this.logger.warn(
        `[AiRateLimitGuard] Rate limit exceeded for ${userId} on ${routeKey} (${currentCount}/${options.limit})`
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `AI rate limit exceeded. You may only make ${options.limit} requests per ${options.ttlSeconds}s for this action. Please retry in ${ttlRemaining} seconds.`,
          retryAfter: ttlRemaining,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private checkMemoryRateLimit(key: string, options: RateLimitOptions): number {
    const now = Date.now();
    const bucket = this.memoryBuckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.memoryBuckets.set(key, {
        count: 1,
        resetAt: now + options.ttlSeconds * 1000,
      });
      return 1;
    }

    bucket.count += 1;
    return bucket.count;
  }
}

