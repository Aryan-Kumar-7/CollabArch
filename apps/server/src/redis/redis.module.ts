import { Module, Global, Provider } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { REDIS_PUB_CLIENT, REDIS_SUB_CLIENT } from './redis.constants';
import { RedisPubSubService } from './redis-pubsub.service';

function getCleanRedisUrl(): string | undefined {
  const raw = process.env.REDIS_URL;
  if (!raw) return undefined;
  let clean = raw.trim();
  // Strip any variable name prefix (e.g. if user pasted REDIS_URL=... into the value input)
  clean = clean.replace(/^[A-Za-z0-9_]+\s*=\s*/, '').trim();
  clean = clean.replace(/^["']|["']$/g, '').trim();
  clean = clean.replace(/^["']|["']$/g, '').trim();

  if (clean.startsWith('tcp://')) {
    clean = 'rediss://' + clean.slice(6);
  } else if (clean.startsWith('//')) {
    clean = 'rediss:' + clean;
  } else if (!clean.startsWith('redis://') && !clean.startsWith('rediss://')) {
    clean = 'rediss://' + clean;
  }
  return clean.length > 0 ? clean : undefined;
}

function createRedisOptions(): RedisOptions {
  const cleanUrl = getCleanRedisUrl();
  const options: RedisOptions = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6380', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: false,
    connectTimeout: 10000,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 5,
    retryStrategy: (times) => Math.min(times * 200, 3000),
    enableReadyCheck: true,
  };

  if (cleanUrl?.startsWith('rediss://')) {
    options.tls = {};
  }

  return options;
}

const redisPubProvider: Provider = {
  provide: REDIS_PUB_CLIENT,
  useFactory: (): Redis => {
    const cleanUrl = getCleanRedisUrl();
    if (cleanUrl) {
      return new Redis(cleanUrl, {
        connectTimeout: 10000,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 5,
        retryStrategy: (times) => Math.min(times * 200, 3000),
        ...(cleanUrl.startsWith('rediss://') ? { tls: {} } : {}),
      });
    }
    return new Redis(createRedisOptions());
  },
};

const redisSubProvider: Provider = {
  provide: REDIS_SUB_CLIENT,
  useFactory: (): Redis => {
    const cleanUrl = getCleanRedisUrl();
    if (cleanUrl) {
      return new Redis(cleanUrl, {
        connectTimeout: 10000,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 5,
        retryStrategy: (times) => Math.min(times * 200, 3000),
        ...(cleanUrl.startsWith('rediss://') ? { tls: {} } : {}),
      });
    }
    return new Redis(createRedisOptions());
  },
};

@Global()
@Module({
  providers: [redisPubProvider, redisSubProvider, RedisPubSubService],
  exports: [REDIS_PUB_CLIENT, REDIS_SUB_CLIENT, RedisPubSubService],
})
export class RedisModule {}
